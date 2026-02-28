# Peer Bridge

**Peer Bridge** is a minimal, room-based realtime messaging system for Chrome extensions.
Two (or more) instances of the extension join the same room, negotiate peer links
over a lightweight WebSocket signaling server, and exchange chat messages over WebRTC DataChannels.
The extension keeps room/session ownership in the Manifest V3 background service worker,
while the actual WebRTC peer connections run inside an offscreen document. That split
keeps sidepanel close/reopen from dropping an active session by itself without trying
to run `RTCPeerConnection` inside the MV3 service worker.

---

## Project Structure

```
webrtc-chat/
  extension/       # Chrome Extension (Manifest V3) + WXT + React
    package.json
    wxt.config.ts
    entrypoints/   # background + sidepanel + offscreen document entrypoints
    src/           # React source + offscreen/runtime/session modules
    .output/       # WXT build output (git-ignored)
  server/          # Node.js WebSocket signaling server
  docs/            # Protocol documentation
  plans/           # Task plans and completion log
```

---

## Quick Start

### 1. Start the server

```bash
cd server
npm install
npm start
# Listening on ws://localhost:8888
```

### 2. Build the extension

```bash
cd extension
npm install
npm run build
```

Set `PEER_BRIDGE_SIGNALING_URL` for non-development builds. In development, the extension defaults to `ws://localhost:8888`.

```bash
cd extension
PEER_BRIDGE_SIGNALING_URL=wss://signal.example.com npm run build
```

The extension uses the `offscreen`, `sidePanel`, and `storage` permissions. It persists the created room id in
`chrome.storage.local`, with a safe `localStorage` fallback for unsupported contexts.
You can also override the signaling server URL from the Home screen; that value is
stored in extension storage and takes precedence over the default development endpoint
for subsequent connect attempts.

### 3. Load the extension

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select `extension/.output/chrome-mv3`.
4. If `.output` is not visible in Finder, press `Cmd + Shift + .` to show hidden folders.

### 4. Develop with hot reload

```bash
cd extension
npm run dev
# Starts WXT dev mode with extension-aware reload/HMR
# Use the printed .output/chrome-mv3 path for "Load unpacked" during dev
```

### 5. Validate the extension package

```bash
cd extension
npm test
npm run lint
npm run typecheck
```

---

## Protocol

See [docs/protocol.md](docs/protocol.md) for the full message specification.

## Architecture

See [docs/architecture.md](docs/architecture.md) for architecture diagrams and
behavior flow walkthroughs, including the background bootstrap layer in
`src/session/backgroundRuntime.ts`, the offscreen RTC bridge in
`src/session/offscreenBridge.ts`, and the offscreen WebRTC runtime in
`src/offscreen/main.ts`.

## Manual Smoke

See [docs/extension-lifecycle-smoke.md](docs/extension-lifecycle-smoke.md) for the
extension lifecycle smoke checklist covering reload, reopen, disable-enable, and tab refresh scenarios.

## Automated Smoke

Lifecycle-oriented extension smoke coverage now lives in:

- `extension/test/smoke.test.tsx`
- `extension/test/background-lifecycle.test.ts`
