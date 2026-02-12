/**
 * AssetLoader — GLTF model and texture loader with caching.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class AssetLoader {
  private gltfLoader: GLTFLoader;
  private textureLoader: THREE.TextureLoader;
  private cache: Map<string, THREE.Object3D>;
  private textureCache: Map<string, THREE.Texture>;

  constructor() {
    this.gltfLoader = new GLTFLoader();
    this.textureLoader = new THREE.TextureLoader();
    this.cache = new Map();
    this.textureCache = new Map();
  }

  /**
   * Load a GLTF/GLB model from a URL. Returns a cached clone if already loaded.
   */
  async loadGLTF(url: string): Promise<THREE.Object3D> {
    const cached = this.cache.get(url);
    if (cached) {
      return cached.clone();
    }

    return new Promise((resolve, reject) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          const model = gltf.scene;
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          this.cache.set(url, model);
          resolve(model.clone());
        },
        undefined,
        (error) => reject(error),
      );
    });
  }

  /**
   * Load a texture from a URL. Returns a cached texture if already loaded.
   */
  async loadTexture(url: string): Promise<THREE.Texture> {
    const cached = this.textureCache.get(url);
    if (cached) {
      return cached;
    }

    return new Promise((resolve, reject) => {
      this.textureLoader.load(
        url,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          this.textureCache.set(url, texture);
          resolve(texture);
        },
        undefined,
        (error) => reject(error),
      );
    });
  }

  /**
   * Get a cached model by its ID (URL). Returns undefined if not cached.
   */
  getCached(id: string): THREE.Object3D | undefined {
    const cached = this.cache.get(id);
    return cached ? cached.clone() : undefined;
  }

  /**
   * Dispose all cached assets and free GPU memory.
   */
  dispose(): void {
    this.cache.forEach((obj) => {
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
    this.cache.clear();

    this.textureCache.forEach((texture) => texture.dispose());
    this.textureCache.clear();
  }
}

