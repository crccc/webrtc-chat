# Peer Bridge Architecture

This document explains how the extension, signaling server, and WebRTC layer fit
together, and what objects/components are involved in each major behavior.

## High-Level Architecture

```mermaid
flowchart LR
  User[User]
  BG[WXT Background<br/>entrypoints/background.ts]
  SP[Sidepanel Entry<br/>entrypoints/sidepanel/main.tsx]
  App[React App<br/>src/App.tsx]
  Hook[Runtime Client Hook<br/>src/hooks/useWebSocket.ts]
  Store[Chrome Storage<br/>src/utils/storage.ts]
  Runtime[Runtime Config<br/>src/config/runtime.ts]
  Bootstrap[Background Bootstrap<br/>src/session/backgroundRuntime.ts]
  Session[Background Session Manager<br/>src/session/sessionManager.ts]
  UUID[UUID Helper<br/>src/utils/uuid.ts]
  ICE[ICE Config<br/>src/webrtc/iceConfig.ts]
  WS[WebSocket Signaling<br/>resolved ws/wss endpoint]
  Server[Node Signaling Server<br/>server/index.js]
  RTC[RTCPeerConnection Map<br/>background-owned]
  DC[RTCDataChannel chat]
  Peer[Other Extension Instance]

  User --> BG
  BG --> SP
  SP --> App
  App --> Store
  App --> UUID
  App --> Hook
  Hook --> BG
  BG --> Bootstrap
  Bootstrap --> Runtime
  Bootstrap --> Session
  Session --> ICE
  Session --> WS
  WS --> Server
  Session --> RTC
  RTC --> DC
  DC --> Peer
```

## Extension Runtime Structure

In this document, `bootstrap` means the background runtime setup layer: the code
that wires Chrome extension events and messaging to the session controller during startup.

```mermaid
flowchart TD
  Background[background.ts<br/>Opens sidepanel + owns session lifecycle]
  Sidepanel[sidepanel/main.tsx<br/>Mounts React root]
  App[App.tsx<br/>View + async storage hydration]
  Create[CreateRoomSection.tsx]
  Join[JoinSection.tsx]
  Home[HomeSection.tsx]
  Chat[ChatSection.tsx]
  Hook[useWebSocket.ts<br/>Runtime messaging client]
  Bootstrap[backgroundRuntime.ts<br/>Registers runtime listeners]
  Session[sessionManager.ts<br/>Signaling + WebRTC orchestration]

  Background --> Sidepanel
  Sidepanel --> App
  App --> Home
  App --> Create
  App --> Join
  App --> Chat
  App --> Hook
  Background --> Bootstrap
  Bootstrap --> Session
  Hook --> Bootstrap
```

## Core Objects

| Object / State | Location | Responsibility |
| --- | --- | --- |
| `view` | `src/App.tsx` | Chooses `home/create/join/chat` screen |
| `createdRoomId` | `src/App.tsx` | Async persisted owner room id used to restore create flow |
| `sessionRef` | `src/App.tsx` | Tracks latest UI-visible room state for disconnect cleanup |
| `snapshot` | `src/hooks/useWebSocket.ts` | Sidepanel copy of background session state |
| `setupBackgroundRuntime` | `src/session/backgroundRuntime.ts` | Wires Chrome runtime events and messaging to the background session controller |
| `socket` | `src/session/sessionManager.ts` | Active signaling WebSocket owned by background |
| `peerId` | `src/session/sessionManager.ts` | Local peer id assigned by server |
| `peers` | `src/session/sessionManager.ts` | `Map<peerId, { pc, dc }>` for all remote peers |
| `messages` | `src/session/sessionManager.ts` | Chat timeline broadcast back to the sidepanel |
| `resolveSignalingEndpoint` | `src/config/runtime.ts` | Resolves env-backed websocket endpoint |
| `rooms` | `server/index.js` | Server-side room registry |
| `peersById` | `server/index.js` | Server-side lookup from `peerId` to socket |

## Control Plane vs Data Plane

Peer Bridge intentionally splits responsibilities into two layers:

### Control Plane: signaling server

The signaling server remains responsible for session coordination:

- Room create/join validation
- Passcode enforcement
- Username uniqueness
- Capacity limits
- `peerId` assignment
- Presence updates
- `offer` / `answer` / `ice` relay
- Peer join/leave notifications

This is the part that answers:

- Who is in the room?
- Is this join allowed?
- Which peer should I negotiate with?
- How do I reach the remote peer's signaling endpoint?

### Data Plane: peer-to-peer WebRTC

Once negotiation succeeds, the peers talk directly over WebRTC:

- Chat text over `RTCDataChannel`
- Future audio/video media tracks
- Future peer-to-peer collaborative events

This is the part that answers:

- What message did the user send?
- What media/data should the other peer receive?

### Why not move room management to peers too?

That is possible only in a very constrained model. In practice, it breaks down
once any of these happen:

- A new peer joins after the first connection is established
- A peer refreshes or reconnects
- Network conditions change and renegotiation is needed
- Permissions, room access, or capacity must be enforced consistently

Because of that, Peer Bridge keeps **room/session orchestration on the server**
while moving **chat/media payloads off the server**.

### Design Summary

- Signaling server manages the **control plane**
- WebRTC peers manage the **data plane**
- Chat should be peer-to-peer
- Session coordination should remain centralized

## Flow: Open Extension To Sidepanel UI

```mermaid
sequenceDiagram
  participant U as User
  participant BG as background.ts
  participant SP as sidepanel/main.tsx
  participant App as App.tsx
  participant Store as storage.ts

  U->>BG: Click extension icon
  BG->>BG: chrome.sidePanel.open(tabId)
  BG->>SP: Open sidepanel page
  SP->>App: Mount React app
  App->>Store: getCreatedRoomId()
  Store-->>App: Promise<roomId | null>
  App-->>U: Render home or create screen
```

## Flow: Create Or Join A Room

```mermaid
sequenceDiagram
  participant U as User
  participant UI as App + Form Section
  participant Hook as useWebSocket.ts
  participant BG as background.ts
  participant Session as sessionManager.ts
  participant WS as WebSocket
  participant S as server/index.js

  U->>UI: Submit create/join form
  UI->>Hook: connect({ roomId, username, passcode, flow })
  Hook->>BG: chrome.runtime.sendMessage(connect)
  BG->>Session: connect(...)
  Session->>WS: open resolved ws/wss endpoint
  WS->>S: { action:"join", ... }
  S->>S: Validate room/passcode/capacity
  S-->>WS: { type:"joined", peerId, peerList, peers, capacity }
  WS-->>Session: joined payload
  Session->>BG: publish snapshot update
  BG-->>Hook: runtime state message
  BG-->>Hook: connect response
  Hook-->>UI: resolve { ok:true } + refresh snapshot
  UI-->>U: Enter chat screen
```

## Flow: Peer Discovery And WebRTC Negotiation

```mermaid
sequenceDiagram
  participant A as Extension A Background Session
  participant S as Signaling Server
  participant B as Extension B Background Session

  B->>S: join room
  S-->>B: joined(peerId, peerList=[A])
  S-->>A: signal.joined(peerId=B)

  Note over A,B: Deterministic offerer rule: smaller peerId initiates

  A->>A: ensurePeerConnection(B, initiator=true)
  A->>S: offer(to=B, payload=localDescription)
  S-->>B: offer(from=A, payload)
  B->>B: setRemoteDescription(offer)
  B->>B: createAnswer()
  B->>S: answer(to=A, payload=localDescription)
  S-->>A: answer(from=B, payload)
  A->>A: setRemoteDescription(answer)
  A->>S: ice(...)
  B->>S: ice(...)
```

## Flow: Send Chat Message

```mermaid
sequenceDiagram
  participant U as User
  participant Chat as ChatSection.tsx
  participant Hook as useWebSocket.ts
  participant BG as background.ts
  participant Session as sessionManager.ts
  participant DC as RTCDataChannel
  participant Peer as Remote Extension

  U->>Chat: Type message + click Send
  Chat->>Hook: onSend(trimmedText)
  Hook->>BG: chrome.runtime.sendMessage(send)
  BG->>Session: sendMessage(trimmedText)
  Session->>DC: dc.send({ type:"chat", from, text })
  DC-->>Peer: DataChannel payload
  Peer->>Peer: decodeChannelMessage()
  Peer->>Peer: append incoming chat to messages
```

## Flow: Sidepanel Close/Reopen

```mermaid
sequenceDiagram
  participant SP as Sidepanel
  participant BG as background.ts
  participant Session as sessionManager.ts

  SP-xBG: Sidepanel closes
  Note over BG,Session: Background session remains active
  SP->>BG: Sidepanel reopens and requests status
  BG->>Session: getSnapshot()
  BG-->>SP: current session snapshot
```

## Flow: Disconnect / Peer Leave

```mermaid
sequenceDiagram
  participant Leaving as Leaving Peer
  participant S as Signaling Server
  participant Remaining as Remaining Peer Background Session

  Leaving-xS: socket close
  S->>S: Remove socket from room + peersById
  S-->>Remaining: signal.left(peerId)
  S-->>Remaining: presence(peers, capacity)
  Remaining->>Remaining: closePeer(peerId)
  Remaining->>Remaining: Update peer count + broadcast snapshot
```

## Behavior Mapping

| Behavior | Main Files Visited |
| --- | --- |
| Open sidepanel | `entrypoints/background.ts` -> `entrypoints/sidepanel/main.tsx` -> `src/App.tsx` |
| Create room | `CreateRoomSection.tsx` -> `App.tsx` -> `useWebSocket.ts` -> `background.ts` -> `backgroundRuntime.ts` -> `sessionManager.ts` -> `server/index.js` |
| Join room | `JoinSection.tsx` -> `App.tsx` -> `useWebSocket.ts` -> `background.ts` -> `backgroundRuntime.ts` -> `sessionManager.ts` -> `server/index.js` |
| Background bootstrap | `entrypoints/background.ts` -> `session/backgroundRuntime.ts` |
| Signaling relay | `sessionManager.ts` -> `server/index.js` -> remote `sessionManager.ts` |
| WebRTC setup | `sessionManager.ts` -> `iceConfig.ts` -> browser `RTCPeerConnection` |
| Chat send | `ChatSection.tsx` -> `useWebSocket.ts` -> `background.ts` -> `backgroundRuntime.ts` -> `sessionManager.ts` -> `RTCDataChannel` |
| Created-room persistence | `App.tsx` -> `utils/storage.ts` -> `chrome.storage.local` |
| Sidepanel reopen restore | `App.tsx` -> `useWebSocket.ts` -> `background.ts` -> `backgroundRuntime.ts` -> `sessionManager.ts` |

## Related Docs

- [Protocol](./protocol.md)
- [Extension Lifecycle Smoke](./extension-lifecycle-smoke.md)
- [README](../README.md)
