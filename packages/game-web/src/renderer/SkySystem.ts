/**
 * SkySystem — Procedural sky with sun positioning and environment map generation
 */
import * as THREE from 'three';
import { Sky } from 'three/examples/jsm/objects/Sky.js';

export class SkySystem {
  public readonly sky: Sky;
  public readonly sunPosition: THREE.Vector3;
  private pmremGenerator: THREE.PMREMGenerator;
  private envMap: THREE.Texture | null = null;

  /** Sky tuning parameters */
  public turbidity = 10;
  public rayleigh = 2;
  public mieCoefficient = 0.005;
  public mieDirectionalG = 0.8;

  /** Sun spherical coordinates */
  public sunElevation = 45; // degrees
  public sunAzimuth = 180; // degrees

  constructor(private renderer: THREE.WebGLRenderer) {
    this.sky = new Sky();
    this.sky.scale.setScalar(10000);

    this.sunPosition = new THREE.Vector3();
    this.pmremGenerator = new THREE.PMREMGenerator(renderer);
    this.pmremGenerator.compileEquirectangularShader();

    this.updateSun();
  }

  /** Update sun position and sky uniforms */
  updateSun(): void {
    const phi = THREE.MathUtils.degToRad(90 - this.sunElevation);
    const theta = THREE.MathUtils.degToRad(this.sunAzimuth);

    this.sunPosition.setFromSphericalCoords(1, phi, theta);

    const uniforms = this.sky.material.uniforms;
    uniforms['turbidity'].value = this.turbidity;
    uniforms['rayleigh'].value = this.rayleigh;
    uniforms['mieCoefficient'].value = this.mieCoefficient;
    uniforms['mieDirectionalG'].value = this.mieDirectionalG;
    uniforms['sunPosition'].value.copy(this.sunPosition);
  }

  /** Generate environment map from sky for PBR reflections */
  generateEnvironmentMap(scene: THREE.Scene): THREE.Texture {
    if (this.envMap) {
      this.envMap.dispose();
    }

    // Temporarily add sky to a render scene for env map
    const envScene = new THREE.Scene();
    envScene.add(this.sky.clone());

    const renderTarget = this.pmremGenerator.fromScene(envScene, 0, 0.1, 1000);
    this.envMap = renderTarget.texture;

    scene.environment = this.envMap;

    return this.envMap;
  }

  /** Get fog color derived from the sky horizon */
  getHorizonColor(): THREE.Color {
    // Approximate horizon color based on sky parameters
    // Warm golden when sun is low, blue-white when high
    const sunHeight = Math.max(0, Math.sin(THREE.MathUtils.degToRad(this.sunElevation)));
    const color = new THREE.Color();

    if (sunHeight > 0.3) {
      // Daytime: light blue-ish haze
      color.setRGB(0.7, 0.75, 0.85);
    } else if (sunHeight > 0.05) {
      // Golden hour: warm tones
      color.setRGB(0.85, 0.65, 0.45);
    } else {
      // Dusk/dawn: deep blue
      color.setRGB(0.2, 0.2, 0.4);
    }

    return color;
  }

  /** Add sky to a scene */
  addToScene(scene: THREE.Scene): void {
    scene.add(this.sky);
    this.generateEnvironmentMap(scene);
  }

  /** Configure directional light to match sun direction */
  configureSunLight(light: THREE.DirectionalLight): void {
    // Scale sun position for light placement
    light.position.copy(this.sunPosition).multiplyScalar(100);
  }

  dispose(): void {
    if (this.envMap) {
      this.envMap.dispose();
    }
    this.pmremGenerator.dispose();
    this.sky.geometry.dispose();
    (this.sky.material as THREE.ShaderMaterial).dispose();
  }
}

