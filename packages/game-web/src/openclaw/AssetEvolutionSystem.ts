/**
 * AssetEvolutionSystem — Manages visual evolution of agent towns.
 *
 * When an agent's ArtDNA mutates or crosses over with another agent,
 * this system handles the visual transition:
 * 1. Fades out old building meshes
 * 2. Generates new meshes from updated ArtDNA
 * 3. Fades in new meshes with a smooth transition
 * 4. Tracks building visual state and generation
 *
 * This creates a living, breathing town that visually evolves
 * as agents refine their aesthetic preferences.
 */

import * as THREE from 'three';
import type { EntityId } from '@augmented-survival/game-core';
import type { ArtDNA } from '@augmented-survival/game-core';
import { BuildingType } from '@augmented-survival/game-core';
import { OpenClawArtGenerator } from './OpenClawArtGenerator';

/** Tracks the visual state of a single building during evolution */
interface BuildingVisualState {
  entityId: EntityId;
  buildingType: BuildingType;
  currentMesh: THREE.Group;
  /** The generation of ArtDNA this mesh was built with */
  dnaGeneration: number;
  /** If transitioning, the new mesh being faded in */
  incomingMesh: THREE.Group | null;
  /** Transition progress (0 = old mesh fully visible, 1 = new mesh fully visible) */
  transitionProgress: number;
  /** Whether currently in a transition */
  isTransitioning: boolean;
}

/** Duration of the visual transition in seconds */
const TRANSITION_DURATION = 3.0;

/**
 * AssetEvolutionSystem manages the lifecycle of visually evolving buildings.
 */
export class AssetEvolutionSystem {
  private scene: THREE.Scene;
  private buildings = new Map<EntityId, BuildingVisualState>();
  private artGenerator: OpenClawArtGenerator;
  private buildingIndex = 0;

  constructor(scene: THREE.Scene, initialDNA: ArtDNA) {
    this.scene = scene;
    this.artGenerator = new OpenClawArtGenerator(initialDNA);
  }

  /**
   * Register a building to be tracked for visual evolution.
   */
  registerBuilding(
    entityId: EntityId,
    buildingType: BuildingType,
    mesh: THREE.Group,
    dnaGeneration: number,
  ): void {
    this.buildings.set(entityId, {
      entityId,
      buildingType,
      currentMesh: mesh,
      dnaGeneration,
      incomingMesh: null,
      transitionProgress: 0,
      isTransitioning: false,
    });
  }

  /**
   * Unregister a building (when destroyed).
   */
  unregisterBuilding(entityId: EntityId): void {
    const state = this.buildings.get(entityId);
    if (state) {
      if (state.incomingMesh) {
        this.scene.remove(state.incomingMesh);
      }
      this.buildings.delete(entityId);
    }
  }

  /**
   * Trigger a visual evolution for all buildings owned by an agent.
   * Called when the agent's ArtDNA changes.
   */
  evolveBuildings(newDNA: ArtDNA, buildingEntityIds: EntityId[]): void {
    this.artGenerator.setDNA(newDNA);

    for (const entityId of buildingEntityIds) {
      const state = this.buildings.get(entityId);
      if (!state) continue;

      // Skip if already at this generation
      if (state.dnaGeneration >= newDNA.generation) continue;

      // Skip if already transitioning
      if (state.isTransitioning) continue;

      // Generate new mesh with updated DNA
      const newMesh = this.artGenerator.createBuilding(state.buildingType, this.buildingIndex++);
      newMesh.position.copy(state.currentMesh.position);
      newMesh.rotation.copy(state.currentMesh.rotation);

      // Start fully transparent
      this.setMeshOpacity(newMesh, 0);

      // Add to scene
      this.scene.add(newMesh);

      // Begin transition
      state.incomingMesh = newMesh;
      state.transitionProgress = 0;
      state.isTransitioning = true;
    }
  }

  /**
   * Update visual transitions each frame.
   */
  update(dt: number): void {
    for (const [entityId, state] of this.buildings) {
      if (!state.isTransitioning || !state.incomingMesh) continue;

      // Advance transition
      state.transitionProgress += dt / TRANSITION_DURATION;

      if (state.transitionProgress >= 1) {
        // Transition complete
        state.transitionProgress = 1;

        // Remove old mesh
        this.scene.remove(state.currentMesh);
        disposeMeshGroup(state.currentMesh);

        // Make new mesh fully opaque
        this.setMeshOpacity(state.incomingMesh, 1);
        this.setMeshTransparent(state.incomingMesh, false);

        // Update state
        state.currentMesh = state.incomingMesh;
        state.incomingMesh = null;
        state.isTransitioning = false;
        state.dnaGeneration++;
      } else {
        // Crossfade: old fades out, new fades in
        const t = smoothstep(state.transitionProgress);
        this.setMeshOpacity(state.currentMesh, 1 - t);
        this.setMeshOpacity(state.incomingMesh, t);
      }
    }
  }

  /**
   * Create a new building mesh using the current ArtDNA.
   */
  createBuildingMesh(type: BuildingType): THREE.Group {
    return this.artGenerator.createBuilding(type, this.buildingIndex++);
  }

  /**
   * Create a road mesh using the current ArtDNA.
   */
  createRoadMesh(segment: { startX: number; startZ: number; endX: number; endZ: number; width: number }): THREE.Mesh {
    return this.artGenerator.createRoad(segment);
  }

  /**
   * Create a town marker mesh.
   */
  createTownMarkerMesh(agentName: string, isFounder = false): THREE.Group {
    return this.artGenerator.createTownMarker(agentName, isFounder);
  }

  /**
   * Update the art generator's DNA.
   */
  updateDNA(dna: ArtDNA): void {
    this.artGenerator.setDNA(dna);
  }

  /**
   * Set the opacity of all materials in a mesh group.
   */
  private setMeshOpacity(group: THREE.Object3D, opacity: number): void {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        child.material.transparent = true;
        child.material.opacity = opacity;
      }
    });
  }

  /**
   * Set whether materials in a mesh group should be transparent.
   */
  private setMeshTransparent(group: THREE.Object3D, transparent: boolean): void {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        child.material.transparent = transparent;
        if (!transparent) {
          child.material.opacity = 1.0;
        }
      }
    });
  }

  /**
   * Get the art generator for external use.
   */
  getArtGenerator(): OpenClawArtGenerator {
    return this.artGenerator;
  }

  /**
   * Dispose of all tracked resources.
   */
  dispose(): void {
    for (const state of this.buildings.values()) {
      if (state.incomingMesh) {
        this.scene.remove(state.incomingMesh);
        disposeMeshGroup(state.incomingMesh);
      }
    }
    this.buildings.clear();
    this.artGenerator.dispose();
  }
}

/** Smooth interpolation for transitions */
function smoothstep(t: number): number {
  t = Math.max(0, Math.min(1, t));
  return t * t * (3 - 2 * t);
}

/** Dispose all geometry and materials in a group */
function disposeMeshGroup(group: THREE.Object3D): void {
  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      if (child.material instanceof THREE.Material) {
        child.material.dispose();
      }
    }
  });
}
