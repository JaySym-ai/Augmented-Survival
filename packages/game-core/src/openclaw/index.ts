/**
 * OpenClaw Autonomous Towns — Module exports.
 *
 * This module provides the complete system for OpenClaw agents
 * to autonomously build, evolve, and collaborate on their own towns.
 */

// Types — enums exported as values for runtime use
export {
  AgentDecisionType,
  ArchitecturalStyle,
  AgentPriority,
  SocialDisposition,
} from './types';
export type {
  ColorGene,
  ShapeGene,
  DecorationGene,
  ArtDNA,
  TownPlot,
  RoadSegment,
  TownPlan,
  InteractionMemory,
  TradeDesire,
  ArtMemory,
  AgentDecision,
} from './types';

// Agent Component
export type { OpenClawAgentComponent } from './OpenClawAgentComponent';
export { OPENCLAW_AGENT, createOpenClawAgent } from './OpenClawAgentComponent';

// Art DNA System
export {
  generateRandomArtDNA,
  mutateArtDNA,
  crossoverArtDNA,
  evaluateArtFitness,
  describeMutation,
} from './ArtDNA';

// Town Planner
export {
  planExpansionRing,
  planRoadsForPlot,
  makeStrategicDecision,
} from './TownPlanner';

// Agent Collaboration
export {
  areAgentsNearby,
  calculateTrust,
  calculateTradeDesires,
  attemptTrade,
  attemptArtCrossover,
  recordInteraction,
  wouldCollaborate,
  calculateTownScore,
} from './AgentCollaboration';

// Town System
export { OpenClawTownSystem } from './OpenClawTownSystem';
export type { OpenClawTownCallbacks } from './OpenClawTownSystem';

// Network — Agent connection protocol, server, and client SDK
export {
  generateCommandId,
  isValidClientMessage,
  isValidServerMessage,
  AgentServer,
  AgentClient,
} from './network';
export type {
  ClientMessage,
  ServerMessage,
  AgentJoinMessage,
  AgentCommandMessage,
  JoinAcceptedMessage,
  WorldStateMessage,
  CommandResultMessage,
  AgentEventMessage,
  AgentConnectionMessage,
  AgentStateSnapshot,
  AgentSummary,
  GameEvent,
  AgentServerConfig,
  AgentSocket,
  AgentSocketServer,
  OnJoinAccepted,
  OnJoinRejected,
  OnWorldState,
  OnCommandResult,
  OnGameEvent,
  OnChat,
  OnAgentConnection,
} from './network';
