const DEFAULT_DEV_SIGNALING_URL = "ws://192.168.1.128:8888";

export interface RuntimeEnvShape {
  PEER_BRIDGE_SIGNALING_URL?: string;
  MODE?: string;
  DEV?: boolean;
  PROD?: boolean;
}

export type SignalingEndpointErrorCode =
  | "MISSING_SIGNALING_URL"
  | "INVALID_SIGNALING_URL";

export type SignalingEndpointResolution =
  | { ok: true; endpoint: string }
  | { ok: false; code: SignalingEndpointErrorCode; message: string };

export function getSignalingEndpointErrorMessage(code: SignalingEndpointErrorCode): string {
  switch (code) {
    case "MISSING_SIGNALING_URL":
      return "Signaling endpoint is missing. Set PEER_BRIDGE_SIGNALING_URL for production builds.";
    case "INVALID_SIGNALING_URL":
      return "Signaling endpoint must use ws:// or wss://.";
  }
}

function isValidWebSocketUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "ws:" || parsed.protocol === "wss:";
  } catch {
    return false;
  }
}

export function resolveSignalingEndpoint(
  env: RuntimeEnvShape = import.meta.env,
): SignalingEndpointResolution {
  const raw = typeof env.PEER_BRIDGE_SIGNALING_URL === "string"
    ? env.PEER_BRIDGE_SIGNALING_URL.trim()
    : "";

  if (raw) {
    if (!isValidWebSocketUrl(raw)) {
      return {
        ok: false,
        code: "INVALID_SIGNALING_URL",
        message: getSignalingEndpointErrorMessage("INVALID_SIGNALING_URL"),
      };
    }

    return {
      ok: true,
      endpoint: raw,
    };
  }

  if (env.DEV || env.MODE === "development") {
    return {
      ok: true,
      endpoint: DEFAULT_DEV_SIGNALING_URL,
    };
  }

  return {
    ok: false,
    code: "MISSING_SIGNALING_URL",
    message: getSignalingEndpointErrorMessage("MISSING_SIGNALING_URL"),
  };
}

export function getDefaultDevSignalingUrl(): string {
  return DEFAULT_DEV_SIGNALING_URL;
}
