import { getIceConfiguration } from "../webrtc/iceConfig";
import {
  decodeChannelMessage,
  shouldInitiateOffer,
  type ParsedChannelMessage,
} from "./sessionManager";
import type { RtcSignalAction } from "./offscreenProtocol";

interface PeerConnectionEntry {
  pc: RTCPeerConnection;
  dc: RTCDataChannel | null;
}

interface RtcPeerManagerEvents {
  onSignal: (
    action: RtcSignalAction,
    to: string,
    payload: RTCSessionDescriptionInit | RTCIceCandidateInit,
  ) => void;
  onMessage: (message: ParsedChannelMessage) => void;
  onDiagnostic?: (code: "RTC_UNAVAILABLE") => void;
}

export interface RtcPeerManager {
  resetSession: (local: { peerId: string; username: string }) => void;
  handlePeerJoined: (remotePeerId?: string) => Promise<void>;
  handlePeerLeft: (remotePeerId?: string) => void;
  handleSignal: (signal: {
    action: RtcSignalAction;
    from: string;
    payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
  }) => Promise<void>;
  sendMessage: (
    text: string,
  ) => { sent: boolean; reason?: "no-peers" | "not-open" | "rtc-unavailable" };
  disconnect: () => void;
}

export function createRtcPeerManager(events: RtcPeerManagerEvents): RtcPeerManager {
  const peers = new Map<string, PeerConnectionEntry>();
  let peerId = "";
  let username = "";
  let hasReportedRtcUnavailable = false;

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

  function reportRtcUnavailable() {
    if (hasReportedRtcUnavailable) return;
    hasReportedRtcUnavailable = true;
    events.onDiagnostic?.("RTC_UNAVAILABLE");
  }

  function setupDataChannel(remotePeerId: string, dc: RTCDataChannel) {
    const existing = peers.get(remotePeerId);
    if (!existing) return;
    existing.dc = dc;
    dc.onmessage = (event) => {
      const parsed = decodeChannelMessage(event.data, remotePeerId);
      if (!parsed) return;
      events.onMessage(parsed);
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
      reportRtcUnavailable();
      return null;
    }

    const pc = new RTCPeerConnection(getIceConfiguration());
    const entry: PeerConnectionEntry = { pc, dc: null };
    peers.set(remotePeerId, entry);

    pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      events.onSignal("ice", remotePeerId, event.candidate.toJSON());
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
      console.log("[peer-bridge] Creating data channel to", remotePeerId);
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
      events.onSignal("offer", remotePeerId, entry.pc.localDescription ?? offer);
    } catch (error) {
      console.warn("[peer-bridge] offer negotiation failed", error);
    }
  }

  return {
    resetSession(local) {
      closeAllPeers();
      peerId = local.peerId;
      username = local.username;
      hasReportedRtcUnavailable = false;
    },

    async handlePeerJoined(remotePeerId) {
      if (!remotePeerId || remotePeerId === peerId) return;
      console.log("[peer-bridge] Peer joined", {
        localPeerId: peerId,
        remotePeerId,
        initiator: shouldInitiateOffer(peerId, remotePeerId),
      });
      if (shouldInitiateOffer(peerId, remotePeerId)) {
        await createAndSendOffer(remotePeerId);
        return;
      }
      ensurePeerConnection(remotePeerId, { initiator: false });
    },

    handlePeerLeft(remotePeerId) {
      if (!remotePeerId) return;
      closePeer(remotePeerId);
    },

    async handleSignal(signal) {
      const remotePeerId = signal.from;
      const payload = signal.payload;
      if (!remotePeerId || !payload) return;

      if (signal.action === "offer") {
        try {
          const entry = ensurePeerConnection(remotePeerId, { initiator: false });
          if (!entry) return;
          await entry.pc.setRemoteDescription(payload as RTCSessionDescriptionInit);
          const answer = await entry.pc.createAnswer();
          await entry.pc.setLocalDescription(answer);
          events.onSignal("answer", remotePeerId, entry.pc.localDescription ?? answer);
        } catch (error) {
          console.warn("[peer-bridge] failed to handle offer", error);
        }
        return;
      }

      const entry = peers.get(remotePeerId);
      if (!entry) return;

      if (signal.action === "answer") {
        try {
          await entry.pc.setRemoteDescription(payload as RTCSessionDescriptionInit);
        } catch (error) {
          console.warn("[peer-bridge] failed to handle answer", error);
        }
        return;
      }

      try {
        await entry.pc.addIceCandidate(payload as RTCIceCandidateInit);
      } catch (error) {
        console.warn("[peer-bridge] failed to add ice candidate", error);
      }
    },

    sendMessage(text) {
      const trimmed = typeof text === "string" ? text.trim() : "";
      if (!trimmed) {
        return { sent: false, reason: "not-open" } as const;
      }

      if (typeof RTCPeerConnection !== "function") {
        reportRtcUnavailable();
        return { sent: false, reason: "rtc-unavailable" } as const;
      }

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
        return { sent: true } as const;
      }

      return peers.size === 0
        ? ({ sent: false, reason: "no-peers" } as const)
        : ({ sent: false, reason: "not-open" } as const);
    },

    disconnect() {
      closeAllPeers();
      peerId = "";
      username = "";
      hasReportedRtcUnavailable = false;
    },
  };
}
