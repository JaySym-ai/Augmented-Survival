/**
 * BuildingGhostPreview — Shows a transparent ghost mesh following the mouse during building placement.
 */
import * as THREE from 'three';
import type { BuildingType, Vector3 } from '@augmented-survival/game-core';
import type { MeshFactory } from '../assets/MeshFactory.js';

export class BuildingGhostPreview {
  private ghostMesh: THREE.Group | null = null;
  private activeType: BuildingType | null = null;

  /** Current world position of the ghost */
  currentPosition: Vector3 | null = null;

  constructor(
    private scene: THREE.Scene,
    private meshFactory: MeshFactory,
    private container: HTMLElement,
    private camera: THREE.Camera,
    private terrainMesh: THREE.Mesh,
  ) {}

  startPlacement(type: BuildingType): void {
    this.cancel(); // Cancel any existing
    this.activeType = type;
    this.ghostMesh = this.meshFactory.createBuildingMesh(type);
    // Make fully transparent green
    this.ghostMesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material = new THREE.MeshBasicMaterial({
          color: 0x00ff00,
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
        });
      }
    });
    this.scene.add(this.ghostMesh);
    this.container.addEventListener('mousemove', this.onMouseMove);
  }

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.ghostMesh) return;

    const rect = this.container.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    // Try raycasting against the terrain mesh first
    const terrainHits = raycaster.intersectObject(this.terrainMesh);
    if (terrainHits.length > 0) {
      const hit = terrainHits[0].point;
      this.ghostMesh.position.set(hit.x, hit.y, hit.z);
      this.currentPosition = { x: hit.x, y: hit.y, z: hit.z };
    } else {
      // Fall back to flat plane if cursor is off the terrain
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const intersection = new THREE.Vector3();
      raycaster.ray.intersectPlane(groundPlane, intersection);
      if (intersection) {
        this.ghostMesh.position.set(intersection.x, intersection.y, intersection.z);
        this.currentPosition = { x: intersection.x, y: intersection.y, z: intersection.z };
      }
    }
  };

  isActive(): boolean {
    return this.activeType != null;
  }

  getActiveType(): BuildingType | null {
    return this.activeType;
  }

  confirm(): Vector3 | null {
    if (!this.currentPosition || !this.activeType) return null;
    const pos = { ...this.currentPosition };
    this.cancel();
    return pos;
  }

  cancel(): void {
    if (this.ghostMesh) {
      this.scene.remove(this.ghostMesh);
      this.ghostMesh = null;
    }
    this.activeType = null;
    this.currentPosition = null;
    this.container.removeEventListener('mousemove', this.onMouseMove);
  }

  dispose(): void {
    this.cancel();
  }
}

