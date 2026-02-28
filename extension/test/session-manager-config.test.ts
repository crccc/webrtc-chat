import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBackgroundSessionManager } from "../src/session/sessionManager";
import type { BackgroundRtcBridge } from "../src/session/offscreenBridge";

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  readonly url: string;
  readyState = 0;
  sentPayloads: string[] = [];
  private listeners = new Map<string, Array<(event?: { data?: string }) => void>>();

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: (event?: { data?: string }) => void) {
    const bucket = this.listeners.get(type) ?? [];
    bucket.push(listener);
    this.listeners.set(type, bucket);
  }

  send(payload?: string) {
    if (typeof payload === "string") {
      this.sentPayloads.push(payload);
    }
  }

  close() {
    this.emit("close");
  }

  emit(type: string, event?: { data?: string }) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

function createRtcBridgeMock(
  overrides: Partial<BackgroundRtcBridge> = {},
): BackgroundRtcBridge {
  return {
    ensureReady: vi.fn(async () => undefined),
    resetSession: vi.fn(async () => undefined),
    peerJoined: vi.fn(async () => undefined),
    peerLeft: vi.fn(async () => undefined),
    receiveSignal: vi.fn(async () => undefined),
    sendMessage: vi.fn(async () => ({ sent: false, reason: "no-peers" as const })),
    disconnect: vi.fn(async () => undefined),
    dispose: vi.fn(),
    ...overrides,
  };
}

async function flushAsyncWork() {
  await Promise.resolve();
  await Promise.resolve();
}

async function waitForWebSocketInstance(): Promise<FakeWebSocket> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const instance = FakeWebSocket.instances[0];
    if (instance) return instance;
    await flushAsyncWork();
  }

  throw new Error("websocket instance was not created");
}

describe("background session manager signaling config", () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
  });

  it("uses the resolved signaling endpoint for websocket connections", async () => {
    const rtcBridge = createRtcBridgeMock();
    const manager = createBackgroundSessionManager({
      endpointResolver: () => ({
        ok: true,
        endpoint: "wss://signal.example.com/ws",
      }),
      webSocketFactory: (url) => new FakeWebSocket(url) as unknown as WebSocket,
      rtcBridge,
    });

    const connectPromise = manager.connect({
      roomId: "room-1",
      username: "alice",
      passcode: "secret123",
      flow: "join",
    });

    const socket = await waitForWebSocketInstance();
    expect(rtcBridge.ensureReady).toHaveBeenCalledTimes(1);
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(socket.url).toBe("wss://signal.example.com/ws");

    socket.emit("error");

    await expect(connectPromise).resolves.toEqual({
      ok: false,
      message:
        "Connection error. Check that the signaling server is reachable and that LAN or Local Network access is allowed.",
    });
  });

  it("returns a safe config failure and avoids websocket creation for invalid endpoint config", async () => {
    const rtcBridge = createRtcBridgeMock();
    const webSocketFactory = vi.fn((url: string) => new FakeWebSocket(url) as unknown as WebSocket);
    const manager = createBackgroundSessionManager({
      endpointResolver: () => ({
        ok: false,
        code: "MISSING_SIGNALING_URL",
        message: "Signaling endpoint is missing. Set PEER_BRIDGE_SIGNALING_URL for production builds.",
      }),
      webSocketFactory,
      rtcBridge,
    });

    await expect(
      manager.connect({
        roomId: "room-1",
        username: "alice",
        passcode: "secret123",
        flow: "join",
      }),
    ).resolves.toEqual({
      ok: false,
      message: "Signaling endpoint is missing. Set PEER_BRIDGE_SIGNALING_URL for production builds.",
    });
    expect(webSocketFactory).not.toHaveBeenCalled();
    expect(rtcBridge.ensureReady).not.toHaveBeenCalled();
    expect(manager.getSnapshot()).toMatchObject({
      status: "error",
      error: {
        ok: false,
        message: "Signaling endpoint is missing. Set PEER_BRIDGE_SIGNALING_URL for production builds.",
      },
    });
  });

  it("syncs joined sessions and forwards peer lifecycle and signal events to offscreen", async () => {
    const rtcBridge = createRtcBridgeMock();
    const manager = createBackgroundSessionManager({
      endpointResolver: () => ({
        ok: true,
        endpoint: "wss://signal.example.com/ws",
      }),
      webSocketFactory: (url) => new FakeWebSocket(url) as unknown as WebSocket,
      rtcBridge,
    });

    const connectPromise = manager.connect({
      roomId: "room-1",
      username: "alice",
      passcode: "secret123",
      flow: "join",
    });

    const socket = await waitForWebSocketInstance();
    socket.emit("message", {
      data: JSON.stringify({
        type: "joined",
        room: "room-1",
        peerId: "peer-b",
        peerList: ["peer-a"],
        peers: 2,
        capacity: 8,
        username: "alice",
      }),
    });

    await expect(connectPromise).resolves.toEqual({ ok: true });
    await flushAsyncWork();

    expect(rtcBridge.resetSession).toHaveBeenCalledWith({
      peerId: "peer-b",
      username: "alice",
    });
    expect(rtcBridge.peerJoined).toHaveBeenCalledWith("peer-a");

    socket.emit("message", {
      data: JSON.stringify({ type: "signal.joined", peerId: "peer-c" }),
    });
    socket.emit("message", {
      data: JSON.stringify({ type: "signal.left", peerId: "peer-a" }),
    });
    socket.emit("message", {
      data: JSON.stringify({
        type: "offer",
        from: "peer-c",
        payload: { type: "offer", sdp: "offer-sdp" },
      }),
    });

    await flushAsyncWork();

    expect(rtcBridge.peerJoined).toHaveBeenCalledWith("peer-c");
    expect(rtcBridge.peerLeft).toHaveBeenCalledWith("peer-a");
    expect(rtcBridge.receiveSignal).toHaveBeenCalledWith({
      action: "offer",
      from: "peer-c",
      payload: { type: "offer", sdp: "offer-sdp" },
    });
  });

  it("surfaces a user-visible message when offscreen reports no connected peers", async () => {
    const rtcBridge = createRtcBridgeMock({
      sendMessage: vi.fn(async () => ({ sent: false, reason: "no-peers" as const })),
    });
    const manager = createBackgroundSessionManager({
      endpointResolver: () => ({
        ok: true,
        endpoint: "wss://signal.example.com/ws",
      }),
      webSocketFactory: (url) => new FakeWebSocket(url) as unknown as WebSocket,
      rtcBridge,
    });

    const connectPromise = manager.connect({
      roomId: "room-1",
      username: "alice",
      passcode: "secret123",
      flow: "create",
    });

    const socket = await waitForWebSocketInstance();
    socket.emit("message", {
      data: JSON.stringify({
        type: "joined",
        room: "room-1",
        peerId: "peer-a",
        peerList: [],
        peers: 1,
        capacity: 8,
        username: "alice",
      }),
    });

    await expect(connectPromise).resolves.toEqual({ ok: true });

    manager.sendMessage("hello");
    await flushAsyncWork();

    expect(manager.getSnapshot().messages.map((message) => message.text)).toContain(
      "⚠ No peers are connected yet.",
    );
  });

  it("returns a controlled failure when offscreen initialization fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const rtcBridge = createRtcBridgeMock({
      ensureReady: vi.fn(async () => {
        throw new Error("offscreen unavailable");
      }),
    });
    const manager = createBackgroundSessionManager({
      endpointResolver: () => ({
        ok: true,
        endpoint: "wss://signal.example.com/ws",
      }),
      webSocketFactory: (url) => new FakeWebSocket(url) as unknown as WebSocket,
      rtcBridge,
    });

    await expect(
      manager.connect({
        roomId: "room-1",
        username: "alice",
        passcode: "secret123",
        flow: "join",
      }),
    ).resolves.toEqual({
      ok: false,
      message: "Failed to initialize the offscreen WebRTC runtime.",
    });
    expect(FakeWebSocket.instances).toHaveLength(0);
    errorSpy.mockRestore();
  });
});
