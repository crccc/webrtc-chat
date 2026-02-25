Feature: Chat messaging
  As a room participant
  I want to send and receive text messages
  So that conversation is possible in real time

  Scenario: Peer message broadcast works
    Given two clients are connected to the same room
    When client A sends a message
    Then client B should receive that message

  Scenario: Empty message is ignored
    Given I am connected to a room
    When I send an empty message
    Then no message should be broadcast
