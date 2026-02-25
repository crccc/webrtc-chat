import React from "react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ChatSection from "../src/components/ChatSection.jsx";

beforeAll(() => {
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = vi.fn();
  }
});

afterEach(() => {
  cleanup();
});

describe("ChatSection", () => {
  it("shows room id and role", () => {
    render(
      <ChatSection
        roomId="room-c"
        role="owner"
        messages={[]}
        onSend={() => {}}
        onLeave={() => {}}
      />,
    );

    expect(screen.getByText("room-c")).toBeDefined();
    expect(screen.getByText("owner")).toBeDefined();
  });

  it("sends trimmed message and clears input", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(
      <ChatSection
        roomId="room-c"
        role="participant"
        messages={[]}
        onSend={onSend}
        onLeave={() => {}}
      />,
    );

    const input = screen.getByPlaceholderText("Type a message…");
    await user.type(input, "  hello  ");
    await user.click(screen.getByText("Send"));

    expect(onSend).toHaveBeenCalledWith("hello");
    expect(input.value).toBe("");
  });

  it("does not send empty message", async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(
      <ChatSection
        roomId="room-c"
        role="participant"
        messages={[]}
        onSend={onSend}
        onLeave={() => {}}
      />,
    );

    const input = screen.getByPlaceholderText("Type a message…");
    await user.type(input, "   ");
    await user.click(screen.getByText("Send"));

    expect(onSend).not.toHaveBeenCalled();
  });

  it("calls onLeave when leave button is clicked", async () => {
    const onLeave = vi.fn();
    const user = userEvent.setup();
    render(
      <ChatSection
        roomId="room-c"
        role="participant"
        messages={[]}
        onSend={() => {}}
        onLeave={onLeave}
      />,
    );

    await user.click(screen.getByTitle("Leave room"));

    expect(onLeave).toHaveBeenCalledTimes(1);
  });
});
