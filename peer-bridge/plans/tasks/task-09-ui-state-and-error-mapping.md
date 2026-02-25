# Task 09: Ui State And Error Mapping

## Goal
- Align UI and user-facing state with new realtime transport behavior.

## In Scope
- Update app flow tests and UI messaging for signaling/WebRTC transport.
- Update capacity display to `8`.
- Ensure fallback user messages for unknown errors.

## Out of Scope
- New visual redesign.
- Media UI controls.

## Task Start Checklist
- Confirm hook API exposed by Task 05.
- Confirm server error code surface to map in UI.
- Identify all places displaying capacity/status/errors.
- Confirm manual rejoin policy wording.

## TDD Plan
### Red
- Add failing tests for new status transitions and capacity display.
- Add failing tests for known and unknown error mapping.

### Green
- Implement UI state wiring to new transport outputs.
- Update error mapping table and fallback text.

### Refactor
- Centralize error mapping utility.
- Simplify conditional rendering paths.

## Tests To Add
- Normal case: successful create/join enters chat with correct peer/capacity display.
- Error case: server rejection and transport failure show user-readable messages.
- Boundary case: unknown error code still shows fallback message and does not block UI navigation.

## Error Handling Baseline
- No empty error states shown to user.
- Disconnected state transitions are explicit.
- UI remains operable after transport failures.

## Done Criteria
- UI tests pass for realtime flow.
- Capacity and error text reflect final decisions.
- Completion log entry appended.

## Dependencies / Notes
- Depends on Task 04 and Task 05-07.
