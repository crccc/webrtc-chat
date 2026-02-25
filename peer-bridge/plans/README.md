# Peer Bridge Phase Plans

## Purpose
這個資料夾提供固定、可版本化的 phase 計畫檔。之後只要引用對應 phase 檔案即可啟動實作，不需要重複描述需求背景。

## Phase Order
1. `phase-0-foundation.md`
2. `phase-1-flow-split.md`
3. `phase-2-auto-room-id.md`
4. `phase-3-passcode-capacity.md`
5. `phase-4-envelope-compat.md`
6. `phase-5-hardening-release.md`

## Entry / Exit Criteria
### Phase 0
- Entry: 專案可正常 build。
- Exit: 測試骨架與 BDD feature 檔可執行。

### Phase 1
- Entry: Phase 0 完成。
- Exit: Home/Create/Join/Chat 流程可用，角色可顯示。

### Phase 2
- Entry: Phase 1 完成。
- Exit: Create flow 採自動 UUIDv4 + local guard。

### Phase 3
- Entry: Phase 2 完成。
- Exit: Passcode 驗證、username 唯一、10 人上限（含 owner）生效。

### Phase 4
- Entry: Phase 3 完成。
- Exit: 協定改 envelope，未知 action 可安全拒絕，保留 webrtc.* 擴充點。

### Phase 5
- Entry: Phase 4 完成。
- Exit: 文件、回歸測試、release checklist 完成。

## Quick Commands
- Extension build: `cd extension && npm run build`
- Extension lint: `cd extension && npm run lint`
- Server start: `cd server && npm start`
- Extension tests (phase 0 後新增): `cd extension && npm test`
- Server tests (phase 0 後新增): `cd server && npm test`

## How To Instruct Agent
- `請依 plans/phase-3-passcode-capacity.md 實作，不要改 phase 範圍外內容。`
- `請依 plans/phase-4-envelope-compat.md 只做 protocol 升級與相容性測試。`

## Source of Truth
- 固定決策請看 `decisions.md`。
- 若決策更新，只修改 `decisions.md` 與受影響 phase 檔，不回改歷史對話。
