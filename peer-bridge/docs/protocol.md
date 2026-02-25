# Peer Bridge – Signaling Protocol (Phase 3)

This document describes the WebSocket protocol between the
Chrome extension client and the Node.js signaling server in Phase 3.

All messages are **JSON objects** serialized as UTF-8 text frames.

---

## Client → Server

### `join`
Sent once after the WebSocket connection is open.
Handles both room creation and join.

```json
{
  "type": "join",
  "flow": "create",
  "room": "<uuidv4-roomId>",
  "username": "<username>",
  "passcode": "<passcode>"
}
```

| Field    | Type   | Description |
|----------|--------|-------------|
| type     | string | `"join"` |
| flow     | string | `"create"` or `"join"` |
| room     | string | UUIDv4 room identifier |
| username | string | Required, unique within room |
| passcode | string | Required, 6-32 characters |

---

### `message`
Send a text message to all other peers in the room.

```json
{ "type": "message", "room": "<roomId>", "text": "<text>" }
```

| Field | Type   | Description |
|-------|--------|-------------|
| type  | string | `"message"` |
| room  | string | Must match the room the client joined |
| text  | string | The message body |

---

## Server → Client

### `joined`
Sent to the client that just successfully joined a room.

```json
{
  "type": "joined",
  "room": "<roomId>",
  "username": "<username>",
  "peers": 2,
  "capacity": 10
}
```

| Field    | Type   | Description |
|----------|--------|-------------|
| type     | string | `"joined"` |
| room     | string | The room that was joined |
| username | string | Username accepted by the server |
| peers    | number | Total members in room (including self) |
| capacity | number | Room max capacity (always 10) |

---

### `presence`
Broadcast when members join/leave, so clients can update member count.

```json
{ "type": "presence", "peers": 4, "capacity": 10 }
```

| Field    | Type   | Description |
|----------|--------|-------------|
| type     | string | `"presence"` |
| peers    | number | Current room member count |
| capacity | number | Room max capacity |

---

### `message`
Delivered to every peer in the room except the sender.

```json
{ "type": "message", "from": "<username>", "text": "<text>" }
```

| Field | Type   | Description |
|-------|--------|-------------|
| type  | string | `"message"` |
| from  | string | Username of the sender |
| text  | string | The message body |

---

### `error`
Sent when join validation fails.

```json
{ "type": "error", "code": "ROOM_FULL", "message": "room is full (10/10)" }
```

| Code                     | Meaning |
|--------------------------|---------|
| `INVALID_ROOM_ID`        | room is not valid UUIDv4 |
| `INVALID_USERNAME`       | username missing |
| `INVALID_PASSCODE_FORMAT`| passcode not 6-32 chars |
| `ROOM_NOT_FOUND`         | join flow on non-existing room |
| `INVALID_PASSCODE`       | passcode mismatch |
| `DUPLICATE_USERNAME`     | username already exists in room |
| `ROOM_FULL`              | room has reached 10 members |
