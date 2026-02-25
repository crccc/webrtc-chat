const WebSocket = require("ws");
const { createSignalingServer, isUuidV4 } = require("../index");

const VALID_ROOM_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
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

describe("dispatcher and peerId", () => {
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

  test("join success returns peerId and initial peer list", async () => {
    const owner = await openClient(port);
    sockets.push(owner);

    owner.send(
      JSON.stringify({
        type: "join",
        flow: "create",
        room: VALID_ROOM_ID,
        username: "owner",
        passcode: PASSCODE,
      }),
    );

    const ownerJoined = await waitForMessage(owner, { type: "joined" });
    expect(isUuidV4(ownerJoined.peerId)).toBe(true);
    expect(ownerJoined.peerList).toEqual([]);
    expect(ownerJoined.peers).toBe(1);

    const alice = await openClient(port);
    sockets.push(alice);
    alice.send(
      JSON.stringify({
        action: "join",
        flow: "join",
        room: VALID_ROOM_ID,
        username: "alice",
        passcode: PASSCODE,
      }),
    );

    const aliceJoined = await waitForMessage(alice, { type: "joined" });
    expect(isUuidV4(aliceJoined.peerId)).toBe(true);
    expect(aliceJoined.peerId).not.toBe(ownerJoined.peerId);
    expect(aliceJoined.peerList).toEqual([ownerJoined.peerId]);
    expect(aliceJoined.peers).toBe(2);
  });

  test("unsupported action returns UNSUPPORTED_ACTION error", async () => {
    const ws = await openClient(port);
    sockets.push(ws);

    ws.send(JSON.stringify({ action: "ping" }));

    const error = await waitForMessage(ws, { type: "error" });
    expect(error).toMatchObject({
      type: "error",
      code: "UNSUPPORTED_ACTION",
    });
  });

  test("non-JSON input does not crash server", async () => {
    const ws = await openClient(port);
    sockets.push(ws);

    ws.send("not-json");

    ws.send(
      JSON.stringify({
        type: "join",
        flow: "create",
        room: VALID_ROOM_ID,
        username: "owner",
        passcode: PASSCODE,
      }),
    );

    const joined = await waitForMessage(ws, { type: "joined" });
    expect(joined.room).toBe(VALID_ROOM_ID);
    expect(isUuidV4(joined.peerId)).toBe(true);
  });
});
