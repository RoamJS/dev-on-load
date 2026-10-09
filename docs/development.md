# Development

Scaffolded from RoamJS/extension-base. Install with `npm ci`, run `npm test`, `npm run typecheck`, `npm run format:check`, and `npm run build:roam`. The dry build produces `dist/extension.js` without publishing.

Load the built folder with the central RoamJS `roamjs-load-extension` skill. The live proof is in `e2e/roam-proof.mjs`; `e2e/run-proof.mjs` composes the internal loader and session skills with a reload-call observer and video capture. Run `node e2e/run-proof.mjs --out local/roam-proof` from this app inside a central RoamJS checkout. Pass `--out` to select an ignored evidence directory. Use the central session skill’s doctor to discover a modern Playwright runtime, then pass its root through `PLAYWRIGHT_PACKAGE_ROOT` and its environment path through `ROAM_PLAYWRIGHT_ENV_PATH`; the template’s transitive Playwright dependency is older. It exercises the real Depot API rather than substituting a successful fake.

The page-local session flag survives extension module replacement. It is set before invoking Roam and remains set even if the operation fails. A full page refresh creates a fresh flag. Toast settings are captured before reloading because Roam replaces the extension settings instance during the reload.

The startup delay begins once defaults and the settings panel are initialized. Browser throttling or background tabs can make execution later than requested. A successful API resolution is the completion signal; it does not independently establish that every other extension initialized successfully.

The inherited template’s unused `patch-package` postinstall was removed because it has no patches or declared dependency. PR validation performs a dry build and uploads its artifacts; it does not require publishing credentials. The inherited release workflow is manual-only for a later authorized release; pushing or merging does not publish this new extension.
