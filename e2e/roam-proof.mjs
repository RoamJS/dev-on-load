import assert from "node:assert/strict";
import path from "node:path";
import {
  openRoamDepotSettings,
  removeExistingDeveloperExtensions,
} from "../../../.agents/skills/roamjs-load-extension/scripts/load-plugin.mjs";

const tab = (page) =>
  page.getByRole("tab", { name: /^Dev on Load(?: \(dev\))?$/ });
const showToast = (page) =>
  page.locator('.rm-modal-dialog--settings input[type="checkbox"]:visible');
const toast = (page, message) =>
  page.locator(".bp3-toast").filter({ hasText: message });
const beginFreshLoad = async (page) => {
  await page.evaluate(async () => {
    window.__reloadProof.calls = [];
    window.__reloadProof.loads = [];
    window.__roamjsDevOnLoadSession.attempted = false;
    await window.__reloadProof.original();
  });
  await page.waitForFunction(() => window.__reloadProof.loads.length > 0);
};
const waitForReload = async (page) => {
  await page.waitForFunction(
    () => window.__reloadProof.calls.some((call) => call.completed),
    undefined,
    { timeout: 30000 },
  );
  return page.evaluate(() => ({
    calls: window.__reloadProof.calls,
    loads: window.__reloadProof.loads,
  }));
};

export default {
  runtimeNames: ["dev-on-load"],
  async run({ page, outDir }) {
    await tab(page).click();
    assert.equal(
      await page.getByPlaceholder("3", { exact: true }).inputValue(),
      "3",
    );
    assert.equal(
      await page.getByText("Delay (milliseconds)", { exact: true }).count(),
      0,
    );
    assert.equal(
      await page
        .getByPlaceholder("Developer extensions reloaded.", { exact: true })
        .inputValue(),
      "Developer extensions reloaded.",
    );
    assert.equal(await showToast(page).isChecked(), true);
    await page.getByRole("button", { name: "success", exact: true }).waitFor();
    await page.screenshot({ path: path.join(outDir, "settings.png") });

    const defaults = await waitForReload(page);
    assert.equal(defaults.calls.length, 1);
    assert(
      defaults.calls[0].started - defaults.loads[0] >= 2900,
      "default waits three seconds",
    );
    const defaultToast = toast(page, "Developer extensions reloaded.");
    await defaultToast.waitFor();
    assert(
      (await defaultToast.getAttribute("class")).includes("bp3-intent-success"),
    );
    await page.screenshot({ path: path.join(outDir, "default-toast.png") });
    await page.waitForTimeout(6500);
    assert.equal(
      await page.evaluate(() => window.__reloadProof.calls.length),
      1,
      "self-reload must not loop",
    );

    await tab(page).click();
    await page.getByPlaceholder("3", { exact: true }).fill("1.25");
    await page
      .getByPlaceholder("Developer extensions reloaded.", { exact: true })
      .fill("Custom developer reload complete");
    await page.getByRole("button", { name: "success", exact: true }).click();
    await page.getByText("warning", { exact: true }).click();
    await page.getByRole("button", { name: "warning", exact: true }).waitFor();
    await page.screenshot({ path: path.join(outDir, "custom-settings.png") });
    await beginFreshLoad(page);
    const custom = await waitForReload(page);
    assert.equal(custom.calls.length, 1);
    const elapsedMs = custom.calls[0].started - custom.loads[0];
    assert(
      elapsedMs >= 1200 && elapsedMs < 3000,
      `expected 1250ms delay, got ${elapsedMs}ms`,
    );
    const customToast = toast(page, "Custom developer reload complete");
    await customToast.waitFor();
    assert(
      (await customToast.getAttribute("class")).includes("bp3-intent-warning"),
    );
    await page.screenshot({ path: path.join(outDir, "custom-toast.png") });
    await page.waitForTimeout(5500);
    assert.equal(
      await page.evaluate(() => window.__reloadProof.calls.length),
      1,
    );

    await tab(page).click();
    assert.equal(
      await page.getByPlaceholder("3", { exact: true }).inputValue(),
      "1.25",
      "seconds persist after reload",
    );
    await showToast(page)
      .locator("..")
      .locator(".bp3-control-indicator")
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector(
          '.rm-modal-dialog--settings label.rm-settings-panel__value input[type="checkbox"]',
        )?.checked === false,
    );
    assert.equal(await showToast(page).isChecked(), false);
    await beginFreshLoad(page);
    const silent = await waitForReload(page);
    await page.waitForTimeout(500);
    assert.equal(silent.calls.length, 1);
    assert.equal(await customToast.count(), 0, "toast disabled");
    await tab(page).click();
    assert.equal(
      await showToast(page).isChecked(),
      false,
      "toast setting persists",
    );
    await page.screenshot({ path: path.join(outDir, "toast-disabled.png") });

    return {
      defaults,
      custom,
      customDelayMs: elapsedMs,
      silent,
      checks: [
        "four native settings and defaults",
        "real API reload",
        "default success toast",
        "no recursive reload",
        "1250ms configured delay",
        "custom warning toast",
        "settings persist",
        "toast disabled",
      ],
    };
  },
  async cleanup({ page, result }) {
    await page.evaluate(() => {
      window.roamAlphaAPI.depot.reloadDeveloperExtensions =
        window.__reloadProof.original;
    });
    await openRoamDepotSettings({ page, timeout: 30000 });
    const removed = await removeExistingDeveloperExtensions({
      page,
      registrationName: "dev-on-load-proof",
      timeout: 30000,
    });
    if (result.developerMode === "enabled") {
      await page
        .locator(".rm-extensions-installed__header button.bp3-icon-cog")
        .click();
      await page.getByText("Disable developer mode", { exact: true }).click();
    }
    return {
      removed,
      restoredDeveloperMode:
        result.developerMode !== "enabled" ? "already enabled" : "disabled",
    };
  },
};
