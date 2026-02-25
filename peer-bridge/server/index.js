/**
 * index.js – Peer Bridge Signaling Server
 *
 * Responsibilities:
 *   - Accept WebSocket connections from Chrome extension clients.
 *   - Maintain a registry of rooms.
 *   - Route messages between peers that share the same room.
 */

const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3000;
const MAX_ROOM_CAPACITY = 10;
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const ERROR_MESSAGES = {
  INVALID_ROOM_ID: "room id must be a UUIDv4",
  INVALID_USERNAME: "username is required",
  INVALID_PASSCODE_FORMAT: "passcode must be 6-32 characters",
  ROOM_NOT_FOUND: "room does not exist",
  INVALID_PASSCODE: "incorrect passcode",
  DUPLICATE_USERNAME: "username already taken in this room",
  ROOM_FULL: "room is full (10/10)",
};

function isUuidV4(value) {
  return typeof value === "string" && UUID_V4_REGEX.test(value);
}

function isValidUsername(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidPasscode(value) {
  return typeof value === "string" && value.length >= 6 && value.length <= 32;
}

function normalizeJoinPayload(msg) {
  return {
    flow: msg?.flow === "create" ? "create" : "join",
    roomId: typeof msg?.room === "string" ? msg.room.trim() : "",
    username: typeof msg?.username === "string" ? msg.username.trim() : "",
    passcode: typeof msg?.passcode === "string" ? msg.passcode.trim() : "",
  };
}

function getJoinValidationError(payload, room) {
  if (!isUuidV4(payload.roomId)) return "INVALID_ROOM_ID";
  if (!isValidUsername(payload.username)) return "INVALID_USERNAME";
  if (!isValidPasscode(payload.passcode)) return "INVALID_PASSCODE_FORMAT";

  if (!room) {
    if (payload.flow !== "create") return "ROOM_NOT_FOUND";
    return null;
  }

  if (room.passcode !== payload.passcode) return "INVALID_PASSCODE";
  if (room.usernames.has(payload.username)) return "DUPLICATE_USERNAME";
  if (room.peers.size >= MAX_ROOM_CAPACITY) return "ROOM_FULL";
  return null;
}

function createSignalingServer({ port = PORT, enableLog = true } = {}) {
  // Map<roomId: string, { passcode: string, peers: Set<WebSocket>, usernames: Set<string> }>
  const rooms = new Map();
  const wss = new WebSocketServer({ port });

  if (enableLog) {
    console.log(`[peer-bridge] Signaling server listening on ws://localhost:${port}`);
  }

  wss.on("connection", (ws) => {
    ws.roomId = null;
    ws.username = null;

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
          handleJoin(ws, msg);
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

  function handleJoin(ws, msg) {
    const payload = normalizeJoinPayload(msg);

    // Leave any previous room first (reconnect edge-case)
    leaveRoom(ws);

    const room = rooms.get(payload.roomId);
    const validationError = getJoinValidationError(payload, room);
    if (validationError) {
      send(ws, {
        type: "error",
        code: validationError,
        message: ERROR_MESSAGES[validationError],
      });
      return;
    }

    let targetRoom = room;
    if (!targetRoom) {
      targetRoom = {
        passcode: payload.passcode,
        peers: new Set(),
        usernames: new Set(),
      };
      rooms.set(payload.roomId, targetRoom);
    }

    targetRoom.peers.add(ws);
    targetRoom.usernames.add(payload.username);
    ws.roomId = payload.roomId;
    ws.username = payload.username;

    if (enableLog) {
      console.log(
        `[peer-bridge] ${payload.username} joined room "${payload.roomId}" (${targetRoom.peers.size}/${MAX_ROOM_CAPACITY})`,
      );
    }

    send(ws, {
      type: "joined",
      room: payload.roomId,
      peers: targetRoom.peers.size,
      capacity: MAX_ROOM_CAPACITY,
      username: payload.username,
    });

    broadcastPresence(targetRoom);
  }

  function handleMessage(ws, msg) {
    const roomId = ws.roomId;
    if (!roomId || !rooms.has(roomId)) return;

    const text = msg.text;
    if (typeof text !== "string" || !text.trim()) return;

    const room = rooms.get(roomId);
    const payload = JSON.stringify({
      type: "message",
      from: ws.username || ws.peerId || "peer",
      text,
    });

    for (const peer of room.peers) {
      if (peer !== ws && peer.readyState === peer.OPEN) {
        peer.send(payload);
      }
    }
  }

  function leaveRoom(ws) {
    const roomId = ws.roomId;
    if (!roomId || !rooms.has(roomId)) return;

    const room = rooms.get(roomId);
    room.peers.delete(ws);

    if (ws.username) {
      room.usernames.delete(ws.username);
    }

    if (enableLog) {
      console.log(
        `[peer-bridge] ${ws.username || "client"} left room "${roomId}" (${room.peers.size} peer(s) remaining)`,
      );
    }

    if (room.peers.size === 0) {
      rooms.delete(roomId);
      if (enableLog) {
        console.log(`[peer-bridge] Room "${roomId}" removed (empty).`);
      }
    } else {
      broadcastPresence(room);
    }

    ws.roomId = null;
    ws.username = null;
  }

  function broadcastPresence(room) {
    const payload = {
      type: "presence",
      peers: room.peers.size,
      capacity: MAX_ROOM_CAPACITY,
    };

    for (const peer of room.peers) {
      send(peer, payload);
    }
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
  MAX_ROOM_CAPACITY,
  ERROR_MESSAGES,
  createSignalingServer,
  getJoinValidationError,
  isUuidV4,
  isValidPasscode,
  isValidUsername,
  normalizeJoinPayload,
};
