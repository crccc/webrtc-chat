import { describe, expect, it } from "vitest";
import {
  decodeChannelMessage,
  getServerErrorMessage,
  shouldInitiateOffer,
} from "../src/sidepanel/hooks/useWebSocket";

describe("useWebSocket error code mapping", () => {
  it("maps ROOM_FULL and passcode-related errors", () => {
    expect(getServerErrorMessage("ROOM_FULL")).toBe("Room is full (8/8).");
    expect(getServerErrorMessage("INVALID_PASSCODE")).toBe("Incorrect passcode.");
    expect(getServerErrorMessage("INVALID_PASSCODE_FORMAT")).toBe(
      "Passcode must be 6-32 characters.",
    );
    expect(getServerErrorMessage("TARGET_NOT_FOUND")).toBe("Target peer was not found in this room.");
  });

  it("falls back for unknown codes", () => {
    expect(getServerErrorMessage("SOMETHING_ELSE")).toBe(
      "Unable to join room. Please try again.",
    );
  });
});

describe("WebRTC helper behavior", () => {
  it("uses deterministic offerer rule based on peerId ordering", () => {
    expect(shouldInitiateOffer("a-100", "b-200")).toBe(true);
    expect(shouldInitiateOffer("z-100", "b-200")).toBe(false);
  });

  it("decodes channel payload and ignores malformed empty payload", () => {
    expect(decodeChannelMessage('{"from":"alice","text":" hi "}', "peer-x")).toEqual({
      from: "alice",
      text: "hi",
    });
    expect(decodeChannelMessage("plain text", "peer-x")).toEqual({
      from: "peer-x",
      text: "plain text",
    });
    expect(decodeChannelMessage('{"text":"   "}', "peer-x")).toBeNull();
  });
});
