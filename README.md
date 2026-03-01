# Peer Bridge

Peer Bridge is a room-based realtime chat Chrome extension. Peers join the same
room through a WebSocket signaling server, then exchange chat messages over
WebRTC DataChannels.

The extension is structured around Manifest V3 runtime boundaries:

- `background/` owns signaling, session state, and Chrome runtime wiring
- `offscreen/` owns `RTCPeerConnection` and `RTCDataChannel`
- `sidepanel/` owns the visible React UI
- `shared/` holds types, config, storage helpers, and cross-runtime protocol

## Project Structure

```text
webrtc-chat/
  extension/
    entrypoints/
      background.ts
      offscreen.html
      sidepanel/main.tsx
    src/
      background/
      offscreen/
      shared/
      sidepanel/
    wxt.config.ts
    vite-env.d.ts
  server/
  docs/
  plans/
```

## Quick Start

### 1. Start the signaling server

```bash
cd server
npm install
npm start
```

Default local endpoint:

```text
ws://localhost:8888
```

### 2. Build the extension

```bash
cd extension
npm install
npm run build
```

For non-development builds, set `PEER_BRIDGE_SIGNALING_URL`:

```bash
cd extension
PEER_BRIDGE_SIGNALING_URL=wss://signal.example.com npm run build
```

### 3. Load the extension in Chrome

1. Open `chrome://extensions`
2. Enable Developer mode
3. Click Load unpacked
4. Select `extension/.output/chrome-mv3`

### 4. Develop with hot reload

```bash
cd extension
npm run dev
```

### 5. Validate the extension

```bash
cd extension
npm test
npm run typecheck
npm run build
```

`npm run lint` still reports some pre-existing React lint findings outside this
runtime-folder refactor.

## Extension Notes

- Permissions used: `offscreen`, `sidePanel`, `storage`
- The sidepanel can be closed and reopened without immediately losing the active
  session, because RTC runs in the offscreen document instead of the visible UI
- The signaling server URL can be overridden from the home screen and is stored
  in extension storage

## Documentation

- [Architecture](docs/architecture.md)
- [Protocol](docs/protocol.md)
- [Extension Lifecycle Smoke](docs/extension-lifecycle-smoke.md)

## Automated Coverage

- `extension/test/background-lifecycle.test.ts`
- `extension/test/background-session-runtime.test.ts`
- `extension/test/session-manager-config.test.ts`
- `extension/test/smoke.test.tsx`
