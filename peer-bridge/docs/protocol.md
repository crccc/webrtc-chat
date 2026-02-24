# Peer Bridge – Signaling Protocol (Phase 1)

This document describes the WebSocket message protocol used between the
Chrome extension (client) and the Node.js signaling server in Phase 1.

All messages are **JSON objects** serialized as UTF-8 text frames.

---

## Client → Server

### `join`
Sent once after the WebSocket connection is open.
Registers the client in the specified room.

```json
{ "type": "join", "room": "<roomId>" }
```

| Field  | Type   | Description                          |
|--------|--------|--------------------------------------|
| type   | string | `"join"`                             |
| room   | string | Arbitrary room identifier string     |

---

### `message`
Send a text message to all other peers in the room.

```json
{ "type": "message", "room": "<roomId>", "text": "<text>" }
```

| Field  | Type   | Description                              |
|--------|--------|------------------------------------------|
| type   | string | `"message"`                              |
| room   | string | Must match the room the client joined    |
| text   | string | The message body                         |

---

## Server → Client

### `joined`
Sent to the client that just successfully joined a room.

```json
{ "type": "joined", "room": "<roomId>", "peers": 2 }
```

| Field  | Type   | Description                                        |
|--------|--------|----------------------------------------------------|
| type   | string | `"joined"`                                         |
| room   | string | The room that was joined                           |
| peers  | number | Total number of clients now in the room (incl. self) |

---

### `message`
Delivered to every peer in the room **except** the sender.

```json
{ "type": "message", "from": "<peerId>", "text": "<text>" }
```

| Field  | Type   | Description                            |
|--------|--------|----------------------------------------|
| type   | string | `"message"`                            |
| from   | string | Identifier of the sending peer         |
| text   | string | The message body                       |

---

## Connection Lifecycle

```
Client A                          Server                         Client B
   |                                 |                               |
   |── open ──────────────────────►  |                               |
   |── { type:"join", room:"abc" } ► |                               |
   |◄── { type:"joined", peers:1 } ─ |                               |
   |                                 |  ◄─── open ────────────────── |
   |                                 |  ◄─── { type:"join", ... } ── |
   |                                 |  ─── { type:"joined", peers:2} ►|
   |── { type:"message", text:"hi" } ►                               |
   |                                 | ─── { type:"message", ... } ─► |
   .                                 .                               .
```
