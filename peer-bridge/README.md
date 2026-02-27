# Peer Bridge

**Peer Bridge** is a minimal, room-based realtime messaging system for Chrome extensions.
Two (or more) instances of the extension join the same room, negotiate peer links
over a lightweight WebSocket signaling server, and exchange chat messages over WebRTC DataChannels.

---

## Project Structure

```
peer-bridge/
  extension/       # Chrome Extension (Manifest V3) + WXT + React
    package.json
    wxt.config.ts
    entrypoints/   # background + sidepanel entrypoints
    src/           # React source
    .output/       # WXT build output (git-ignored)
  server/          # Node.js WebSocket signaling server
  docs/            # Protocol documentation
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

---

## Protocol

See [docs/protocol.md](docs/protocol.md) for the full message specification.
