# Phase 4 - Envelope Protocol + Compatibility

## Objective
把通訊協定升級為 `envelope`，同時預留 WebRTC signaling 擴充點但不啟用 media 功能。

## In Scope
- 訊息格式統一為 `v/domain/action/requestId/payload`。
- server 由 switch-type 改為 action router。
- 預留 `webrtc.*` action 並安全拒絕（不崩潰）。
- client 加入協定版本與未知 action 容錯。

## Out of Scope
- 不建立 WebRTC offer/answer/ice 實際交換流程。
- 不接 camera/mic 權限與 stream。

## Required Changes by File
- `docs/protocol.md`
- `server/index.js`（router 重構）
- `extension/src/hooks/useWebSocket.js`
- `docs/bdd/protocol-compat.feature`
- server/extension 協定相容性測試檔

## Protocol / Interface Impact
- 舊 `type` 訊息由 `domain+action` 替代。
- 新增 `UNSUPPORTED_ACTION` / `UNSUPPORTED_VERSION` 類錯誤處理策略。
- webrtc 保留 action：
  - `webrtc.offer`
  - `webrtc.answer`
  - `webrtc.ice`
  - `webrtc.renegotiate`
  - `webrtc.track.toggle`

## BDD Scenarios
- 合法 envelope 可被正確路由。
- 未知 action 回可預期錯誤。
- 未支援版本被拒絕但不影響連線穩定。
- webrtc.* 在未啟用時被安全拒絕。

## Test Plan
- protocol router unit tests。
- client message parsing tests。
- integration test 驗證舊功能（create/join/chat）不回退。

## Acceptance Criteria
- room/chat 功能在 envelope 下仍可運作。
- 未知 action 不造成 crash。
- 文件與實作一致。

## Risks & Mitigations
- 風險: 協定切換影響既有流程。
- 緩解: 維持 action 對應表與回歸測試，必要時短期雙棧轉譯。

## Handoff Prompt
`請依 phase-4-envelope-compat.md 實作 envelope 協定與相容性處理，保留 webrtc.* 擴充但不做影音。`
