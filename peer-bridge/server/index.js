/**
 * index.js – Peer Bridge Signaling Server
 *
 * Responsibilities:
 *   - Accept WebSocket connections from Chrome extension clients.
 *   - Maintain a registry of rooms.
 *   - Route messages between peers that share the same room.
 */

const { WebSocketServer } = require("ws");
const { randomUUID } = require("crypto");

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
  ROOM_CLOSED: "owner closed the room",
  UNSUPPORTED_ACTION: "unsupported action",
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
  // Map<roomId: string, { passcode: string, peers: Set<WebSocket>, usernames: Set<string>, owner: WebSocket, peersById: Map<string, WebSocket> }>
  const rooms = new Map();
  const wss = new WebSocketServer({ port });

  if (enableLog) {
    console.log(`[peer-bridge] Signaling server listening on ws://localhost:${port}`);
  }

  wss.on("connection", (ws) => {
    ws.roomId = null;
    ws.username = null;
    ws.peerId = null;
    ws.isOwner = false;

    ws.on("message", (raw) => {
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch {
        console.warn("[peer-bridge] Non-JSON message received – ignoring.");
        return;
      }

      const action = typeof msg?.action === "string" ? msg.action : msg?.type;
      switch (action) {
        case "join":
          handleJoin(ws, msg);
          break;
        case "offer":
        case "answer":
        case "ice":
          // Placeholder handlers; relay behavior is implemented in Task 02.
          break;
        default:
          send(ws, {
            type: "error",
            code: "UNSUPPORTED_ACTION",
            message: ERROR_MESSAGES.UNSUPPORTED_ACTION,
          });
          if (enableLog) {
            console.warn("[peer-bridge] Unsupported action:", action);
          }
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
        owner: ws,
        peersById: new Map(),
      };
      rooms.set(payload.roomId, targetRoom);
    }

    const peerId = generatePeerId(targetRoom);
    targetRoom.peers.add(ws);
    targetRoom.usernames.add(payload.username);
    targetRoom.peersById.set(peerId, ws);
    ws.roomId = payload.roomId;
    ws.username = payload.username;
    ws.peerId = peerId;
    ws.isOwner = targetRoom.owner === ws;

    if (enableLog) {
      console.log(
        `[peer-bridge] ${payload.username} joined room "${payload.roomId}" (${targetRoom.peers.size}/${MAX_ROOM_CAPACITY})`,
      );
    }

    send(ws, {
      type: "joined",
      room: payload.roomId,
      peerId,
      peerList: Array.from(targetRoom.peersById.keys()).filter((id) => id !== peerId),
      peers: targetRoom.peers.size,
      capacity: MAX_ROOM_CAPACITY,
      username: payload.username,
    });

    broadcastPresence(targetRoom);
  }

  function leaveRoom(ws) {
    const roomId = ws.roomId;
    if (!roomId || !rooms.has(roomId)) return;

    const room = rooms.get(roomId);

    if (room.owner === ws) {
      // Owner leaving closes the room and kicks all participants.
      for (const peer of room.peers) {
        if (peer === ws) continue;
        send(peer, {
          type: "error",
          code: "ROOM_CLOSED",
          message: ERROR_MESSAGES.ROOM_CLOSED,
        });
        room.peers.delete(peer);
        if (peer.username) {
          room.usernames.delete(peer.username);
        }
        if (peer.peerId) {
          room.peersById.delete(peer.peerId);
        }
        peer.roomId = null;
        peer.username = null;
        peer.peerId = null;
        peer.isOwner = false;
        peer.close(4001, "ROOM_CLOSED");
      }

      room.peers.delete(ws);
      if (ws.username) {
        room.usernames.delete(ws.username);
      }
      if (ws.peerId) {
        room.peersById.delete(ws.peerId);
      }
      rooms.delete(roomId);

      if (enableLog) {
        console.log(`[peer-bridge] Owner closed room "${roomId}".`);
      }

      ws.roomId = null;
      ws.username = null;
      ws.peerId = null;
      ws.isOwner = false;
      return;
    }

    room.peers.delete(ws);

    if (ws.username) {
      room.usernames.delete(ws.username);
    }
    if (ws.peerId) {
      room.peersById.delete(ws.peerId);
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
    ws.peerId = null;
    ws.isOwner = false;
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

  function generatePeerId(room) {
    let peerId = randomUUID();
    while (room.peersById.has(peerId)) {
      peerId = randomUUID();
    }
    return peerId;
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
