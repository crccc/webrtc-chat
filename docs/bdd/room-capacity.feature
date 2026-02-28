Feature: Room capacity
  As a room owner
  I want a room participant limit
  So that room size remains bounded and predictable

  Scenario: Correct passcode can join
    Given a room exists with passcode "secret123"
    When a participant joins with the same passcode
    Then the participant should be accepted

  Scenario: Wrong passcode is rejected
    Given a room exists with passcode "secret123"
    When a participant joins with passcode "wrong999"
    Then the join should be rejected with INVALID_PASSCODE

  Scenario: Duplicate username is rejected
    Given a room already has username "alice"
    When another participant joins with username "alice"
    Then the join should be rejected with DUPLICATE_USERNAME

  Scenario: The 8th participant can join
    Given a room has 7 connected participants including owner
    When one more participant joins
    Then the room should report 8 participants

  Scenario: The 9th participant is rejected
    Given a room already has 8 connected participants including owner
    When one more participant attempts to join
    Then the join should be rejected with ROOM_FULL

  Scenario: A slot is available after someone leaves
    Given a room reached 8 connected participants
    When one participant leaves the room
    And a new participant attempts to join
    Then the new participant should be accepted
