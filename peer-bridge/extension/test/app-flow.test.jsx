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
});

afterEach(() => {
  cleanup();
});

describe("App phase-2 flow", () => {
  it("shows Home screen by default", () => {
    render(<App />);

    expect(screen.getByText("Create Room")).toBeDefined();
    expect(screen.getByText("Join Room")).toBeDefined();
  });

  it("handles Create flow with generated room id and owner role", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("Create Room"));
    await user.click(screen.getByText("Create Room"));

    expect(connect).toHaveBeenCalledWith("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", "create");
    expect(screen.getByText("owner")).toBeDefined();
    expect(createdRoomIdStore).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");

    await user.click(screen.getByTitle("Leave room"));
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Join Room")).toBeDefined();
    expect(createdRoomIdStore).toBeNull();
  });

  it("handles Join flow and shows participant role", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("Join Room"));
    await user.type(screen.getByLabelText("Room ID"), "room-participant");
    await user.click(screen.getByText("Join Room"));

    expect(connect).toHaveBeenCalledWith("room-participant", "join");
    expect(screen.getByText("participant")).toBeDefined();
  });

  it("blocks Create when an active created room exists locally", async () => {
    const user = userEvent.setup();
    createdRoomIdStore = "99999999-9999-4999-8999-999999999999";
    render(<App />);

    expect(screen.getByText(/Active created room detected/i)).toBeDefined();
    expect(screen.getByText("Create Room").hasAttribute("disabled")).toBe(true);

    await user.click(screen.getByText("Join Room"));
    expect(screen.getByText("Back")).toBeDefined();
  });
});
