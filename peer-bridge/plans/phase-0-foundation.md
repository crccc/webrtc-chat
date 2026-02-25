# Phase 0 - Foundation

## Objective
建立 BDD 與測試基礎，確保後續每個 phase 都能以可驗證方式推進。

## In Scope
- 建立 BDD feature 檔骨架。
- 為 extension/server 建立 test script 與最小測試 setup。
- 整理標準命令入口（build/test/lint）。

## Out of Scope
- 不改 UI 流程。
- 不改 server protocol 行為。
- 不做功能性重構。

## Required Changes by File
- `docs/bdd/create-room.feature`（新增）
- `docs/bdd/join-room.feature`（新增）
- `docs/bdd/chat.feature`（新增）
- `docs/bdd/protocol-compat.feature`（新增）
- `docs/bdd/room-capacity.feature`（新增）
- `extension/package.json`（新增 test scripts / deps）
- `server/package.json`（新增 test scripts / deps）
- `extension/` 測試設定檔（例如 `vitest.config.*`）
- `server/` 測試設定檔

## Protocol / Interface Impact
- 無 protocol 變更。
- 僅新增驗證與測試基建。

## BDD Scenarios
- 建立 feature skeleton，至少包含：
  - create 成功與失敗。
  - join 成功與失敗。
  - chat 收發。
  - unsupported action 容錯。
  - room capacity 邊界（10/10）。

## Test Plan
- `extension`: 測試 runner 可啟動，至少有 1 個 smoke test。
- `server`: 測試 runner 可啟動，至少有 1 個 smoke test。
- feature 文件與測試映射表建立（scenario -> test file）。

## Acceptance Criteria
- `cd extension && npm test` 可執行。
- `cd server && npm test` 可執行。
- `docs/bdd/*.feature` 檔案齊全。

## Risks & Mitigations
- 風險: 一次導入測試框架造成配置噪音。
- 緩解: 只放最小配置，避免提前優化。

## Handoff Prompt
`請依 phase-0-foundation.md 實作，只做測試基礎與 BDD 骨架，不改功能流程。`
