#!/usr/bin/env npx tsx
/**
 * OpenClaw Agent Server — Launcher Script
 *
 * Starts a WebSocket server that accepts agent connections.
 * Agents can connect via WebSocket and autonomously build towns.
 *
 * Usage:
 *   npx tsx packages/game-core/src/openclaw/network/examples/run-server.ts
 *
 * Or with a custom port:
 *   PORT=4000 npx tsx packages/game-core/src/openclaw/network/examples/run-server.ts
 *
 * Prerequisites:
 *   npm install ws
 */

import { WebSocketServer, WebSocket } from 'ws';
import { AgentServer } from '../AgentServer';
import type { AgentSocketServer, AgentSocket } from '../AgentServer';

const PORT = parseInt(process.env.PORT ?? '3001', 10);

// Create the game server
const server = new AgentServer({
  port: PORT,
  maxAgents: 8,
  stateInterval: 1000,
  tickRate: 50,
});

// Create WebSocket server and adapt to AgentSocketServer interface
const wss = new WebSocketServer({ port: PORT });

const socketAdapter: AgentSocketServer = {
  onConnection(handler) {
    wss.on('connection', (ws: WebSocket) => {
      const agentSocket: AgentSocket = {
        send: (data: string) => ws.send(data),
        close: () => ws.close(),
        get readyState() { return ws.readyState; },
      };
      handler(agentSocket);

      // Store the mapping for message/close handlers
      (ws as any).__agentSocket = agentSocket;
    });
  },

  onMessage(socket: AgentSocket, handler) {
    // Find the WS that maps to this socket
    for (const ws of wss.clients) {
      if ((ws as any).__agentSocket === socket) {
        ws.on('message', (data) => handler(data.toString()));
        break;
      }
    }
  },

  onClose(socket: AgentSocket, handler) {
    for (const ws of wss.clients) {
      if ((ws as any).__agentSocket === socket) {
        ws.on('close', handler);
        break;
      }
    }
  },

  onError(socket: AgentSocket, handler) {
    for (const ws of wss.clients) {
      if ((ws as any).__agentSocket === socket) {
        ws.on('error', handler);
        break;
      }
    }
  },

  close() {
    wss.close();
  },
};

// Attach and start
server.attachSocketServer(socketAdapter);

console.log(`
╔══════════════════════════════════════════════════════════════╗
║                 OpenClaw Agent Server                       ║
║                                                             ║
║  WebSocket listening on ws://localhost:${PORT}                ║
║  Waiting for agents to connect...                           ║
║                                                             ║
║  To connect an agent, run:                                  ║
║  npx tsx packages/game-core/src/openclaw/network/            ║
║         examples/example-agent.ts                            ║
║                                                             ║
║  Press Ctrl+C to stop                                       ║
╚══════════════════════════════════════════════════════════════╝
`);

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Server] Shutting down...');
  server.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.stop();
  process.exit(0);
});
