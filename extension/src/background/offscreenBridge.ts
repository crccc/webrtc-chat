import type {
  OffscreenCommandMessage,
  OffscreenCommandResponse,
  OffscreenEventMessage,
} from "../shared/rtcProtocol";

export interface BackgroundRtcBridgeEventHandler {
  (event: OffscreenEventMessage): void;
}

export interface BackgroundRtcBridge {
  ensureReady: () => Promise<void>;
  resetSession: (payload: { peerId: string; username: string }) => Promise<void>;
  peerJoined: (peerId: string) => Promise<void>;
  peerLeft: (peerId: string) => Promise<void>;
  receiveSignal: (payload: {
    action: "offer" | "answer" | "ice";
    from: string;
    payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
  }) => Promise<void>;
  sendMessage: (
    text: string,
  ) => Promise<{ sent: boolean; reason?: "no-peers" | "not-open" | "rtc-unavailable" }>;
  disconnect: () => Promise<void>;
  dispose: () => void;
}

interface BackgroundChromeApiForOffscreen {
  runtime: {
    id?: string;
    getURL: (path: string) => string;
    getContexts?: (filter: chrome.runtime.ContextFilter) => Promise<chrome.runtime.ExtensionContext[]>;
    onMessage: {
      addListener: (
        listener: (
          message: unknown,
          sender: chrome.runtime.MessageSender,
          sendResponse: (response: unknown) => void,
        ) => boolean | void,
      ) => void;
      removeListener?: (
        listener: (
          message: unknown,
          sender: chrome.runtime.MessageSender,
          sendResponse: (response: unknown) => void,
        ) => boolean | void,
      ) => void;
    };
    sendMessage: (message: OffscreenCommandMessage) => Promise<OffscreenCommandResponse> | void;
  };
  offscreen?: {
    createDocument: (options: {
      url: string;
      reasons: chrome.offscreen.Reason[];
      justification: string;
    }) => Promise<void>;
    closeDocument?: () => Promise<void>;
  };
}

export function createChromeOffscreenRtcBridge({
  chromeApi,
  onEvent,
}: {
  chromeApi: BackgroundChromeApiForOffscreen;
  onEvent: BackgroundRtcBridgeEventHandler;
}): BackgroundRtcBridge {
  const offscreenPath = "offscreen.html";
  let ensureReadyPromise: Promise<void> | null = null;

  const onMessage = (message: unknown) => {
    if (
      typeof message !== "object" ||
      message === null ||
      (message as { namespace?: unknown }).namespace !== "rtc" ||
      (message as { target?: unknown }).target !== "background"
    ) {
      return undefined;
    }

    onEvent(message as OffscreenEventMessage);
    return undefined;
  };

  chromeApi.runtime.onMessage.addListener(onMessage);

  async function ensureReady() {
    const offscreenApi = chromeApi.offscreen;
    if (!offscreenApi?.createDocument) {
      throw new Error("chrome.offscreen API is unavailable.");
    }

    if (ensureReadyPromise) return ensureReadyPromise;

    ensureReadyPromise = (async () => {
      const offscreenUrl = chromeApi.runtime.getURL(offscreenPath);
      const contexts = chromeApi.runtime.getContexts
        ? await chromeApi.runtime.getContexts({
            contextTypes: ["OFFSCREEN_DOCUMENT"],
            documentUrls: [offscreenUrl],
          })
        : [];

      if (contexts.length > 0) {
        return;
      }

      await offscreenApi.createDocument({
        url: offscreenPath,
        reasons: [chrome.offscreen.Reason.WEB_RTC],
        justification: "Keep WebRTC peer connections alive outside the visible sidepanel UI.",
      });
    })();

    try {
      await ensureReadyPromise;
    } catch (error) {
      ensureReadyPromise = null;
      throw error;
    }
  }

  async function sendCommand(
    message: OffscreenCommandMessage,
  ): Promise<OffscreenCommandResponse> {
    await ensureReady();
    const response = await Promise.resolve(chromeApi.runtime.sendMessage(message));
    return (response ?? { ok: true }) as OffscreenCommandResponse;
  }

  return {
    ensureReady,

    async resetSession(payload) {
      await sendCommand({
        namespace: "rtc",
        target: "offscreen",
        action: "reset",
        payload,
      });
    },

    async peerJoined(peerId) {
      await sendCommand({
        namespace: "rtc",
        target: "offscreen",
        action: "peer-joined",
        payload: { peerId },
      });
    },

    async peerLeft(peerId) {
      await sendCommand({
        namespace: "rtc",
        target: "offscreen",
        action: "peer-left",
        payload: { peerId },
      });
    },

    async receiveSignal(payload) {
      await sendCommand({
        namespace: "rtc",
        target: "offscreen",
        action: "signal",
        payload,
      });
    },

    async sendMessage(text) {
      const response = await sendCommand({
        namespace: "rtc",
        target: "offscreen",
        action: "send",
        payload: { text },
      });

      return {
        sent: "sent" in response ? response.sent : false,
        reason: "reason" in response ? response.reason : undefined,
      };
    },

    async disconnect() {
      await sendCommand({
        namespace: "rtc",
        target: "offscreen",
        action: "disconnect",
      });
    },

    dispose() {
      chromeApi.runtime.onMessage.removeListener?.(onMessage);
    },
  };
}
