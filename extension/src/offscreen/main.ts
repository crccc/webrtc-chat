import {
  isOffscreenCommandMessage,
  type OffscreenCommandResponse,
} from "../shared/rtcProtocol";
import { createRtcPeerManager } from "./rtcPeerManager";

const rtcManager = createRtcPeerManager({
  onSignal(action, to, payload) {
    void chrome.runtime.sendMessage({
      namespace: "rtc",
      target: "background",
      action: "signal",
      payload: {
        action,
        to,
        payload,
      },
    });
  },
  onMessage(message) {
    void chrome.runtime.sendMessage({
      namespace: "rtc",
      target: "background",
      action: "received",
      payload: {
        from: message.from,
        text: message.text,
      },
    });
  },
  onDiagnostic(code) {
    void chrome.runtime.sendMessage({
      namespace: "rtc",
      target: "background",
      action: "diagnostic",
      payload: { code },
    });
  },
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isOffscreenCommandMessage(message)) {
    return undefined;
  }

  void (async () => {
    let response: OffscreenCommandResponse = { ok: true };

    switch (message.action) {
      case "reset":
        rtcManager.resetSession(message.payload);
        break;
      case "peer-joined":
        await rtcManager.handlePeerJoined(message.payload.peerId);
        break;
      case "peer-left":
        rtcManager.handlePeerLeft(message.payload.peerId);
        break;
      case "signal":
        await rtcManager.handleSignal(message.payload);
        break;
      case "send":
        response = {
          ok: true,
          ...rtcManager.sendMessage(message.payload.text),
        };
        break;
      case "disconnect":
        rtcManager.disconnect();
        break;
    }

    sendResponse(response);
  })();

  return true;
});
