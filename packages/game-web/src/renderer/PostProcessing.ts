/**
 * PostProcessing — EffectComposer chain with FXAA, SSAO, bloom, color correction, vignette
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { SAOPass } from 'three/examples/jsm/postprocessing/SAOPass.js';
import type { RenderSettings } from './RenderSettings.js';

// Custom color correction shader — slight warm tint + contrast boost
const ColorCorrectionShader = {
  name: 'ColorCorrectionShader',
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    warmth: { value: 0.05 },
    contrast: { value: 1.08 },
    brightness: { value: 0.02 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float warmth;
    uniform float contrast;
    uniform float brightness;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      // Warm tint
      color.r += warmth;
      color.b -= warmth * 0.5;
      // Brightness
      color.rgb += brightness;
      // Contrast
      color.rgb = (color.rgb - 0.5) * contrast + 0.5;
      gl_FragColor = color;
    }
  `,
};

// Custom subtle vignette shader
const VignetteShader = {
  name: 'VignetteShader',
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    intensity: { value: 0.3 },
    smoothness: { value: 0.5 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float intensity;
    uniform float smoothness;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec2 uv = vUv * (1.0 - vUv);
      float vig = uv.x * uv.y * 15.0;
      vig = pow(vig, smoothness * 0.5);
      color.rgb *= mix(1.0 - intensity, 1.0, vig);
      gl_FragColor = color;
    }
  `,
};

export class PostProcessingPipeline {
  public readonly composer: EffectComposer;
  public readonly renderPass: RenderPass;
  public fxaaPass: ShaderPass;
  public saoPass: SAOPass | null = null;
  public bloomPass: UnrealBloomPass;
  public colorCorrectionPass: ShaderPass;
  public vignettePass: ShaderPass;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
  ) {
    const size = renderer.getSize(new THREE.Vector2());
    const pixelRatio = renderer.getPixelRatio();

    this.composer = new EffectComposer(renderer);

    // 1. Render pass
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);

    // 2. SAO (Screen-space Ambient Occlusion)
    try {
      this.saoPass = new SAOPass(scene, camera);
      this.saoPass.params.saoBias = 0.5;
      this.saoPass.params.saoIntensity = 0.015;
      this.saoPass.params.saoScale = 5;
      this.saoPass.params.saoKernelRadius = 50;
      this.saoPass.params.saoBlurRadius = 4;
      this.composer.addPass(this.saoPass);
    } catch {
      // SAOPass may not be available in all builds
      console.warn('[PostProcessing] SAOPass unavailable, skipping SSAO');
      this.saoPass = null;
    }

    // 3. Unreal Bloom
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.x, size.y),
      0.15, // strength
      0.4,  // radius
      0.85, // threshold
    );
    this.composer.addPass(this.bloomPass);

    // 4. Color correction
    this.colorCorrectionPass = new ShaderPass(ColorCorrectionShader);
    this.composer.addPass(this.colorCorrectionPass);

    // 5. Vignette
    this.vignettePass = new ShaderPass(VignetteShader);
    this.composer.addPass(this.vignettePass);

    // 6. FXAA (last, operates on final image)
    this.fxaaPass = new ShaderPass(FXAAShader);
    this.updateFXAAResolution(size.x * pixelRatio, size.y * pixelRatio);
    this.composer.addPass(this.fxaaPass);
  }

  updateFXAAResolution(width: number, height: number): void {
    if (this.fxaaPass.uniforms['resolution']) {
      this.fxaaPass.uniforms['resolution'].value.set(1 / width, 1 / height);
    }
  }

  /** Resize all passes */
  setSize(width: number, height: number, pixelRatio: number): void {
    this.composer.setSize(width, height);
    this.composer.setPixelRatio(pixelRatio);
    this.updateFXAAResolution(width * pixelRatio, height * pixelRatio);

    if (this.bloomPass) {
      this.bloomPass.resolution.set(width, height);
    }
  }

  /** Apply render settings toggles */
  applySettings(settings: RenderSettings): void {
    if (this.fxaaPass) this.fxaaPass.enabled = settings.fxaaEnabled;
    if (this.saoPass) this.saoPass.enabled = settings.ssaoEnabled;
    if (this.bloomPass) this.bloomPass.enabled = settings.bloomEnabled;
  }

  /** Render the postprocessing chain */
  render(): void {
    this.composer.render();
  }

  dispose(): void {
    this.composer.dispose();
  }
}

