/**
 * index.js – Peer Bridge Signaling Server (Phase 1)
 *
 * Responsibilities:
 *   - Accept WebSocket connections from Chrome extension clients.
 *   - Maintain a registry of rooms: { roomId → Set<WebSocket> }
 *   - Route messages between peers that share the same room.
 *
 * Message protocol (see docs/protocol.md):
 *
 *   CLIENT → SERVER  { type: "join",    room: "<roomId>" }
 *   CLIENT → SERVER  { type: "message", room: "<roomId>", text: "<text>" }
 *   SERVER → CLIENT  { type: "joined",  room: "<roomId>", peers: <number> }
 *   SERVER → CLIENT  { type: "message", from: "<peerId>", text: "<text>" }
 */

const { WebSocketServer } = require("ws");

// ── Config ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

// ── Room registry ─────────────────────────────────────────────────────────────
// Map<roomId: string, Set<WebSocket>>
const rooms = new Map();

// ── Server setup ──────────────────────────────────────────────────────────────
const wss = new WebSocketServer({ port: PORT });
console.log(`[peer-bridge] Signaling server listening on ws://localhost:${PORT}`);

wss.on("connection", (ws) => {
  // Track which room this connection belongs to
  ws.roomId = null;

  ws.on("message", (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      console.warn("[peer-bridge] Non-JSON message received – ignoring.");
      return;
    }

    switch (msg.type) {
      case "join":
        handleJoin(ws, msg.room);
        break;

      case "message":
        handleMessage(ws, msg);
        break;

      default:
        console.warn("[peer-bridge] Unknown message type:", msg.type);
    }
  });

  ws.on("close", () => {
    leaveRoom(ws);
  });
});

// ── Handlers ──────────────────────────────────────────────────────────────────

/** Add a client to a room. */
function handleJoin(ws, roomId) {
  if (!roomId || typeof roomId !== "string") return;

  // Leave any previous room first (reconnect edge-case)
  leaveRoom(ws);

  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }

  const room = rooms.get(roomId);
  room.add(ws);
  ws.roomId = roomId;

  console.log(`[peer-bridge] Client joined room "${roomId}" (${room.size} peer(s))`);

  // Acknowledge the join to the client that just connected
  send(ws, { type: "joined", room: roomId, peers: room.size });
}

/** Broadcast a text message from one peer to all other peers in the room. */
function handleMessage(ws, msg) {
  const roomId = ws.roomId;
  if (!roomId || !rooms.has(roomId)) return;

  const text = msg.text;
  if (typeof text !== "string" || !text.trim()) return;

  const room = rooms.get(roomId);
  const payload = JSON.stringify({ type: "message", from: ws.peerId || "peer", text });

  for (const peer of room) {
    if (peer !== ws && peer.readyState === peer.OPEN) {
      peer.send(payload);
    }
  }
}

/** Remove a client from its current room and clean up empty rooms. */
function leaveRoom(ws) {
  const roomId = ws.roomId;
  if (!roomId || !rooms.has(roomId)) return;

  const room = rooms.get(roomId);
  room.delete(ws);

  console.log(`[peer-bridge] Client left room "${roomId}" (${room.size} peer(s) remaining)`);

  if (room.size === 0) {
    rooms.delete(roomId);
    console.log(`[peer-bridge] Room "${roomId}" removed (empty).`);
  }

  ws.roomId = null;
}

// ── Utility ───────────────────────────────────────────────────────────────────

/** Safely send a JSON payload to a single client. */
function send(ws, payload) {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(payload));
  }
}
