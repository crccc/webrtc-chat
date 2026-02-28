# Task 08: Ice Config Google Stun

## Goal
- Provide centralized ICE config with Google public STUN defaults and safe override support.

## In Scope
- Add ICE config module used by peer connection manager.
- Default servers:
- `stun:stun.l.google.com:19302`
- `stun:stun1.l.google.com:19302`
- `stun:stun2.l.google.com:19302`
- Support optional runtime override with fallback.

## Out of Scope
- TURN credentials/provisioning.
- Network quality heuristics.

## Task Start Checklist
- Confirm no-TURN decision.
- Confirm module location and import consumers.
- Identify invalid override shapes to guard.
- Ensure tests do not rely on real network.

## TDD Plan
### Red
- Add failing tests for default ICE values.
- Add failing tests for override and fallback behavior.

### Green
- Implement config module and consumer wiring.
- Validate override shape before use.

### Refactor
- Keep config API minimal and deterministic.
- Remove duplicated ICE literals.

## Tests To Add
- Normal case: peer connections use default Google STUN list.
- Error case: invalid override falls back to defaults.
- Boundary case: empty override array behaves predictably (fallback or explicit none, per spec and tests).

## Error Handling Baseline
- Never throw on bad ICE override input.
- Log/warn on invalid override path.
- Preserve deterministic defaults.

## Done Criteria
- ICE config tests pass.
- All peer connection creation paths consume centralized config.
- Completion log entry appended.

## Dependencies / Notes
- Depends on Task 06 consumer integration.
- Must complete before final integration polish.
