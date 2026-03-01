import { defineBackground } from "wxt/utils/define-background";
import { createBackgroundSessionManager } from "../src/background/sessionManager";
import { setupBackgroundRuntime } from "../src/background/runtime";

export default defineBackground(() => {
  const controller = createBackgroundSessionManager();
  setupBackgroundRuntime({
    controller,
    chromeApi: chrome,
  });
});
