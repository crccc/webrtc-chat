# Task 01: Server Dispatcher And Peer Id

## Goal
- Build a signaling-first server dispatcher and assign room-scoped `peerId` on join.
- Keep existing join validation (roomId/passcode/username) while preparing for WebRTC signaling actions.

## In Scope
- Add message dispatcher for server actions.
- Introduce `peerId` generation and room peer registry.
- Return `peerId` and initial peer list payload to joined client.
- Keep room `create/join` flow and auth behavior.

## Out of Scope
- Offer/answer/ice forwarding logic (Task 02).
- DataChannel or frontend transport changes.
- Capacity change to 8 (Task 04).

## Task Start Checklist
- Confirm current `server/index.js` join flow and tests are green.
- Confirm final decision: WS is signaling-only, no WS chat data plane.
- Confirm peer identity format (`peerId`) is stable and unique per active room session.
- Identify missing errors for unknown/invalid actions.

## TDD Plan
### Red
- Add failing server tests for:
- join success returns `peerId`.
- unsupported action returns `UNSUPPORTED_ACTION` error.
- non-JSON input does not crash server.

### Green
- Implement dispatcher and basic action handlers (`join`, signaling placeholders).
- Implement peerId creation and attach to connection context.
- Emit joined payload with `peerId`.

### Refactor
- Extract validation/error helpers.
- Keep message parsing and dispatch flow readable and isolated.

## Tests To Add
- Normal case: valid join returns `joined` with `peerId` and room metadata.
- Error case: unknown action returns structured error with code/message.
- Boundary case: malformed JSON and unexpected payload shape are safely handled.

## Error Handling Baseline
- Uniform error envelope: `{ type: "error", code, message }`.
- Fail fast for unsupported actions.
- Ignore/handle malformed frames without process crash.

## Done Criteria
- Server tests for dispatcher/peerId pass.
- Join behavior remains valid for existing validation rules.
- `peerId` exists for every joined socket.
- Completion log entry appended.

## Dependencies / Notes
- First task in sequence.
- Required by Task 02 and Task 03.
