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

/** Names for randomly generated AI agents */
const AGENT_NAMES = [
  'Thornhollow', 'Mistpeak', 'Ironridge', 'Sunvale', 'Frostmere',
  'Embercrest', 'Stonewatch', 'Windshear', 'Ashgrove', 'Dewpoint',
  'Shadowfen', 'Brightmoor', 'Copperdale', 'Silverglen', 'Goldhaven',
  'Mossveil', 'Stormhaven', 'Cloudspire', 'Duskhollow', 'Dawnfield',
];

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
  /** The first spawned agent — belongs to the user */
  private userAgentEntityId: EntityId | null = null;
  /** User-chosen name for their town (set via promptUserTownName) */
  private userTownName: string | null = null;

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
   * The first agent is the user's — they'll be prompted for a town name.
   * Remaining agents are AI-controlled with random names.
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
   * Prompt the user for their town name. Call before spawnAgents
   * so the first agent gets the user's chosen name.
   * Returns a promise that resolves when the user responds.
   */
  async promptUserTownName(): Promise<string> {
    return new Promise<string>((resolve) => {
      // Create modal overlay
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 10000;
        background: rgba(0, 0, 0, 0.7);
        display: flex; align-items: center; justify-content: center;
        font-family: 'Trebuchet MS', sans-serif;
      `;

      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: 2px solid rgba(255, 220, 150, 0.6);
        border-radius: 12px; padding: 32px 40px;
        text-align: center; min-width: 360px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      `;

      const title = document.createElement('h2');
      title.textContent = 'Name Your Town';
      title.style.cssText = `
        color: #ffe8b4; margin: 0 0 8px 0; font-size: 24px;
        text-shadow: 0 2px 8px rgba(255, 200, 80, 0.3);
      `;

      const subtitle = document.createElement('p');
      subtitle.textContent = 'Your agent will build and evolve this town autonomously.';
      subtitle.style.cssText = 'color: #a0a8c0; margin: 0 0 20px 0; font-size: 14px;';

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Enter town name...';
      input.maxLength = 20;
      input.style.cssText = `
        width: 100%; box-sizing: border-box;
        padding: 10px 14px; font-size: 18px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 220, 150, 0.35);
        border-radius: 6px; color: #fff;
        outline: none; font-family: inherit;
      `;

      const button = document.createElement('button');
      button.textContent = 'Found Town';
      button.style.cssText = `
        margin-top: 16px; padding: 10px 28px;
        font-size: 16px; font-weight: 600;
        background: linear-gradient(135deg, #d4a03c 0%, #b8860b 100%);
        color: #1a1a2e; border: none; border-radius: 6px;
        cursor: pointer; font-family: inherit;
        transition: transform 0.1s;
      `;
      button.onmouseenter = () => { button.style.transform = 'scale(1.04)'; };
      button.onmouseleave = () => { button.style.transform = 'scale(1)'; };

      const submit = () => {
        const name = input.value.trim();
        const finalName = name.length > 0 ? name : AGENT_NAMES[Math.floor(Math.random() * AGENT_NAMES.length)];
        this.userTownName = finalName;
        overlay.remove();
        resolve(finalName);
      };

      button.addEventListener('click', submit);
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submit();
      });

      dialog.appendChild(title);
      dialog.appendChild(subtitle);
      dialog.appendChild(input);
      dialog.appendChild(button);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);

      // Focus input after render
      requestAnimationFrame(() => input.focus());
    });
  }

  /**
   * Spawn a single autonomous agent at a specific location.
   */
  spawnAgent(centerX: number, centerZ: number, seed: number, index: number): EntityId {
    // Generate unique personality
    const rng = this.seededRandom(seed);
    const isUserAgent = this.userAgentEntityId == null;

    // First agent uses the user's chosen name; others get random names
    const name = isUserAgent && this.userTownName
      ? this.userTownName
      : AGENT_NAMES[index % AGENT_NAMES.length];

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

    if (isUserAgent) {
      this.userAgentEntityId = agentEntityId;
    }

    // Create per-agent evolution system
    const evolutionSystem = new AssetEvolutionSystem(this.scene, artDNA);
    this.agentEvolutionSystems.set(agentEntityId, evolutionSystem);

    // Create town center for this agent
    this.createAgentTownCenter(agentEntityId, agentComponent, centerX, centerZ);

    // Spawn starting citizens (4 per agent for social dynamics)
    for (let c = 0; c < 4; c++) {
      const citizenPos: Vector3 = {
        x: centerX + (Math.random() - 0.5) * 6,
        y: 0,
        z: centerZ + (Math.random() - 0.5) * 6,
      };
      const citizenId = this.gameWorld.spawnCitizen(citizenPos);
      agentComponent.citizenEntities.push(citizenId);
    }

    // Create town marker — user's agent gets highlighted, all agents get name labels
    const marker = evolutionSystem.createTownMarkerMesh(name, isUserAgent);
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

    // Place building — uses agent placement (skips global resource deduction,
    // since costs were already deducted from the agent's own pool)
    const type = buildingType as BuildingType;
    const buildingId = this.gameWorld.placeBuildingForAgent(type, position);

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
   * Get the user's agent town center for camera focus.
   */
  getUserAgentTownCenter(): THREE.Vector3 | null {
    if (this.userAgentEntityId == null) return null;

    const agent = this.gameWorld.world.getComponent<OpenClawAgentComponent>(
      this.userAgentEntityId,
      OPENCLAW_AGENT,
    );
    if (!agent) return null;

    return new THREE.Vector3(agent.townPlan.centerX, 0, agent.townPlan.centerZ);
  }

  /**
   * Get the user's agent name.
   */
  getUserAgentName(): string | null {
    if (this.userAgentEntityId == null) return null;
    const agent = this.gameWorld.world.getComponent<OpenClawAgentComponent>(
      this.userAgentEntityId,
      OPENCLAW_AGENT,
    );
    return agent?.name ?? null;
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

    this.userAgentEntityId = null;
  }
}
