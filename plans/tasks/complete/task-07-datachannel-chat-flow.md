# Task 07: Datachannel Chat Flow

## Goal
- Move chat data plane to WebRTC DataChannel and remove dependence on WS message broadcast.

## In Scope
- Create `chat` DataChannel with reliable + ordered settings.
- Broadcast outgoing text to all open channels.
- Ingest incoming peer messages into UI message state.

## Out of Scope
- Audio/video tracks.
- TURN fallback.

## Task Start Checklist
- Confirm legacy WS chat path is scheduled for removal (Task 10).
- Confirm message format and sender labeling expectations.
- Validate channel-open gating before send.
- Identify empty-text handling and malformed channel payload handling.

## TDD Plan
### Red
- Add failing tests for send broadcast across multiple peers.
- Add failing tests for empty message ignore.
- Add failing tests for incoming channel message mapping to UI state.

### Green
- Implement DataChannel setup and send/receive handlers.
- Wire sendMessage to DataChannel transport.

### Refactor
- Isolate message encoding/decoding helper.
- Remove duplicated checks around channel state.

## Tests To Add
- Normal case: message from local peer reaches all connected remote peers.
- Error case: send attempt while channel not open is safely ignored with predictable behavior.
- Boundary case: malformed channel payload is ignored and does not break chat flow.

## Error Handling Baseline
- Guard send by channel readyState.
- Catch `dc.send` exceptions and keep app alive.
- Reject blank messages consistently.

## Done Criteria
- Chat flow tests pass using DataChannel only.
- Local and remote messages render correctly.
- Completion log entry appended.

## Dependencies / Notes
- Depends on Task 05 and Task 06.
- Completes transport-side migration for text chat.
