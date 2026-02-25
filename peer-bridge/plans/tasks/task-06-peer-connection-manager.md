# Task 06: Peer Connection Manager

## Goal
- Implement peer connection management for mesh topology with deterministic offerer rule.

## In Scope
- Create/manage `RTCPeerConnection` instances by remote `peerId`.
- Deterministic offer collision avoidance (`peerId` ordering rule).
- Handle incoming offer/answer/ice from signaling layer.

## Out of Scope
- Chat message formatting and send flow (Task 07).
- ICE default config finalization (Task 08).

## Task Start Checklist
- Confirm mesh topology and SFU-ready abstraction requirement.
- Confirm offerer selection rule (stable by `peerId` sort/comparison).
- Verify expected peer lifecycle events (`peers`, `joined`, `left`).
- Identify cleanup behavior when a peer leaves.

## TDD Plan
### Red
- Add failing tests for offerer decision and connection lifecycle.
- Add failing tests for handling offer/answer/ice sequences.

### Green
- Implement peer connection map and event handlers.
- Apply glare-avoidance rule for connection initiation.

### Refactor
- Extract negotiation helper utilities.
- Reduce branching complexity in signaling event handlers.

## Tests To Add
- Normal case: two peers connect through signaling and reach connected state.
- Error case: invalid remote description/candidate handled without app crash.
- Boundary case: near-simultaneous join/leave does not leak peer connection objects.

## Error Handling Baseline
- Catch and surface `setRemoteDescription` and `addIceCandidate` errors.
- Ensure failed peer setup does not break other active peers.
- Always close and delete stale peer connections on leave.

## Done Criteria
- Negotiation tests pass with deterministic behavior.
- No offer-glare infinite loop.
- Peer cleanup validated.
- Completion log entry appended.

## Dependencies / Notes
- Depends on Task 02 and Task 05.
- Task 08 may provide final ICE config import path.
