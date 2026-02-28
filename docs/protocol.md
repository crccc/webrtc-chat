# Peer Bridge Signaling Protocol (Realtime)

This document describes the signaling protocol between extension clients and the
Node.js signaling server. Chat text payloads are sent through WebRTC DataChannels,
not through WebSocket `message` broadcasts.

This document covers only the external client/server signaling protocol. The
extension's internal background-to-offscreen runtime bridge is an implementation
detail and is documented in [architecture.md](architecture.md).

All signaling frames are JSON objects sent over WebSocket text frames.

## Client -> Server

### `join`

```json
{
  "action": "join",
  "flow": "create",
  "room": "<uuidv4-roomId>",
  "username": "<username>",
  "passcode": "<passcode>"
}
```

| Field | Type | Description |
| --- | --- | --- |
| `action` | string | `join` |
| `flow` | string | `create` or `join` |
| `room` | string | UUIDv4 room id |
| `username` | string | Required, unique in room |
| `passcode` | string | Required, 6-32 characters |

### `offer` / `answer` / `ice`

```json
{
  "action": "offer",
  "to": "<targetPeerId>",
  "payload": { "...": "rtc payload" }
}
```

| Field | Type | Description |
| --- | --- | --- |
| `action` | string | `offer`, `answer`, or `ice` |
| `to` | string | Target peer id in same room |
| `payload` | object | Signaling payload for that action |

## Server -> Client

### `joined`

```json
{
  "type": "joined",
  "room": "<roomId>",
  "peerId": "<selfPeerId>",
  "peerList": ["<existingPeerId>"],
  "username": "<username>",
  "peers": 2,
  "capacity": 8
}
```

### `signal.joined`

Sent to existing peers when a new peer joins.

```json
{ "type": "signal.joined", "peerId": "<newPeerId>" }
```

### `signal.left`

Sent to remaining peers when a peer leaves.

```json
{ "type": "signal.left", "peerId": "<leftPeerId>" }
```

### `presence`

```json
{ "type": "presence", "peers": 4, "capacity": 8 }
```

### `offer` / `answer` / `ice` relay

```json
{
  "type": "offer",
  "from": "<senderPeerId>",
  "payload": { "...": "rtc payload" }
}
```

### `error`

```json
{ "type": "error", "code": "ROOM_FULL", "message": "room is full (8/8)" }
```

| Code | Meaning |
| --- | --- |
| `INVALID_ROOM_ID` | Room id is not UUIDv4 |
| `INVALID_USERNAME` | Username missing |
| `INVALID_PASSCODE_FORMAT` | Passcode not 6-32 chars |
| `ROOM_NOT_FOUND` | Join flow on non-existing room |
| `INVALID_PASSCODE` | Passcode mismatch |
| `DUPLICATE_USERNAME` | Username already exists in room |
| `ROOM_FULL` | Room reached 8 participants |
| `UNSUPPORTED_ACTION` | Unknown or legacy action |
| `NOT_IN_ROOM` | Signaling action sent before join |
| `INVALID_SIGNAL_PAYLOAD` | Missing/invalid `to` or `payload` |
| `TARGET_NOT_FOUND` | Target peer not in sender room |
