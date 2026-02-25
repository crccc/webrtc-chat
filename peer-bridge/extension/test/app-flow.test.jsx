import React from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App.jsx";

const connect = vi.fn();
const disconnect = vi.fn();
const sendMessage = vi.fn();
let createdRoomIdStore = null;

vi.mock("../src/hooks/useWebSocket", () => ({
  useWebSocket: () => ({
    connect,
    disconnect,
    sendMessage,
    messages: [],
    status: "idle",
    peers: 1,
    capacity: 10,
  }),
}));

vi.mock("../src/utils/uuid", () => ({
  generateUuidV4: vi.fn(() => "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
}));

vi.mock("../src/utils/storage", () => ({
  getCreatedRoomId: vi.fn(() => createdRoomIdStore),
  setCreatedRoomId: vi.fn((roomId) => {
    createdRoomIdStore = roomId;
  }),
  clearCreatedRoomId: vi.fn(() => {
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
    connect.mockResolvedValue({ ok: false, code: "ROOM_FULL", message: "Room is full (10/10)." });
    render(<App />);

    await user.click(screen.getByText("Join Room"));
    await user.type(
      screen.getByLabelText("Room ID"),
      "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    );
    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Passcode"), "secret123");
    await user.click(screen.getByText("Join Room"));

    expect(screen.getByText("Room is full (10/10).")).toBeDefined();
    expect(screen.queryByText("participant")).toBeNull();
  });

  it("restores create state when existing created-room id is found", () => {
    createdRoomIdStore = "99999999-9999-4999-8999-999999999999";
    render(<App />);

    expect(screen.getByText("Regenerate")).toBeDefined();
    expect(screen.getByLabelText("Room ID").value).toBe(
      "99999999-9999-4999-8999-999999999999",
    );
  });

  it("auto leaves room when popup unmounts", async () => {
    const user = userEvent.setup();
    const view = render(<App />);

    await user.click(screen.getByText("Create Room"));
    await user.type(screen.getByLabelText("Username"), "owner-a");
    await user.type(screen.getByLabelText("Passcode"), "secret123");
    await user.click(screen.getByText("Create Room"));

    expect(createdRoomIdStore).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");

    view.unmount();

    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(createdRoomIdStore).toBeNull();
  });

  it("auto leaves room when side panel pagehide fires", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("Create Room"));
    await user.type(screen.getByLabelText("Username"), "owner-a");
    await user.type(screen.getByLabelText("Passcode"), "secret123");
    await user.click(screen.getByText("Create Room"));

    window.dispatchEvent(new Event("pagehide"));

    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(createdRoomIdStore).toBeNull();
  });
});
