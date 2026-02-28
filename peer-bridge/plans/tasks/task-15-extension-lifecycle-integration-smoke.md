# Task 15: Extension Lifecycle Integration Smoke

## Goal
- Add meaningful extension lifecycle smoke/integration coverage for background, sidepanel, and reconnection-related behaviors beyond trivial test-runner checks.

## In Scope
- Replace current placeholder smoke test with lifecycle-oriented assertions.
- Add integration-level tests for sidepanel/background interaction and session lifecycle transitions.
- Define and document a manual smoke checklist for install/reload/disable-enable/tab refresh scenarios.
- Ensure CI/local test scripts include smoke coverage execution.

## Out of Scope
- Full end-to-end browser automation framework rollout.
- Performance/load testing.
- Web Store packaging validation automation.

## Task Start Checklist
- Dependencies and prerequisites verified.
- Existing tests baseline checked.
- High-risk boundary conditions identified.
- Missing error handling paths identified.
- User clarification required only for high-impact uncertainty.

## TDD Plan
### Red
- Add failing smoke/integration tests for extension lifecycle-critical paths (initial load, connect flow, lifecycle transitions).
- Add failing tests ensuring placeholder smoke no longer the only coverage.

### Green
- Implement required test harness/mocks for chrome runtime APIs and lifecycle events.
- Add manual smoke checklist documentation tied to expected outcomes.

### Refactor
- Remove duplicated setup code in tests and centralize lifecycle test utilities.
- Keep smoke suite fast but behaviorally meaningful.

## Tests To Add
- Normal case: extension context boots and sidepanel can execute connect/join path with expected state transition.
- Error case: background/service lifecycle interruption surfaces controlled disconnected/error state.
- Boundary case: repeated extension reload/session reset does not leave stale state or hanging handlers.

## Error Handling Baseline
- Lifecycle failures should map to explicit status transitions, not silent no-op.
- Tests must assert no uncaught exceptions for reload/unmount sequences.
- Smoke checklist must include failure signal points (console/service worker inspector/status UI).

## Done Criteria
- Tests pass.
- Behavior matches task goal.
- Completion log entry appended.

## Dependencies / Notes
- Depends on availability of stable session and messaging boundaries from Task 12.
- Should update `extension/test/smoke.test.js` and add focused integration files rather than one monolithic test.
