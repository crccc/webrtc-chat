# Phase 5 - Hardening & Release

## Objective
收斂品質、補齊文件與回歸驗證，讓功能可穩定交付與持續維護。

## In Scope
- 補齊測試覆蓋與回歸案例。
- 整理 README / protocol / plans 文件一致性。
- 建立 release checklist。
- 確認 side panel 使用體驗與錯誤訊息完整。

## Out of Scope
- 不新增新功能。
- 不進行架構級重寫。

## Required Changes by File
- `README.md`
- `docs/protocol.md`
- `docs/bdd/*.feature`（必要時補 scenario）
- extension/server 測試檔（補漏）
- `plans/README.md`（若流程有更新）
- 新增 `docs/release-checklist.md`（建議）

## Protocol / Interface Impact
- 無新增功能接口。
- 只做一致性校正與文件落地。

## BDD Scenarios
- 既有 scenario 全覆蓋並可追蹤對應測試。
- 新增針對錯誤路徑與邊界條件的回歸案例。

## Test Plan
- 全量 test run（extension + server）。
- 手動驗收：
  - create/join/chat 基本流程
  - passcode 錯誤
  - room full
  - leave/rejoin
- build/reload extension 手動驗證 side panel。

## Acceptance Criteria
- 所有自動測試通過。
- 核心流程手測通過。
- 文件可讓新成員直接上手與接續 phase。

## Risks & Mitigations
- 風險: 文件與程式版本漂移。
- 緩解: release checklist 加入「文件對齊」必檢項。

## Handoff Prompt
`請依 phase-5-hardening-release.md 執行回歸與文件收斂，不新增功能，只修正穩定性與可交付性問題。`
