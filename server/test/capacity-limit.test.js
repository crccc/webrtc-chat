const WebSocket = require("ws");
const { MAX_ROOM_CAPACITY, createSignalingServer } = require("../index");

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

describe("capacity limit", () => {
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

  test("8th join accepted, 9th rejected and payload capacity is 8", async () => {
    expect(MAX_ROOM_CAPACITY).toBe(8);

    for (let i = 1; i <= MAX_ROOM_CAPACITY; i += 1) {
      const ws = await openClient(port);
      sockets.push(ws);

      ws.send(
        JSON.stringify({
          action: "join",
          flow: i === 1 ? "create" : "join",
          room: ROOM_ID,
          username: `u${i}`,
          passcode: PASSCODE,
        }),
      );

      const joined = await waitForMessage(ws, { type: "joined" });
      expect(joined.capacity).toBe(8);
      expect(joined.peers).toBe(i);
    }

    const overflow = await openClient(port);
    sockets.push(overflow);
    overflow.send(
      JSON.stringify({
        action: "join",
        flow: "join",
        room: ROOM_ID,
        username: "u9",
        passcode: PASSCODE,
      }),
    );

    const error = await waitForMessage(overflow, { type: "error" });
    expect(error).toMatchObject({
      code: "ROOM_FULL",
      message: "room is full (8/8)",
    });
  });
});
