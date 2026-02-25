Feature: Room capacity
  As a room owner
  I want a room participant limit
  So that room size remains bounded and predictable

  Scenario: The 10th participant can join
    Given a room has 9 connected participants including owner
    When one more participant joins
    Then the room should report 10 participants

  Scenario: The 11th participant is rejected
    Given a room already has 10 connected participants including owner
    When one more participant attempts to join
    Then the join should be rejected with room full error
