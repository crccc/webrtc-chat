# Task 04: Capacity Limit Eight

## Goal
- Update room capacity limit from 10 to 8 and enforce consistently.

## In Scope
- Server capacity constant update.
- Join validation update and error messaging.
- Presence/joined payloads reflect new capacity.

## Out of Scope
- UI display update (Task 09).
- Transport negotiation behavior.

## Task Start Checklist
- Confirm final capacity decision is 8.
- Locate all server capacity references.
- Confirm tests currently assume 10 and need rewrite.
- Ensure error code remains `ROOM_FULL`.

## TDD Plan
### Red
- Add failing tests: 8th join accepted, 9th join rejected.
- Add failing tests for payload capacity field value.

### Green
- Implement updated capacity constant and checks.
- Update error message text to `8/8`.

### Refactor
- Centralize capacity constant usage.
- Remove hardcoded legacy values.

## Tests To Add
- Normal case: room accepts up to 8 participants.
- Error case: 9th participant gets `ROOM_FULL`.
- Boundary case: concurrent joins around boundary still enforce max 8.

## Error Handling Baseline
- Deterministic rejection at full capacity.
- Consistent `ROOM_FULL` code/message.
- No partial joins when capacity exceeded.

## Done Criteria
- Capacity tests pass.
- No residual `10` capacity in server behavior.
- Completion log entry appended.

## Dependencies / Notes
- Can run after Task 01.
- UI and docs alignment handled later (Task 09/10).
