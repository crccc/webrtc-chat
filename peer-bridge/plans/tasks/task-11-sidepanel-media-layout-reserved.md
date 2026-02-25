# Task 11: Sidepanel Media Layout Reserved

## Goal
- Add a dedicated sidepanel design task to reserve media display regions for upcoming video/audio support, without implementing media transport.

## In Scope
- Define UI layout changes for chat sidepanel to include:
- Remote media display region.
- Local self-preview region.
- Space behavior with message list and input row.
- Define responsive behavior for narrow sidepanel widths.
- Define test coverage for layout presence and basic interaction safety.

## Out of Scope
- WebRTC media tracks (`getUserMedia`, addTrack, mute/camera controls).
- TURN/STUN runtime logic.
- Server signaling changes.

## Task Start Checklist
- Confirm current chat layout constraints in sidepanel height.
- Confirm expected priority between media area and message area when space is limited.
- Identify accessibility requirements (labels/roles for media placeholders).
- Identify regression risks to existing chat tests and message flow.
- Ask only if high-impact layout ambiguity remains.

## TDD Plan
### Red
- Add failing component tests asserting:
- Media stage container exists.
- Remote and local preview regions are rendered.
- Existing send/leave interactions still work.

### Green
- Implement layout structure and CSS for reserved media blocks.
- Keep current chat message/input functionality unchanged.

### Refactor
- Clean up class naming and shared style tokens.
- Ensure readable responsive rules and avoid duplicated CSS.

## Tests To Add
- Normal case: chat section renders remote/local media reserved regions with room status.
- Error case: with empty messages and minimal state, layout still renders safely.
- Boundary case: small viewport/sidepanel width keeps controls reachable and visible.

## Error Handling Baseline
- UI should degrade gracefully if media is not active (placeholder state).
- No runtime errors when media region has no stream source.
- Existing chat actions (`send`, `leave`) must remain unaffected by layout change.

## Done Criteria
- New media-reserved layout is visible in chat sidepanel.
- Existing chat behavior tests remain green.
- New tests for media placeholder layout pass.
- Completion log entry appended after implementation.

## Dependencies / Notes
- Can be implemented independently of transport tasks.
- Intended as visual preparation for upcoming audio/video tasks.
