# Phase 3 - Passcode + Capacity

## Objective
加入最小可行安全驗證（passcode）與房間容量限制（10 人含 owner），封住 room id 被猜到就亂入的風險。

## In Scope
- Create/Join 都要 passcode（6-32 字元）。
- username 必填且房內唯一。
- room capacity = 10（包含 owner）。
- 新增 `ROOM_FULL` 等錯誤處理。

## Out of Scope
- 不做 hash 儲存或持久化。
- 不做 TLS/wss 升級。
- 不做 media streaming。

## Required Changes by File
- `server/index.js`
- `docs/protocol.md`
- `extension/src/components/CreateRoomSection.jsx`
- `extension/src/components/JoinSection.jsx`
- `extension/src/hooks/useWebSocket.js`
- `extension/src/components/ChatSection.jsx`（顯示 peers/capacity）
- `docs/bdd/room-capacity.feature`
- server/extension 對應測試檔

## Protocol / Interface Impact
- Create payload: `roomId, username, passcode`
- Join payload: `roomId, username, passcode`
- server error codes 新增：
  - `INVALID_PASSCODE_FORMAT`
  - `INVALID_PASSCODE`
  - `ROOM_FULL`

## BDD Scenarios
- 正確 passcode 可 join。
- 錯誤 passcode 被拒絕。
- duplicate username 被拒絕。
- 第 10 人可加入，第 11 人收到 `ROOM_FULL`。
- 有人離開後可再次加入至上限。

## Test Plan
- server integration: join auth + capacity boundary。
- extension tests: passcode validation + ROOM_FULL UI。
- contract tests: error code mapping。

## Acceptance Criteria
- 知道 roomId 但不知道 passcode 無法加入。
- room 成員數不會超過 10。
- join 失敗時 UI 顯示具體錯誤。

## Risks & Mitigations
- 風險: 明文 passcode 安全性有限。
- 緩解: 僅作 MVP；後續可在 Phase 5+ 提升為 hash + wss。

## Handoff Prompt
`請依 phase-3-passcode-capacity.md 實作 passcode 驗證、username 唯一與 10 人上限（含 owner），並補齊測試。`
