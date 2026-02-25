/**
 * index.js – Peer Bridge Signaling Server
 *
 * Responsibilities:
 *   - Accept WebSocket connections from Chrome extension clients.
 *   - Maintain a registry of rooms: { roomId → Set<WebSocket> }
 *   - Route messages between peers that share the same room.
 */

const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3000;
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuidV4(value) {
  return typeof value === "string" && UUID_V4_REGEX.test(value);
}

function getJoinValidationError(roomId) {
  if (!isUuidV4(roomId)) {
    return "INVALID_ROOM_ID";
  }
  return null;
}

function createSignalingServer({ port = PORT, enableLog = true } = {}) {
  // Map<roomId: string, Set<WebSocket>>
  const rooms = new Map();
  const wss = new WebSocketServer({ port });

  if (enableLog) {
    console.log(`[peer-bridge] Signaling server listening on ws://localhost:${port}`);
  }

  wss.on("connection", (ws) => {
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

  function handleJoin(ws, roomId) {
    const validationError = getJoinValidationError(roomId);
    if (validationError) {
      send(ws, {
        type: "error",
        code: validationError,
        message: "room id must be a UUIDv4",
      });
      return;
    }

    // Leave any previous room first (reconnect edge-case)
    leaveRoom(ws);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, new Set());
    }

    const room = rooms.get(roomId);
    room.add(ws);
    ws.roomId = roomId;

    if (enableLog) {
      console.log(`[peer-bridge] Client joined room "${roomId}" (${room.size} peer(s))`);
    }

    send(ws, { type: "joined", room: roomId, peers: room.size });
  }

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

  function leaveRoom(ws) {
    const roomId = ws.roomId;
    if (!roomId || !rooms.has(roomId)) return;

    const room = rooms.get(roomId);
    room.delete(ws);

    if (enableLog) {
      console.log(`[peer-bridge] Client left room "${roomId}" (${room.size} peer(s) remaining)`);
    }

    if (room.size === 0) {
      rooms.delete(roomId);
      if (enableLog) {
        console.log(`[peer-bridge] Room "${roomId}" removed (empty).`);
      }
    }

    ws.roomId = null;
  }

  function close() {
    return new Promise((resolve, reject) => {
      wss.close((err) => (err ? reject(err) : resolve()));
    });
  }

  function send(ws, payload) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }

  return { wss, rooms, close };
}

if (require.main === module) {
  createSignalingServer({ port: PORT });
}

module.exports = {
  createSignalingServer,
  getJoinValidationError,
  isUuidV4,
};
