# Task 03: Room Lifecycle Owner Leave

## Goal
- Change room lifecycle so owner leaving does not close the room; room closes only when empty.

## In Scope
- Update leave/disconnect handling for all roles.
- Broadcast `signal.left` events.
- Keep room alive if at least one peer remains.

## Out of Scope
- Capacity change.
- Client auto-reconnect.
- Media stream behavior.

## Task Start Checklist
- Confirm prior decision: owner leave should not force `ROOM_CLOSED`.
- Confirm existing leave path and cleanup side effects.
- Verify idempotent disconnect handling requirements.
- Identify state cleanup fields on socket/room entries.

## TDD Plan
### Red
- Add failing tests for owner leave while participants continue.
- Add failing tests for `signal.left` broadcast.
- Add failing tests for room deletion only when last peer leaves.

### Green
- Implement neutral leave semantics (owner treated as normal member on exit).
- Ensure room/user registries remain consistent.

### Refactor
- Extract room cleanup helpers.
- Ensure leave logic is idempotent.

## Tests To Add
- Normal case: owner leaves, remaining participants stay connected and can continue signaling.
- Error case: repeated close/leave events do not throw or corrupt room state.
- Boundary case: two near-simultaneous disconnects still lead to correct room cleanup.

## Error Handling Baseline
- Leave path must tolerate missing/partial state.
- Never throw on repeated disconnect callbacks.
- Emit consistent presence/left updates to remaining peers.

## Done Criteria
- Lifecycle tests pass with new owner-leave policy.
- `ROOM_CLOSED` forced-kick behavior removed.
- Room cleanup only occurs at zero peers.
- Completion log entry appended.

## Dependencies / Notes
- Depends on Task 01.
- Must complete before final integration validation.
