Feature: Protocol compatibility
  As a system maintainer
  I want unsupported actions to fail safely
  So that future protocol changes do not break running clients

  Scenario: Unsupported action is handled safely
    Given a connected client
    When it sends an unsupported action
    Then the server should return an unsupported action error

  Scenario: Unknown payload should not crash the server
    Given a connected client
    When it sends an unexpected payload shape
    Then the server should stay available for new messages
