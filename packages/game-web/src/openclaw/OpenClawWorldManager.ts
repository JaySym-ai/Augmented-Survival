/**
 * OpenClawWorldManager — Integrates OpenClaw autonomous agents
 * with the GameWorld rendering and ECS systems.
 *
 * This is the bridge between the agent logic (game-core) and
 * the visual rendering (game-web). It:
 *
 * 1. Spawns OpenClaw agents with unique personalities and town locations
 * 2. Registers the OpenClawTownSystem with the ECS world
 * 3. Implements rendering callbacks (building placement, art evolution)
 * 4. Manages per-agent AssetEvolutionSystems for visual transitions
 * 5. Creates the initial town centers and starting citizens for agents
 *
 * Usage:
 *   const manager = new OpenClawWorldManager(gameWorld);
 *   manager.spawnAgents(3); // Spawn 3 autonomous agents
 *   // In game loop:
 *   manager.update(dt);
 */

import * as THREE from 'three';
import {
  type EntityId,
  type Vector3,
  OPENCLAW_AGENT,
  createOpenClawAgent,
  generateRandomArtDNA,
  OpenClawTownSystem,
  type OpenClawTownCallbacks,
  type OpenClawAgentComponent,
  ArchitecturalStyle,
  AgentPriority,
  SocialDisposition,
  BuildingType,
  TRANSFORM,
  type TransformComponent,
} from '@augmented-survival/game-core';
import type { GameWorld } from '../game/GameWorld';
import { AssetEvolutionSystem } from './AssetEvolutionSystem';

/** Names for randomly generated agents */
const AGENT_NAMES = [
  'Thornhollow', 'Mistpeak', 'Ironridge', 'Sunvale', 'Frostmere',
  'Embercrest', 'Stonewatch', 'Windshear', 'Ashgrove', 'Dewpoint',
  'Shadowfen', 'Brightmoor', 'Copperdale', 'Silverglen', 'Goldhaven',
  'Mossveil', 'Stormhaven', 'Cloudspire', 'Duskhollow', 'Dawnfield',
];

export const FROST_FOUNDER_NAME = 'FrostD4D';

/** Architectural styles to randomly assign */
const STYLES = Object.values(ArchitecturalStyle);

/** Priorities to randomly assign */
const PRIORITIES = Object.values(AgentPriority);

/** Social dispositions */
const DISPOSITIONS = Object.values(SocialDisposition);

/**
 * OpenClawWorldManager orchestrates autonomous agent towns.
 */
export class OpenClawWorldManager {
  private gameWorld: GameWorld;
  private scene: THREE.Scene;
  private townSystem: OpenClawTownSystem;
  private agentEvolutionSystems = new Map<EntityId, AssetEvolutionSystem>();
  private agentEntities: EntityId[] = [];
  private roadMeshes: THREE.Mesh[] = [];
  private markerMeshes: THREE.Object3D[] = [];
  private frostFounderEntityId: EntityId | null = null;

  constructor(gameWorld: GameWorld) {
    this.gameWorld = gameWorld;
    this.scene = gameWorld.scene;

    // Create and register the OpenClaw town system
    this.townSystem = new OpenClawTownSystem(
      gameWorld.timeSystem,
      gameWorld.eventBus,
      gameWorld.resourceStore,
    );

    // Set up callbacks for rendering integration
    const callbacks: OpenClawTownCallbacks = {
      onBuildingPlaced: this.handleBuildingPlaced.bind(this),
      onArtEvolved: this.handleArtEvolved.bind(this),
      onRoadCreated: this.handleRoadCreated.bind(this),
      onCitizenSpawned: this.handleCitizenSpawned.bind(this),
      onTradeCompleted: this.handleTradeCompleted.bind(this),
    };
    this.townSystem.setCallbacks(callbacks);

    // Register the system with the ECS world
    gameWorld.world.addSystem(this.townSystem);
  }

  /**
   * Spawn multiple autonomous agents at spread-out locations on the map.
   */
  spawnAgents(count: number, mapHalfSize = 128): void {
    // Place agents in a circle around the map, away from center
    // and from each other
    const minRadius = 35;
    const maxRadius = mapHalfSize * 0.6;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
      const radius = minRadius + Math.random() * (maxRadius - minRadius);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const seed = 1000 + i * 7919 + Math.floor(Math.random() * 1000);
      this.spawnAgent(x, z, seed, i);
    }
  }

  /**
   * Spawn a single autonomous agent at a specific location.
   */
  spawnAgent(centerX: number, centerZ: number, seed: number, index: number): EntityId {
    // Generate unique personality
    const rng = this.seededRandom(seed);
    const isFounder = this.frostFounderEntityId == null;
    const name = isFounder ? FROST_FOUNDER_NAME : AGENT_NAMES[index % AGENT_NAMES.length];
    const style = STYLES[Math.floor(rng() * STYLES.length)];
    const priority = PRIORITIES[Math.floor(rng() * PRIORITIES.length)];
    const secondaryPriority = PRIORITIES[Math.floor(rng() * PRIORITIES.length)];
    const disposition = DISPOSITIONS[Math.floor(rng() * DISPOSITIONS.length)];

    // Generate unique art DNA
    const artDNA = generateRandomArtDNA(seed);

    // Create the agent entity in ECS
    const agentEntityId = this.gameWorld.world.createEntity();
    const agentComponent = createOpenClawAgent(
      name, seed, style, priority, secondaryPriority, disposition,
      artDNA, centerX, centerZ,
    );

    this.gameWorld.world.addComponent(agentEntityId, OPENCLAW_AGENT, agentComponent);

    if (isFounder) {
      this.frostFounderEntityId = agentEntityId;
    }

    // Create per-agent evolution system
    const evolutionSystem = new AssetEvolutionSystem(this.scene, artDNA);
    this.agentEvolutionSystems.set(agentEntityId, evolutionSystem);

    // Create town center for this agent
    this.createAgentTownCenter(agentEntityId, agentComponent, centerX, centerZ);

    // Spawn starting citizens for this agent
    for (let c = 0; c < 3; c++) {
      const citizenPos: Vector3 = {
        x: centerX + (Math.random() - 0.5) * 6,
        y: 0,
        z: centerZ + (Math.random() - 0.5) * 6,
      };
      const citizenId = this.gameWorld.spawnCitizen(citizenPos);
      agentComponent.citizenEntities.push(citizenId);
    }

    // Create town marker
    const marker = evolutionSystem.createTownMarkerMesh(name, isFounder);
    marker.position.set(centerX + 4, this.gameWorld.terrainMesh.getHeightAt(centerX + 4, centerZ - 3), centerZ - 3);
    this.scene.add(marker);
    this.markerMeshes.push(marker);

    // Plan the first expansion ring
    this.townSystem['executeExpand'](agentComponent);

    this.agentEntities.push(agentEntityId);

    console.log(
      `[OpenClaw] Spawned agent "${name}" at (${centerX.toFixed(0)}, ${centerZ.toFixed(0)}) ` +
      `style=${style} priority=${priority} disposition=${disposition} ` +
      `DNA gen=${artDNA.generation}`
    );

    return agentEntityId;
  }

  /**
   * Create a town center building for an agent.
   */
  private createAgentTownCenter(
    agentEntityId: EntityId,
    agent: OpenClawAgentComponent,
    x: number,
    z: number,
  ): void {
    const evolutionSystem = this.agentEvolutionSystems.get(agentEntityId);
    if (!evolutionSystem) return;

    // Place building through GameWorld
    const position: Vector3 = { x, y: 0, z };
    position.y = this.gameWorld.terrainMesh.getHeightAt(x, z);

    const buildingId = this.gameWorld.placeBuilding(BuildingType.StorageBarn, position);
    if (buildingId != null) {
      agent.buildingEntities.push(buildingId);
      agent.totalBuildingsBuilt++;

      // Register with evolution system
      const mesh = this.getBuildingMesh(buildingId);
      if (mesh) {
        evolutionSystem.registerBuilding(buildingId, BuildingType.StorageBarn, mesh, agent.artDNA.generation);
      }
    }
  }

  /**
   * Update all evolution systems (call each frame).
   */
  update(dt: number): void {
    for (const evolutionSystem of this.agentEvolutionSystems.values()) {
      evolutionSystem.update(dt);
    }
  }

  // ─── Rendering Callbacks ──────────────────────────────────────────

  private handleBuildingPlaced(
    agentEntityId: EntityId,
    buildingType: string,
    position: Vector3,
  ): EntityId | null {
    const agent = this.gameWorld.world.getComponent<OpenClawAgentComponent>(agentEntityId, OPENCLAW_AGENT);
    if (!agent) return null;

    const evolutionSystem = this.agentEvolutionSystems.get(agentEntityId);

    // Place building through GameWorld's existing system
    const type = buildingType as BuildingType;
    const buildingId = this.gameWorld.placeBuilding(type, position);

    if (buildingId != null && evolutionSystem) {
      // Register with evolution system for future visual evolution
      const mesh = this.getBuildingMesh(buildingId);
      if (mesh) {
        evolutionSystem.registerBuilding(buildingId, type, mesh, agent.artDNA.generation);
      }
    }

    return buildingId;
  }

  private handleArtEvolved(agentEntityId: EntityId, agent: OpenClawAgentComponent): void {
    const evolutionSystem = this.agentEvolutionSystems.get(agentEntityId);
    if (!evolutionSystem) return;

    // Update the evolution system's DNA and trigger visual transitions
    evolutionSystem.updateDNA(agent.artDNA);
    evolutionSystem.evolveBuildings(agent.artDNA, agent.buildingEntities);

    console.log(
      `[OpenClaw] Agent "${agent.name}" art evolved to generation ${agent.artDNA.generation} ` +
      `(fitness: ${agent.artDNA.fitnessScore.toFixed(2)}, satisfaction: ${agent.satisfaction.toFixed(2)})`
    );
  }

  private handleRoadCreated(
    agentEntityId: EntityId,
    road: { startX: number; startZ: number; endX: number; endZ: number; width: number },
  ): void {
    const evolutionSystem = this.agentEvolutionSystems.get(agentEntityId);
    if (!evolutionSystem) return;

    const roadMesh = evolutionSystem.createRoadMesh(road);
    const midY = this.gameWorld.terrainMesh.getHeightAt(
      (road.startX + road.endX) / 2,
      (road.startZ + road.endZ) / 2,
    );
    roadMesh.position.y = midY + 0.03;
    this.scene.add(roadMesh);
    this.roadMeshes.push(roadMesh);
  }

  private handleCitizenSpawned(agentEntityId: EntityId, position: Vector3): EntityId | null {
    return this.gameWorld.spawnCitizen(position);
  }

  private handleTradeCompleted(agentAId: EntityId, agentBId: EntityId, description: string): void {
    const agentA = this.gameWorld.world.getComponent<OpenClawAgentComponent>(agentAId, OPENCLAW_AGENT);
    const agentB = this.gameWorld.world.getComponent<OpenClawAgentComponent>(agentBId, OPENCLAW_AGENT);
    console.log(
      `[OpenClaw] Trade between "${agentA?.name ?? '?'}" and "${agentB?.name ?? '?'}": ${description}`
    );
  }

  // ─── Utilities ────────────────────────────────────────────────────

  /**
   * Get all spawned agent entity IDs.
   */
  getAgentEntities(): readonly EntityId[] {
    return this.agentEntities;
  }

  /**
   * Get agent info for UI display.
   */
  getAgentInfo(entityId: EntityId): OpenClawAgentComponent | undefined {
    return this.gameWorld.world.getComponent<OpenClawAgentComponent>(entityId, OPENCLAW_AGENT);
  }

  /**
   * Get FrostD4D's town center for camera focus affordances.
   */
  getFrostFounderTownCenter(): THREE.Vector3 | null {
    if (this.frostFounderEntityId == null) return null;

    const founder = this.gameWorld.world.getComponent<OpenClawAgentComponent>(
      this.frostFounderEntityId,
      OPENCLAW_AGENT,
    );
    if (!founder) return null;

    return new THREE.Vector3(founder.townPlan.centerX, 0, founder.townPlan.centerZ);
  }

  /**
   * Get the Three.js mesh for a building entity (from GameWorld's internal map).
   */
  private getBuildingMesh(entityId: EntityId): THREE.Group | null {
    // Access through the scene — find the mesh at the building's position
    const transform = this.gameWorld.world.getComponent<TransformComponent>(entityId, TRANSFORM);
    if (!transform) return null;

    // Search scene children for a mesh at this position
    for (const child of this.scene.children) {
      if (child instanceof THREE.Group &&
          Math.abs(child.position.x - transform.position.x) < 0.1 &&
          Math.abs(child.position.z - transform.position.z) < 0.1) {
        return child;
      }
    }
    return null;
  }

  private seededRandom(seed: number): () => number {
    let s = seed;
    return () => {
      s = (s * 1664525 + 1013904223) & 0xffffffff;
      return (s >>> 0) / 0xffffffff;
    };
  }

  /**
   * Clean up all resources.
   */
  dispose(): void {
    for (const mesh of this.roadMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      if (mesh.material instanceof THREE.Material) {
        mesh.material.dispose();
      }
    }
    this.roadMeshes = [];

    for (const mesh of this.markerMeshes) {
      this.scene.remove(mesh);
    }
    this.markerMeshes = [];

    for (const system of this.agentEvolutionSystems.values()) {
      system.dispose();
    }
    this.agentEvolutionSystems.clear();

    this.frostFounderEntityId = null;
  }
}
