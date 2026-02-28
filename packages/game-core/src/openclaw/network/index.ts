/**
 * OpenClaw Network — Agent connection infrastructure.
 */

// Protocol
export type {
  ClientMessage,
  ServerMessage,
  AgentJoinMessage,
  AgentCommandMessage,
  AgentRequestStateMessage,
  AgentChatMessage,
  AgentLeaveMessage,
  AgentCommand,
  PlaceBuildingCommand,
  EvolveArtCommand,
  SetArtDNACommand,
  TradeOfferCommand,
  SpawnCitizenCommand,
  ExpandTerritoryCommand,
  SetPriorityCommand,
  JoinAcceptedMessage,
  JoinRejectedMessage,
  WorldStateMessage,
  CommandResultMessage,
  AgentEventMessage,
  ChatRelayMessage,
  AgentConnectionMessage,
  AgentStateSnapshot,
  AgentSummary,
  GameEvent,
} from './protocol';
export { generateCommandId, isValidClientMessage, isValidServerMessage } from './protocol';

// Server
export { AgentServer } from './AgentServer';
export type { AgentServerConfig, AgentSocket, AgentSocketServer } from './AgentServer';

// Client SDK
export { AgentClient } from './AgentClient';
export type {
  OnJoinAccepted,
  OnJoinRejected,
  OnWorldState,
  OnCommandResult,
  OnGameEvent,
  OnChat,
  OnAgentConnection,
} from './AgentClient';
