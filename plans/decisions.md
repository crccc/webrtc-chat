# Decisions Log

## Locked Decisions
1. Create Room 的 `roomId` 由系統自動產生 UUIDv4。
2. Create Room 的 `roomId` 不可手動編輯，但可 `Regenerate`。
3. Join Room 必須提供 passcode。
4. `username` 必填，且房內唯一。
5. 單一 room 上限 8 人，包含 owner。
6. 協定方向採 envelope：`v/domain/action/payload`。
7. 預留 `webrtc.*` action 作為未來 video/audio signaling 擴充點。
8. 現階段不實作 media stream（camera/mic）流程。
9. `createdRoomId` 屬於 extension 本地 UX guard，不作為安全驗證。
10. 真正授權判定由 server 的 passcode 與 room 規則負責。

## Update Rule
- 新需求若影響以上決策，先更新本檔，再更新受影響 phase 檔。
- 不直接覆蓋歷史對話內容，避免來源分裂。
