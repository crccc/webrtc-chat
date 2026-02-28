import React from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App";

const connect = vi.fn();
const disconnect = vi.fn();
const sendMessage = vi.fn();
let createdRoomIdStore: string | null = null;
let sessionState = {
  roomId: null as string | null,
  role: null as "owner" | "participant" | null,
  messages: [] as Array<{ id: number; text: string; type: "self" | "peer" | "info" }>,
  status: "idle" as "idle" | "connecting" | "connected" | "error" | "disconnected",
  peers: 1,
  capacity: 8,
};

vi.mock("../src/hooks/useWebSocket", () => ({
  useWebSocket: () => ({
    connect,
    disconnect,
    sendMessage,
    ...sessionState,
  }),
}));

vi.mock("../src/utils/uuid", () => ({
  generateUuidV4: vi.fn(() => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
}));

vi.mock("../src/utils/storage", () => ({
  getCreatedRoomId: vi.fn(async () => createdRoomIdStore),
  setCreatedRoomId: vi.fn(async (roomId) => {
    createdRoomIdStore = roomId;
  }),
  clearCreatedRoomId: vi.fn(async () => {
    createdRoomIdStore = null;
  }),
}));

beforeAll(() => {
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
});

beforeEach(() => {
  vi.clearAllMocks();
  createdRoomIdStore = null;
  sessionState = {
    roomId: null,
    role: null,
    messages: [],
    status: "idle",
    peers: 1,
    capacity: 8,
  };
  connect.mockResolvedValue({ ok: true });
});

afterEach(() => {
  cleanup();
});

describe("App phase-3 flow", () => {
  it("shows Home screen by default", () => {
    render(<App />);

    expect(screen.getByText("Create Room")).toBeDefined();
    expect(screen.getByText("Join Room")).toBeDefined();
  });

  it("handles Create flow and enters chat as owner", async () => {
    const user = userEvent.setup();
    connect.mockImplementation(async ({ roomId }) => {
      sessionState = {
        ...sessionState,
        roomId,
        role: "owner",
        status: "connected",
      };
      return { ok: true };
    });
    render(<App />);

    await user.click(screen.getByText("Create Room"));
    await user.type(screen.getByLabelText("Username"), "owner-a");
    await user.type(screen.getByLabelText("Passcode"), "secret123");
    await user.click(screen.getByText("Create Room"));

    expect(connect).toHaveBeenCalledWith({
      flow: "create",
      roomId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      username: "owner-a",
      passcode: "secret123",
    });
    expect(screen.getByText("owner")).toBeDefined();
    expect(createdRoomIdStore).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");

    await user.click(screen.getByTitle("Leave room"));
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(createdRoomIdStore).toBeNull();
  });

  it("shows ROOM_FULL error in join flow", async () => {
    const user = userEvent.setup();
    connect.mockResolvedValue({ ok: false, code: "ROOM_FULL", message: "Room is full (8/8)." });
    render(<App />);

    await user.click(screen.getByText("Join Room"));
    await user.type(
      screen.getByLabelText("Room ID"),
      "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    );
    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Passcode"), "secret123");
    await user.click(screen.getByText("Join Room"));

    expect(screen.getByText("Room is full (8/8).")).toBeDefined();
    expect(screen.queryByText("participant")).toBeNull();
  });

  it("restores create state when existing created-room id is found", () => {
    createdRoomIdStore = "99999999-9999-4999-8999-999999999999";
    render(<App />);

    return screen.findByText("Regenerate").then(() => {
      expect((screen.getByLabelText("Room ID") as HTMLInputElement).value).toBe(
      "99999999-9999-4999-8999-999999999999",
      );
    });
  });

  it("auto leaves room when popup unmounts", async () => {
    const user = userEvent.setup();
    connect.mockImplementation(async ({ roomId }) => {
      sessionState = {
        ...sessionState,
        roomId,
        role: "owner",
        status: "connected",
      };
      return { ok: true };
    });
    const view = render(<App />);

    await user.click(screen.getByText("Create Room"));
    await user.type(screen.getByLabelText("Username"), "owner-a");
    await user.type(screen.getByLabelText("Passcode"), "secret123");
    await user.click(screen.getByText("Create Room"));

    expect(createdRoomIdStore).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");

    view.unmount();

    expect(disconnect).not.toHaveBeenCalled();
    expect(createdRoomIdStore).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
  });

  it("restores active chat session after side panel remount", () => {
    sessionState = {
      ...sessionState,
      roomId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      role: "owner",
      status: "connected",
      messages: [{ id: 1, text: '✓ Created room "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" as owner-a.', type: "info" }],
    };

    render(<App />);

    expect(screen.getByText("owner")).toBeDefined();
    expect(screen.getByText("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")).toBeDefined();
  });
});
