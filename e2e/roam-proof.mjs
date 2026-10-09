import assert from "node:assert/strict";
import path from "node:path";
import {
  openRoamDepotSettings,
  removeExistingDeveloperExtensions,
} from "../../../.agents/skills/roamjs-load-extension/scripts/load-plugin.mjs";

const tab = (page) =>
  page.getByRole("tab", { name: /^Reload Developer Extensions(?: \(dev\))?$/ });
const showToast = (page) =>
  page.locator('.rm-modal-dialog--settings input[type="checkbox"]:visible');
const toast = (page, message) =>
  page.locator(".bp3-toast").filter({ hasText: message });
const beginFreshLoad = async (page) => {
  await page.evaluate(async () => {
    window.__reloadProof.calls = [];
    window.__reloadProof.loads = [];
    window.__roamjsReloadDeveloperExtensionsSession.attempted = false;
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
  runtimeNames: ["reload-developer-extensions"],
  async run({ page, outDir }) {
    await tab(page).click();
    assert.equal(
      await page.getByPlaceholder("5", { exact: true }).inputValue(),
      "5",
    );
    assert.equal(
      await page.getByPlaceholder("0", { exact: true }).inputValue(),
      "0",
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
      defaults.calls[0].started - defaults.loads[0] >= 4900,
      "default waits five seconds",
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
    await page.getByPlaceholder("5", { exact: true }).fill("1");
    await page.getByPlaceholder("0", { exact: true }).fill("250");
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
      await page.getByPlaceholder("5", { exact: true }).inputValue(),
      "1",
      "seconds persist after reload",
    );
    assert.equal(
      await page.getByPlaceholder("0", { exact: true }).inputValue(),
      "250",
      "milliseconds persist after reload",
    );
    await showToast(page).locator("..").click();
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
        "five native settings and defaults",
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
      registrationName: "reload-developer-extensions-proof",
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
