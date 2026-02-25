import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JoinSection from "../src/components/JoinSection.jsx";

afterEach(() => {
  cleanup();
});

describe("JoinSection phase-3", () => {
  it("submits trimmed credentials on join", async () => {
    const onJoin = vi.fn();
    const user = userEvent.setup();
    render(<JoinSection onJoin={onJoin} onBack={() => {}} />);

    await user.type(screen.getByLabelText("Room ID"), "  room-b  ");
    await user.type(screen.getByLabelText("Username"), "  alice  ");
    await user.type(screen.getByLabelText("Passcode"), "  secret123  ");
    await user.click(screen.getByText("Join Room"));

    expect(onJoin).toHaveBeenCalledWith({
      roomId: "room-b",
      username: "alice",
      passcode: "secret123",
    });
  });

  it("requires username and passcode format", async () => {
    const onJoin = vi.fn();
    const user = userEvent.setup();
    render(<JoinSection onJoin={onJoin} onBack={() => {}} />);

    await user.type(screen.getByLabelText("Room ID"), "room-a");
    await user.click(screen.getByText("Join Room"));
    expect(screen.getByText("Username is required.")).toBeDefined();

    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Passcode"), "12345");
    await user.click(screen.getByText("Join Room"));

    expect(screen.getByText("Passcode must be 6-32 characters.")).toBeDefined();
    expect(onJoin).not.toHaveBeenCalled();
  });

  it("calls onBack when back is clicked", async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(<JoinSection onJoin={() => {}} onBack={onBack} />);

    await user.click(screen.getByText("Back"));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
