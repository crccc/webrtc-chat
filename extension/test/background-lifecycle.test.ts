import { describe, expect, it, vi } from "vitest";
import { setupBackgroundRuntime } from "../src/background/runtime";
import type { BackgroundSessionSnapshot } from "../src/shared/sessionTypes";
import { createBackgroundRuntimeTestHarness } from "./test-utils/chromeRuntime";

function createSnapshot(
  overrides: Partial<BackgroundSessionSnapshot> = {},
): BackgroundSessionSnapshot {
  return {
    roomId: null,
    role: null,
    messages: [],
    status: "idle",
    peers: 0,
    capacity: 8,
    error: null,
    ...overrides,
  };
}

describe("background runtime integration", () => {
  it("boots runtime listeners and forwards status/connect requests plus state broadcasts", async () => {
    let subscribedListener: ((snapshot: BackgroundSessionSnapshot) => void) | null = null;
    const controller = {
      connect: vi.fn(async () => ({ ok: true as const })),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      getSnapshot: vi.fn(() =>
        createSnapshot({ roomId: "room-1", role: "owner", status: "connected" }),
      ),
      subscribe: vi.fn((listener: (snapshot: BackgroundSessionSnapshot) => void) => {
        subscribedListener = listener;
        return () => {
          subscribedListener = null;
        };
      }),
    };
    const chromeHarness = createBackgroundRuntimeTestHarness();

    const runtime = setupBackgroundRuntime({
      controller,
      chromeApi: chromeHarness.chrome,
    });

    expect(chromeHarness.onInstalledListenerCount()).toBe(1);
    expect(chromeHarness.onMessageListenerCount()).toBe(1);

    await expect(
      chromeHarness.dispatchRuntimeMessage({
        namespace: "session",
        action: "status",
      }),
    ).resolves.toEqual({
      ok: true,
      snapshot: createSnapshot({ roomId: "room-1", role: "owner", status: "connected" }),
    });

    await expect(
      chromeHarness.dispatchRuntimeMessage({
        namespace: "session",
        action: "connect",
        payload: {
          roomId: "room-1",
          username: "owner-a",
          passcode: "secret123",
          flow: "create",
        },
      }),
    ).resolves.toEqual({ ok: true });
    expect(controller.connect).toHaveBeenCalledTimes(1);

    const stateListener = subscribedListener as
      | ((snapshot: BackgroundSessionSnapshot) => void)
      | null;
    if (stateListener) {
      stateListener(
        createSnapshot({ roomId: "room-1", role: "owner", status: "connected" }),
      );
    }
    expect(chromeHarness.sendMessage).toHaveBeenCalledWith({
      namespace: "session",
      action: "state",
      payload: {
        snapshot: createSnapshot({ roomId: "room-1", role: "owner", status: "connected" }),
      },
    });

    runtime.dispose();
    expect(chromeHarness.onMessageListenerCount()).toBe(0);
  });

  it("returns a controlled failure during background lifecycle interruption", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const controller = {
      connect: vi.fn(async () => {
        throw new Error("worker restarted");
      }),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      getSnapshot: vi.fn(() => createSnapshot()),
      subscribe: vi.fn(() => () => {}),
    };
    const chromeHarness = createBackgroundRuntimeTestHarness();

    setupBackgroundRuntime({
      controller,
      chromeApi: chromeHarness.chrome,
    });

    await expect(
      chromeHarness.dispatchRuntimeMessage({
        namespace: "session",
        action: "connect",
        payload: {
          roomId: "room-2",
          username: "alice",
          passcode: "secret123",
          flow: "join",
        },
      }),
    ).resolves.toEqual({
      ok: false,
      code: "SESSION_MESSAGE_FAILED",
      message: "Background session request failed. Please try again.",
    });
    errorSpy.mockRestore();
  });
});
