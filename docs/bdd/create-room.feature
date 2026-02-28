Feature: Create room
  As an extension user
  I want to create a room
  So that others can join my chatroom

  Scenario: Create room succeeds with valid inputs
    Given I am on the Create Room screen
    When I submit a valid room creation request
    Then I should enter chat as owner

  Scenario: Create room fails with invalid room id format
    Given I am on the Create Room screen
    When I submit room creation with invalid room id
    Then I should see an invalid room id error
