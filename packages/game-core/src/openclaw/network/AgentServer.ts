/**
 * AgentServer — WebSocket server for OpenClaw agent connections.
 *
 * Hosts the game world and allows external agents to connect,
 * observe world state, and send commands to build/evolve their towns.
 *
 * Architecture:
 * - Server runs a headless game loop (no rendering)
 * - Each connected agent gets assigned a town location and entity
 * - Server broadcasts world state to agents at regular intervals
 * - Agents send commands; server validates and executes them
 * - Multiple agents can connect simultaneously
 *
 * Usage:
 *   import { AgentServer } from './AgentServer';
 *   const server = new AgentServer({ port: 3001 });
 *   server.start();
 */

import { World } from '../../ecs/World';
import { EventBus } from '../../events/EventBus';
import type { GameEventMap } from '../../events/GameEvents';
import type { EntityId } from '../../ecs/Entity';
import { TRANSFORM } from '../../ecs/components/TransformComponent';
import type { TransformComponent, Vector3 } from '../../ecs/components/TransformComponent';
import { VELOCITY } from '../../ecs/components/VelocityComponent';
import { CITIZEN } from '../../ecs/components/CitizenComponent';
import { BUILDING } from '../../ecs/components/BuildingComponent';
import type { BuildingComponent } from '../../ecs/components/BuildingComponent';
import { OPENCLAW_AGENT } from '../OpenClawAgentComponent';
import type { OpenClawAgentComponent } from '../OpenClawAgentComponent';
import { createOpenClawAgent } from '../OpenClawAgentComponent';
import { generateRandomArtDNA } from '../ArtDNA';
import { ArchitecturalStyle, AgentPriority, SocialDisposition, AgentDecisionType } from '../types';
import type { ArtDNA } from '../types';
import { planExpansionRing, planRoadsForPlot } from '../TownPlanner';
import { mutateArtDNA, evaluateArtFitness } from '../ArtDNA';
import { calculateTownScore } from '../AgentCollaboration';
import {
  calculateCulturalValue,
  getCulturalHappinessBonus,
  getCulturalProductionBonus,
  getArtEvolutionCost,
  canAffordArtCost,
} from '../ArtEconomy';
import { ResourceType } from '../../types/resources';
import { BuildingType } from '../../types/buildings';
import { TimeSystem } from '../../systems/TimeSystem';
import { ResourceStoreSystem } from '../../systems/ResourceStoreSystem';
import { BuildingPlacementSystem } from '../../systems/BuildingPlacementSystem';
import { JobAssignmentSystem } from '../../systems/JobAssignmentSystem';
import { PathFollowSystem } from '../../systems/PathFollowSystem';
import { MovementSystem } from '../../systems/MovementSystem';
import { GatherSystem } from '../../systems/GatherSystem';
import { CarrySystem } from '../../systems/CarrySystem';
import { DeliverySystem } from '../../systems/DeliverySystem';
import { ConstructionSystem } from '../../systems/ConstructionSystem';
import { ResourceDepletionSystem } from '../../systems/ResourceDepletionSystem';
import { CitizenNeedsSystem } from '../../systems/CitizenNeedsSystem';
import { TerrainGenerator } from '../../terrain/TerrainGenerator';
import { BUILDING_DEFS } from '../../content/BuildingDefs';
import { DEFAULT_GAME_CONFIG } from '../../content/DefaultGameConfig';
import {
  createTransform,
  createVelocity,
  createCitizen,
  createBuilding,
  createStorage,
  createSelectable,
  createCarry,
  createJobAssignment,
  createEquipment,
} from '../../index';
import { SELECTABLE } from '../../ecs/components/SelectableComponent';
import { CARRY } from '../../ecs/components/CarryComponent';
import { JOB_ASSIGNMENT } from '../../ecs/components/JobAssignmentComponent';
import { EQUIPMENT } from '../../ecs/components/EquipmentComponent';
import { STORAGE } from '../../ecs/components/StorageComponent';
import { JobType } from '../../types/jobs';
import { CitizenState, Gender, Mood, LifeGoal } from '../../types/citizens';
import type {
  ClientMessage,
  ServerMessage,
  AgentStateSnapshot,
  AgentSummary,
  JoinAcceptedMessage,
  WorldStateMessage,
  CommandResultMessage,
  AgentEventMessage,
  AgentConnectionMessage,
} from './protocol';

const MALE_NAMES = ['Aldric', 'Cedric', 'Edmund', 'Gilbert', 'Ivar', 'Oswald', 'Wulfric'];
const FEMALE_NAMES = ['Beatrice', 'Dorothea', 'Fiona', 'Helena', 'Juliana', 'Rowena', 'Matilda'];

/** Configuration for the agent server */
export interface AgentServerConfig {
  /** WebSocket port (default: 3001) */
  port: number;
  /** Maximum connected agents (default: 8) */
  maxAgents: number;
  /** World state broadcast interval in ms (default: 1000) */
  stateInterval: number;
  /** Game tick rate in ms (default: 50 = 20 ticks/sec) */
  tickRate: number;
  /** Map half-size (default: 128) */
  mapHalfSize: number;
}

const DEFAULT_CONFIG: AgentServerConfig = {
  port: 3001,
  maxAgents: 8,
  stateInterval: 1000,
  tickRate: 50,
  mapHalfSize: 128,
};

/** Tracks a connected agent's WebSocket and state */
interface ConnectedAgent {
  /** WebSocket connection (generic — works with any WS implementation) */
  ws: AgentSocket;
  /** Assigned entity ID in the ECS world */
  entityId: EntityId;
  /** Agent's display name */
  name: string;
  /** Whether the agent has joined (sent agent:join) */
  joined: boolean;
}

/** Minimal WebSocket interface — compatible with `ws` lib and browser WebSocket */
export interface AgentSocket {
  send(data: string): void;
  close(): void;
  readyState: number;
}

/** Callback-based WebSocket server interface for dependency injection */
export interface AgentSocketServer {
  onConnection(handler: (socket: AgentSocket) => void): void;
  onMessage(socket: AgentSocket, handler: (data: string) => void): void;
  onClose(socket: AgentSocket, handler: () => void): void;
  onError(socket: AgentSocket, handler: (err: Error) => void): void;
  close(): void;
}

/**
 * AgentServer — Headless game server for OpenClaw agent connections.
 */
export class AgentServer {
  private config: AgentServerConfig;
  private world: World;
  private eventBus: EventBus<GameEventMap>;
  private timeSystem: TimeSystem;
  private resourceStore: ResourceStoreSystem;
  private buildingPlacement: BuildingPlacementSystem;

  private connectedAgents = new Map<AgentSocket, ConnectedAgent>();
  private nextSeed = 5000;
  private gameTime = 0;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private stateInterval: ReturnType<typeof setInterval> | null = null;
  private socketServer: AgentSocketServer | null = null;

  // Track agent spawn angles to space them out
  private spawnIndex = 0;

  constructor(config: Partial<AgentServerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    // Initialize ECS world
    this.eventBus = new EventBus<GameEventMap>();
    this.world = new World();

    // Create systems (headless — no rendering)
    this.timeSystem = new TimeSystem(this.eventBus);
    const jobAssignment = new JobAssignmentSystem(this.timeSystem, this.eventBus);
    const pathFollow = new PathFollowSystem(this.timeSystem, this.eventBus);
    const movement = new MovementSystem(this.timeSystem);
    const gather = new GatherSystem(this.timeSystem, this.eventBus);
    const resourceDepletion = new ResourceDepletionSystem(this.timeSystem, this.eventBus);
    const carry = new CarrySystem();
    const delivery = new DeliverySystem(this.timeSystem, this.eventBus);
    const construction = new ConstructionSystem(this.timeSystem, this.eventBus);
    const citizenNeeds = new CitizenNeedsSystem(this.timeSystem);
    this.resourceStore = new ResourceStoreSystem(this.eventBus);
    this.buildingPlacement = new BuildingPlacementSystem(this.eventBus);

    // Generate terrain for height sampling
    const terrainGen = new TerrainGenerator(42);
    const terrainData = terrainGen.generate(200, 200, 128);
    movement.setTerrainData(terrainData);

    // Register systems
    this.world.addSystem(this.timeSystem);
    this.world.addSystem(jobAssignment);
    this.world.addSystem(pathFollow);
    this.world.addSystem(movement);
    this.world.addSystem(gather);
    this.world.addSystem(resourceDepletion);
    this.world.addSystem(carry);
    this.world.addSystem(delivery);
    this.world.addSystem(construction);
    this.world.addSystem(citizenNeeds);
    this.world.addSystem(this.resourceStore);
    this.world.addSystem(this.buildingPlacement);

    // Set starting resources
    const config2 = DEFAULT_GAME_CONFIG;
    for (const [type, amount] of Object.entries(config2.startingResources)) {
      if (amount != null) {
        this.resourceStore.setResource(type as ResourceType, amount);
      }
    }

    // Route citizen resource deliveries to owning agent's pool
    this.eventBus.on('ResourceDelivered', (event) => {
      const ownerAgent = this.findOwningAgent(event.entityId);
      if (ownerAgent) {
        ownerAgent.resources[event.resourceType] =
          (ownerAgent.resources[event.resourceType] ?? 0) + event.amount;
      }
    });

    // Listen for events to relay to agents
    this.setupEventRelays();
  }

  /**
   * Attach a WebSocket server implementation and start the game loop.
   * This allows any WS library to be used (ws, uWebSockets, etc.).
   */
  attachSocketServer(server: AgentSocketServer): void {
    this.socketServer = server;

    server.onConnection((socket: AgentSocket) => {
      this.handleConnection(socket);
      server.onMessage(socket, (data: string) => this.handleMessage(socket, data));
      server.onClose(socket, () => this.handleDisconnect(socket));
      server.onError(socket, (err: Error) => {
        console.error(`[AgentServer] Socket error:`, err.message);
        this.handleDisconnect(socket);
      });
    });

    // Start game loop
    this.startGameLoop();

    console.log(`[AgentServer] Ready for agent connections (max ${this.config.maxAgents} agents)`);
  }

  /**
   * Start the headless game loop.
   */
  private startGameLoop(): void {
    // Game tick
    let lastTick = Date.now();
    this.tickInterval = setInterval(() => {
      const now = Date.now();
      const dt = (now - lastTick) / 1000;
      lastTick = now;
      this.gameTime += dt;
      this.world.step(dt);
    }, this.config.tickRate);

    // State broadcast
    this.stateInterval = setInterval(() => {
      this.broadcastWorldState();
    }, this.config.stateInterval);
  }

  /**
   * Handle a new WebSocket connection.
   */
  private handleConnection(socket: AgentSocket): void {
    if (this.connectedAgents.size >= this.config.maxAgents) {
      this.sendToSocket(socket, {
        type: 'server:join_rejected',
        reason: `Server full (${this.config.maxAgents} max agents)`,
      });
      socket.close();
      return;
    }

    // Create placeholder — agent must send agent:join to complete registration
    this.connectedAgents.set(socket, {
      ws: socket,
      entityId: -1 as EntityId,
      name: 'pending',
      joined: false,
    });

    console.log(`[AgentServer] New connection (${this.connectedAgents.size} total)`);
  }

  /**
   * Handle an incoming message from a connected agent.
   */
  private handleMessage(socket: AgentSocket, rawData: string): void {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(rawData) as ClientMessage;
    } catch {
      this.sendToSocket(socket, {
        type: 'server:command_result',
        commandId: 'parse_error',
        success: false,
        message: 'Invalid JSON',
      });
      return;
    }

    const agent = this.connectedAgents.get(socket);
    if (!agent) return;

    switch (msg.type) {
      case 'agent:join':
        this.handleJoin(socket, agent, msg);
        break;

      case 'agent:command':
        if (!agent.joined) {
          this.sendToSocket(socket, {
            type: 'server:command_result',
            commandId: msg.commandId,
            success: false,
            message: 'Must send agent:join first',
          });
          return;
        }
        this.handleCommand(socket, agent, msg.commandId, msg.command as unknown as Record<string, unknown>);
        break;

      case 'agent:request_state':
        if (agent.joined) {
          this.sendWorldState(socket, agent);
        }
        break;

      case 'agent:chat':
        this.handleChat(agent, msg);
        break;

      case 'agent:leave':
        this.handleDisconnect(socket);
        break;
    }
  }

  /**
   * Handle agent join request.
   */
  private handleJoin(
    socket: AgentSocket,
    agent: ConnectedAgent,
    msg: ClientMessage & { type: 'agent:join' },
  ): void {
    if (agent.joined) {
      this.sendToSocket(socket, {
        type: 'server:join_rejected',
        reason: 'Already joined',
      });
      return;
    }

    // Resolve style/priority/disposition
    const allStyles = Object.values(ArchitecturalStyle);
    const allPriorities = Object.values(AgentPriority);
    const allDispositions = Object.values(SocialDisposition);

    const style = msg.style === 'random'
      ? allStyles[Math.floor(Math.random() * allStyles.length)]
      : msg.style;
    const priority = msg.priority === 'random'
      ? allPriorities[Math.floor(Math.random() * allPriorities.length)]
      : msg.priority;
    const disposition = msg.disposition === 'random'
      ? allDispositions[Math.floor(Math.random() * allDispositions.length)]
      : msg.disposition;

    // Assign town location (spread agents in a circle)
    const angle = (this.spawnIndex / Math.max(this.config.maxAgents, 4)) * Math.PI * 2;
    const radius = 35 + Math.random() * 30;
    const centerX = Math.cos(angle) * radius;
    const centerZ = Math.sin(angle) * radius;
    this.spawnIndex++;

    // Generate or use provided seed/art DNA
    const seed = msg.seed ?? this.nextSeed++;
    const artDNA = msg.artDNA ?? generateRandomArtDNA(seed);

    // Create ECS entity for this agent
    const entityId = this.world.createEntity();
    const agentComponent = createOpenClawAgent(
      msg.name, seed, style, priority, priority, disposition,
      artDNA, centerX, centerZ,
    );

    this.world.addComponent(entityId, OPENCLAW_AGENT, agentComponent);

    // Create town center
    this.createTownCenter(entityId, agentComponent, centerX, centerZ);

    // Spawn starting citizens (4 per agent for social dynamics)
    for (let i = 0; i < 4; i++) {
      const citizenId = this.spawnCitizen(
        centerX + (Math.random() - 0.5) * 6,
        centerZ + (Math.random() - 0.5) * 6,
      );
      agentComponent.citizenEntities.push(citizenId);
    }

    // Plan first expansion ring
    const plots = planExpansionRing(agentComponent, 0);
    agentComponent.townPlan.plots.push(...plots);
    agentComponent.townPlan.expansionRing = 0;

    // Update connected agent record
    agent.entityId = entityId;
    agent.name = msg.name;
    agent.joined = true;

    // Send acceptance
    const joinAccepted: JoinAcceptedMessage = {
      type: 'server:join_accepted',
      agentEntityId: entityId as number,
      townCenter: { x: centerX, z: centerZ },
      seed,
      artDNA,
      connectedAgents: this.getJoinedCount(),
    };
    this.sendToSocket(socket, joinAccepted);

    // Notify other agents
    this.broadcastToOthers(socket, {
      type: 'server:agent_connection',
      agentEntityId: entityId as number,
      agentName: msg.name,
      action: 'connected',
      connectedAgents: this.getJoinedCount(),
    });

    console.log(
      `[AgentServer] Agent "${msg.name}" joined at (${centerX.toFixed(0)}, ${centerZ.toFixed(0)}) ` +
      `style=${style} priority=${priority} (${this.getJoinedCount()} agents)`
    );
  }

  /**
   * Handle an agent command.
   */
  private handleCommand(
    socket: AgentSocket,
    agent: ConnectedAgent,
    commandId: string,
    command: Record<string, unknown>,
  ): void {
    const agentComp = this.world.getComponent<OpenClawAgentComponent>(agent.entityId, OPENCLAW_AGENT);
    if (!agentComp) {
      this.sendToSocket(socket, {
        type: 'server:command_result',
        commandId,
        success: false,
        message: 'Agent entity not found',
      });
      return;
    }

    const action = command.action as string;

    switch (action) {
      case 'place_building': {
        const type = command.buildingType as BuildingType;
        const x = command.x as number;
        const z = command.z as number;

        // Check if affordable from agent's own pool
        const def = BUILDING_DEFS[type];
        if (!def) {
          this.sendResult(socket, commandId, false, `Unknown building type: ${type}`);
          return;
        }
        if (!this.canAgentAfford(agentComp, def.cost)) {
          this.sendResult(socket, commandId, false, 'Insufficient resources');
          return;
        }

        // Deduct from agent's own pool
        this.deductFromAgent(agentComp, def.cost);
        const pos: Vector3 = { x, y: 0, z };
        const buildingId = this.buildingPlacement.placeBuilding(this.world, type, pos, {
          cost: def.cost,
          workerSlots: def.workerSlots,
          storageCapacity: def.storageCapacity,
          buildTime: def.buildTime,
        });

        if (buildingId != null) {
          agentComp.buildingEntities.push(buildingId);
          agentComp.totalBuildingsBuilt++;

          // Mark plot as built
          const plot = agentComp.townPlan.plots.find(
            p => !p.isBuilt && Math.abs(p.x - x) < 2 && Math.abs(p.z - z) < 2
          );
          if (plot) {
            plot.isBuilt = true;
            const roads = planRoadsForPlot(agentComp.townPlan, plot);
            agentComp.townPlan.roads.push(...roads);
          }

          this.sendResult(socket, commandId, true, `Building ${type} placed`, { buildingId });
          this.sendEvent(socket, {
            event: 'building_placed',
            buildingId: buildingId as number,
            buildingType: type,
            x, z,
          });
        } else {
          this.sendResult(socket, commandId, false, 'Building placement failed');
        }
        break;
      }

      case 'evolve_art': {
        const intensity = (command.intensity as number) ?? 0.5;

        // Art evolution costs resources from agent's own pool
        const artCost = getArtEvolutionCost(intensity);
        if (!canAffordArtCost(artCost.resources, agentComp.resources)) {
          const needed = Object.entries(artCost.resources)
            .map(([r, a]) => `${a} ${r}`)
            .join(', ');
          this.sendResult(socket, commandId, false,
            `Can't afford art evolution (${artCost.tier}). Need: ${needed}`);
          return;
        }

        // Deduct from agent's own pool
        this.deductFromAgent(agentComp, artCost.resources);

        // Track investment
        const investmentValue = Object.values(artCost.resources).reduce((sum, v) => sum + (v ?? 0), 0);
        agentComp.artInvestment += investmentValue;

        // Mutate
        const seed = agentComp.seed + agentComp.artDNA.generation * 7919 + Math.floor(this.gameTime);
        const newDNA = mutateArtDNA(agentComp.artDNA, intensity, seed);

        const preferences = {
          prefersWarm: agentComp.priority === AgentPriority.Aesthetics,
          prefersDetailed: agentComp.priority === AgentPriority.Defense,
          prefersTall: agentComp.style === ArchitecturalStyle.Vertical,
        };
        newDNA.fitnessScore = evaluateArtFitness(newDNA, preferences);
        agentComp.artDNA = newDNA;
        agentComp.culturalValue = calculateCulturalValue(agentComp);

        this.sendResult(socket, commandId, true,
          `Art evolved to gen ${newDNA.generation} (fitness: ${newDNA.fitnessScore.toFixed(2)}, ` +
          `culture: ${agentComp.culturalValue.toFixed(1)}) — cost: ${artCost.tier}`,
          {
            generation: newDNA.generation,
            fitnessScore: newDNA.fitnessScore,
            culturalValue: agentComp.culturalValue,
            costTier: artCost.tier,
          },
        );
        this.sendEvent(socket, {
          event: 'art_evolved',
          generation: newDNA.generation,
          fitnessScore: newDNA.fitnessScore,
          cost: artCost.tier,
          culturalValue: agentComp.culturalValue,
        });
        break;
      }

      case 'set_art_dna': {
        const newDNA = command.artDNA as ArtDNA;
        if (!newDNA) {
          this.sendResult(socket, commandId, false, 'artDNA field required');
          return;
        }
        agentComp.artDNA = newDNA;
        agentComp.culturalValue = calculateCulturalValue(agentComp);
        this.sendResult(socket, commandId, true, `Art DNA set (generation ${newDNA.generation})`);
        this.sendEvent(socket, {
          event: 'art_evolved',
          generation: newDNA.generation,
          fitnessScore: newDNA.fitnessScore,
          cost: 'free',
          culturalValue: agentComp.culturalValue,
        });
        break;
      }

      case 'spawn_citizen': {
        const cx = (command.x as number) ?? agentComp.townPlan.centerX + (Math.random() - 0.5) * 6;
        const cz = (command.z as number) ?? agentComp.townPlan.centerZ + (Math.random() - 0.5) * 6;
        const citizenId = this.spawnCitizen(cx, cz);
        agentComp.citizenEntities.push(citizenId);

        this.sendResult(socket, commandId, true, 'Citizen spawned', { citizenId });
        this.sendEvent(socket, { event: 'citizen_spawned', citizenId: citizenId as number });
        break;
      }

      case 'expand_territory': {
        const nextRing = agentComp.townPlan.expansionRing + 1;
        const newPlots = planExpansionRing(agentComp, nextRing);
        agentComp.townPlan.plots.push(...newPlots);
        agentComp.townPlan.expansionRing = nextRing;
        agentComp.townPlan.radius = Math.min(agentComp.townPlan.maxRadius, agentComp.townPlan.radius + 8);

        this.sendResult(socket, commandId, true,
          `Expanded to ring ${nextRing} (${newPlots.length} new plots)`,
          { ring: nextRing, newPlots: newPlots.length },
        );
        this.sendEvent(socket, { event: 'territory_expanded', ring: nextRing, newPlots: newPlots.length });
        break;
      }

      case 'set_priority': {
        const newPriority = command.priority as AgentPriority;
        agentComp.priority = newPriority;
        this.sendResult(socket, commandId, true, `Priority set to ${newPriority}`);
        break;
      }

      default:
        this.sendResult(socket, commandId, false, `Unknown action: ${action}`);
    }
  }

  /**
   * Handle chat messages between agents.
   */
  private handleChat(
    sender: ConnectedAgent,
    msg: ClientMessage & { type: 'agent:chat' },
  ): void {
    const relay = {
      type: 'server:chat' as const,
      fromAgentId: sender.entityId as number,
      fromAgentName: sender.name,
      message: msg.message,
    };

    if (msg.targetAgentId != null) {
      // Direct message
      for (const [, agent] of this.connectedAgents) {
        if (agent.joined && (agent.entityId as number) === msg.targetAgentId) {
          this.sendToSocket(agent.ws, relay);
          break;
        }
      }
    } else {
      // Broadcast
      this.broadcastToOthers(sender.ws, relay);
    }
  }

  /**
   * Handle agent disconnect.
   */
  private handleDisconnect(socket: AgentSocket): void {
    const agent = this.connectedAgents.get(socket);
    if (!agent) return;

    if (agent.joined) {
      this.broadcastToOthers(socket, {
        type: 'server:agent_connection',
        agentEntityId: agent.entityId as number,
        agentName: agent.name,
        action: 'disconnected',
        connectedAgents: this.getJoinedCount() - 1,
      });

      console.log(`[AgentServer] Agent "${agent.name}" disconnected (${this.getJoinedCount() - 1} remaining)`);
    }

    this.connectedAgents.delete(socket);
  }

  // ─── Game World Helpers ─────────────────────────────────────────

  private createTownCenter(agentEntityId: EntityId, agent: OpenClawAgentComponent, x: number, z: number): void {
    const def = BUILDING_DEFS[BuildingType.StorageBarn];
    const entityId = this.world.createEntity();
    this.world.addComponent(entityId, TRANSFORM, createTransform({ x, y: 0, z }));
    this.world.addComponent(entityId, BUILDING, createBuilding(BuildingType.StorageBarn, def.workerSlots, true));
    this.world.addComponent(entityId, STORAGE, createStorage(def.storageCapacity));
    this.world.addComponent(entityId, SELECTABLE, createSelectable());
    agent.buildingEntities.push(entityId);
    agent.totalBuildingsBuilt++;
  }

  private spawnCitizen(x: number, z: number): EntityId {
    const gender = Math.random() < 0.5 ? Gender.Male : Gender.Female;
    const names = gender === Gender.Male ? MALE_NAMES : FEMALE_NAMES;
    const name = names[Math.floor(Math.random() * names.length)];
    const age = 18 + Math.floor(Math.random() * 48);
    const lifeGoals = Object.values(LifeGoal);
    const lifeGoal = lifeGoals[Math.floor(Math.random() * lifeGoals.length)];

    const entity = this.world.createEntity();
    this.world.addComponent(entity, TRANSFORM, createTransform({ x, y: 0, z }));
    this.world.addComponent(entity, VELOCITY, createVelocity());
    this.world.addComponent(entity, CITIZEN, createCitizen(
      name, gender, null, CitizenState.Idle, 100, 100, 0, 0, Mood.Neutral, age, lifeGoal,
    ));
    this.world.addComponent(entity, CARRY, createCarry());
    this.world.addComponent(entity, SELECTABLE, createSelectable());
    this.world.addComponent(entity, JOB_ASSIGNMENT, createJobAssignment(JobType.Idle));
    this.world.addComponent(entity, EQUIPMENT, createEquipment());

    return entity;
  }

  // ─── State Broadcasting ─────────────────────────────────────────

  private broadcastWorldState(): void {
    for (const [socket, agent] of this.connectedAgents) {
      if (!agent.joined) continue;
      this.sendWorldState(socket, agent);
    }
  }

  private sendWorldState(socket: AgentSocket, agent: ConnectedAgent): void {
    const agentComp = this.world.getComponent<OpenClawAgentComponent>(agent.entityId, OPENCLAW_AGENT);
    if (!agentComp) return;

    // Send the agent's own resource pool (not the global one)
    const resources: Partial<Record<ResourceType, number>> = { ...agentComp.resources };

    const culturalValue = calculateCulturalValue(agentComp);
    const agentState: AgentStateSnapshot = {
      name: agentComp.name,
      entityId: agent.entityId as number,
      style: agentComp.style,
      priority: agentComp.priority,
      disposition: agentComp.socialDisposition,
      artDNA: agentComp.artDNA,
      townPlan: agentComp.townPlan,
      citizenCount: agentComp.citizenEntities.length,
      buildingCount: agentComp.buildingEntities.length,
      totalBuildingsBuilt: agentComp.totalBuildingsBuilt,
      satisfaction: agentComp.satisfaction,
      townScore: calculateTownScore(agentComp),
      artInvestment: agentComp.artInvestment,
      culturalValue,
      crossoversCompleted: agentComp.crossoversCompleted,
      culturalHappinessBonus: getCulturalHappinessBonus(culturalValue),
      culturalProductionBonus: getCulturalProductionBonus(culturalValue),
    };

    // Build summaries of other agents
    const otherAgents: AgentSummary[] = [];
    for (const [, other] of this.connectedAgents) {
      if (!other.joined || other.entityId === agent.entityId) continue;
      const otherComp = this.world.getComponent<OpenClawAgentComponent>(other.entityId, OPENCLAW_AGENT);
      if (!otherComp) continue;
      otherAgents.push({
        entityId: other.entityId as number,
        name: otherComp.name,
        style: otherComp.style,
        townCenter: { x: otherComp.townPlan.centerX, z: otherComp.townPlan.centerZ },
        buildingCount: otherComp.buildingEntities.length,
        citizenCount: otherComp.citizenEntities.length,
        artGeneration: otherComp.artDNA.generation,
        disposition: otherComp.socialDisposition,
        culturalValue: otherComp.culturalValue ?? 0,
      });
    }

    const stateMsg: WorldStateMessage = {
      type: 'server:world_state',
      gameTime: this.gameTime,
      agentState,
      otherAgents,
      resources,
    };

    this.sendToSocket(socket, stateMsg);
  }

  // ─── Message Utilities ──────────────────────────────────────────

  private sendToSocket(socket: AgentSocket, msg: ServerMessage): void {
    if (socket.readyState === 1) { // OPEN
      socket.send(JSON.stringify(msg));
    }
  }

  private sendResult(socket: AgentSocket, commandId: string, success: boolean, message: string, data?: Record<string, unknown>): void {
    const msg: CommandResultMessage = {
      type: 'server:command_result',
      commandId,
      success,
      message,
      data,
    };
    this.sendToSocket(socket, msg);
  }

  private sendEvent(socket: AgentSocket, event: AgentEventMessage['event']): void {
    this.sendToSocket(socket, { type: 'server:event', event });
  }

  private broadcastToOthers(excludeSocket: AgentSocket, msg: ServerMessage): void {
    for (const [socket, agent] of this.connectedAgents) {
      if (socket === excludeSocket || !agent.joined) continue;
      this.sendToSocket(socket, msg);
    }
  }

  private getJoinedCount(): number {
    let count = 0;
    for (const agent of this.connectedAgents.values()) {
      if (agent.joined) count++;
    }
    return count;
  }

  // ─── Agent Lookup ──────────────────────────────────────────────

  /**
   * Find which agent owns a given citizen entity.
   */
  private findOwningAgent(citizenEntityId: EntityId): OpenClawAgentComponent | null {
    for (const [, connected] of this.connectedAgents) {
      if (!connected.joined) continue;
      const agent = this.world.getComponent<OpenClawAgentComponent>(connected.entityId, OPENCLAW_AGENT);
      if (agent && agent.citizenEntities.includes(citizenEntityId)) {
        return agent;
      }
    }
    return null;
  }

  // ─── Agent Resource Helpers ─────────────────────────────────────

  private canAgentAfford(
    agent: OpenClawAgentComponent,
    cost: Partial<Record<ResourceType, number>>,
  ): boolean {
    for (const [type, amount] of Object.entries(cost)) {
      if (amount == null) continue;
      const current = agent.resources[type as ResourceType] ?? 0;
      if (current < amount) return false;
    }
    return true;
  }

  private deductFromAgent(
    agent: OpenClawAgentComponent,
    cost: Partial<Record<ResourceType, number>>,
  ): void {
    for (const [type, amount] of Object.entries(cost)) {
      if (amount == null || amount <= 0) continue;
      agent.resources[type as ResourceType] =
        (agent.resources[type as ResourceType] ?? 0) - amount;
    }
  }

  // ─── Event Relays ───────────────────────────────────────────────

  private setupEventRelays(): void {
    this.eventBus.on('ConstructionComplete', (e) => {
      // Find which agent owns this building
      for (const [socket, agent] of this.connectedAgents) {
        if (!agent.joined) continue;
        const agentComp = this.world.getComponent<OpenClawAgentComponent>(agent.entityId, OPENCLAW_AGENT);
        if (!agentComp) continue;
        if (agentComp.buildingEntities.includes(e.buildingId)) {
          this.sendEvent(socket, {
            event: 'building_completed',
            buildingId: e.buildingId as number,
            buildingType: e.buildingType,
          });
        }
      }
    });
  }

  // ─── Lifecycle ──────────────────────────────────────────────────

  /**
   * Stop the server and clean up.
   */
  stop(): void {
    if (this.tickInterval) clearInterval(this.tickInterval);
    if (this.stateInterval) clearInterval(this.stateInterval);

    for (const [socket] of this.connectedAgents) {
      socket.close();
    }
    this.connectedAgents.clear();

    if (this.socketServer) {
      this.socketServer.close();
    }

    console.log('[AgentServer] Stopped');
  }

  /** Get current game time */
  getGameTime(): number {
    return this.gameTime;
  }

  /** Get the ECS world (for testing/inspection) */
  getWorld(): World {
    return this.world;
  }

  /** Get connected agent count */
  getConnectedCount(): number {
    return this.getJoinedCount();
  }
}
