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
      expect(stored["delay-seconds"]).toBe("3");
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
      delayMs: 3000,
      showToast: true,
      toastIntent: "success",
      toastMessage: DEFAULTS["toast-message"],
    });
  });
  it.each([
    ["2", 2000],
    ["2.5", 2500],
    ["1.25", 1250],
    [".25", 250],
    [" 2.5 ", 2500],
    ["0.005", 5],
    ["1.2345", 1235],
    [2.5, 2500],
    [0, 0],
  ])("converts seconds %j to %i milliseconds", (value, expected) => {
    expect(config({ "delay-seconds": value }).delayMs).toBe(expected);
  });
  it.each([
    "",
    "-1",
    "-0.5",
    "1.2.3",
    "0x10",
    "1e3",
    "Infinity",
    "oops",
    null,
    true,
    {},
    "9".repeat(400),
  ])("falls back for invalid delay %j", (value) => {
    expect(config({ "delay-seconds": value }).delayMs).toBe(3000);
  });
  it("caps large delays instead of overflowing the browser timer", () => {
    expect(
      config({
        "delay-seconds": "999999999",
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
