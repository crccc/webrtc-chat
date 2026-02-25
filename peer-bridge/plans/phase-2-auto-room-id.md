# Phase 2 - Auto Room ID

## Objective
Create Room 採系統自動產生 UUIDv4，降低使用者輸入錯誤並固定建立流程。

## In Scope
- 進入 Create 頁自動生成 roomId（UUIDv4）。
- roomId 欄位唯讀。
- 支援 `Regenerate`。
- `createdRoomId` 本地 guard：同 extension 同時只允許一個 active created room。

## Out of Scope
- 不新增 server 安全機制（passcode 在 Phase 3）。
- 不改整體 protocol envelope（Phase 4）。

## Required Changes by File
- `extension/src/components/CreateRoomSection.jsx`
- `extension/src/App.jsx`
- `extension/src/utils/uuid.js`（新增）
- `extension/src/utils/storage.js`（新增）
- `extension/src/App.css`

## Protocol / Interface Impact
- `roomId` 仍傳給 server，但來源改成 client 自動生成。
- server 仍需保留 UUIDv4 驗證（防偽造）。

## BDD Scenarios
- 進 Create 頁自動出現合法 UUIDv4。
- 按 Regenerate 會產生不同且合法 UUIDv4。
- roomId 欄位不可手動改。
- active created room 時 Create 被禁用並提示先離開。

## Test Plan
- component test: initial UUIDv4 valid。
- component test: regenerate changes value。
- component test: roomId readonly。
- app test: active created room guard。

## Acceptance Criteria
- Create 流程不需要手打 roomId。
- 用戶能看到並複製 roomId（若 UI 有 copy）。
- guard 行為可預期，不影響 Join 流程。

## Risks & Mitigations
- 風險: local guard 被誤認為安全機制。
- 緩解: UI 文案清楚標註 guard 只屬本機限制，真正驗證在 server。

## Handoff Prompt
`請依 phase-2-auto-room-id.md 實作自動 UUIDv4、readonly、regenerate 與 createdRoomId 本地 guard。`
