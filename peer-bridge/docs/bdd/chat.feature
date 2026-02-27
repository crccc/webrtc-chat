Feature: Realtime chat messaging over DataChannel
  As a room participant
  I want to send and receive text messages
  So that conversation is possible in real time

  Scenario: Peer message relay works on open DataChannels
    Given two clients are connected to the same room with open chat DataChannels
    When client A sends a message
    Then client B should receive that message

  Scenario: Empty message is ignored safely
    Given I am connected to a room but no valid message body is provided
    When I send an empty message
    Then no DataChannel message should be sent
