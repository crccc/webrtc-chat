export type RtcSignalAction = "offer" | "answer" | "ice";

export interface OffscreenResetPayload {
  peerId: string;
  username: string;
}

export interface OffscreenSignalPayload {
  action: RtcSignalAction;
  from: string;
  payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

export interface OffscreenSendPayload {
  text: string;
}

export type OffscreenCommandMessage =
  | {
      namespace: "rtc";
      target: "offscreen";
      action: "reset";
      payload: OffscreenResetPayload;
    }
  | {
      namespace: "rtc";
      target: "offscreen";
      action: "peer-joined" | "peer-left";
      payload: { peerId: string };
    }
  | {
      namespace: "rtc";
      target: "offscreen";
      action: "signal";
      payload: OffscreenSignalPayload;
    }
  | {
      namespace: "rtc";
      target: "offscreen";
      action: "send";
      payload: OffscreenSendPayload;
    }
  | {
      namespace: "rtc";
      target: "offscreen";
      action: "disconnect";
    };

export type OffscreenEventMessage =
  | {
      namespace: "rtc";
      target: "background";
      action: "signal";
      payload: {
        action: RtcSignalAction;
        to: string;
        payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
      };
    }
  | {
      namespace: "rtc";
      target: "background";
      action: "received";
      payload: {
        from: string;
        text: string;
      };
    }
  | {
      namespace: "rtc";
      target: "background";
      action: "diagnostic";
      payload: {
        code: "RTC_UNAVAILABLE";
      };
    };

export interface OffscreenSendResponse {
  ok: true;
  sent: boolean;
  reason?: "no-peers" | "not-open" | "rtc-unavailable";
}

export interface OffscreenAckResponse {
  ok: true;
}

export type OffscreenCommandResponse = OffscreenSendResponse | OffscreenAckResponse;

export function isOffscreenCommandMessage(message: unknown): message is OffscreenCommandMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "namespace" in message &&
    (message as { namespace?: unknown }).namespace === "rtc" &&
    "target" in message &&
    (message as { target?: unknown }).target === "offscreen" &&
    "action" in message &&
    typeof (message as { action?: unknown }).action === "string"
  );
}
