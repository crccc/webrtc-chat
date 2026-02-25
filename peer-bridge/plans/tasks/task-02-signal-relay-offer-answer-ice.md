# Task 02: Signal Relay Offer Answer Ice

## Goal
- Implement signaling relay for `offer`, `answer`, and `ice` between peers in the same room.

## In Scope
- Route signaling payload by target `peerId`.
- Enforce same-room relay rule.
- Add server-side payload validation for signaling actions.

## Out of Scope
- Peer connection creation on client.
- Owner leave lifecycle changes (Task 03).
- UI or message rendering changes.

## Task Start Checklist
- Confirm Task 01 dispatcher and `peerId` are complete.
- Confirm signaling action names and envelope fields.
- Confirm policy: relay only for same room, cross-room must fail safely.
- Check missing validation branches (`to`, payload presence, sender joined state).

## TDD Plan
### Red
- Add failing tests for successful same-room relay of `offer/answer/ice`.
- Add failing tests for invalid target, missing fields, and cross-room relay attempts.

### Green
- Implement targeted relay handler and same-room checks.
- Add validation for required fields.

### Refactor
- Consolidate duplicate relay code into shared helper.
- Standardize relay error responses.

## Tests To Add
- Normal case: A and B in same room, A offer relays to B with correct `from`.
- Error case: sender not in room or invalid `to` returns error.
- Boundary case: target disconnected between validation and send is handled without crash.

## Error Handling Baseline
- `INVALID_SIGNAL_PAYLOAD` for missing/invalid payload fields.
- `NOT_IN_ROOM` when sender has no active room.
- Unknown target in room handled as explicit error or safe ignore (must be deterministic and tested).

## Done Criteria
- Relay tests pass for offer/answer/ice.
- No cross-room leakage possible.
- Server remains stable under malformed signaling payloads.
- Completion log entry appended.

## Dependencies / Notes
- Depends on Task 01.
- Required by client transport tasks (Task 05-07).
