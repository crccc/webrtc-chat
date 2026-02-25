import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateRoomSection from "../src/components/CreateRoomSection.jsx";

afterEach(() => {
  cleanup();
});

describe("CreateRoomSection", () => {
  it("submits trimmed room id on create", async () => {
    const onCreate = vi.fn();
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(<CreateRoomSection onCreate={onCreate} onBack={onBack} />);

    await user.type(screen.getByLabelText("Room ID"), "  room-a  ");
    await user.click(screen.getByText("Create Room"));

    expect(onCreate).toHaveBeenCalledWith("room-a");
  });

  it("submits on Enter", async () => {
    const onCreate = vi.fn();
    const user = userEvent.setup();
    render(<CreateRoomSection onCreate={onCreate} onBack={() => {}} />);

    const input = screen.getByLabelText("Room ID");
    await user.type(input, "room-enter{Enter}");

    expect(onCreate).toHaveBeenCalledWith("room-enter");
  });

  it("does not submit empty room id", async () => {
    const onCreate = vi.fn();
    const user = userEvent.setup();
    render(<CreateRoomSection onCreate={onCreate} onBack={() => {}} />);

    await user.click(screen.getByText("Create Room"));

    expect(onCreate).not.toHaveBeenCalled();
  });

  it("calls onBack when back is clicked", async () => {
    const onBack = vi.fn();
    const user = userEvent.setup();
    render(<CreateRoomSection onCreate={() => {}} onBack={onBack} />);

    await user.click(screen.getByText("Back"));

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
