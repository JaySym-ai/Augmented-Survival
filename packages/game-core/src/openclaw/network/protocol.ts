/**
 * OpenClaw Agent Connection Protocol
 *
 * Defines the JSON message format exchanged between the game server
 * and connected agents over WebSocket.
 *
 * Flow:
 * 1. Agent connects via WebSocket
 * 2. Agent sends AgentJoin with its identity
 * 3. Server responds with JoinAccepted (assigns town location, entity ID)
 * 4. Server broadcasts WorldState at regular intervals
 * 5. Agent sends AgentCommand messages to build, evolve, trade
 * 6. Server processes commands and sends AgentEvent notifications
 */

import type { ArtDNA, ArchitecturalStyle, AgentPriority, SocialDisposition, TownPlan } from '../types';
import type { ResourceType } from '../../types/resources';
import type { BuildingType } from '../../types/buildings';

// ─── Client → Server Messages ────────────────────────────────────────

/** Agent requests to join the game */
export interface AgentJoinMessage {
  type: 'agent:join';
  /** Display name for this agent */
  name: string;
  /** Preferred architectural style (or 'random') */
  style: ArchitecturalStyle | 'random';
  /** Decision-making priority (or 'random') */
  priority: AgentPriority | 'random';
  /** Social behavior (or 'random') */
  disposition: SocialDisposition | 'random';
  /** Optional custom art DNA seed (server assigns one if omitted) */
  seed?: number;
  /** Optional initial art DNA (server generates if omitted) */
  artDNA?: ArtDNA;
}

/** Agent sends a command to affect the game world */
export interface AgentCommandMessage {
  type: 'agent:command';
  /** Unique command ID for tracking responses */
  commandId: string;
  /** The command to execute */
  command: AgentCommand;
}

/** Agent requests current world state */
export interface AgentRequestStateMessage {
  type: 'agent:request_state';
}

/** Agent sends a chat/message to another agent */
export interface AgentChatMessage {
  type: 'agent:chat';
  /** Target agent ID (null = broadcast to all) */
  targetAgentId: number | null;
  message: string;
}

/** Agent disconnects gracefully */
export interface AgentLeaveMessage {
  type: 'agent:leave';
}

/** All possible client-to-server messages */
export type ClientMessage =
  | AgentJoinMessage
  | AgentCommandMessage
  | AgentRequestStateMessage
  | AgentChatMessage
  | AgentLeaveMessage;

// ─── Agent Commands ──────────────────────────────────────────────────

export type AgentCommand =
  | PlaceBuildingCommand
  | EvolveArtCommand
  | SetArtDNACommand
  | TradeOfferCommand
  | SpawnCitizenCommand
  | ExpandTerritoryCommand
  | SetPriorityCommand;

export interface PlaceBuildingCommand {
  action: 'place_building';
  buildingType: BuildingType;
  x: number;
  z: number;
}

export interface EvolveArtCommand {
  action: 'evolve_art';
  /** Mutation intensity 0-1 (higher = more dramatic changes) */
  intensity?: number;
}

export interface SetArtDNACommand {
  action: 'set_art_dna';
  /** Replace current art DNA entirely */
  artDNA: ArtDNA;
}

export interface TradeOfferCommand {
  action: 'trade_offer';
  /** Target agent entity ID */
  targetAgentId: number;
  /** What we're offering */
  offering: Partial<Record<ResourceType, number>>;
  /** What we want in return */
  requesting: Partial<Record<ResourceType, number>>;
}

export interface SpawnCitizenCommand {
  action: 'spawn_citizen';
  /** Optional preferred position */
  x?: number;
  z?: number;
}

export interface ExpandTerritoryCommand {
  action: 'expand_territory';
}

export interface SetPriorityCommand {
  action: 'set_priority';
  priority: AgentPriority;
}

// ─── Server → Client Messages ────────────────────────────────────────

/** Server accepts agent join request */
export interface JoinAcceptedMessage {
  type: 'server:join_accepted';
  /** Assigned entity ID for this agent */
  agentEntityId: number;
  /** Assigned town center position */
  townCenter: { x: number; z: number };
  /** Assigned seed */
  seed: number;
  /** Generated or echoed art DNA */
  artDNA: ArtDNA;
  /** Current connected agent count */
  connectedAgents: number;
}

/** Server rejects agent join */
export interface JoinRejectedMessage {
  type: 'server:join_rejected';
  reason: string;
}

/** Server sends periodic world state snapshot */
export interface WorldStateMessage {
  type: 'server:world_state';
  /** Game time in seconds */
  gameTime: number;
  /** This agent's current state */
  agentState: AgentStateSnapshot;
  /** Other agents visible to this agent */
  otherAgents: AgentSummary[];
  /** Global resource pool */
  resources: Partial<Record<ResourceType, number>>;
}

/** Server confirms a command was executed */
export interface CommandResultMessage {
  type: 'server:command_result';
  /** Echo of the command ID */
  commandId: string;
  /** Whether the command succeeded */
  success: boolean;
  /** Result details or error message */
  message: string;
  /** Data returned by the command (e.g., new building entity ID) */
  data?: Record<string, unknown>;
}

/** Server notifies about game events relevant to this agent */
export interface AgentEventMessage {
  type: 'server:event';
  event: GameEvent;
}

/** Chat message relayed from another agent */
export interface ChatRelayMessage {
  type: 'server:chat';
  fromAgentId: number;
  fromAgentName: string;
  message: string;
}

/** Server notifies that another agent connected or disconnected */
export interface AgentConnectionMessage {
  type: 'server:agent_connection';
  agentEntityId: number;
  agentName: string;
  action: 'connected' | 'disconnected';
  connectedAgents: number;
}

/** All possible server-to-client messages */
export type ServerMessage =
  | JoinAcceptedMessage
  | JoinRejectedMessage
  | WorldStateMessage
  | CommandResultMessage
  | AgentEventMessage
  | ChatRelayMessage
  | AgentConnectionMessage;

// ─── Shared Data Snapshots ──────────────────────────────────────────

/** Full state snapshot of an agent (sent to the owning agent) */
export interface AgentStateSnapshot {
  name: string;
  entityId: number;
  style: string;
  priority: string;
  disposition: string;
  artDNA: ArtDNA;
  townPlan: TownPlan;
  citizenCount: number;
  buildingCount: number;
  totalBuildingsBuilt: number;
  satisfaction: number;
  townScore: number;
}

/** Summary of another agent (limited info) */
export interface AgentSummary {
  entityId: number;
  name: string;
  style: string;
  townCenter: { x: number; z: number };
  buildingCount: number;
  citizenCount: number;
  artGeneration: number;
  disposition: string;
}

/** Game events that agents care about */
export type GameEvent =
  | { event: 'building_placed'; buildingId: number; buildingType: string; x: number; z: number }
  | { event: 'building_completed'; buildingId: number; buildingType: string }
  | { event: 'art_evolved'; generation: number; fitnessScore: number }
  | { event: 'trade_completed'; partnerName: string; description: string }
  | { event: 'citizen_spawned'; citizenId: number }
  | { event: 'territory_expanded'; ring: number; newPlots: number }
  | { event: 'agent_nearby'; agentName: string; agentEntityId: number; distance: number };

// ─── Utilities ──────────────────────────────────────────────────────

/** Generate a unique command ID */
export function generateCommandId(): string {
  return `cmd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Validate a client message has the required fields */
export function isValidClientMessage(msg: unknown): msg is ClientMessage {
  if (typeof msg !== 'object' || msg === null) return false;
  const m = msg as Record<string, unknown>;
  if (typeof m.type !== 'string') return false;
  return m.type.startsWith('agent:');
}

/** Validate a server message has the required fields */
export function isValidServerMessage(msg: unknown): msg is ServerMessage {
  if (typeof msg !== 'object' || msg === null) return false;
  const m = msg as Record<string, unknown>;
  if (typeof m.type !== 'string') return false;
  return m.type.startsWith('server:');
}
