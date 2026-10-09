import { describe, expect, it } from "vitest";
import {
  DEFAULTS,
  getConfig,
  initializeSettings,
  TOAST_INTENTS,
} from "../src/utils/settings";

const config = (values: Record<string, unknown> = {}) =>
  getConfig((key) => values[key]);

describe("settings", () => {
  it.each([null, undefined])(
    "initializes Roam's unset settings (%j)",
    async (missing) => {
      const stored: Record<string, unknown> = {};
      await initializeSettings({
        get: (key) => stored[key] ?? missing,
        set: async (key, value) => {
          stored[key] = value;
        },
      });
      expect(stored).toEqual(DEFAULTS);
    },
  );
  it("preserves saved values, including false and zero", async () => {
    const stored: Record<string, unknown> = {
      "delay-seconds": 0,
      "show-toast": false,
      "toast-message": "My message",
    };
    await initializeSettings({
      get: (key) => stored[key],
      set: async (key, value) => {
        stored[key] = value;
      },
    });
    expect(stored).toMatchObject({
      "delay-seconds": 0,
      "show-toast": false,
      "toast-message": "My message",
    });
  });
  it("uses safe defaults for missing settings", () => {
    expect(config()).toEqual({
      delayMs: 5000,
      showToast: true,
      toastIntent: "success",
      toastMessage: DEFAULTS["toast-message"],
    });
  });
  it("adds whole seconds and milliseconds, including zero", () => {
    expect(
      config({ "delay-seconds": "2", "delay-milliseconds": "500" }).delayMs,
    ).toBe(2500);
    expect(
      config({ "delay-seconds": 0, "delay-milliseconds": 0 }).delayMs,
    ).toBe(0);
  });
  it.each([
    "",
    "-1",
    "1.5",
    "Infinity",
    "oops",
    null,
    true,
    {},
    "9007199254740992",
  ])("falls back for invalid delay %j", (value) => {
    expect(
      config({ "delay-seconds": value, "delay-milliseconds": value }).delayMs,
    ).toBe(5000);
  });
  it("caps large delays instead of overflowing the browser timer", () => {
    expect(
      config({
        "delay-seconds": "999999999",
        "delay-milliseconds": "999999999",
      }).delayMs,
    ).toBe(2147483647);
  });
  it.each(TOAST_INTENTS)("preserves toast intent %s", (intent) => {
    expect(config({ "toast-intent": intent }).toastIntent).toBe(intent);
  });
  it("honors toast suppression, custom text, and fallback values", () => {
    expect(
      config({ "show-toast": false, "toast-message": "Ready!" }),
    ).toMatchObject({ showToast: false, toastMessage: "Ready!" });
    expect(
      config({ "toast-message": "   ", "toast-intent": "bad" }),
    ).toMatchObject({
      toastMessage: DEFAULTS["toast-message"],
      toastIntent: "success",
    });
  });
});
