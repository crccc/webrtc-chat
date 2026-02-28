import {
  handleSessionMessageSafely,
  type BackgroundSessionController,
  isRuntimeSessionMessage,
} from "./runtime";
import type { BackgroundSessionSnapshot, RuntimeSessionMessage } from "../types";

export interface BackgroundRuntimeController extends BackgroundSessionController {
  subscribe: (listener: (snapshot: BackgroundSessionSnapshot) => void) => () => void;
}

interface EventTargetLike<T> {
  addListener: (listener: T) => void;
  removeListener?: (listener: T) => void;
}

export interface BackgroundChromeApi {
  runtime: {
    onInstalled: EventTargetLike<() => void>;
    onMessage: EventTargetLike<
      (
        message: unknown,
        sender: chrome.runtime.MessageSender,
        sendResponse: (response: unknown) => void,
      ) => boolean | void
    >;
    sendMessage: (message: RuntimeSessionMessage) => Promise<unknown> | unknown;
  };
  action: {
    onClicked: EventTargetLike<(tab: chrome.tabs.Tab) => void>;
  };
  sidePanel: {
    open: (options: { tabId: number }) => Promise<void> | void;
  };
}

export function setupBackgroundRuntime({
  controller,
  chromeApi,
}: {
  controller: BackgroundRuntimeController;
  chromeApi: BackgroundChromeApi;
}) {
  const unsubscribe = controller.subscribe((snapshot) => {
    void Promise.resolve(
      chromeApi.runtime.sendMessage({
        namespace: "session",
        action: "state",
        payload: { snapshot },
      } satisfies RuntimeSessionMessage),
    ).catch(() => {
      // Sidepanel may be closed; ignore missing listeners.
    });
  });

  const onInstalled = () => {
    console.log("[peer-bridge] Extension installed.");
  };

  const onActionClicked = (tab: chrome.tabs.Tab) => {
    if (!tab?.id) return;
    console.log("[peer-bridge] Toolbar icon clicked. Opening side panel...");
    void chromeApi.sidePanel.open({ tabId: tab.id });
  };

  const onMessage = (
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response: unknown) => void,
  ) => {
    if (!isRuntimeSessionMessage(message) || message.action === "state") {
      return undefined;
    }

    void handleSessionMessageSafely(controller, message).then(sendResponse);
    return true;
  };

  chromeApi.runtime.onInstalled.addListener(onInstalled);
  chromeApi.action.onClicked.addListener(onActionClicked);
  chromeApi.runtime.onMessage.addListener(onMessage);

  return {
    dispose() {
      unsubscribe();
      chromeApi.runtime.onInstalled.removeListener?.(onInstalled);
      chromeApi.action.onClicked.removeListener?.(onActionClicked);
      chromeApi.runtime.onMessage.removeListener?.(onMessage);
    },
  };
}
