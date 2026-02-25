import { describe, expect, it } from "vitest";
import { getServerErrorMessage } from "../src/hooks/useWebSocket";

describe("useWebSocket error code mapping", () => {
  it("maps ROOM_FULL and passcode-related errors", () => {
    expect(getServerErrorMessage("ROOM_FULL")).toBe("Room is full (10/10).");
    expect(getServerErrorMessage("INVALID_PASSCODE")).toBe("Incorrect passcode.");
    expect(getServerErrorMessage("INVALID_PASSCODE_FORMAT")).toBe(
      "Passcode must be 6-32 characters.",
    );
  });

  it("falls back for unknown codes", () => {
    expect(getServerErrorMessage("SOMETHING_ELSE")).toBe(
      "Unable to join room. Please try again.",
    );
  });
});
