# Peer Bridge

**Peer Bridge** is a minimal, room-based realtime messaging system for Chrome extensions.
Two (or more) instances of the extension join the same room, negotiate peer links
over a lightweight WebSocket signaling server, and exchange chat messages over WebRTC DataChannels.

---

## Project Structure

```
peer-bridge/
  extension/       # Chrome Extension (Manifest V3) + Vite/React UI source
    manifest.json
    background.js
    package.json
    vite.config.js
    index.html
    src/           # React source
    dist/          # Built extension UI (git-ignored)
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
# Listening on ws://localhost:3000
```

### 2. Build the extension UI

```bash
cd extension
npm install
npm run build
```

### 3. Load the extension

1. Open `chrome://extensions` in Chrome.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `extension/` folder.

### 4. Develop with hot reload

```bash
cd extension
npm run dev
# Opens a local Vite dev server at http://localhost:5173 for rapid UI iteration
# Re-run `npm run build` and reload the extension to test changes in Chrome
```

---

## Protocol

See [docs/protocol.md](docs/protocol.md) for the full message specification.
