const WebSocket = require("ws");
const { createSignalingServer } = require("../index");

const ROOM_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
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

async function joinRoom(ws, { room = ROOM_ID, username, flow = "join", passcode = PASSCODE }) {
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

async function waitForCondition(check, { timeoutMs = 1500 } = {}) {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error("Timed out waiting for condition");
    }
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe("room lifecycle owner leave", () => {
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

  test("owner leaves and remaining participant can continue signaling", async () => {
    const owner = await openClient(port);
    const alice = await openClient(port);
    const bob = await openClient(port);
    sockets.push(owner, alice, bob);

    const ownerJoined = await joinRoom(owner, { username: "owner", flow: "create" });
    await joinRoom(alice, { username: "alice" });

    owner.close();

    const leftEvent = await waitForMessage(alice, { type: "signal.left" });
    expect(leftEvent.peerId).toBe(ownerJoined.peerId);

    const bobJoined = await joinRoom(bob, { username: "bob" });
    alice.send(
      JSON.stringify({
        action: "offer",
        to: bobJoined.peerId,
        payload: { type: "offer", sdp: "offer-sdp" },
      }),
    );

    const offer = await waitForMessage(bob, { type: "offer" });
    expect(offer.payload).toEqual({ type: "offer", sdp: "offer-sdp" });
  });

  test("repeated leave path is idempotent", async () => {
    const owner = await openClient(port);
    sockets.push(owner);
    await joinRoom(owner, { username: "owner", flow: "create" });

    owner.close();
    owner.close();

    await waitForCondition(() => owner.readyState === WebSocket.CLOSED);
    await waitForCondition(() => !server.rooms.has(ROOM_ID));
  });

  test("near-simultaneous disconnects clean up room once empty", async () => {
    const owner = await openClient(port);
    const alice = await openClient(port);
    sockets.push(owner, alice);

    await joinRoom(owner, { username: "owner", flow: "create" });
    await joinRoom(alice, { username: "alice" });

    owner.close();
    alice.close();

    await waitForCondition(() => !server.rooms.has(ROOM_ID));
  });
});
