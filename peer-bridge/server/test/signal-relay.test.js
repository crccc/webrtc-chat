const WebSocket = require("ws");
const { createSignalingServer } = require("../index");

const ROOM_A = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const ROOM_B = "9f47ac10-b58c-4372-a567-0e02b2c3d470";
const PASSCODE = "secret123";

function openClient(port) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);
    ws.once("open", () => resolve(ws));
    ws.once("error", reject);
  });
}

function waitForMessage(ws, { type, timeoutMs = 1500 } = {}) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for message${type ? `: ${type}` : ""}`));
    }, timeoutMs);

    function cleanup() {
      clearTimeout(timer);
      ws.off("message", onMessage);
      ws.off("error", onError);
    }

    function onError(err) {
      cleanup();
      reject(err);
    }

    function onMessage(data) {
      const msg = JSON.parse(data.toString());
      if (type && msg.type !== type) return;
      cleanup();
      resolve(msg);
    }

    ws.on("message", onMessage);
    ws.on("error", onError);
  });
}

async function joinRoom(ws, { room, username, flow = "join", passcode = PASSCODE }) {
  ws.send(
    JSON.stringify({
      action: "join",
      flow,
      room,
      username,
      passcode,
    }),
  );
  return waitForMessage(ws, { type: "joined" });
}

async function waitForReadyState(ws, readyState, timeoutMs = 1500) {
  const start = Date.now();
  while (ws.readyState !== readyState) {
    if (Date.now() - start > timeoutMs) {
      throw new Error(`Timed out waiting for readyState=${readyState}`);
    }
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe("signal relay offer/answer/ice", () => {
  let server;
  let port;
  let sockets;

  beforeEach(() => {
    sockets = [];
    server = createSignalingServer({ port: 0, enableLog: false });
    port = server.wss.address().port;
  });

  afterEach(async () => {
    for (const ws of sockets) {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    }
    await server.close();
  });

  test("relay offer/answer/ice to target in same room with correct from", async () => {
    const alice = await openClient(port);
    const bob = await openClient(port);
    sockets.push(alice, bob);

    const aliceJoined = await joinRoom(alice, { room: ROOM_A, username: "alice", flow: "create" });
    const bobJoined = await joinRoom(bob, { room: ROOM_A, username: "bob" });

    const actions = [
      { action: "offer", payload: { type: "offer", sdp: "offer-sdp" } },
      { action: "answer", payload: { type: "answer", sdp: "answer-sdp" } },
      { action: "ice", payload: { candidate: "abc", sdpMLineIndex: 0 } },
    ];

    for (const item of actions) {
      alice.send(
        JSON.stringify({
          action: item.action,
          to: bobJoined.peerId,
          payload: item.payload,
        }),
      );

      const relayed = await waitForMessage(bob, { type: item.action });
      expect(relayed).toMatchObject({
        type: item.action,
        from: aliceJoined.peerId,
        payload: item.payload,
      });
    }
  });

  test("sender not in room returns NOT_IN_ROOM", async () => {
    const ws = await openClient(port);
    sockets.push(ws);

    ws.send(
      JSON.stringify({
        action: "offer",
        to: "2f47ac10-b58c-4372-a567-0e02b2c3d471",
        payload: { type: "offer", sdp: "x" },
      }),
    );

    const error = await waitForMessage(ws, { type: "error" });
    expect(error.code).toBe("NOT_IN_ROOM");
  });

  test("missing target or payload returns INVALID_SIGNAL_PAYLOAD", async () => {
    const alice = await openClient(port);
    sockets.push(alice);
    await joinRoom(alice, { room: ROOM_A, username: "alice", flow: "create" });

    alice.send(
      JSON.stringify({
        action: "offer",
        payload: { type: "offer", sdp: "x" },
      }),
    );
    const noTarget = await waitForMessage(alice, { type: "error" });
    expect(noTarget.code).toBe("INVALID_SIGNAL_PAYLOAD");

    alice.send(
      JSON.stringify({
        action: "offer",
        to: "2f47ac10-b58c-4372-a567-0e02b2c3d471",
      }),
    );
    const noPayload = await waitForMessage(alice, { type: "error" });
    expect(noPayload.code).toBe("INVALID_SIGNAL_PAYLOAD");
  });

  test("cross-room target is rejected with deterministic error", async () => {
    const alice = await openClient(port);
    const bob = await openClient(port);
    sockets.push(alice, bob);

    await joinRoom(alice, { room: ROOM_A, username: "alice", flow: "create" });
    const bobJoined = await joinRoom(bob, { room: ROOM_B, username: "bob", flow: "create" });

    alice.send(
      JSON.stringify({
        action: "offer",
        to: bobJoined.peerId,
        payload: { type: "offer", sdp: "x" },
      }),
    );

    const error = await waitForMessage(alice, { type: "error" });
    expect(error.code).toBe("TARGET_NOT_FOUND");
  });

  test("target disconnected before relay returns TARGET_NOT_FOUND", async () => {
    const alice = await openClient(port);
    const bob = await openClient(port);
    sockets.push(alice, bob);

    await joinRoom(alice, { room: ROOM_A, username: "alice", flow: "create" });
    const bobJoined = await joinRoom(bob, { room: ROOM_A, username: "bob" });

    bob.close();
    await waitForReadyState(bob, WebSocket.CLOSED);

    alice.send(
      JSON.stringify({
        action: "ice",
        to: bobJoined.peerId,
        payload: { candidate: "x" },
      }),
    );

    const error = await waitForMessage(alice, { type: "error" });
    expect(error.code).toBe("TARGET_NOT_FOUND");
  });
});
