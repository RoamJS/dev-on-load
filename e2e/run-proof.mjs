import path from "node:path";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import { runExtensionTest } from "../../../.agents/skills/roamjs-load-extension/scripts/load-plugin.mjs";
import {
  openRoamSession,
  resolveRoamEnvironment,
} from "../../../.agents/skills/roamjs-playwright-session/scripts/roam-session.mjs";

const outArg = process.argv.indexOf("--out");
const outDir = path.resolve(
  outArg >= 0 ? process.argv[outArg + 1] : "local/roam-proof",
);
const proofDir = path.join(outDir, "reload-developer-extensions-proof");
await fs.cp(path.resolve("dist"), proofDir, { recursive: true });
const result = await runExtensionTest({
  repo: proofDir,
  out: outDir,
  registrationName: "reload-developer-extensions-proof",
  envPath: process.env.ROAM_PLAYWRIGHT_ENV_PATH,
  playwrightPackageRoot: process.env.PLAYWRIGHT_PACKAGE_ROOT,
  runtimeNames: ["reload-developer-extensions"],
  testModule: path.resolve("e2e/roam-proof.mjs"),
  sessionFactory: async (options) => {
    const environment = await resolveRoamEnvironment({
      cwd: process.cwd(),
      envPath: options.envPath,
      playwrightPackageRoot: options.playwrightPackageRoot,
    });
    const require = createRequire(
      path.join(environment.playwrightPackageRoot, "package.json"),
    );
    const { chromium } = require(environment.playwrightPackageName);
    const session = await openRoamSession({
      ...options,
      chromium: {
        launchPersistentContext: (profile, launchOptions) =>
          chromium.launchPersistentContext(profile, {
            ...launchOptions,
            recordVideo: {
              dir: path.join(outDir, "video"),
              size: { width: 1440, height: 1000 },
            },
          }),
      },
    });
    await session.page.evaluate(() => {
      const depot = window.roamAlphaAPI.depot;
      if (typeof depot?.reloadDeveloperExtensions !== "function")
        throw new Error("Live Roam reload API unavailable");
      const original = depot.reloadDeveloperExtensions.bind(depot);
      window.__reloadProof = { calls: [], loads: [], original };
      document.body.addEventListener(
        "roamjs:reload-developer-extensions:loaded",
        () => {
          window.__reloadProof.loads.push(performance.now());
        },
      );
      depot.reloadDeveloperExtensions = async () => {
        const call = { started: performance.now() };
        window.__reloadProof.calls.push(call);
        try {
          const summary = await original();
          call.completed = performance.now();
          call.summary = summary;
          return summary;
        } catch (error) {
          call.error = error.message;
          throw error;
        }
      };
    });
    return {
      ...session,
      playwrightPackageName: environment.playwrightPackageName,
      playwrightPackageRoot: environment.playwrightPackageRoot,
    };
  },
});
console.log(
  JSON.stringify(
    { ok: result.ok, test: result.test, resultPath: result.resultPath },
    null,
    2,
  ),
);
