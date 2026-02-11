/**
 * GameRenderer — Core renderer setup, scene, lights, ground plane, fog, postprocessing
 */
import * as THREE from 'three';
import { SkySystem } from './SkySystem.js';
import { PostProcessingPipeline } from './PostProcessing.js';
import { type RenderSettings, getShadowMapSize, PRESET_HIGH } from './RenderSettings.js';

export class GameRenderer {
  public readonly renderer: THREE.WebGLRenderer;
  public readonly scene: THREE.Scene;
  public readonly sunLight: THREE.DirectionalLight;
  public readonly ambientLight: THREE.HemisphereLight;
  public readonly skySystem: SkySystem;
  public readonly postProcessing: PostProcessingPipeline;
  public readonly groundPlane: THREE.Mesh;

  private fog: THREE.FogExp2;
  private currentSettings: RenderSettings;

  constructor(
    private container: HTMLElement,
    camera: THREE.Camera,
    initialSettings: RenderSettings = PRESET_HIGH,
  ) {
    // ---- WebGL Renderer ----
    this.renderer = new THREE.WebGLRenderer({
      antialias: false, // post-process AA instead
      powerPreference: 'high-performance',
    });
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(this.renderer.domElement);

    // Canvas styling
    this.renderer.domElement.style.display = 'block';

    // ---- Scene ----
    this.scene = new THREE.Scene();

    // ---- Lights ----
    // Directional sun light
    this.sunLight = new THREE.DirectionalLight(0xfff4e0, 2.5);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.left = -50;
    this.sunLight.shadow.camera.right = 50;
    this.sunLight.shadow.camera.top = 50;
    this.sunLight.shadow.camera.bottom = -50;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 300;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    // Hemisphere light for soft fill
    this.ambientLight = new THREE.HemisphereLight(
      0x87CEEB, // sky color (light blue)
      0x3a5f0b, // ground color (dark green)
      0.6,
    );
    this.scene.add(this.ambientLight);

    // ---- Sky ----
    this.skySystem = new SkySystem(this.renderer);
    this.skySystem.addToScene(this.scene);
    this.skySystem.configureSunLight(this.sunLight);

    // ---- Fog ----
    const horizonColor = this.skySystem.getHorizonColor();
    this.fog = new THREE.FogExp2(horizonColor.getHex(), 0.003);
    this.scene.fog = this.fog;

    // ---- Ground Plane ----
    const groundGeometry = new THREE.PlaneGeometry(200, 200, 64, 64);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x4a7c3f,     // grass green
      roughness: 0.9,
      metalness: 0.0,
      flatShading: false,
    });
    this.groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
    this.groundPlane.rotation.x = -Math.PI / 2;
    this.groundPlane.receiveShadow = true;
    this.scene.add(this.groundPlane);

    // ---- PostProcessing ----
    this.postProcessing = new PostProcessingPipeline(
      this.renderer,
      this.scene,
      camera,
    );

    // Apply initial settings
    this.currentSettings = { ...initialSettings };
    this.applySettings(initialSettings);
  }

  /** Apply render quality settings */
  applySettings(settings: RenderSettings): void {
    this.currentSettings = { ...settings };

    // Shadow quality
    const shadowSize = getShadowMapSize(settings.shadowQuality);
    if (settings.shadowQuality === 'off') {
      this.renderer.shadowMap.enabled = false;
      this.sunLight.castShadow = false;
    } else {
      this.renderer.shadowMap.enabled = true;
      this.sunLight.castShadow = true;
      this.sunLight.shadow.mapSize.set(shadowSize, shadowSize);
      // Force shadow map regeneration
      if (this.sunLight.shadow.map) {
        this.sunLight.shadow.map.dispose();
        this.sunLight.shadow.map = null!;
      }
    }

    // Fog
    if (this.scene.fog instanceof THREE.FogExp2) {
      (this.scene.fog as THREE.FogExp2).density = settings.fogEnabled ? 0.003 : 0;
    }

    // Post-processing toggles
    this.postProcessing.applySettings(settings);

    // Resolution scale
    const pixelRatio = Math.min(window.devicePixelRatio, 2) * settings.resolutionScale;
    this.renderer.setPixelRatio(pixelRatio);
  }

  /** Get current settings */
  getSettings(): RenderSettings {
    return { ...this.currentSettings };
  }

  /** Handle resize */
  onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const pixelRatio = Math.min(window.devicePixelRatio, 2) * this.currentSettings.resolutionScale;

    this.renderer.setSize(width, height);
    this.postProcessing.setSize(width, height, pixelRatio);
  }

  /** Render the scene through postprocessing pipeline */
  render(): void {
    this.postProcessing.render();
  }

  dispose(): void {
    this.postProcessing.dispose();
    this.skySystem.dispose();
    this.renderer.dispose();
    this.groundPlane.geometry.dispose();
    (this.groundPlane.material as THREE.MeshStandardMaterial).dispose();
    this.container.removeChild(this.renderer.domElement);
  }
}

