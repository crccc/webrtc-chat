# Task 10: Remove Legacy Ws Chat And Docs

## Goal
- Remove legacy WS chat data-path and update documentation/specs to the new realtime design.

## In Scope
- Delete WS chat `message` handler/send branches in server and extension.
- Remove obsolete tests tied to WS chat compatibility.
- Update protocol and BDD docs to signaling + DataChannel model.

## Out of Scope
- Feature additions unrelated to migration.
- Audio/video documentation.

## Task Start Checklist
- Confirm DataChannel chat flow is complete (Task 07).
- Confirm UI and server tests are green before cleanup.
- Identify all references to legacy WS message protocol in docs/tests.
- Decide whether unsupported old action returns explicit error (recommended) and lock in tests.

## TDD Plan
### Red
- Add failing regression tests proving old WS chat path is not supported.
- Add failing doc-oriented assertions/checklist for updated protocol behavior.

### Green
- Remove old WS chat code paths.
- Update docs and test fixtures to new behavior.

### Refactor
- Delete dead constants/branches.
- Keep naming aligned with current architecture.

## Tests To Add
- Normal case: realtime messaging tests still pass after legacy code removal.
- Error case: old WS chat action returns deterministic unsupported behavior.
- Boundary case: mixed old/new payload attempts do not crash server/client.

## Error Handling Baseline
- Unsupported legacy action handled safely.
- No silent crash when receiving stale client payload.
- Clear migration-safe server behavior.

## Done Criteria
- No runtime WS chat data path remains.
- Docs match implemented behavior.
- Full server and extension test suites pass.
- Completion log entry appended.

## Dependencies / Notes
- Final cleanup task.
- Depends on Task 01-09 completion.
