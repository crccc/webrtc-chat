const { getJoinValidationError, isUuidV4 } = require("../index");

const VALID_ROOM_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479";

describe("room id validation", () => {
  test("isUuidV4 accepts valid UUIDv4", () => {
    expect(isUuidV4(VALID_ROOM_ID)).toBe(true);
  });

  test("isUuidV4 rejects invalid room id", () => {
    expect(isUuidV4("f47ac10b-58cc-1372-a567-0e02b2c3d479")).toBe(false);
    expect(isUuidV4("room-a")).toBe(false);
    expect(isUuidV4("")).toBe(false);
  });

  test("getJoinValidationError returns INVALID_ROOM_ID for invalid room id", () => {
    expect(getJoinValidationError("room-a")).toBe("INVALID_ROOM_ID");
    expect(getJoinValidationError(VALID_ROOM_ID)).toBeNull();
  });
});
