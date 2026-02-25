const {
  ERROR_MESSAGES,
  MAX_ROOM_CAPACITY,
  getJoinValidationError,
  isUuidV4,
  isValidPasscode,
  isValidUsername,
  normalizeJoinPayload,
} = require("../index");

const VALID_ROOM_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

function createRoomState({ passcode = "secret123", size = 0, usernames = [] } = {}) {
  return {
    passcode,
    peers: new Set(Array.from({ length: size }, (_, i) => ({ id: i }))),
    usernames: new Set(usernames),
  };
}

describe("join validation", () => {
  test("isUuidV4 accepts valid UUIDv4", () => {
    expect(isUuidV4(VALID_ROOM_ID)).toBe(true);
  });

  test("isValidUsername / isValidPasscode enforce required constraints", () => {
    expect(isValidUsername("alice")).toBe(true);
    expect(isValidUsername("   ")).toBe(false);

    expect(isValidPasscode("secret1")).toBe(true);
    expect(isValidPasscode("12345")).toBe(false);
    expect(isValidPasscode("x".repeat(33))).toBe(false);
  });

  test("normalizeJoinPayload trims and defaults flow", () => {
    expect(
      normalizeJoinPayload({ room: ` ${VALID_ROOM_ID} `, username: " alice ", passcode: " 123456 " }),
    ).toEqual({
      flow: "join",
      roomId: VALID_ROOM_ID,
      username: "alice",
      passcode: "123456",
    });
  });

  test("rejects wrong passcode", () => {
    const room = createRoomState({ passcode: "secret123", size: 1 });
    const code = getJoinValidationError(
      { flow: "join", roomId: VALID_ROOM_ID, username: "bob", passcode: "wrong999" },
      room,
    );
    expect(code).toBe("INVALID_PASSCODE");
  });

  test("rejects duplicate username", () => {
    const room = createRoomState({ passcode: "secret123", size: 1, usernames: ["alice"] });
    const code = getJoinValidationError(
      { flow: "join", roomId: VALID_ROOM_ID, username: "alice", passcode: "secret123" },
      room,
    );
    expect(code).toBe("DUPLICATE_USERNAME");
  });

  test("allows 10th member, rejects 11th", () => {
    const roomAt9 = createRoomState({ passcode: "secret123", size: MAX_ROOM_CAPACITY - 1 });
    const ninthCode = getJoinValidationError(
      { flow: "join", roomId: VALID_ROOM_ID, username: "user10", passcode: "secret123" },
      roomAt9,
    );
    expect(ninthCode).toBeNull();

    const roomAt10 = createRoomState({ passcode: "secret123", size: MAX_ROOM_CAPACITY });
    const tenthCode = getJoinValidationError(
      { flow: "join", roomId: VALID_ROOM_ID, username: "user11", passcode: "secret123" },
      roomAt10,
    );
    expect(tenthCode).toBe("ROOM_FULL");
  });

  test("join non-existing room is rejected, create non-existing room is allowed", () => {
    expect(
      getJoinValidationError(
        { flow: "join", roomId: VALID_ROOM_ID, username: "alice", passcode: "secret123" },
        null,
      ),
    ).toBe("ROOM_NOT_FOUND");

    expect(
      getJoinValidationError(
        { flow: "create", roomId: VALID_ROOM_ID, username: "owner", passcode: "secret123" },
        null,
      ),
    ).toBeNull();
  });

  test("exports ROOM_CLOSED error message for owner room shutdown", () => {
    expect(ERROR_MESSAGES.ROOM_CLOSED).toBe("owner closed the room");
  });
});
