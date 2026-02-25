import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JoinSection from "../src/components/JoinSection.jsx";

afterEach(() => {
  cleanup();
});

describe("JoinSection", () => {
  it("submits trimmed room id on join", async () => {
    const onJoin = vi.fn();
    const user = userEvent.setup();
    render(<JoinSection onJoin={onJoin} onBack={() => {}} />);

    await user.type(screen.getByLabelText("Room ID"), "  room-b  ");
    await user.click(screen.getByText("Join Room"));

    expect(onJoin).toHaveBeenCalledWith("room-b");
  });

  it("submits on Enter", async () => {
    const onJoin = vi.fn();
    const user = userEvent.setup();
    render(<JoinSection onJoin={onJoin} onBack={() => {}} />);

    const input = screen.getByLabelText("Room ID");
    await user.type(input, "room-enter{Enter}");

    expect(onJoin).toHaveBeenCalledWith("room-enter");
  });

  it("does not submit empty room id", async () => {
    const onJoin = vi.fn();
    const user = userEvent.setup();
    render(<JoinSection onJoin={onJoin} onBack={() => {}} />);

    await user.click(screen.getByText("Join Room"));

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
