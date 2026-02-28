# Task 12: Background Session Orchestration

## Goal
- Move session orchestration responsibilities from sidepanel UI to background service worker so session lifecycle is resilient to sidepanel close/reopen events.

## In Scope
- Define message contract between sidepanel UI and background for connect/disconnect/send/status.
- Move WebSocket signaling lifecycle and room session ownership to background entrypoint.
- Keep sidepanel UI as a thin view/state renderer that subscribes to background session updates.
- Preserve existing room create/join/leave UX behavior from user perspective.

## Out of Scope
- Changes to server protocol shape.
- New UI feature additions unrelated to lifecycle resilience.
- Multi-window synchronization enhancements beyond current sidepanel behavior.

## Task Start Checklist
- Dependencies and prerequisites verified.
- Existing tests baseline checked.
- High-risk boundary conditions identified.
- Missing error handling paths identified.
- User clarification required only for high-impact uncertainty.

## TDD Plan
### Red
- Add failing tests that simulate sidepanel unmount/remount while session should remain active.
- Add failing tests for background message routing (`connect`, `send`, `disconnect`, status updates).

### Green
- Implement background-owned session manager and sidepanel/background runtime messaging.
- Update sidepanel hook to call background APIs instead of owning direct socket lifecycle.

### Refactor
- Consolidate duplicated session state logic and normalize event payload typing.
- Keep UI-specific state transitions isolated from transport logic.

## Tests To Add
- Normal case: connect from sidepanel, close/reopen sidepanel, session state and messages remain available.
- Error case: background connect failure propagates deterministic error payload to UI.
- Boundary case: repeated rapid sidepanel mount/unmount does not create duplicate connections.

## Error Handling Baseline
- Background must return structured error results for unknown message actions and connection failures.
- Sidepanel should fail gracefully when background is not ready (retry-safe or fallback status).
- Duplicate connect requests for same room/session should be idempotent.

## Done Criteria
- Tests pass.
- Behavior matches task goal.
- Completion log entry appended.

## Dependencies / Notes
- Depends on current `extension/entrypoints/background.ts`, `extension/src/hooks/useWebSocket.ts`, and `extension/src/App.tsx` split of responsibilities.
- Runtime messaging should align with the current WXT service worker model and TypeScript payload contracts in `extension/src/types.ts`.
- Must be completed before adding lifecycle-focused integration smoke coverage.
