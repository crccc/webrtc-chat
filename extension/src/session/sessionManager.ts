import { getIceConfiguration } from "../webrtc/iceConfig";
import { resolveSignalingEndpoint, type SignalingEndpointResolution } from "../config/runtime";
import type {
  BackgroundSessionSnapshot,
  ChatMessage,
  ConnectArgs,
  ConnectFailureResult,
  ConnectFlow,
  ConnectResult,
  ConnectionStatus,
  MessageType,
  Role,
} from "../types";
const ROOM_CAPACITY = 8;
const CONNECTION_ERROR_MESSAGE =
  "Connection error. Check that the signaling server is reachable and that LAN or Local Network access is allowed.";

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

interface PeerConnectionEntry {
  pc: RTCPeerConnection;
  dc: RTCDataChannel | null;
}

interface ParsedChannelMessage {
  from: string;
  text: string;
}

interface JoinedServerMessage {
  type: "joined";
  room: string;
  peerId?: string;
  peerList?: string[];
  peers?: number;
  capacity?: number;
  username: string;
}

interface PresenceServerMessage {
  type: "presence";
  peers?: number;
  capacity?: number;
}

interface PeerLifecycleServerMessage {
  type: "signal.joined" | "signal.left";
  peerId?: string;
}

interface RelayServerMessage {
  type: "offer" | "answer" | "ice";
  from?: string;
  payload?: RTCSessionDescriptionInit | RTCIceCandidateInit;
}

interface ErrorServerMessage {
  type: "error";
  code?: string;
}

type ServerMessage =
  | JoinedServerMessage
  | PresenceServerMessage
  | PeerLifecycleServerMessage
  | RelayServerMessage
  | ErrorServerMessage
  | { type?: string; [key: string]: unknown };

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

function createChatMessage(text: string, type: MessageType): ChatMessage {
  return {
    id: Date.now() + Math.random(),
    text,
    type,
  };
}

function toRole(flow: ConnectFlow): Role {
  return flow === "create" ? "owner" : "participant";
}

export interface BackgroundSessionManager {
  connect: (args: ConnectArgs) => Promise<ConnectResult>;
  disconnect: () => void;
  sendMessage: (text: string) => void;
  getSnapshot: () => BackgroundSessionSnapshot;
  subscribe: (listener: (snapshot: BackgroundSessionSnapshot) => void) => () => void;
}

interface BackgroundSessionManagerOptions {
  endpointResolver?: () => SignalingEndpointResolution;
  webSocketFactory?: (url: string) => WebSocket;
}

export function createBackgroundSessionManager(
  options: BackgroundSessionManagerOptions = {},
): BackgroundSessionManager {
  const endpointResolver = options.endpointResolver ?? (() => resolveSignalingEndpoint());
  const webSocketFactory = options.webSocketFactory ?? ((url: string) => new WebSocket(url));
  let snapshot = getDefaultSessionSnapshot();
  let socket: WebSocket | null = null;
  let username = "";
  let peerId = "";
  const peers = new Map<string, PeerConnectionEntry>();
  const listeners = new Set<(snapshot: BackgroundSessionSnapshot) => void>();

  function notify() {
    const nextSnapshot = {
      ...snapshot,
      messages: [...snapshot.messages],
    };
    for (const listener of listeners) {
      listener(nextSnapshot);
    }
  }

  function setSnapshot(
    updater:
      | Partial<BackgroundSessionSnapshot>
      | ((current: BackgroundSessionSnapshot) => BackgroundSessionSnapshot),
  ) {
    snapshot =
      typeof updater === "function"
        ? updater(snapshot)
        : {
            ...snapshot,
            ...updater,
          };
    notify();
  }

  function addMessage(text: string, type: MessageType) {
    setSnapshot((current) => ({
      ...current,
      messages: [...current.messages, createChatMessage(text, type)],
    }));
  }

  function sendSignal(
    action: "offer" | "answer" | "ice",
    to: string,
    payload: RTCSessionDescriptionInit | RTCIceCandidateInit,
  ) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ action, to, payload }));
  }

  function closePeer(remotePeerId: string) {
    const entry = peers.get(remotePeerId);
    if (!entry) return;
    try {
      entry.dc?.close();
    } catch {
      // Ignore close failures.
    }
    try {
      entry.pc.close();
    } catch {
      // Ignore close failures.
    }
    peers.delete(remotePeerId);
  }

  function closeAllPeers() {
    for (const remotePeerId of peers.keys()) {
      closePeer(remotePeerId);
    }
    peers.clear();
  }

  function setupDataChannel(remotePeerId: string, dc: RTCDataChannel) {
    const existing = peers.get(remotePeerId);
    if (!existing) return;
    existing.dc = dc;
    dc.onmessage = (event) => {
      const parsed = decodeChannelMessage(event.data, remotePeerId);
      if (!parsed) return;
      addMessage(`Peer (${parsed.from}): ${parsed.text}`, "peer");
    };
    dc.onerror = () => {
      // Keep channel errors non-fatal for other peers.
    };
  }

  function ensurePeerConnection(
    remotePeerId: string,
    options: { initiator: boolean },
  ): PeerConnectionEntry | null {
    if (!remotePeerId || remotePeerId === peerId) return null;

    const existing = peers.get(remotePeerId);
    if (existing) return existing;

    if (typeof RTCPeerConnection !== "function") {
      return null;
    }

    const pc = new RTCPeerConnection(getIceConfiguration());
    const entry: PeerConnectionEntry = { pc, dc: null };
    peers.set(remotePeerId, entry);

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      sendSignal("ice", remotePeerId, event.candidate.toJSON());
    };

    pc.ondatachannel = (event) => {
      setupDataChannel(remotePeerId, event.channel);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "failed" || pc.connectionState === "closed") {
        closePeer(remotePeerId);
      }
    };

    if (options.initiator) {
      const dc = pc.createDataChannel("chat", { ordered: true });
      setupDataChannel(remotePeerId, dc);
    }

    return entry;
  }

  async function createAndSendOffer(remotePeerId: string) {
    const entry = ensurePeerConnection(remotePeerId, { initiator: true });
    if (!entry) return;
    try {
      const offer = await entry.pc.createOffer();
      await entry.pc.setLocalDescription(offer);
      sendSignal("offer", remotePeerId, entry.pc.localDescription ?? offer);
    } catch (error) {
      console.warn("[peer-bridge] offer negotiation failed", error);
    }
  }

  function onPeerJoined(remotePeerId?: string) {
    if (!remotePeerId || remotePeerId === peerId) return;
    if (shouldInitiateOffer(peerId, remotePeerId)) {
      void createAndSendOffer(remotePeerId);
      return;
    }
    ensurePeerConnection(remotePeerId, { initiator: false });
  }

  function onPeerLeft(remotePeerId?: string) {
    if (!remotePeerId) return;
    closePeer(remotePeerId);
  }

  async function onSignalOffer(msg: RelayServerMessage) {
    const remotePeerId = typeof msg.from === "string" ? msg.from : "";
    const payload = msg.payload;
    if (!remotePeerId || !payload) return;

    try {
      const entry = ensurePeerConnection(remotePeerId, { initiator: false });
      if (!entry) return;
      await entry.pc.setRemoteDescription(payload as RTCSessionDescriptionInit);
      const answer = await entry.pc.createAnswer();
      await entry.pc.setLocalDescription(answer);
      sendSignal("answer", remotePeerId, entry.pc.localDescription ?? answer);
    } catch (error) {
      console.warn("[peer-bridge] failed to handle offer", error);
    }
  }

  async function onSignalAnswer(msg: RelayServerMessage) {
    const remotePeerId = typeof msg.from === "string" ? msg.from : "";
    const payload = msg.payload;
    if (!remotePeerId || !payload) return;
    const entry = peers.get(remotePeerId);
    if (!entry) return;
    try {
      await entry.pc.setRemoteDescription(payload as RTCSessionDescriptionInit);
    } catch (error) {
      console.warn("[peer-bridge] failed to handle answer", error);
    }
  }

  async function onSignalIce(msg: RelayServerMessage) {
    const remotePeerId = typeof msg.from === "string" ? msg.from : "";
    const payload = msg.payload;
    if (!remotePeerId || !payload) return;
    const entry = peers.get(remotePeerId);
    if (!entry) return;
    try {
      await entry.pc.addIceCandidate(payload as RTCIceCandidateInit);
    } catch (error) {
      console.warn("[peer-bridge] failed to add ice candidate", error);
    }
  }

  function resetSessionState(status: ConnectionStatus = "idle", error: ConnectFailureResult | null = null) {
    setSnapshot({
      ...getDefaultSessionSnapshot(),
      status,
      error,
    });
  }

  return {
    async connect({ roomId, username: nextUsername, passcode, flow = "join" }: ConnectArgs) {
      const currentRole = toRole(flow);
      if (
        snapshot.status === "connected" &&
        snapshot.roomId === roomId &&
        snapshot.role === currentRole
      ) {
        return { ok: true };
      }

      if (socket) {
        socket.close(1000, "REPLACED_SESSION");
      }
      closeAllPeers();

      setSnapshot({
        roomId,
        role: currentRole,
        messages: [],
        status: "connecting",
        peers: 0,
        capacity: ROOM_CAPACITY,
        error: null,
      });
      username = nextUsername;
      peerId = "";

      const endpoint = endpointResolver();
      if (!endpoint.ok) {
        const failure = {
          ok: false,
          message: endpoint.message,
        } satisfies ConnectFailureResult;
        setSnapshot((current) => ({
          ...current,
          status: "error",
          error: failure,
        }));
        return failure;
      }

      const ws = webSocketFactory(endpoint.endpoint);
      socket = ws;

      return new Promise<ConnectResult>((resolve) => {
        let settled = false;
        let joined = false;

        function resolveOnce(value: ConnectResult) {
          if (settled) return;
          settled = true;
          resolve(value);
        }

        ws.addEventListener("open", () => {
          ws.send(
            JSON.stringify({
              action: "join",
              flow,
              room: roomId,
              username: nextUsername,
              passcode,
            }),
          );
        });

        ws.addEventListener("message", (event) => {
          try {
            const msg = JSON.parse(event.data as string) as ServerMessage;

            switch (msg.type) {
              case "joined": {
                const joinedMsg = msg as JoinedServerMessage;
                joined = true;
                peerId = joinedMsg.peerId ?? "";
                setSnapshot((current) => ({
                  ...current,
                  roomId: joinedMsg.room,
                  role: currentRole,
                  status: "connected",
                  peers: joinedMsg.peers ?? 1,
                  capacity: joinedMsg.capacity ?? ROOM_CAPACITY,
                  error: null,
                }));
                if (flow === "create") {
                  addMessage(`✓ Created room "${joinedMsg.room}" as ${joinedMsg.username}.`, "info");
                } else {
                  addMessage(`✓ Joined room "${joinedMsg.room}" as ${joinedMsg.username}.`, "info");
                }
                if (Array.isArray(joinedMsg.peerList)) {
                  for (const remotePeerId of joinedMsg.peerList) {
                    onPeerJoined(remotePeerId);
                  }
                }
                resolveOnce({ ok: true });
                break;
              }
              case "signal.joined":
                onPeerJoined((msg as PeerLifecycleServerMessage).peerId);
                break;
              case "signal.left":
                onPeerLeft((msg as PeerLifecycleServerMessage).peerId);
                break;
              case "presence":
                setSnapshot((current) => ({
                  ...current,
                  peers: (msg as PresenceServerMessage).peers ?? 0,
                  capacity: (msg as PresenceServerMessage).capacity ?? ROOM_CAPACITY,
                }));
                break;
              case "offer":
                void onSignalOffer(msg as RelayServerMessage);
                break;
              case "answer":
                void onSignalAnswer(msg as RelayServerMessage);
                break;
              case "ice":
                void onSignalIce(msg as RelayServerMessage);
                break;
              case "error": {
                const failure = {
                  ok: false,
                  code: (msg as ErrorServerMessage).code,
                  message: getServerErrorMessage((msg as ErrorServerMessage).code),
                } satisfies ConnectFailureResult;
                setSnapshot((current) => ({
                  ...current,
                  status: "error",
                  error: failure,
                }));
                resolveOnce(failure);
                ws.close();
                break;
              }
              default:
                console.log("[peer-bridge] Unknown message type:", msg);
            }
          } catch {
            console.warn("[peer-bridge] Unexpected non-JSON message:", event.data);
          }
        });

        ws.addEventListener("close", () => {
          closeAllPeers();
          socket = null;
          peerId = "";
          if (!settled) {
            const failure = {
              ok: false,
              message: "Connection closed before join completed.",
            } satisfies ConnectFailureResult;
            setSnapshot((current) => ({
              ...current,
              status: joined ? "disconnected" : "error",
              error: joined ? null : failure,
            }));
            resolveOnce(failure);
            if (!joined) return;
          } else {
            setSnapshot((current) => ({
              ...current,
              status: "disconnected",
            }));
          }

          if (joined) {
            addMessage("⚠ Disconnected from server.", "info");
          }
        });

        ws.addEventListener("error", () => {
          closeAllPeers();
          socket = null;
          peerId = "";
          const failure = {
            ok: false,
            message: CONNECTION_ERROR_MESSAGE,
          } satisfies ConnectFailureResult;
          setSnapshot((current) => ({
            ...current,
            status: "error",
            error: failure,
          }));
          resolveOnce(failure);
        });
      });
    },

    disconnect() {
      closeAllPeers();
      socket?.close();
      socket = null;
      username = "";
      peerId = "";
      resetSessionState();
    },

    sendMessage(text: string) {
      const trimmed = typeof text === "string" ? text.trim() : "";
      if (!trimmed) return;

      let sent = false;
      const payload = JSON.stringify({
        type: "chat",
        from: username || peerId || "peer",
        text: trimmed,
      });

      for (const entry of peers.values()) {
        const dc = entry.dc;
        if (!dc || dc.readyState !== "open") continue;
        try {
          dc.send(payload);
          sent = true;
        } catch (error) {
          console.warn("[peer-bridge] data channel send failed", error);
        }
      }

      if (sent) {
        addMessage(`You: ${trimmed}`, "self");
      }
    },

    getSnapshot() {
      return {
        ...snapshot,
        messages: [...snapshot.messages],
      };
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
