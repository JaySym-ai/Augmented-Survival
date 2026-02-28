/**
 * AgentClient — SDK for OpenClaw agents to connect to a game server.
 *
 * This is the interface your agents use to join the game world,
 * observe state, and send commands. Works with any WebSocket
 * implementation (browser WebSocket or Node.js `ws` library).
 *
 * Example usage (Node.js with `ws`):
 *
 *   import WebSocket from 'ws';
 *   import { AgentClient } from '@augmented-survival/game-core';
 *
 *   const client = new AgentClient();
 *
 *   // Connect
 *   const ws = new WebSocket('ws://localhost:3001');
 *   ws.on('open', () => {
 *     client.attachSocket({
 *       send: (data) => ws.send(data),
 *       close: () => ws.close(),
 *       readyState: ws.readyState,
 *     });
 *
 *     client.join({
 *       name: 'MyAgent',
 *       style: 'Geometric',
 *       priority: 'Economy',
 *       disposition: 'Friendly',
 *     });
 *   });
 *
 *   ws.on('message', (data) => client.handleMessage(data.toString()));
 *
 *   // React to world state
 *   client.onWorldState((state) => {
 *     console.log('My town has', state.agentState.buildingCount, 'buildings');
 *
 *     // Build a house if we can afford it
 *     const unbuilt = state.agentState.townPlan.plots.filter(p => !p.isBuilt);
 *     if (unbuilt.length > 0) {
 *       client.placeBuilding('House', unbuilt[0].x, unbuilt[0].z);
 *     }
 *   });
 *
 *   // React to events
 *   client.onEvent((event) => {
 *     console.log('Event:', event);
 *   });
 */

import type {
  ClientMessage,
  ServerMessage,
  AgentJoinMessage,
  JoinAcceptedMessage,
  WorldStateMessage,
  CommandResultMessage,
  AgentEventMessage,
  ChatRelayMessage,
  AgentConnectionMessage,
  AgentStateSnapshot,
  AgentSummary,
  GameEvent,
} from './protocol';
import { generateCommandId } from './protocol';
import type { AgentSocket } from './AgentServer';
import type { ArtDNA, ArchitecturalStyle, AgentPriority, SocialDisposition } from '../types';
import type { BuildingType } from '../../types/buildings';
import type { ResourceType } from '../../types/resources';

/** Callback types for agent events */
export type OnJoinAccepted = (msg: JoinAcceptedMessage) => void;
export type OnJoinRejected = (reason: string) => void;
export type OnWorldState = (state: WorldStateMessage) => void;
export type OnCommandResult = (result: CommandResultMessage) => void;
export type OnGameEvent = (event: GameEvent) => void;
export type OnChat = (fromName: string, message: string) => void;
export type OnAgentConnection = (msg: AgentConnectionMessage) => void;

/**
 * AgentClient — Connect to an OpenClaw game server and play.
 */
export class AgentClient {
  private socket: AgentSocket | null = null;
  private agentEntityId: number | null = null;
  private agentName = '';
  private isJoined = false;
  private lastWorldState: WorldStateMessage | null = null;

  // Callback registrations
  private joinAcceptedHandlers: OnJoinAccepted[] = [];
  private joinRejectedHandlers: OnJoinRejected[] = [];
  private worldStateHandlers: OnWorldState[] = [];
  private commandResultHandlers: Map<string, OnCommandResult> = new Map();
  private eventHandlers: OnGameEvent[] = [];
  private chatHandlers: OnChat[] = [];
  private connectionHandlers: OnAgentConnection[] = [];

  /**
   * Attach a WebSocket connection.
   * Call this after the socket is open.
   */
  attachSocket(socket: AgentSocket): void {
    this.socket = socket;
  }

  /**
   * Process an incoming message from the server.
   * Call this from your WebSocket's message handler.
   */
  handleMessage(rawData: string): void {
    let msg: ServerMessage;
    try {
      msg = JSON.parse(rawData) as ServerMessage;
    } catch {
      return;
    }

    switch (msg.type) {
      case 'server:join_accepted':
        this.agentEntityId = msg.agentEntityId;
        this.isJoined = true;
        for (const handler of this.joinAcceptedHandlers) handler(msg);
        break;

      case 'server:join_rejected':
        for (const handler of this.joinRejectedHandlers) handler(msg.reason);
        break;

      case 'server:world_state':
        this.lastWorldState = msg;
        for (const handler of this.worldStateHandlers) handler(msg);
        break;

      case 'server:command_result': {
        const handler = this.commandResultHandlers.get(msg.commandId);
        if (handler) {
          handler(msg);
          this.commandResultHandlers.delete(msg.commandId);
        }
        break;
      }

      case 'server:event':
        for (const handler of this.eventHandlers) handler(msg.event);
        break;

      case 'server:chat':
        for (const handler of this.chatHandlers) handler(msg.fromAgentName, msg.message);
        break;

      case 'server:agent_connection':
        for (const handler of this.connectionHandlers) handler(msg);
        break;
    }
  }

  // ─── Join / Leave ──────────────────────────────────────────────

  /**
   * Send a join request to the server.
   */
  join(options: {
    name: string;
    style?: ArchitecturalStyle | 'random';
    priority?: AgentPriority | 'random';
    disposition?: SocialDisposition | 'random';
    seed?: number;
    artDNA?: ArtDNA;
  }): void {
    const msg: AgentJoinMessage = {
      type: 'agent:join',
      name: options.name,
      style: options.style ?? 'random',
      priority: options.priority ?? 'random',
      disposition: options.disposition ?? 'random',
      seed: options.seed,
      artDNA: options.artDNA,
    };
    this.agentName = options.name;
    this.send(msg);
  }

  /**
   * Gracefully disconnect from the server.
   */
  leave(): void {
    this.send({ type: 'agent:leave' });
    this.isJoined = false;
  }

  // ─── Commands ──────────────────────────────────────────────────

  /**
   * Place a building at a specific location.
   * Returns a promise that resolves with the command result.
   */
  placeBuilding(
    buildingType: BuildingType | string,
    x: number,
    z: number,
  ): Promise<CommandResultMessage> {
    return this.sendCommand({
      action: 'place_building',
      buildingType: buildingType as BuildingType,
      x,
      z,
    });
  }

  /**
   * Evolve the agent's art DNA through mutation.
   * @param intensity - How dramatic the mutation is (0-1, default 0.5)
   */
  evolveArt(intensity = 0.5): Promise<CommandResultMessage> {
    return this.sendCommand({
      action: 'evolve_art',
      intensity,
    });
  }

  /**
   * Set the agent's art DNA to a specific value.
   * Use this for full creative control over the town's visual style.
   */
  setArtDNA(artDNA: ArtDNA): Promise<CommandResultMessage> {
    return this.sendCommand({
      action: 'set_art_dna',
      artDNA,
    });
  }

  /**
   * Spawn a new citizen in the agent's town.
   */
  spawnCitizen(x?: number, z?: number): Promise<CommandResultMessage> {
    return this.sendCommand({
      action: 'spawn_citizen',
      x,
      z,
    });
  }

  /**
   * Expand the town's territory to the next ring.
   */
  expandTerritory(): Promise<CommandResultMessage> {
    return this.sendCommand({ action: 'expand_territory' });
  }

  /**
   * Change the agent's decision-making priority.
   */
  setPriority(priority: AgentPriority | string): Promise<CommandResultMessage> {
    return this.sendCommand({
      action: 'set_priority',
      priority: priority as AgentPriority,
    });
  }

  /**
   * Request the current world state from the server.
   */
  requestState(): void {
    this.send({ type: 'agent:request_state' });
  }

  /**
   * Send a chat message to another agent or broadcast to all.
   */
  chat(message: string, targetAgentId?: number): void {
    this.send({
      type: 'agent:chat',
      targetAgentId: targetAgentId ?? null,
      message,
    });
  }

  // ─── Event Handlers ────────────────────────────────────────────

  /** Called when join is accepted */
  onJoinAccepted(handler: OnJoinAccepted): void {
    this.joinAcceptedHandlers.push(handler);
  }

  /** Called when join is rejected */
  onJoinRejected(handler: OnJoinRejected): void {
    this.joinRejectedHandlers.push(handler);
  }

  /** Called when world state is received (periodic) */
  onWorldState(handler: OnWorldState): void {
    this.worldStateHandlers.push(handler);
  }

  /** Called when game events occur */
  onEvent(handler: OnGameEvent): void {
    this.eventHandlers.push(handler);
  }

  /** Called when chat messages are received */
  onChat(handler: OnChat): void {
    this.chatHandlers.push(handler);
  }

  /** Called when another agent connects or disconnects */
  onAgentConnection(handler: OnAgentConnection): void {
    this.connectionHandlers.push(handler);
  }

  // ─── State Accessors ──────────────────────────────────────────

  /** Whether this client has successfully joined */
  getIsJoined(): boolean {
    return this.isJoined;
  }

  /** This agent's entity ID (assigned by server) */
  getAgentEntityId(): number | null {
    return this.agentEntityId;
  }

  /** This agent's name */
  getAgentName(): string {
    return this.agentName;
  }

  /** Last received world state */
  getLastWorldState(): WorldStateMessage | null {
    return this.lastWorldState;
  }

  /** Convenience: get own agent state from last world update */
  getMyState(): AgentStateSnapshot | null {
    return this.lastWorldState?.agentState ?? null;
  }

  /** Convenience: get list of other agents */
  getOtherAgents(): AgentSummary[] {
    return this.lastWorldState?.otherAgents ?? [];
  }

  /** Convenience: get current resource levels */
  getResources(): Partial<Record<ResourceType, number>> {
    return this.lastWorldState?.resources ?? {};
  }

  // ─── Internal ──────────────────────────────────────────────────

  private send(msg: ClientMessage): void {
    if (!this.socket || this.socket.readyState !== 1) {
      throw new Error('Not connected to server');
    }
    this.socket.send(JSON.stringify(msg));
  }

  private sendCommand(command: Record<string, unknown>): Promise<CommandResultMessage> {
    const commandId = generateCommandId();
    return new Promise((resolve) => {
      this.commandResultHandlers.set(commandId, resolve);

      this.send({
        type: 'agent:command',
        commandId,
        command: command as never,
      });

      // Timeout after 10 seconds
      setTimeout(() => {
        if (this.commandResultHandlers.has(commandId)) {
          this.commandResultHandlers.delete(commandId);
          resolve({
            type: 'server:command_result',
            commandId,
            success: false,
            message: 'Command timed out',
          });
        }
      }, 10000);
    });
  }
}
