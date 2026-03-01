import {
  resolveSignalingEndpoint,
  type RuntimeEnvShape,
  type SignalingEndpointResolution,
} from "../shared/runtimeConfig";
import { getSignalingServerUrl } from "../shared/storage";
import {
  createChromeOffscreenRtcBridge,
  type BackgroundRtcBridge,
} from "./offscreenBridge";
import type { OffscreenEventMessage, RtcSignalAction } from "../shared/rtcProtocol";
import type {
  BackgroundSessionSnapshot,
  ConnectArgs,
  ConnectFailureResult,
  ConnectResult,
  ConnectionStatus,
  MessageType,
} from "../shared/sessionTypes";
import {
  createChatMessage,
  getDefaultSessionSnapshot,
  getRoomCapacity,
  getServerErrorMessage,
  toRole,
} from "../shared/session";

const ROOM_CAPACITY = getRoomCapacity();
const CONNECTION_ERROR_MESSAGE =
  "Connection error. Check that the signaling server is reachable and that LAN or Local Network access is allowed.";

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

export interface BackgroundSessionManager {
  connect: (args: ConnectArgs) => Promise<ConnectResult>;
  disconnect: () => void;
  sendMessage: (text: string) => void;
  getSnapshot: () => BackgroundSessionSnapshot;
  subscribe: (listener: (snapshot: BackgroundSessionSnapshot) => void) => () => void;
}

interface BackgroundSessionManagerOptions {
  endpointResolver?: (env?: RuntimeEnvShape) => SignalingEndpointResolution;
  webSocketFactory?: (url: string) => WebSocket;
  rtcBridge?: BackgroundRtcBridge;
}

export function createBackgroundSessionManager(
  options: BackgroundSessionManagerOptions = {},
): BackgroundSessionManager {
  const endpointResolver =
    options.endpointResolver ?? ((env?: RuntimeEnvShape) => resolveSignalingEndpoint(env));
  const webSocketFactory = options.webSocketFactory ?? ((url: string) => new WebSocket(url));
  let snapshot = getDefaultSessionSnapshot();
  let socket: WebSocket | null = null;
  let peerId = "";
  const listeners = new Set<(snapshot: BackgroundSessionSnapshot) => void>();

  const rtcBridge =
    options.rtcBridge ??
    createChromeOffscreenRtcBridge({
      chromeApi: chrome,
      onEvent: handleRtcBridgeEvent,
    });

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
    action: RtcSignalAction,
    to: string,
    payload: RTCSessionDescriptionInit | RTCIceCandidateInit,
  ) {
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ action, to, payload }));
  }

  function handleRtcBridgeEvent(event: OffscreenEventMessage) {
    switch (event.action) {
      case "signal":
        sendSignal(event.payload.action, event.payload.to, event.payload.payload);
        break;
      case "received":
        addMessage(`Peer (${event.payload.from}): ${event.payload.text}`, "peer");
        break;
      case "diagnostic":
        if (event.payload.code === "RTC_UNAVAILABLE") {
          addMessage(
            "⚠ WebRTC is unavailable in the extension offscreen runtime. Peer chat cannot start.",
            "info",
          );
        }
        break;
    }
  }

  function onPeerJoined(remotePeerId?: string) {
    if (!remotePeerId || remotePeerId === peerId) return;
    void rtcBridge.peerJoined(remotePeerId).catch((error) => {
      console.warn("[peer-bridge] failed to notify offscreen peer join", error);
    });
  }

  function onPeerLeft(remotePeerId?: string) {
    if (!remotePeerId) return;
    void rtcBridge.peerLeft(remotePeerId).catch((error) => {
      console.warn("[peer-bridge] failed to notify offscreen peer leave", error);
    });
  }

  function onRelaySignal(msg: RelayServerMessage) {
    const remotePeerId = typeof msg.from === "string" ? msg.from : "";
    const payload = msg.payload;
    if (!remotePeerId || !payload || !msg.type) return;

    void rtcBridge
      .receiveSignal({
        action: msg.type,
        from: remotePeerId,
        payload,
      })
      .catch((error) => {
        console.warn(`[peer-bridge] failed to forward ${msg.type} to offscreen`, error);
      });
  }

  function resetSessionState(
    status: ConnectionStatus = "idle",
    error: ConnectFailureResult | null = null,
  ) {
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
      await rtcBridge.disconnect().catch(() => {
        // Ignore offscreen teardown failures while reconnecting.
      });

      setSnapshot({
        roomId,
        role: currentRole,
        messages: [],
        status: "connecting",
        peers: 0,
        capacity: ROOM_CAPACITY,
        error: null,
      });
      peerId = "";

      const signalingServerOverride = await getSignalingServerUrl();
      const endpoint = endpointResolver({
        ...import.meta.env,
        PEER_BRIDGE_SIGNALING_URL:
          signalingServerOverride ?? import.meta.env.PEER_BRIDGE_SIGNALING_URL,
      });
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

      try {
        await rtcBridge.ensureReady();
      } catch (error) {
        console.error("[peer-bridge] failed to initialize offscreen runtime", error);
        const failure = {
          ok: false,
          message: "Failed to initialize the offscreen WebRTC runtime.",
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
                  addMessage(
                    `✓ Created room "${joinedMsg.room}" as ${joinedMsg.username}.`,
                    "info",
                  );
                } else {
                  addMessage(
                    `✓ Joined room "${joinedMsg.room}" as ${joinedMsg.username}.`,
                    "info",
                  );
                }
                void rtcBridge
                  .resetSession({
                    peerId,
                    username: joinedMsg.username,
                  })
                  .then(() => {
                    if (Array.isArray(joinedMsg.peerList)) {
                      for (const remotePeerId of joinedMsg.peerList) {
                        onPeerJoined(remotePeerId);
                      }
                    }
                  })
                  .catch((error) => {
                    console.warn("[peer-bridge] failed to reset offscreen session", error);
                  });
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
              case "answer":
              case "ice":
                onRelaySignal(msg as RelayServerMessage);
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
          void rtcBridge.disconnect().catch(() => {
            // Ignore offscreen teardown failures on close.
          });
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
          void rtcBridge.disconnect().catch(() => {
            // Ignore offscreen teardown failures on error.
          });
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
      void rtcBridge.disconnect().catch(() => {
        // Ignore offscreen teardown failures during explicit disconnect.
      });
      socket?.close();
      socket = null;
      peerId = "";
      resetSessionState();
    },

    sendMessage(text: string) {
      const trimmed = typeof text === "string" ? text.trim() : "";
      if (!trimmed) return;

      void rtcBridge
        .sendMessage(trimmed)
        .then((result) => {
          if (result.sent) {
            addMessage(`You: ${trimmed}`, "self");
            return;
          }

          if (result.reason === "rtc-unavailable") {
            addMessage(
              "⚠ WebRTC is unavailable in the extension offscreen runtime. Peer chat cannot start.",
              "info",
            );
            return;
          }

          if (result.reason === "no-peers") {
            addMessage("⚠ No peers are connected yet.", "info");
            return;
          }

          addMessage("⚠ Peer channel is not open yet. Wait a moment and try again.", "info");
        })
        .catch((error) => {
          console.warn("[peer-bridge] failed to send message via offscreen runtime", error);
          addMessage("⚠ Failed to send message.", "info");
        });
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
