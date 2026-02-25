# BDD Scenario Mapping (Phase 0)

| Feature file | Coverage target | Planned test file(s) |
| --- | --- | --- |
| `create-room.feature` | Create success/failure skeleton | `extension/test/create-room.test.js`, `server/test/create-room.test.js` |
| `join-room.feature` | Join success/failure skeleton | `extension/test/join-room.test.js`, `server/test/join-room.test.js` |
| `chat.feature` | Message send/receive skeleton | `server/test/chat.test.js`, `extension/test/chat.test.js` |
| `protocol-compat.feature` | Unsupported action tolerance | `server/test/protocol-compat.test.js` |
| `room-capacity.feature` | 10/10 capacity boundary | `server/test/room-capacity.test.js`, `extension/test/room-capacity.test.js` |

## Current Test Baseline
- Extension smoke test: `extension/test/smoke.test.js`
- Server smoke test: `server/test/smoke.test.js`
- Test runner: `vitest` (configured per package)
