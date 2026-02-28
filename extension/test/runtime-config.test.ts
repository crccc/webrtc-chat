import { describe, expect, it } from "vitest";
import {
  getSignalingEndpointErrorMessage,
  resolveSignalingEndpoint,
} from "../src/config/runtime";

describe("runtime signaling config", () => {
  it("uses explicit env override when valid", () => {
    expect(
      resolveSignalingEndpoint({
        PEER_BRIDGE_SIGNALING_URL: "wss://signal.example.com/ws",
        MODE: "production",
        DEV: false,
        PROD: true,
      }),
    ).toEqual({
      ok: true,
      endpoint: "wss://signal.example.com/ws",
    });
  });

  it("falls back to localhost in development when env is missing", () => {
    expect(
      resolveSignalingEndpoint({
        MODE: "development",
        DEV: true,
        PROD: false,
      }),
    ).toEqual({
      ok: true,
      endpoint: "ws://localhost:8888",
    });
  });

  it("fails fast with a clear message for missing or invalid production config", () => {
    expect(
      resolveSignalingEndpoint({
        MODE: "production",
        DEV: false,
        PROD: true,
      }),
    ).toEqual({
      ok: false,
      code: "MISSING_SIGNALING_URL",
      message: getSignalingEndpointErrorMessage("MISSING_SIGNALING_URL"),
    });

    expect(
      resolveSignalingEndpoint({
        PEER_BRIDGE_SIGNALING_URL: "http://signal.example.com",
        MODE: "production",
        DEV: false,
        PROD: true,
      }),
    ).toEqual({
      ok: false,
      code: "INVALID_SIGNALING_URL",
      message: getSignalingEndpointErrorMessage("INVALID_SIGNALING_URL"),
    });
  });
});
