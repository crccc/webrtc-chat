import { useCallback, useEffect, useState } from "react";
import {
  decodeChannelMessage,
  getDefaultSessionSnapshot,
  getServerErrorMessage,
  shouldInitiateOffer,
} from "../session/sessionManager";
import type {
  BackgroundSessionSnapshot,
  ConnectArgs,
  ConnectResult,
  RealtimeHookResult,
  RuntimeSessionMessage,
  RuntimeSessionResponse,
} from "../types";

function canUseRuntimeApi(): boolean {
  return (
    typeof chrome !== "undefined" &&
    !!chrome.runtime &&
    typeof chrome.runtime.sendMessage === "function"
  );
}

function sendRuntimeMessage(message: RuntimeSessionMessage): Promise<RuntimeSessionResponse> {
  if (!canUseRuntimeApi()) {
    return Promise.resolve({
      ok: false,
      message: "Background session runtime is unavailable.",
    });
  }

  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response: RuntimeSessionResponse) => {
      if (chrome.runtime.lastError) {
        resolve({
          ok: false,
          message: chrome.runtime.lastError.message || "Background session runtime is unavailable.",
        });
        return;
      }

      resolve(response);
    });
  });
}

export { decodeChannelMessage, getServerErrorMessage, shouldInitiateOffer };

export function useWebSocket(): RealtimeHookResult {
  const [snapshot, setSnapshot] = useState<BackgroundSessionSnapshot>(getDefaultSessionSnapshot);

  const refreshSnapshot = useCallback(async () => {
    const response = await sendRuntimeMessage({
      namespace: "session",
      action: "status",
    });

    if (response.ok && "snapshot" in response) {
      setSnapshot(response.snapshot);
      return response.snapshot;
    }

    setSnapshot((current) => ({
      ...current,
      status: "disconnected",
      error: response.ok ? null : response,
    }));
    return null;
  }, []);

  useEffect(() => {
    void refreshSnapshot();

    if (
      typeof chrome === "undefined" ||
      !chrome.runtime ||
      !chrome.runtime.onMessage ||
      typeof chrome.runtime.onMessage.addListener !== "function"
    ) {
      return undefined;
    }

    const listener = (message: RuntimeSessionMessage) => {
      if (
        message.namespace !== "session" ||
        message.action !== "state" ||
        !message.payload ||
        !("snapshot" in message.payload)
      ) {
        return;
      }

      setSnapshot(message.payload.snapshot);
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, [refreshSnapshot]);

  const connect = useCallback(async (args: ConnectArgs): Promise<ConnectResult> => {
    const response = await sendRuntimeMessage({
      namespace: "session",
      action: "connect",
      payload: args,
    });

    await refreshSnapshot();
    return response as ConnectResult;
  }, [refreshSnapshot]);

  const disconnect = useCallback(() => {
    void sendRuntimeMessage({
      namespace: "session",
      action: "disconnect",
    }).then(() => refreshSnapshot());
  }, [refreshSnapshot]);

  const sendMessage = useCallback((text: string) => {
    void sendRuntimeMessage({
      namespace: "session",
      action: "send",
      payload: { text },
    });
  }, []);

  return {
    connect,
    disconnect,
    sendMessage,
    roomId: snapshot.roomId,
    role: snapshot.role,
    messages: snapshot.messages,
    status: snapshot.status,
    peers: snapshot.peers,
    capacity: snapshot.capacity,
  };
}
