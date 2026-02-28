# Task 05: Realtime Client Hook

## Goal
- Replace websocket-chat-only hook with realtime transport hook: WS signaling + WebRTC orchestration.

## In Scope
- Introduce new client hook (or renamed hook) managing signaling lifecycle.
- Keep public API compatible with App usage (`connect`, `disconnect`, `sendMessage`, `messages`, `status`, `peers`, `capacity`).
- Handle signaling socket open/message/close/error states.

## Out of Scope
- Detailed peer connection negotiation logic (Task 06).
- DataChannel message broadcast behavior (Task 07).

## Task Start Checklist
- Confirm server signaling actions are available from Task 01/02.
- Confirm chosen reconnect strategy: manual rejoin only.
- Review existing app tests mocking old hook API.
- Identify cleanup requirements for socket and in-memory room/session state.

## TDD Plan
### Red
- Add failing hook tests for status transitions and connect result handling.
- Add failing tests for disconnect cleanup and repeated connect attempts.

### Green
- Implement signaling lifecycle management and API-compatible return shape.
- Wire joined/presence style events to local state.

### Refactor
- Separate transport state management helpers.
- Keep side effects isolated for testability.

## Tests To Add
- Normal case: successful connect resolves ok and sets connected state.
- Error case: signaling error/close before join resolves with failure and fallback message.
- Boundary case: connect called while existing session active performs safe replacement cleanup.

## Error Handling Baseline
- Explicit failure for server rejection codes.
- Safe handling for unexpected message shape.
- Disconnect always resets refs/state predictably.

## Done Criteria
- Hook tests pass with new signaling flow.
- App can keep using same high-level hook API.
- Completion log entry appended.

## Dependencies / Notes
- Depends on Task 01 and Task 02.
- Prepares foundation for Task 06 and Task 07.
