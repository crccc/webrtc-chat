# BDD Scenario Mapping (Phase 0)

| Feature file | Coverage target | Planned test file(s) |
| --- | --- | --- |
| `create-room.feature` | Create success/failure skeleton | `extension/test/create-room.test.js`, `server/test/create-room.test.js` |
| `join-room.feature` | Join success/failure skeleton | `extension/test/join-room.test.js`, `server/test/join-room.test.js` |
| `chat.feature` | DataChannel chat send/receive skeleton | `extension/test/use-websocket.test.js` |
| `protocol-compat.feature` | Unsupported action tolerance | `server/test/protocol-compat.test.js` |
| `room-capacity.feature` | 8/8 capacity boundary | `server/test/capacity-limit.test.js` |

## Current Test Baseline
- Extension smoke tests: `extension/test/smoke.test.tsx`, `extension/test/background-lifecycle.test.ts`
- Server smoke test: `server/test/smoke.test.js`
- Test runner: `vitest` (configured per package)
