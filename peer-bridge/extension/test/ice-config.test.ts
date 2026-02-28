import { afterEach, describe, expect, it } from "vitest";
import {
  DEFAULT_ICE_SERVERS,
  getIceConfiguration,
  resolveIceServers,
} from "../src/webrtc/iceConfig";

describe("iceConfig", () => {
  afterEach(() => {
    delete (globalThis as typeof globalThis & { PEER_BRIDGE_ICE_SERVERS?: RTCIceServer[] })
      .PEER_BRIDGE_ICE_SERVERS;
  });

  it("uses Google STUN defaults", () => {
    const config = getIceConfiguration();
    expect(config.iceServers).toEqual(DEFAULT_ICE_SERVERS);
  });

  it("uses explicit valid override", () => {
    const override = [{ urls: "stun:example.org:3478" }];
    expect(resolveIceServers(override)).toEqual(override);
  });

  it("falls back to defaults when override shape is invalid", () => {
    const invalidOverride = [{ urls: "" }];
    expect(resolveIceServers(invalidOverride)).toEqual(DEFAULT_ICE_SERVERS);
  });
});
