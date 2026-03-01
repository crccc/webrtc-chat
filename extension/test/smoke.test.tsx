import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { useWebSocket } from "../src/sidepanel/hooks/useWebSocket";
import type { BackgroundSessionSnapshot, RuntimeSessionMessage } from "../src/shared/sessionTypes";
import { createSidepanelChromeRuntimeTestHarness } from "./test-utils/chromeRuntime";

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

function HookProbe() {
  const state = useWebSocket();

  return (
    <div>
      <span data-testid="status">{state.status}</span>
      <span data-testid="room">{state.roomId ?? ""}</span>
      <span data-testid="role">{state.role ?? ""}</span>
      <span data-testid="messages">{state.messages.length}</span>
    </div>
  );
}

afterEach(() => {
  cleanup();
});

describe("extension lifecycle smoke", () => {
  it("hydrates active session state from background and reacts to pushed lifecycle updates", async () => {
    const harness = createSidepanelChromeRuntimeTestHarness({
      statusSnapshot: createSnapshot({
        roomId: "room-1",
        role: "owner",
        status: "connected",
        messages: [{ id: 1, text: "hello", type: "info" }],
      }),
    });

    render(<HookProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("connected");
    });
    expect(screen.getByTestId("room").textContent).toBe("room-1");
    expect(screen.getByTestId("role").textContent).toBe("owner");
    expect(screen.getByTestId("messages").textContent).toBe("1");

    harness.emitRuntimeMessage({
      namespace: "session",
      action: "state",
      payload: {
        snapshot: createSnapshot({
          roomId: "room-1",
          role: "owner",
          status: "disconnected",
          messages: [
            { id: 1, text: "hello", type: "info" },
            { id: 2, text: "⚠ Disconnected from server.", type: "info" },
          ],
        }),
      },
    } satisfies RuntimeSessionMessage);

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("disconnected");
    });
    expect(screen.getByTestId("messages").textContent).toBe("2");
  });

  it("shows a controlled disconnected state when background status lookup fails", async () => {
    createSidepanelChromeRuntimeTestHarness({
      lastErrorMessage: "The message port closed before a response was received.",
    });

    render(<HookProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("disconnected");
    });
  });

  it("does not leave stale runtime listeners across repeated mount and unmount", async () => {
    const harness = createSidepanelChromeRuntimeTestHarness({
      statusSnapshot: createSnapshot({
        roomId: "room-2",
        role: "participant",
        status: "connected",
      }),
    });

    const first = render(<HookProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("connected");
    });
    expect(harness.getRuntimeListenerCount()).toBe(1);

    first.unmount();
    expect(harness.getRuntimeListenerCount()).toBe(0);

    render(<HookProbe />);

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("connected");
    });
    expect(harness.getRuntimeListenerCount()).toBe(1);
  });
});
