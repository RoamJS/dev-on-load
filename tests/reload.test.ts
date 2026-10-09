import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scheduleReload, type ReloadSession } from "../src/utils/reload";
import { getConfig } from "../src/utils/settings";

const setup = (session: ReloadSession = { attempted: false }) => {
  const config = { ...getConfig(() => undefined), delayMs: 2500 };
  return {
    session,
    config,
    reload: vi.fn(async () => ({ reloaded: [] })),
    notify: vi.fn(),
    reportError: vi.fn(),
  };
};

describe("startup reload", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());
  it("waits the full delay and only notifies after completion", async () => {
    const args = setup();
    let finish!: () => void;
    args.reload.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = () => resolve({ reloaded: [] });
        }),
    );
    scheduleReload(args);
    await vi.advanceTimersByTimeAsync(2499);
    expect(args.reload).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(args.reload).toHaveBeenCalledOnce();
    expect(args.notify).not.toHaveBeenCalled();
    finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(args.notify).toHaveBeenCalledWith({
      message: args.config.toastMessage,
      intent: "success",
    });
  });
  it("survives self-unload and new module load without scheduling a loop", async () => {
    const args = setup();
    const cancel = scheduleReload(args);
    args.reload.mockImplementation(async () => {
      expect(args.session.attempted).toBe(true);
      cancel();
      scheduleReload(args);
      return { reloaded: [] };
    });
    await vi.advanceTimersByTimeAsync(20000);
    expect(args.reload).toHaveBeenCalledOnce();
    expect(args.notify).toHaveBeenCalledOnce();
  });
  it("cancels pending work when disabled and permits a later load", async () => {
    const args = setup();
    scheduleReload(args)();
    await vi.advanceTimersByTimeAsync(3000);
    expect(args.reload).not.toHaveBeenCalled();
    expect(args.session.attempted).toBe(false);
    scheduleReload(args);
    await vi.advanceTimersByTimeAsync(2500);
    expect(args.reload).toHaveBeenCalledOnce();
  });
  it("suppresses the toast when requested", async () => {
    const args = setup();
    args.config.showToast = false;
    scheduleReload(args);
    await vi.advanceTimersByTimeAsync(2500);
    expect(args.reload).toHaveBeenCalledOnce();
    expect(args.notify).not.toHaveBeenCalled();
  });
  it("catches API failures, uses danger, and does not retry", async () => {
    const args = setup();
    const error = new Error("API unavailable");
    args.reload.mockRejectedValue(error);
    scheduleReload(args);
    await vi.advanceTimersByTimeAsync(2500);
    expect(args.reportError).toHaveBeenCalledWith(error);
    expect(args.notify).toHaveBeenCalledWith(
      expect.objectContaining({ intent: "danger" }),
    );
    scheduleReload(args);
    await vi.advanceTimersByTimeAsync(10000);
    expect(args.reload).toHaveBeenCalledOnce();
  });
  it("keeps failures silent when toasts are disabled", async () => {
    const args = setup();
    args.config.showToast = false;
    args.reload.mockRejectedValue(new Error("failed"));
    scheduleReload(args);
    await vi.advanceTimersByTimeAsync(2500);
    expect(args.notify).not.toHaveBeenCalled();
    expect(args.reportError).toHaveBeenCalledOnce();
  });
  it("allows exactly one reload if overlapping loads share the session", async () => {
    const args = setup();
    scheduleReload(args);
    scheduleReload(args);
    await vi.advanceTimersByTimeAsync(10000);
    expect(args.reload).toHaveBeenCalledOnce();
  });
  it("starts again in a fresh page session", async () => {
    const first = setup();
    scheduleReload(first);
    await vi.advanceTimersByTimeAsync(2500);
    const fresh = setup();
    scheduleReload(fresh);
    await vi.advanceTimersByTimeAsync(2500);
    expect(first.reload).toHaveBeenCalledOnce();
    expect(fresh.reload).toHaveBeenCalledOnce();
  });
});
