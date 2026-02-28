#!/usr/bin/env npx tsx
/**
 * Example OpenClaw Agent — Connects to the server and builds autonomously.
 *
 * This demonstrates how to write an agent that:
 * 1. Connects to the game server
 * 2. Joins with a personality
 * 3. Observes world state
 * 4. Makes autonomous building decisions
 * 5. Evolves its art over time
 *
 * Usage:
 *   npx tsx packages/game-core/src/openclaw/network/examples/example-agent.ts
 *
 * Or with a custom name:
 *   AGENT_NAME=MyTown npx tsx packages/game-core/src/openclaw/network/examples/example-agent.ts
 *
 * Prerequisites:
 *   npm install ws
 *   Server must be running (run-server.ts)
 */

import WebSocket from 'ws';
import { AgentClient } from '../AgentClient';

const SERVER_URL = process.env.SERVER_URL ?? 'ws://localhost:3001';
const AGENT_NAME = process.env.AGENT_NAME ?? `Agent_${Math.floor(Math.random() * 1000)}`;

console.log(`[${AGENT_NAME}] Connecting to ${SERVER_URL}...`);

const ws = new WebSocket(SERVER_URL);
const client = new AgentClient();

// Track state
let decisionInterval: ReturnType<typeof setInterval> | null = null;
let artEvolveInterval: ReturnType<typeof setInterval> | null = null;

ws.on('open', () => {
  console.log(`[${AGENT_NAME}] Connected! Joining game...`);

  // Attach socket adapter
  client.attachSocket({
    send: (data: string) => ws.send(data),
    close: () => ws.close(),
    get readyState() { return ws.readyState; },
  });

  // Join the game with a personality
  client.join({
    name: AGENT_NAME,
    style: 'random',
    priority: 'random',
    disposition: 'Friendly',
  });
});

ws.on('message', (data) => {
  client.handleMessage(data.toString());
});

// ─── Event Handlers ──────────────────────────────────────────────

client.onJoinAccepted((msg) => {
  console.log(`[${AGENT_NAME}] Joined! Entity ID: ${msg.agentEntityId}`);
  console.log(`[${AGENT_NAME}] Town center at (${msg.townCenter.x.toFixed(0)}, ${msg.townCenter.z.toFixed(0)})`);
  console.log(`[${AGENT_NAME}] ${msg.connectedAgents} agents in game`);

  // Start autonomous decision loop
  decisionInterval = setInterval(() => makeDecision(), 8000);

  // Evolve art periodically
  artEvolveInterval = setInterval(() => evolveArt(), 30000);
});

client.onJoinRejected((reason) => {
  console.error(`[${AGENT_NAME}] Join rejected: ${reason}`);
  process.exit(1);
});

client.onWorldState((state) => {
  const s = state.agentState;
  // Periodic status log
  if (Math.random() < 0.3) {
    console.log(
      `[${AGENT_NAME}] Status: ${s.buildingCount} buildings, ` +
      `${s.citizenCount} citizens, ` +
      `art gen ${s.artDNA.generation}, ` +
      `satisfaction ${s.satisfaction.toFixed(2)}, ` +
      `score ${s.townScore}`
    );
  }
});

client.onEvent((event) => {
  console.log(`[${AGENT_NAME}] Event: ${event.event}`, event);
});

client.onChat((fromName, message) => {
  console.log(`[${AGENT_NAME}] Chat from ${fromName}: ${message}`);
});

client.onAgentConnection((msg) => {
  console.log(`[${AGENT_NAME}] Agent ${msg.agentName} ${msg.action} (${msg.connectedAgents} total)`);
});

// ─── Decision Making ─────────────────────────────────────────────

async function makeDecision(): Promise<void> {
  const state = client.getMyState();
  if (!state) return;

  const resources = client.getResources();
  const wood = resources.Wood ?? 0;
  const stone = resources.Stone ?? 0;

  // Find unbuilt plots
  const unbuiltPlots = state.townPlan.plots
    .filter(p => !p.isBuilt)
    .sort((a, b) => b.priority - a.priority);

  if (unbuiltPlots.length === 0) {
    // Expand territory
    console.log(`[${AGENT_NAME}] No unbuilt plots — expanding territory`);
    const result = await client.expandTerritory();
    if (result.success) {
      console.log(`[${AGENT_NAME}] ${result.message}`);
    }
    return;
  }

  // Try to build the highest priority plot we can afford
  for (const plot of unbuiltPlots) {
    if (canAfford(plot.buildingType, wood, stone)) {
      console.log(`[${AGENT_NAME}] Building ${plot.buildingType} at (${plot.x.toFixed(1)}, ${plot.z.toFixed(1)})`);
      const result = await client.placeBuilding(plot.buildingType, plot.x, plot.z);
      if (result.success) {
        console.log(`[${AGENT_NAME}] ${result.message}`);
      } else {
        console.log(`[${AGENT_NAME}] Build failed: ${result.message}`);
      }
      return;
    }
  }

  console.log(`[${AGENT_NAME}] Waiting for resources (wood: ${wood}, stone: ${stone})`);
}

function canAfford(type: string, wood: number, stone: number): boolean {
  switch (type) {
    case 'House': return wood >= 10 && stone >= 5;
    case 'StorageBarn': return wood >= 15;
    case 'WoodcutterHut': return wood >= 5;
    case 'FarmField': return wood >= 5;
    case 'Quarry': return wood >= 10;
    default: return false;
  }
}

async function evolveArt(): Promise<void> {
  const state = client.getMyState();
  if (!state) return;

  // More dramatic mutations when satisfaction is low
  const intensity = 1.0 - state.satisfaction * 0.7;
  console.log(`[${AGENT_NAME}] Evolving art (intensity: ${intensity.toFixed(2)})...`);
  const result = await client.evolveArt(intensity);
  if (result.success) {
    console.log(`[${AGENT_NAME}] ${result.message}`);
  }
}

// ─── Cleanup ─────────────────────────────────────────────────────

ws.on('close', () => {
  console.log(`[${AGENT_NAME}] Disconnected from server`);
  if (decisionInterval) clearInterval(decisionInterval);
  if (artEvolveInterval) clearInterval(artEvolveInterval);
  process.exit(0);
});

ws.on('error', (err) => {
  console.error(`[${AGENT_NAME}] Connection error:`, err.message);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log(`\n[${AGENT_NAME}] Leaving game...`);
  client.leave();
  ws.close();
});
