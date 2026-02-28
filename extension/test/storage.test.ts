import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearCreatedRoomId,
  getCreatedRoomId,
  setCreatedRoomId,
} from "../src/utils/storage";

type ChromeGlobal = { chrome?: typeof chrome };

function createChromeStorageMock() {
  let store: Record<string, string> = {};

  return {
    area: {
      get: vi.fn(async (key: string) => ({ [key]: store[key] })),
      set: vi.fn(async (next: Record<string, string>) => {
        store = { ...store, ...next };
      }),
      remove: vi.fn(async (key: string) => {
        delete store[key];
      }),
    },
    getStore: () => ({ ...store }),
  };
}

function installFallbackStorage() {
  let store: Record<string, string> = {};

  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => (key in store ? store[key] : null),
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
    },
  });
}

describe("created room storage", () => {
  beforeEach(() => {
    installFallbackStorage();
    delete (globalThis as ChromeGlobal).chrome;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("persists and restores room id with chrome.storage.local", async () => {
    const storage = createChromeStorageMock();
    (globalThis as ChromeGlobal).chrome = {
      storage: {
        local: storage.area,
      },
    } as unknown as typeof chrome;

    await setCreatedRoomId("room-1");

    expect(storage.area.set).toHaveBeenCalledTimes(1);
    await expect(getCreatedRoomId()).resolves.toBe("room-1");

    await clearCreatedRoomId();
    await expect(getCreatedRoomId()).resolves.toBeNull();
    expect(storage.area.remove).toHaveBeenCalledTimes(1);
  });

  it("falls back safely when chrome storage is unavailable or rejects", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    (globalThis as ChromeGlobal).chrome = {
      storage: {
        local: {
          get: vi.fn(async () => {
            throw new Error("blocked");
          }),
          set: vi.fn(async () => {
            throw new Error("blocked");
          }),
          remove: vi.fn(async () => {
            throw new Error("blocked");
          }),
        },
      },
    } as unknown as typeof chrome;

    window.localStorage.setItem("peer-bridge:created-room-id", "room-fallback");

    await expect(getCreatedRoomId()).resolves.toBe("room-fallback");
    await expect(setCreatedRoomId("room-next")).resolves.toBeUndefined();
    expect(window.localStorage.getItem("peer-bridge:created-room-id")).toBe("room-next");
    await expect(clearCreatedRoomId()).resolves.toBeUndefined();
    expect(window.localStorage.getItem("peer-bridge:created-room-id")).toBeNull();
    expect(warn).toHaveBeenCalled();
  });

  it("ignores blank room ids consistently", async () => {
    const storage = createChromeStorageMock();
    (globalThis as ChromeGlobal).chrome = {
      storage: {
        local: storage.area,
      },
    } as unknown as typeof chrome;

    await setCreatedRoomId("   ");

    expect(storage.area.set).not.toHaveBeenCalled();
    await expect(getCreatedRoomId()).resolves.toBeNull();
  });
});
