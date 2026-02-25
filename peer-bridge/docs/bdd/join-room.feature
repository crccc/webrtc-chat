Feature: Join room
  As an extension user
  I want to join an existing room
  So that I can chat with current participants

  Scenario: Join room succeeds with valid credentials
    Given a room already exists
    When I submit valid room id, username, and passcode
    Then I should enter chat as participant

  Scenario: Join room fails for non-existing room
    Given no room exists for the target room id
    When I attempt to join that room id
    Then I should see a room not found error
