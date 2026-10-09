export const TOAST_INTENTS = [
  "none",
  "primary",
  "success",
  "warning",
  "danger",
] as const;
export type ToastIntent = (typeof TOAST_INTENTS)[number];
export const DEFAULTS = {
  "delay-seconds": "5",
  "delay-milliseconds": "0",
  "show-toast": true,
  "toast-intent": "success",
  "toast-message": "Developer extensions reloaded.",
} as const;
export type ReloadConfig = {
  delayMs: number;
  showToast: boolean;
  toastIntent: ToastIntent;
  toastMessage: string;
};

export const initializeSettings = async (settings: {
  get: (key: string) => unknown;
  set: (key: string, value: unknown) => Promise<void>;
}): Promise<void> => {
  for (const [key, value] of Object.entries(DEFAULTS)) {
    // Roam returns null for unset settings; mocks may return undefined.
    if (settings.get(key) == null) await settings.set(key, value);
  }
};
const parseDelay = (value: unknown, fallback: number): number => {
  if (typeof value !== "string" && typeof value !== "number") return fallback;
  const text = String(value).trim();
  if (!/^\d+$/.test(text)) return fallback;
  const number = Number(text);
  return Number.isSafeInteger(number) ? number : fallback;
};
export const getConfig = (get: (key: string) => unknown): ReloadConfig => {
  const intent = get("toast-intent");
  const message = get("toast-message");
  return {
    // Browser timers overflow above this limit and otherwise fire immediately.
    delayMs: Math.min(
      parseDelay(get("delay-seconds"), 5) * 1000 +
        parseDelay(get("delay-milliseconds"), 0),
      2_147_483_647,
    ),
    showToast: get("show-toast") !== false,
    toastIntent: TOAST_INTENTS.includes(intent as ToastIntent)
      ? (intent as ToastIntent)
      : "success",
    toastMessage:
      typeof message === "string" && message.trim()
        ? message
        : DEFAULTS["toast-message"],
  };
};
