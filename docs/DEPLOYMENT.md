# Deployment

`bun run build` produces the complete static application in `dist/`. No backend or runtime secrets are required. Publish that directory to an HTTPS static host with SPA fallback to `index.html`. HTTPS (or localhost) is required for Web Locks, service workers, and persistence APIs.

Serve hashed `/assets/` files with immutable caching. Serve `index.html` and `sw.js` with revalidation so updates can be discovered. Do not rewrite missing asset requests to HTML. Keep the previous deployment available until the new build's complete asset set is uploaded.

`Dockerfile` and `deploy/nginx.conf` provide a static server on port 8080. Put HTTPS termination in front of it for remote use. The container deployment configuration has been authored; an image deployment has not been performed in this workspace.

The app prompts before activating an update and flushes its project save first. The browser's project data belongs to the deployment origin. Moving to a different hostname or port requires export/import.

The release-candidate milestone stops before public deployment. Cloudflare Pages is the intended later host; no site, DNS change or public release is created by candidate verification.

The GitHub workflow runs domain tests, builds, CLI fixture verification and production Chromium/Firefox/WebKit checks after explicitly waiting for the preview server. Require a green run for the candidate commit, not an older successful run. On success it retains a browser-only `loom-web.tar.gz`, SHA-256 checksum and commit file; the CLI is uploaded separately. Failure artifacts include browser evidence and preview logs. Build metadata in Help identifies the version and commit; local tracked edits are marked modified.

The build also produces the Bun-targeted CLI bundle `dist-cli/loom.mjs`, which runs with Bun 1.4.2 or newer. Serve `dist/` over HTTPS (localhost is allowed for local testing). Do not put `dist-cli` into the browser app. `bun run build` produces both artifacts; `bun pm pack --dry-run` inspects CLI packaging. No account, external API, or public hosting is required.

The service worker caches bundled examples and application assets after the first successful load. The update prompt saves the active project before activation. Execution history is session-only and is not retained across updates/reloads. Export `.loom.json` files for portable backups.


## Desktop candidate verification

Desktop sign-off covers English/Chinese wiring, keyboard use, course progression and file workflows at 1280×800 and 1920×1080. Two fresh UI-only agents exercised the app without repository context: both completed the opening lessons, failure repair and counter controls; native file round trips were tested in Safari. This is unfamiliar-app evaluation, not a human beginner study.

Observed issues led to non-overlapping component placement, stable canvas notices, viewport preservation, clearer ROM-word errors and removal of contradictory failure feedback after Undo. Native Safari also exposed a blank/stale paused canvas after file operations and reload. Paused commits now draw without depending on animation-frame delivery; the regression test suspends animation frames and checks real canvas pixels. Running animation continues to use its existing frame scheduling.

Reliability checks exercise rejected-save recovery, invalid imports, two-tab lock handover, offline editing/saving and the cached ROM table. The update check builds two distinct production bundles on one origin, proves rejected saves prevent activation, then verifies course and ROM data after a successful update. Existing WebKit offline-emulation exclusions require a native Safari alternative; the full course journey runs in Chromium, with other engines checking entry/import/resume.

Run the explicit one-hour gate separately from routine CI:

```sh
LOOM_BASE_URL=http://127.0.0.1:4173 LOOM_SOAK_MINUTES=60 bun run playwright test tests/browser/release-soak.spec.ts --project=chromium
```

The soak keeps an I/O CPU running and checks pause/input, history rewind, saves and project exports each minute. Exported circuits must reproduce the expected terminal bytes through the simulator; reload must retain the latest saved edit. `soak.json` records elapsed time and checkpoints in the ignored test output directory. A short harness check does not count as the one-hour gate. Keep evidence with the candidate's CI/local results rather than committing screenshots or generated log bundles.
