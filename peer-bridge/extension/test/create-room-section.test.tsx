import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import CreateRoomSection from "../src/components/CreateRoomSection";

const uuidQueue = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
  "33333333-3333-4333-8333-333333333333",
];

const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

vi.mock("../src/utils/uuid", () => ({
  generateUuidV4: vi.fn(() => uuidQueue.shift() || "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
}));

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  uuidQueue.splice(
    0,
    uuidQueue.length,
    "11111111-1111-4111-8111-111111111111",
    "22222222-2222-4222-8222-222222222222",
    "33333333-3333-4333-8333-333333333333",
  );
});

describe("CreateRoomSection phase-3", () => {
  it("shows an initial UUIDv4 room id", () => {
    render(<CreateRoomSection onCreate={() => {}} onBack={() => {}} />);
    const input = screen.getByLabelText("Room ID") as HTMLInputElement;

    expect(UUID_V4_REGEX.test(input.value)).toBe(true);
    expect(input.value).toBe("11111111-1111-4111-8111-111111111111");
  });

  it("regenerates a different UUIDv4", async () => {
    const user = userEvent.setup();
    render(<CreateRoomSection onCreate={() => {}} onBack={() => {}} />);

    const input = screen.getByLabelText("Room ID") as HTMLInputElement;
    const firstValue = input.value;
    await user.click(screen.getByText("Regenerate"));

    expect(input.value).not.toBe(firstValue);
    expect(input.value).toBe("22222222-2222-4222-8222-222222222222");
  });

  it("keeps room id input readonly", () => {
    render(<CreateRoomSection onCreate={() => {}} onBack={() => {}} />);
    const input = screen.getByLabelText("Room ID") as HTMLInputElement;
    expect(input.readOnly).toBe(true);
  });

  it("requires username and passcode length", async () => {
    const onCreate = vi.fn();
    const user = userEvent.setup();
    render(<CreateRoomSection onCreate={onCreate} onBack={() => {}} />);

    await user.click(screen.getByText("Create Room"));
    expect(screen.getByText("Username is required.")).toBeDefined();

    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Passcode"), "12345");
    await user.click(screen.getByText("Create Room"));

    expect(screen.getByText("Passcode must be 6-32 characters.")).toBeDefined();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("submits generated room id with username/passcode", async () => {
    const onCreate = vi.fn();
    const user = userEvent.setup();
    render(<CreateRoomSection onCreate={onCreate} onBack={() => {}} />);

    await user.type(screen.getByLabelText("Username"), "alice");
    await user.type(screen.getByLabelText("Passcode"), "secret123");
    await user.click(screen.getByText("Create Room"));

    expect(onCreate).toHaveBeenCalledWith({
      roomId: "11111111-1111-4111-8111-111111111111",
      username: "alice",
      passcode: "secret123",
    });
  });
});
