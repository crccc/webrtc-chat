# Task 13: Configure Signaling Endpoint By Env

## Goal
- Replace hardcoded signaling server URL with environment-based configuration suitable for dev/test/production extension builds.

## In Scope
- Move signaling endpoint definition out of runtime hook constants into WXT environment/config resolution.
- Provide deterministic defaults for local development and explicit production override path.
- Document and validate required environment variable presence/format.
- Ensure tests can inject endpoint value without mutating source code.

## Out of Scope
- Server deployment automation.
- Runtime endpoint switching UI.
- Credential/authentication changes for signaling transport.

## Task Start Checklist
- Dependencies and prerequisites verified.
- Existing tests baseline checked.
- High-risk boundary conditions identified.
- Missing error handling paths identified.
- User clarification required only for high-impact uncertainty.

## TDD Plan
### Red
- Add failing tests asserting endpoint resolution behavior for dev default, explicit override, and invalid value fallback.
- Add failing tests verifying connection uses resolved endpoint instead of hardcoded constant.

### Green
- Implement endpoint resolver module and wire it into socket connection path.
- Update WXT config/environment usage and project docs/scripts where needed.

### Refactor
- Centralize runtime config access points to avoid scattered env reads.
- Improve naming for endpoint-related config and validation helpers.

## Tests To Add
- Normal case: explicit env endpoint is used for websocket connection target.
- Error case: invalid endpoint format falls back to safe error and does not attempt undefined behavior.
- Boundary case: missing env in development resolves to localhost default deterministically.

## Error Handling Baseline
- Invalid endpoint config should surface clear, user-safe error state.
- Missing endpoint in non-dev mode should fail fast with explicit message.
- Resolver must never throw uncaught errors into UI rendering path.

## Done Criteria
- Tests pass.
- Behavior matches task goal.
- Completion log entry appended.

## Dependencies / Notes
- Touchpoints include `extension/wxt.config.ts`, `extension/src/hooks/useWebSocket.ts`, a new runtime config resolver if needed, and related tests/docs.
- Environment handling should follow current WXT build/runtime conventions instead of ad hoc global constants.
- Independent of background orchestration, but both tasks should align on single config source.
