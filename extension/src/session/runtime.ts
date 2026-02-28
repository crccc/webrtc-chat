import type {
  BackgroundSessionSnapshot,
  ConnectArgs,
  ConnectFailureResult,
  ConnectResult,
  RuntimeSessionMessage,
  RuntimeSessionResponse,
} from "../types";

export interface BackgroundSessionController {
  connect: (args: ConnectArgs) => Promise<ConnectResult>;
  disconnect: () => void;
  sendMessage: (text: string) => void;
  getSnapshot: () => BackgroundSessionSnapshot;
}

export function isRuntimeSessionMessage(message: unknown): message is RuntimeSessionMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    "namespace" in message &&
    (message as { namespace?: unknown }).namespace === "session" &&
    "action" in message &&
    typeof (message as { action?: unknown }).action === "string"
  );
}

export function createSessionMessageHandler(controller: BackgroundSessionController) {
  return async (message: RuntimeSessionMessage) => {
    switch (message.action) {
      case "connect":
        return controller.connect((message.payload ?? {}) as ConnectArgs);
      case "send":
        controller.sendMessage(
          typeof (message.payload as { text?: unknown } | undefined)?.text === "string"
            ? ((message.payload as { text: string }).text)
            : "",
        );
        return { ok: true } as const;
      case "disconnect":
        controller.disconnect();
        return { ok: true } as const;
      case "status":
        return {
          ok: true as const,
          snapshot: controller.getSnapshot(),
        };
      default:
        return {
          ok: false as const,
          code: "UNKNOWN_ACTION",
          message: `Unknown session action: "${message.action}".`,
        };
    }
  };
}

export async function handleSessionMessageSafely(
  controller: BackgroundSessionController,
  message: RuntimeSessionMessage,
): Promise<RuntimeSessionResponse> {
  try {
    return await createSessionMessageHandler(controller)(message);
  } catch (error) {
    console.error("[peer-bridge] background session message failed", error);
    return {
      ok: false,
      code: "SESSION_MESSAGE_FAILED",
      message: "Background session request failed. Please try again.",
    } satisfies ConnectFailureResult;
  }
}
