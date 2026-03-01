import { vi } from "vitest";
import type {
  BackgroundSessionSnapshot,
  RuntimeSessionMessage,
} from "../../src/shared/sessionTypes";

type RuntimeMessageListener = (
  message: RuntimeSessionMessage,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response: unknown) => void,
) => boolean | void;

function installChromeGlobal(chromeApi: typeof chrome) {
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    value: chromeApi,
  });
}

export function createSidepanelChromeRuntimeTestHarness({
  statusSnapshot,
  lastErrorMessage,
}: {
  statusSnapshot?: BackgroundSessionSnapshot;
  lastErrorMessage?: string;
} = {}) {
  const runtimeListeners = new Set<(message: RuntimeSessionMessage) => void>();
  const runtimeState: { lastError?: { message: string } } = {};

  const runtimeApi = {
    sendMessage: vi.fn((message: RuntimeSessionMessage, callback?: (response: unknown) => void) => {
        if (typeof callback !== "function") {
          return Promise.resolve(undefined);
        }

        if (lastErrorMessage) {
          runtimeState.lastError = { message: lastErrorMessage };
          callback(undefined);
          runtimeState.lastError = undefined;
          return;
        }

        if (message.action === "status") {
          callback({
            ok: true,
            snapshot:
              statusSnapshot ??
              ({
                roomId: null,
                role: null,
                messages: [],
                status: "idle",
                peers: 0,
                capacity: 8,
                error: null,
              } satisfies BackgroundSessionSnapshot),
          });
          return;
        }

        callback({ ok: true });
      }),
    onMessage: {
      addListener: vi.fn((listener: (message: RuntimeSessionMessage) => void) => {
        runtimeListeners.add(listener);
      }),
      removeListener: vi.fn((listener: (message: RuntimeSessionMessage) => void) => {
        runtimeListeners.delete(listener);
      }),
    },
  };

  const chromeApi = {
    runtime: runtimeApi,
  } as unknown as typeof chrome;

  Object.defineProperty(runtimeApi, "lastError", {
    configurable: true,
    get: () => runtimeState.lastError,
  });

  installChromeGlobal(chromeApi);

  return {
    chrome: chromeApi,
    emitRuntimeMessage(message: RuntimeSessionMessage) {
      for (const listener of runtimeListeners) {
        listener(message);
      }
    },
    getRuntimeListenerCount() {
      return runtimeListeners.size;
    },
  };
}

export function createBackgroundRuntimeTestHarness() {
  const onInstalledListeners = new Set<() => void>();
  const onActionClickedListeners = new Set<(tab: chrome.tabs.Tab) => void>();
  const onMessageListeners = new Set<RuntimeMessageListener>();

  const chromeApi = {
    runtime: {
      onInstalled: {
        addListener: vi.fn((listener: () => void) => {
          onInstalledListeners.add(listener);
        }),
        removeListener: vi.fn((listener: () => void) => {
          onInstalledListeners.delete(listener);
        }),
      },
      onMessage: {
        addListener: vi.fn((listener: RuntimeMessageListener) => {
          onMessageListeners.add(listener);
        }),
        removeListener: vi.fn((listener: RuntimeMessageListener) => {
          onMessageListeners.delete(listener);
        }),
      },
      sendMessage: vi.fn(async () => undefined),
    },
    action: {
      onClicked: {
        addListener: vi.fn((listener: (tab: chrome.tabs.Tab) => void) => {
          onActionClickedListeners.add(listener);
        }),
        removeListener: vi.fn((listener: (tab: chrome.tabs.Tab) => void) => {
          onActionClickedListeners.delete(listener);
        }),
      },
    },
    sidePanel: {
      open: vi.fn(async () => undefined),
    },
  } as unknown as typeof chrome;

  return {
    chrome: chromeApi,
    sendMessage: chromeApi.runtime.sendMessage,
    onInstalledListenerCount() {
      return onInstalledListeners.size;
    },
    onMessageListenerCount() {
      return onMessageListeners.size;
    },
    async dispatchRuntimeMessage(message: RuntimeSessionMessage) {
      const listeners = Array.from(onMessageListeners);
      const listener = listeners[0];
      if (!listener) return undefined;

      return await new Promise((resolve) => {
        listener(message, {} as chrome.runtime.MessageSender, resolve);
      });
    },
  };
}
