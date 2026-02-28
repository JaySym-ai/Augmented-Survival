/**
 * OpenClawTownSystem — The master ECS system for autonomous agent towns.
 *
 * This system drives the entire OpenClaw agent lifecycle:
 * 1. Decision-making: Agents evaluate state and choose actions
 * 2. Town planning: Expansion rings, building placement
 * 3. Art evolution: Periodic DNA mutation and fitness evaluation
 * 4. Collaboration: Agent-to-agent interaction when nearby
 * 5. Resource management: Tracking agent-owned resources
 *
 * Each tick, every agent with an OpenClawAgentComponent is updated.
 */

import { System } from '../ecs/System';
import type { World } from '../ecs/World';
import type { EntityId } from '../ecs/Entity';
import { TRANSFORM } from '../ecs/components/TransformComponent';
import type { TransformComponent, Vector3 } from '../ecs/components/TransformComponent';
import { BUILDING } from '../ecs/components/BuildingComponent';
import type { BuildingComponent } from '../ecs/components/BuildingComponent';
import { CITIZEN } from '../ecs/components/CitizenComponent';
import { OPENCLAW_AGENT, type OpenClawAgentComponent } from './OpenClawAgentComponent';
import { AgentDecisionType } from './types';
import type { AgentDecision } from './types';
import { planExpansionRing, planRoadsForPlot, makeStrategicDecision } from './TownPlanner';
import { mutateArtDNA, evaluateArtFitness, describeMutation } from './ArtDNA';
import {
  areAgentsNearby,
  attemptTrade,
  attemptArtCrossover,
  recordInteraction,
  calculateTownScore,
} from './AgentCollaboration';
import {
  getArtEvolutionCost,
  getArtCrossoverCost,
  canAffordArtCost,
  chooseArtIntensity,
  calculateCulturalValue,
  getCulturalHappinessBonus,
  getCulturalProductionBonus,
} from './ArtEconomy';
import { ResourceType } from '../types/resources';
import type { EventBus } from '../events/EventBus';
import type { GameEventMap } from '../events/GameEvents';
import type { TimeSystem } from '../systems/TimeSystem';
import type { ResourceStoreSystem } from '../systems/ResourceStoreSystem';

/**
 * Callbacks that the rendering layer implements to handle
 * visual side effects of agent decisions.
 */
export interface OpenClawTownCallbacks {
  /** Called when an agent wants to place a building */
  onBuildingPlaced: (agentEntityId: EntityId, buildingType: string, position: Vector3) => EntityId | null;

  /** Called when an agent's art DNA evolves */
  onArtEvolved: (agentEntityId: EntityId, agent: OpenClawAgentComponent) => void;

  /** Called when a road segment should be created */
  onRoadCreated: (agentEntityId: EntityId, road: { startX: number; startZ: number; endX: number; endZ: number; width: number }) => void;

  /** Called when a citizen should be spawned for an agent */
  onCitizenSpawned: (agentEntityId: EntityId, position: Vector3) => EntityId | null;

  /** Called when a trade occurs between agents */
  onTradeCompleted: (agentAId: EntityId, agentBId: EntityId, description: string) => void;
}

/**
 * OpenClawTownSystem — drives autonomous agent town building.
 */
export class OpenClawTownSystem extends System {
  private callbacks: OpenClawTownCallbacks | null = null;
  private gameTime = 0;
  private collaborationTimer = 0;
  private collaborationInterval = 15; // Check for collaborations every 15 seconds
  /** Cached reference to the ECS world (set on first update) */
  private worldRef: World | null = null;

  constructor(
    private timeSystem: TimeSystem,
    private eventBus: EventBus<GameEventMap>,
    private resourceStore: ResourceStoreSystem,
  ) {
    super('OpenClawTownSystem');

    // Route citizen resource deliveries to the owning agent's pool
    this.eventBus.on('ResourceDelivered', (event) => {
      if (!this.worldRef) return;
      const ownerAgent = this.findOwningAgent(this.worldRef, event.entityId);
      if (ownerAgent) {
        ownerAgent.resources[event.resourceType] =
          (ownerAgent.resources[event.resourceType] ?? 0) + event.amount;
      }
    });
  }

  /** Set callbacks for rendering layer integration */
  setCallbacks(callbacks: OpenClawTownCallbacks): void {
    this.callbacks = callbacks;
  }

  update(world: World, dt: number): void {
    if (this.timeSystem.isPaused()) return;
    this.worldRef = world;
    const scaledDt = this.timeSystem.getScaledDt(dt);
    this.gameTime += scaledDt;

    // Find all OpenClaw agents
    const agentEntities = world.query(OPENCLAW_AGENT);
    if (agentEntities.length === 0) return;

    // Update each agent
    for (const entityId of agentEntities) {
      const agent = world.getComponent<OpenClawAgentComponent>(entityId, OPENCLAW_AGENT);
      if (!agent) continue;

      this.updateAgent(world, entityId, agent, scaledDt);
    }

    // Periodic collaboration checks between agents
    this.collaborationTimer += scaledDt;
    if (this.collaborationTimer >= this.collaborationInterval) {
      this.collaborationTimer = 0;
      this.updateCollaborations(world, agentEntities);
    }
  }

  /**
   * Update a single agent: decision-making, art evolution, resource tracking.
   */
  private updateAgent(
    world: World,
    entityId: EntityId,
    agent: OpenClawAgentComponent,
    dt: number,
  ): void {
    // Tick decision timer
    agent.decisionTimer += dt;

    // Make decisions at regular intervals
    if (agent.decisionTimer >= agent.decisionInterval) {
      agent.decisionTimer = 0;

      // Make a strategic decision using the agent's own resource pool
      const decision = makeStrategicDecision(agent, agent.resources, this.gameTime);
      agent.pendingDecisions.push(decision);
    }

    // Execute pending decisions
    this.executeDecisions(world, entityId, agent);

    // Tick art evolution timer
    agent.artEvolutionTimer += dt;
    if (agent.artEvolutionTimer >= agent.artEvolutionInterval) {
      agent.artEvolutionTimer = 0;
      this.evolveArt(world, entityId, agent);
    }

    // Update satisfaction based on town state
    this.updateSatisfaction(agent);
  }

  /**
   * Execute queued decisions for an agent.
   */
  private executeDecisions(
    world: World,
    entityId: EntityId,
    agent: OpenClawAgentComponent,
  ): void {
    // Sort by priority (highest first)
    agent.pendingDecisions.sort((a, b) => b.priority - a.priority);

    // Execute top decision
    const decision = agent.pendingDecisions.shift();
    if (!decision) return;

    switch (decision.type) {
      case AgentDecisionType.Build:
        this.executeBuild(world, entityId, agent, decision);
        break;

      case AgentDecisionType.ExpandTerritory:
        this.executeExpand(agent);
        break;

      case AgentDecisionType.EvolveArt:
        this.evolveArt(world, entityId, agent);
        break;

      case AgentDecisionType.SpawnCitizen:
        this.executeSpawnCitizen(world, entityId, agent);
        break;

      case AgentDecisionType.AssignJobs:
        // Job assignment is handled by existing JobAssignmentSystem
        break;

      case AgentDecisionType.Idle:
        // Nothing to do
        break;
    }
  }

  /**
   * Execute a Build decision.
   */
  private executeBuild(
    world: World,
    entityId: EntityId,
    agent: OpenClawAgentComponent,
    decision: AgentDecision,
  ): void {
    if (!decision.buildingType || !decision.position || !this.callbacks) return;

    // Deduct building cost from agent's own resource pool
    const buildingCost = this.getBuildingCost(decision.buildingType);
    for (const [resource, amount] of Object.entries(buildingCost)) {
      if (amount && amount > 0) {
        agent.resources[resource as ResourceType] =
          (agent.resources[resource as ResourceType] ?? 0) - amount;
      }
    }

    const position: Vector3 = {
      x: decision.position.x,
      y: 0,
      z: decision.position.z,
    };

    const buildingEntityId = this.callbacks.onBuildingPlaced(
      entityId,
      decision.buildingType,
      position,
    );

    if (buildingEntityId != null) {
      // Track the building
      agent.buildingEntities.push(buildingEntityId);
      agent.totalBuildingsBuilt++;

      // Mark the plot as built
      const plot = agent.townPlan.plots.find(
        p => !p.isBuilt && p.buildingType === decision.buildingType &&
             Math.abs(p.x - decision.position!.x) < 1 &&
             Math.abs(p.z - decision.position!.z) < 1
      );
      if (plot) {
        plot.isBuilt = true;

        // Create roads to this plot
        const roads = planRoadsForPlot(agent.townPlan, plot);
        for (const road of roads) {
          agent.townPlan.roads.push(road);
          this.callbacks.onRoadCreated(entityId, road);
        }
      }

      // Bump satisfaction slightly
      agent.satisfaction = Math.min(1, agent.satisfaction + 0.05);
    }
  }

  /**
   * Execute territory expansion — plan the next ring of buildings.
   */
  private executeExpand(agent: OpenClawAgentComponent): void {
    const nextRing = agent.townPlan.expansionRing + 1;
    const newPlots = planExpansionRing(agent, nextRing);

    agent.townPlan.plots.push(...newPlots);
    agent.townPlan.expansionRing = nextRing;
    agent.townPlan.radius = Math.min(
      agent.townPlan.maxRadius,
      agent.townPlan.radius + 8,
    );
  }

  /**
   * Execute citizen spawning for an agent.
   */
  private executeSpawnCitizen(
    _world: World,
    entityId: EntityId,
    agent: OpenClawAgentComponent,
  ): void {
    if (!this.callbacks) return;

    const pos: Vector3 = {
      x: agent.townPlan.centerX + (Math.random() - 0.5) * 6,
      y: 0,
      z: agent.townPlan.centerZ + (Math.random() - 0.5) * 6,
    };

    const citizenId = this.callbacks.onCitizenSpawned(entityId, pos);
    if (citizenId != null) {
      agent.citizenEntities.push(citizenId);
    }
  }

  /**
   * Evolve the agent's art DNA through mutation.
   * Art evolution now COSTS RESOURCES — this is the core art-economy loop.
   *
   * The agent chooses mutation intensity based on what it can afford:
   *   Minor tweak (< 0.3): 2 Gold
   *   Standard (0.3-0.7): 5 Gold + 3 Wood
   *   Major overhaul (> 0.7): 8 Gold + 5 Wood + 3 Stone
   *
   * Investment is tracked and accumulates cultural value, which in turn
   * boosts citizen happiness, productivity, and population growth.
   */
  private evolveArt(
    _world: World,
    entityId: EntityId,
    agent: OpenClawAgentComponent,
  ): void {
    // Choose intensity based on what the agent can afford from its own pool
    const intensity = chooseArtIntensity(agent, agent.resources);
    if (intensity <= 0) return; // Can't afford any art evolution

    // Calculate and check cost against agent's own resources
    const cost = getArtEvolutionCost(intensity);
    if (!canAffordArtCost(cost.resources, agent.resources)) return;

    // Deduct resources from the agent's own pool
    for (const [resource, amount] of Object.entries(cost.resources)) {
      if (amount && amount > 0) {
        agent.resources[resource as ResourceType] =
          (agent.resources[resource as ResourceType] ?? 0) - amount;
      }
    }

    // Track the investment (in Gold-equivalent units)
    const investmentValue = Object.values(cost.resources).reduce((sum, v) => sum + (v ?? 0), 0);
    agent.artInvestment += investmentValue;

    // Now mutate
    const oldDNA = agent.artDNA;
    const seed = agent.seed + agent.artDNA.generation * 7919 + Math.floor(this.gameTime);
    const newDNA = mutateArtDNA(oldDNA, intensity, seed);

    // Evaluate fitness
    const preferences = {
      prefersWarm: agent.priority === 'Aesthetics' || agent.priority === 'Growth',
      prefersDetailed: agent.priority === 'Aesthetics' || agent.priority === 'Defense',
      prefersTall: agent.style === 'Vertical' || agent.style === 'Fortified',
    };
    newDNA.fitnessScore = evaluateArtFitness(newDNA, preferences);

    // Accept mutation if fitness improved or we're exploring (low satisfaction)
    const accepted = newDNA.fitnessScore >= oldDNA.fitnessScore || agent.satisfaction < 0.3;

    // Record in art memory
    const mutationType = describeMutation(oldDNA, newDNA);
    agent.artMemory.push({
      parentGeneration: oldDNA.generation,
      mutationType,
      wasKept: accepted,
    });

    // Keep memory bounded
    if (agent.artMemory.length > 30) {
      agent.artMemory.shift();
    }

    if (accepted) {
      agent.artDNA = newDNA;

      // Update cultural value immediately after successful evolution
      agent.culturalValue = calculateCulturalValue(agent);

      // Notify rendering layer
      if (this.callbacks) {
        this.callbacks.onArtEvolved(entityId, agent);
      }
    }
  }

  /**
   * Update agent satisfaction based on current town state.
   * Cultural value now plays a major role — towns that invest in art
   * have significantly happier citizens.
   */
  private updateSatisfaction(agent: OpenClawAgentComponent): void {
    let satisfaction = 0.2; // Base (slightly lower to make culture matter more)

    // More buildings = more satisfaction
    satisfaction += Math.min(0.2, agent.totalBuildingsBuilt * 0.02);

    // More citizens = more satisfaction
    satisfaction += Math.min(0.15, agent.citizenEntities.length * 0.03);

    // Art fitness contributes directly
    satisfaction += agent.artDNA.fitnessScore * 0.15;

    // Cultural value is the big satisfaction driver
    // This is the payoff for art investment
    agent.culturalValue = calculateCulturalValue(agent);
    const cultureBonus = getCulturalHappinessBonus(agent.culturalValue);
    satisfaction *= cultureBonus; // Multiplier, not additive — culture amplifies everything

    agent.satisfaction = Math.min(1, satisfaction);
  }

  /**
   * Check for and process collaborations between nearby agents.
   */
  private updateCollaborations(world: World, agentEntities: EntityId[]): void {
    if (!this.callbacks) return;

    // Check all pairs of agents
    for (let i = 0; i < agentEntities.length; i++) {
      for (let j = i + 1; j < agentEntities.length; j++) {
        const agentA = world.getComponent<OpenClawAgentComponent>(agentEntities[i], OPENCLAW_AGENT);
        const agentB = world.getComponent<OpenClawAgentComponent>(agentEntities[j], OPENCLAW_AGENT);
        if (!agentA || !agentB) continue;

        // Check if agents are close enough to interact
        if (!areAgentsNearby(agentA, agentB)) continue;

        // Try trade using each agent's own resource pool
        const tradeResult = attemptTrade(agentA, agentB, agentA.resources, agentB.resources);
        if (tradeResult.success) {
          // Apply transfers between agent pools
          for (const transfer of tradeResult.transfers) {
            const from = transfer.from === 'A' ? agentA : agentB;
            const to = transfer.from === 'A' ? agentB : agentA;
            from.resources[transfer.resource] =
              (from.resources[transfer.resource] ?? 0) - transfer.amount;
            to.resources[transfer.resource] =
              (to.resources[transfer.resource] ?? 0) + transfer.amount;
          }

          // Record positive interaction for both
          recordInteraction(agentA, agentEntities[j] as number, 'trade', 'positive', this.gameTime);
          recordInteraction(agentB, agentEntities[i] as number, 'trade', 'positive', this.gameTime);

          const desc = tradeResult.transfers
            .map(t => `${t.amount} ${t.resource} from ${t.from === 'A' ? agentA.name : agentB.name}`)
            .join(', ');
          this.callbacks.onTradeCompleted(agentEntities[i], agentEntities[j], desc);
        }

        // Try art crossover (happens rarely, requires trust AND resources)
        // Each agent pays from its own pool
        const crossoverCost = getArtCrossoverCost();
        const canAffordCrossover =
          canAffordArtCost(crossoverCost, agentA.resources) &&
          canAffordArtCost(crossoverCost, agentB.resources);

        if (canAffordCrossover) {
          const seed = Math.floor(this.gameTime * 1000) + agentEntities[i] as number;
          const crossoverDNA = attemptArtCrossover(agentA, agentB, agentEntities[j] as number, seed);
          if (crossoverDNA) {
            // Deduct crossover cost from each agent's own pool
            for (const [resource, amount] of Object.entries(crossoverCost)) {
              if (amount && amount > 0) {
                agentA.resources[resource as ResourceType] =
                  (agentA.resources[resource as ResourceType] ?? 0) - amount;
                agentB.resources[resource as ResourceType] =
                  (agentB.resources[resource as ResourceType] ?? 0) - amount;
              }
            }

            // Track investment for both agents
            const investmentValue = Object.values(crossoverCost).reduce((sum, v) => sum + (v ?? 0), 0);
            agentA.artInvestment += investmentValue;
            agentB.artInvestment += investmentValue;

            // Apply crossover and track
            agentA.artDNA = crossoverDNA;
            agentA.crossoversCompleted++;
            agentB.crossoversCompleted++;
            agentA.culturalValue = calculateCulturalValue(agentA);
            agentB.culturalValue = calculateCulturalValue(agentB);

            recordInteraction(agentA, agentEntities[j] as number, 'collaboration', 'positive', this.gameTime);
            recordInteraction(agentB, agentEntities[i] as number, 'collaboration', 'positive', this.gameTime);
            this.callbacks.onArtEvolved(agentEntities[i], agentA);
          }
        }
      }
    }
  }

  /**
   * Get the resource cost for a building type.
   */
  private getBuildingCost(type: string): Partial<Record<ResourceType, number>> {
    switch (type) {
      case 'House': return { [ResourceType.Wood]: 10, [ResourceType.Stone]: 5 };
      case 'StorageBarn': return { [ResourceType.Wood]: 15 };
      case 'WoodcutterHut': return { [ResourceType.Wood]: 5 };
      case 'FarmField': return { [ResourceType.Wood]: 5 };
      case 'Quarry': return { [ResourceType.Wood]: 10 };
      default: return {};
    }
  }

  /**
   * Find which agent owns a given citizen entity.
   * Returns the agent component, or null if not owned by any agent.
   */
  private findOwningAgent(world: World, citizenEntityId: EntityId): OpenClawAgentComponent | null {
    const agentEntities = world.query(OPENCLAW_AGENT);
    for (const agentEntity of agentEntities) {
      const agent = world.getComponent<OpenClawAgentComponent>(agentEntity, OPENCLAW_AGENT);
      if (agent && agent.citizenEntities.includes(citizenEntityId)) {
        return agent;
      }
    }
    return null;
  }
}
