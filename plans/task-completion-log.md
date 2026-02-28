# Task Completion Log

Add one entry per completed task.

## 2026-02-26 - task-xx-...md
- Summary:
- Tests Added/Updated:
- Error Handling Added:
- Changed Files:
- Verification Result:
- Follow-up Notes:

## 2026-02-25 - task-01-server-dispatcher-and-peer-id.md
- Summary: Added server action dispatcher (`action`/`type`), assigned room-scoped `peerId` on join, and included initial peer list in `joined` payload.
- Tests Added/Updated: Added `server/test/dispatcher-peer-id.test.js` covering join `peerId` payload, unsupported action error, and malformed JSON safety.
- Error Handling Added: Added uniform `UNSUPPORTED_ACTION` error envelope and kept malformed JSON safe-ignore behavior.
- Changed Files: `server/index.js`, `server/test/dispatcher-peer-id.test.js`, `plans/task-completion-log.md`.
- Verification Result: `npm test` in `server` passed (`3` files, `12` tests).
- Follow-up Notes: Task 02 can now implement actual `offer`/`answer`/`ice` relay using the established `peerId` registry.

## 2026-02-25 - task-02-signal-relay-offer-answer-ice.md
- Summary: Implemented same-room targeted relay for `offer` / `answer` / `ice` using `to: peerId`, relaying messages with `from: senderPeerId`.
- Tests Added/Updated: Added `server/test/signal-relay.test.js` covering same-room relay success, `NOT_IN_ROOM`, `INVALID_SIGNAL_PAYLOAD`, cross-room rejection, and disconnected target handling.
- Error Handling Added: Added `INVALID_SIGNAL_PAYLOAD`, `NOT_IN_ROOM`, and deterministic `TARGET_NOT_FOUND` responses.
- Changed Files: `server/index.js`, `server/test/signal-relay.test.js`, `plans/task-completion-log.md`.
- Verification Result: `npm test` in `server` passed (`4` files, `17` tests).
- Follow-up Notes: Task 05/06 can now consume server signaling actions to drive peer-connection setup.

## 2026-02-25 - task-03-room-lifecycle-owner-leave.md
- Summary: Changed leave lifecycle to neutral semantics (owner leaves like any peer); room is deleted only when last peer leaves.
- Tests Added/Updated: Added `server/test/room-lifecycle.test.js` for owner leave continuity, idempotent repeated leave, and near-simultaneous disconnect cleanup.
- Error Handling Added: Leave path remains idempotent under repeated close callbacks and partial state.
- Changed Files: `server/index.js`, `server/test/room-lifecycle.test.js`.
- Verification Result: `npm test` in `server` passed.
- Follow-up Notes: Added `signal.left` broadcast for peer cleanup on client side.

## 2026-02-25 - task-04-capacity-limit-eight.md
- Summary: Updated room capacity from 10 to 8 and aligned server payload/error text.
- Tests Added/Updated: Added `server/test/capacity-limit.test.js` and updated validation assertions to capacity-agnostic checks.
- Error Handling Added: Deterministic `ROOM_FULL` with message `room is full (8/8)`.
- Changed Files: `server/index.js`, `server/test/capacity-limit.test.js`, `server/test/room-id-validation.test.js`, `plans/decisions.md`.
- Verification Result: `npm test` in `server` passed.
- Follow-up Notes: UI/test expectation updates handled in Task 09.

## 2026-02-25 - task-05-realtime-client-hook.md
- Summary: Replaced legacy websocket-chat hook internals with realtime signaling transport that manages join lifecycle + signaling events while keeping the same public API.
- Tests Added/Updated: Extended `extension/test/use-websocket.test.js` with deterministic helper behavior coverage.
- Error Handling Added: Mapped signaling errors (`NOT_IN_ROOM`, `INVALID_SIGNAL_PAYLOAD`, `TARGET_NOT_FOUND`) and guarded malformed inbound payloads.
- Changed Files: `extension/src/hooks/useWebSocket.js`, `extension/test/use-websocket.test.js`.
- Verification Result: `npm test` in `extension` passed.
- Follow-up Notes: Hook now handles `signal.joined` and `signal.left` for peer lifecycle.

## 2026-02-25 - task-06-peer-connection-manager.md
- Summary: Implemented per-peer `RTCPeerConnection` manager in hook with deterministic offerer rule and signaling handlers for offer/answer/ice.
- Tests Added/Updated: Added helper coverage (`shouldInitiateOffer`) validating deterministic offer selection.
- Error Handling Added: Wrapped `setRemoteDescription`/`addIceCandidate` and negotiation paths with safe warning-level handling.
- Changed Files: `extension/src/hooks/useWebSocket.js`, `extension/test/use-websocket.test.js`.
- Verification Result: `npm test` in `extension` passed.
- Follow-up Notes: Peer cleanup wired to `signal.left` and connection-state failure handling.

## 2026-02-25 - task-07-datachannel-chat-flow.md
- Summary: Moved chat send/receive path to WebRTC DataChannel (`chat`, ordered/reliable) and removed client dependency on WS chat frames.
- Tests Added/Updated: Added data-message decode helper tests including malformed payload ignore behavior.
- Error Handling Added: Send gated by open DataChannel state; send failures are isolated and non-fatal.
- Changed Files: `extension/src/hooks/useWebSocket.js`, `extension/test/use-websocket.test.js`.
- Verification Result: `npm test` in `extension` passed.
- Follow-up Notes: Server legacy WS chat action now rejected deterministically (Task 10 regression).

## 2026-02-25 - task-08-ice-config-google-stun.md
- Summary: Added centralized ICE config module with Google STUN defaults and safe override support.
- Tests Added/Updated: Added `extension/test/ice-config.test.js` for defaults, valid override, and invalid-override fallback.
- Error Handling Added: Invalid override shape falls back to deterministic defaults without throwing.
- Changed Files: `extension/src/webrtc/iceConfig.js`, `extension/test/ice-config.test.js`, `extension/src/hooks/useWebSocket.js`.
- Verification Result: `npm test` in `extension` passed.
- Follow-up Notes: Hook peer creation now consumes centralized ICE config.

## 2026-02-25 - task-09-ui-state-and-error-mapping.md
- Summary: Updated UI-facing capacity/error expectations to match realtime behavior and server capacity 8.
- Tests Added/Updated: Updated `extension/test/app-flow.test.jsx` and `extension/test/chat-section.test.jsx` capacity/error assertions.
- Error Handling Added: Unknown codes still use fallback user-facing join failure message.
- Changed Files: `extension/test/app-flow.test.jsx`, `extension/test/chat-section.test.jsx`, `extension/src/hooks/useWebSocket.js`.
- Verification Result: `npm test` in `extension` passed.
- Follow-up Notes: App API remained compatible with existing flow tests.

## 2026-02-25 - task-10-remove-legacy-ws-chat-and-docs.md
- Summary: Removed legacy WS chat data path and aligned protocol/docs with signaling + DataChannel architecture.
- Tests Added/Updated: Added regression test in `server/test/dispatcher-peer-id.test.js` asserting legacy `type: "message"` is rejected via `UNSUPPORTED_ACTION`.
- Error Handling Added: Legacy/unsupported action handling remains deterministic and non-crashing.
- Changed Files: `server/index.js`, `server/test/dispatcher-peer-id.test.js`, `docs/protocol.md`, `docs/bdd/chat.feature`, `docs/bdd/room-capacity.feature`, `docs/bdd/README.md`, `README.md`.
- Verification Result: `npm test` passed in both `server` and `extension`.
- Follow-up Notes: Documentation now reflects WS signaling-only + WebRTC DataChannel chat model.
