/**
 * OpenClawAgent ECS Component — Defines an autonomous AI agent
 * that builds and evolves its own town.
 *
 * Each OpenClaw agent has:
 * - A unique personality driving its decisions
 * - Art DNA defining its visual style
 * - A town plan with building layouts
 * - Memory of past interactions and art evolution
 * - Resource stockpile for building
 */

import type { EntityId } from '../ecs/Entity';
import type {
  ArtDNA,
  ArchitecturalStyle,
  AgentPriority,
  SocialDisposition,
  TownPlan,
  InteractionMemory,
  AgentDecision,
  ArtMemory,
} from './types';
import { ResourceType } from '../types/resources';

/** The OpenClaw agent's personality and state */
export interface OpenClawAgentComponent {
  /** Display name of this agent */
  name: string;

  /** Unique seed for procedural generation */
  seed: number;

  /** Architectural style preference */
  style: ArchitecturalStyle;

  /** Primary decision-making priority */
  priority: AgentPriority;

  /** Secondary priority (less weight in decisions) */
  secondaryPriority: AgentPriority;

  /** How this agent interacts with others */
  socialDisposition: SocialDisposition;

  /** The agent's visual DNA for procedural art */
  artDNA: ArtDNA;

  /** The town's master layout plan */
  townPlan: TownPlan;

  /** Citizens owned by this agent */
  citizenEntities: EntityId[];

  /** Buildings owned by this agent */
  buildingEntities: EntityId[];

  /** Time accumulator for decision-making (decides every N seconds) */
  decisionTimer: number;

  /** How often the agent makes decisions (seconds) */
  decisionInterval: number;

  /** Queue of pending decisions to execute */
  pendingDecisions: AgentDecision[];

  /** Memory of interactions with other agents */
  interactionMemory: InteractionMemory[];

  /** Memory of art evolution attempts */
  artMemory: ArtMemory[];

  /** Time accumulator for art evolution (evolves periodically) */
  artEvolutionTimer: number;

  /** How often art evolves (seconds) */
  artEvolutionInterval: number;

  /** Total number of buildings constructed */
  totalBuildingsBuilt: number;

  /** Agent "satisfaction" with current town (0-1, affects mutation rate) */
  satisfaction: number;

  /** Total resources invested in art evolution (Gold equivalent) */
  artInvestment: number;

  /** Cached cultural value (updated each tick) */
  culturalValue: number;

  /** Number of art commissions completed as the artist */
  commissionsCompleted: number;

  /** Number of art crossovers with other agents */
  crossoversCompleted: number;

  /** Per-agent resource stockpile — isolated from other agents */
  resources: Record<ResourceType, number>;
}

export const OPENCLAW_AGENT = 'OpenClawAgent' as const;

export function createOpenClawAgent(
  name: string,
  seed: number,
  style: ArchitecturalStyle,
  priority: AgentPriority,
  secondaryPriority: AgentPriority,
  socialDisposition: SocialDisposition,
  artDNA: ArtDNA,
  centerX: number,
  centerZ: number,
): OpenClawAgentComponent {
  return {
    name,
    seed,
    style,
    priority,
    secondaryPriority,
    socialDisposition,
    artDNA,
    townPlan: {
      centerX,
      centerZ,
      radius: 15,
      plots: [],
      roads: [],
      expansionRing: 0,
      maxRadius: 60,
    },
    citizenEntities: [],
    buildingEntities: [],
    decisionTimer: 0,
    decisionInterval: 5 + (seed % 5), // 5-10 seconds between decisions
    pendingDecisions: [],
    interactionMemory: [],
    artMemory: [],
    artEvolutionTimer: 0,
    artEvolutionInterval: 60 + (seed % 60), // 60-120 seconds between art evolutions
    totalBuildingsBuilt: 0,
    satisfaction: 0.5,
    artInvestment: 0,
    culturalValue: 0,
    commissionsCompleted: 0,
    crossoversCompleted: 0,
    resources: {
      [ResourceType.Wood]: 30,
      [ResourceType.Food]: 20,
      [ResourceType.Stone]: 15,
      [ResourceType.Iron]: 0,
      [ResourceType.Gold]: 5,
      [ResourceType.Hemp]: 0,
      [ResourceType.Branch]: 0,
    },
  };
}
