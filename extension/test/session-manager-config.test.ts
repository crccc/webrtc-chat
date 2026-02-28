import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBackgroundSessionManager } from "../src/session/sessionManager";

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  readonly url: string;
  readyState = 0;
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

  send() {}

  close() {
    this.emit("close");
  }

  emit(type: string, event?: { data?: string }) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

describe("background session manager signaling config", () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
  });

  it("uses the resolved signaling endpoint for websocket connections", async () => {
    const manager = createBackgroundSessionManager({
      endpointResolver: () => ({
        ok: true,
        endpoint: "wss://signal.example.com/ws",
      }),
      webSocketFactory: (url) => new FakeWebSocket(url) as unknown as WebSocket,
    });

    const connectPromise = manager.connect({
      roomId: "room-1",
      username: "alice",
      passcode: "secret123",
      flow: "join",
    });

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(FakeWebSocket.instances[0]?.url).toBe("wss://signal.example.com/ws");

    FakeWebSocket.instances[0]?.emit("error");

    await expect(connectPromise).resolves.toEqual({
      ok: false,
      message: "Connection error. Is the server running?",
    });
  });

  it("returns a safe config failure and avoids websocket creation for invalid endpoint config", async () => {
    const webSocketFactory = vi.fn((url: string) => new FakeWebSocket(url) as unknown as WebSocket);
    const manager = createBackgroundSessionManager({
      endpointResolver: () => ({
        ok: false,
        code: "MISSING_SIGNALING_URL",
        message: "Signaling endpoint is missing. Set PEER_BRIDGE_SIGNALING_URL for production builds.",
      }),
      webSocketFactory,
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
    expect(manager.getSnapshot()).toMatchObject({
      status: "error",
      error: {
        ok: false,
        message: "Signaling endpoint is missing. Set PEER_BRIDGE_SIGNALING_URL for production builds.",
      },
    });
  });
});
