import { describe, expect, it, vi } from "vitest";
import {
  createSessionMessageHandler,
  handleSessionMessageSafely,
  type BackgroundSessionController,
} from "../src/background/messageRouter";
import type { BackgroundSessionSnapshot, RuntimeSessionMessage } from "../src/shared/sessionTypes";

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

describe("background session runtime", () => {
  it("routes connect, send, disconnect, and status requests", async () => {
    const controller: BackgroundSessionController = {
      connect: vi.fn(async () => ({ ok: true as const })),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      getSnapshot: vi.fn(() => createSnapshot({ roomId: "room-1", role: "owner" })),
    };
    const handleMessage = createSessionMessageHandler(controller);

    await expect(
      handleMessage({
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
    expect(controller.connect).toHaveBeenCalledWith({
      roomId: "room-1",
      username: "owner-a",
      passcode: "secret123",
      flow: "create",
    });

    await expect(
      handleMessage({
        namespace: "session",
        action: "send",
        payload: { text: "hello" },
      }),
    ).resolves.toEqual({ ok: true });
    expect(controller.sendMessage).toHaveBeenCalledWith("hello");

    await expect(
      handleMessage({
        namespace: "session",
        action: "disconnect",
      }),
    ).resolves.toEqual({ ok: true });
    expect(controller.disconnect).toHaveBeenCalledTimes(1);

    await expect(
      handleMessage({
        namespace: "session",
        action: "status",
      }),
    ).resolves.toEqual({
      ok: true,
      snapshot: createSnapshot({ roomId: "room-1", role: "owner" }),
    });
  });

  it("returns deterministic failures for unknown actions and connect errors", async () => {
    const controller: BackgroundSessionController = {
      connect: vi.fn(async () => ({
        ok: false,
        code: "ROOM_NOT_FOUND",
        message: "Room not found. Ask owner to create it first.",
      })),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      getSnapshot: vi.fn(() => createSnapshot()),
    };
    const handleMessage = createSessionMessageHandler(controller);

    await expect(
      handleMessage({
        namespace: "session",
        action: "connect",
        payload: {
          roomId: "room-x",
          username: "alice",
          passcode: "secret123",
          flow: "join",
        },
      }),
    ).resolves.toEqual({
      ok: false,
      code: "ROOM_NOT_FOUND",
      message: "Room not found. Ask owner to create it first.",
    });

    const unknownMessage = {
      namespace: "session",
      action: "wat",
    } as unknown as RuntimeSessionMessage;
    await expect(handleMessage(unknownMessage)).resolves.toEqual({
      ok: false,
      code: "UNKNOWN_ACTION",
      message: 'Unknown session action: "wat".',
    });
  });

  it("converts thrown controller failures into structured responses", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const controller: BackgroundSessionController = {
      connect: vi.fn(async () => {
        throw new Error("boom");
      }),
      disconnect: vi.fn(),
      sendMessage: vi.fn(),
      getSnapshot: vi.fn(() => createSnapshot()),
    };

    await expect(
      handleSessionMessageSafely(controller, {
        namespace: "session",
        action: "connect",
        payload: {
          roomId: "room-1",
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
