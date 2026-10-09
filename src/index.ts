import runExtension from "roamjs-components/util/runExtension";
import { render as renderToast } from "roamjs-components/components/Toast";
import {
  DEFAULTS,
  getConfig,
  initializeSettings,
  TOAST_INTENTS,
} from "~/utils/settings";
import { scheduleReload, type ReloadSession } from "~/utils/reload";

const SESSION_KEY = "__roamjsDevOnLoadSession";
type ReloadWindow = Window & { [SESSION_KEY]?: ReloadSession };
type DepotAPI = { reloadDeveloperExtensions?: () => Promise<unknown> };

export default runExtension(async ({ extensionAPI }) => {
  await initializeSettings(extensionAPI.settings);

  extensionAPI.settings.panel.create({
    tabTitle: "Dev on Load",
    settings: [
      {
        id: "delay-seconds",
        name: "Delay (seconds)",
        description:
          "Whole seconds to wait after this extension loads. Added to milliseconds. Changes apply on the next page load.",
        action: { type: "input", placeholder: "5" },
      },
      {
        id: "delay-milliseconds",
        name: "Delay (milliseconds)",
        description:
          "Additional whole milliseconds to wait. For example, 2 seconds + 500 milliseconds = 2.5 seconds. Invalid or negative values use the default.",
        action: { type: "input", placeholder: "0" },
      },
      {
        id: "show-toast",
        name: "Show toast",
        description: "Show a notification after the reload finishes or fails.",
        action: { type: "switch" },
      },
      {
        id: "toast-intent",
        name: "Toast intent",
        description:
          "Appearance of the completion notification. Reload failures use danger.",
        action: { type: "select", items: [...TOAST_INTENTS] },
      },
      {
        id: "toast-message",
        name: "Toast message",
        description:
          "Message shown after developer extensions finish reloading.",
        action: { type: "input", placeholder: DEFAULTS["toast-message"] },
      },
    ],
  });

  // Keep this on window: a developer reload replaces the module, but not the page.
  const host = window as ReloadWindow;
  const session = (host[SESSION_KEY] ??= { attempted: false });
  const config = getConfig(extensionAPI.settings.get);
  const unload = scheduleReload({
    session,
    config,
    reload: async (): Promise<unknown> => {
      const depot = (
        window.roamAlphaAPI as typeof window.roamAlphaAPI & { depot?: DepotAPI }
      ).depot;
      if (typeof depot?.reloadDeveloperExtensions !== "function") {
        throw new Error(
          "Roam's developer extension reload API is unavailable.",
        );
      }
      return depot.reloadDeveloperExtensions();
    },
    notify: ({ message, intent }): void => {
      renderToast({
        id: "dev-on-load-result",
        content: message,
        intent,
      });
    },
    reportError: (error): void => {
      console.error("Dev on Load: reload failed", error);
    },
  });

  return { unload };
});
