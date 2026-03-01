import type {
  BackgroundSessionSnapshot,
  ChatMessage,
  ConnectFlow,
  MessageType,
  Role,
} from "./sessionTypes";

const ROOM_CAPACITY = 8;

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_ROOM_ID: "Room ID must be a valid UUIDv4.",
  INVALID_USERNAME: "Username is required.",
  INVALID_PASSCODE_FORMAT: "Passcode must be 6-32 characters.",
  ROOM_NOT_FOUND: "Room not found. Ask owner to create it first.",
  INVALID_PASSCODE: "Incorrect passcode.",
  DUPLICATE_USERNAME: "This username is already in use in the room.",
  ROOM_FULL: "Room is full (8/8).",
  NOT_IN_ROOM: "You are not in an active room.",
  INVALID_SIGNAL_PAYLOAD: "Signal payload is invalid.",
  TARGET_NOT_FOUND: "Target peer was not found in this room.",
  ROOM_CLOSED: "Room was closed.",
};

export interface ParsedChannelMessage {
  from: string;
  text: string;
}

export function getRoomCapacity(): number {
  return ROOM_CAPACITY;
}

export function getDefaultSessionSnapshot(): BackgroundSessionSnapshot {
  return {
    roomId: null,
    role: null,
    messages: [],
    status: "idle",
    peers: 0,
    capacity: ROOM_CAPACITY,
    error: null,
  };
}

export function getServerErrorMessage(code?: string): string {
  return (code && ERROR_MESSAGES[code]) || "Unable to join room. Please try again.";
}

export function shouldInitiateOffer(localPeerId: string, remotePeerId: string): boolean {
  if (!localPeerId || !remotePeerId) return false;
  return localPeerId < remotePeerId;
}

export function decodeChannelMessage(
  data: unknown,
  fallbackFrom: string,
): ParsedChannelMessage | null {
  if (typeof data !== "string" || data.trim().length === 0) return null;

  try {
    const parsed = JSON.parse(data) as { from?: unknown; text?: unknown };
    if (typeof parsed?.text !== "string" || parsed.text.trim().length === 0) return null;
    return {
      from:
        typeof parsed.from === "string" && parsed.from.trim().length > 0
          ? parsed.from
          : fallbackFrom,
      text: parsed.text.trim(),
    };
  } catch {
    return {
      from: fallbackFrom,
      text: data.trim(),
    };
  }
}

export function createChatMessage(text: string, type: MessageType): ChatMessage {
  return {
    id: Date.now() + Math.random(),
    text,
    type,
  };
}

export function toRole(flow: ConnectFlow): Role {
  return flow === "create" ? "owner" : "participant";
}
