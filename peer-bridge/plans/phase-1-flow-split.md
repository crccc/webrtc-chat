# Phase 1 - Flow Split (Home/Create/Join/Chat)

## Objective
把目前單一路徑改成明確分流：Create Room 與 Join Room 各自獨立，並在 chat 顯示角色。

## In Scope
- App 狀態機改為 `home -> create|join -> chat`。
- 新增 Home UI。
- 分離 Create 與 Join 表單流程。
- Chat 顯示 `role`（owner / participant）。

## Out of Scope
- 不加入 passcode 驗證。
- 不加入 room capacity 限制。
- 不改為 envelope 協定。

## Required Changes by File
- `extension/src/App.jsx`
- `extension/src/components/HomeSection.jsx`（新增）
- `extension/src/components/CreateRoomSection.jsx`（新增）
- `extension/src/components/JoinSection.jsx`
- `extension/src/components/ChatSection.jsx`
- `extension/src/hooks/useWebSocket.js`
- `extension/src/App.css`

## Protocol / Interface Impact
- 若 server 仍是現行 join protocol，Phase 1 可先做 client 邏輯分流、內部轉譯成現有請求。
- 對外協定正式調整留到 Phase 3/4。

## BDD Scenarios
- 使用者可從 Home 選 Create 或 Join。
- Create 成功進 chat 且 role=owner。
- Join 成功進 chat 且 role=participant。
- Leave 後回 Home。

## Test Plan
- App flow 測試：四個 view 切換。
- 表單流程測試：Create/Join 提交分流。
- Chat header 測試：顯示 role。

## Acceptance Criteria
- side panel 中看得到 Home。
- Create 與 Join 有獨立 UI 與事件處理。
- chat 顯示 room 與 role。

## Risks & Mitigations
- 風險: 一次改多個 component 導致狀態錯亂。
- 緩解: 先以單一來源 state 管理 view/role/room，再逐步下放。

## Handoff Prompt
`請依 phase-1-flow-split.md 實作，建立 Home/Create/Join/Chat 分流與 role 顯示，不加入 passcode 或容量限制。`
