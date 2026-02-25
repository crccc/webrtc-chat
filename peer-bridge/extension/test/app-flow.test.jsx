import React from "react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../src/App.jsx";

const connect = vi.fn();
const disconnect = vi.fn();
const sendMessage = vi.fn();

vi.mock("../src/hooks/useWebSocket", () => ({
  useWebSocket: () => ({
    connect,
    disconnect,
    sendMessage,
    messages: [],
    status: "idle",
  }),
}));

beforeAll(() => {
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  cleanup();
});

describe("App phase-1 flow split", () => {
  it("shows Home screen by default", () => {
    render(<App />);

    expect(screen.getByText("Create Room")).toBeDefined();
    expect(screen.getByText("Join Room")).toBeDefined();
  });

  it("handles Create flow and shows owner role", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByText("Create Room"));
    await user.type(screen.getByLabelText("Room ID"), "room-owner");
    await user.click(screen.getByText("Create Room"));

    expect(connect).toHaveBeenCalledWith("room-owner", "create");
    expect(screen.getByText("owner")).toBeDefined();

    await user.click(screen.getByTitle("Leave room"));
    expect(disconnect).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Join Room")).toBeDefined();
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
});
