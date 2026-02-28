# Extension Lifecycle Smoke Checklist

Use this checklist when validating a local build or a reloaded unpacked extension.

## Automated Coverage

The fast lifecycle smoke coverage in this repo is split across:

- `extension/test/smoke.test.tsx` for sidepanel runtime-client hydration, controlled interruption handling, and listener cleanup
- `extension/test/background-lifecycle.test.ts` for background bootstrap wiring, meaning the background runtime setup path, plus runtime routing and state broadcast behavior

## Manual Checklist

1. Install or reload the unpacked extension from `chrome://extensions`.
   Expected: the background service worker starts without errors in the service worker inspector.
2. Click the toolbar icon to open the sidepanel.
   Expected: the sidepanel renders `Create Room` and `Join Room` without runtime messaging errors.
3. Create a room with the signaling server running.
   Expected: the sidepanel enters chat, the background service worker stays alive, and the room id is persisted.
4. Close and reopen the sidepanel while the session is active.
   Expected: chat state restores from the background session snapshot and does not disconnect just because the panel closed.
5. Reload the extension while the sidepanel is open.
   Expected: the sidepanel falls back to a controlled disconnected or idle state; no uncaught exception or hung loading state.
6. Disable and re-enable the extension.
   Expected: a fresh background service worker starts and the sidepanel can open again cleanly.
7. Refresh the active browser tab, then reopen the sidepanel.
   Expected: the extension UI still boots, and a persisted created room id restores the create flow if present.

## Failure Signals To Check

- Service worker inspector shows uncaught exceptions.
- Sidepanel shows `The message port closed before a response was received`.
- Connect or reconnect attempts leave the UI stuck in a transient state.
- Reopening the sidepanel duplicates event handling or message history unexpectedly.
