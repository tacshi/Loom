# Loom development handoff

Workspace: `/Users/shibang/Documents/ChatGPT/Loom`. Date: 2026-09-06.

## Current instruction

The user clarified that Loom has never been released. All iterations, including future v3, are development work: **remove all migration logic**. This supersedes earlier compatibility and protected-backup requirements. The policy is recorded in `AGENTS.md`.

Removed the old-format conversion module, staging map, protected backup creation/retention rules, UI labels, obsolete fixtures and conversion tests. Import/load accepts current schema 2 only. Current-format serialization is in `src/persistence/serialization.ts`; current truth-table execution uses `src/verification/vectors.ts`. Signal label/reference helpers are current runtime utilities, not format adapters. Ordinary save recovery remains.

## Ongoing v2 verification

The earlier user request “Tackle them” covers remaining release checks and fixes. Do not publish. The user requested committing the v2 snapshot after verification; preserve any later working-tree changes.

- Full domain run before compatibility removal: 87 passed / 24 files.
- Full Chromium/WebKit production run: 38 passed, 6 intentional skips.
- Current Firefox run in official cached container: 15 passed, 1 intentional performance skip.
- New Chromium/WebKit library-update tests actually run package tests, apply an update, and fork a local editable definition while retaining pinned versions.
- New ROM browser checks cover binary byte order, malformed input rejection, exported bytes and persistence after reload.
- Native Safari origin-offline test passed: isolated server on 4180 was stopped; reload, counter simulation to 1, name save and another reload succeeded. The server remains stopped.
- Native file picker changed to an unrelated path during automation. Native input paused to avoid interference; an asynchronous question asks whether the desktop is free. Native file-dialog and Chinese IME checks remain unverified. Do not claim ASCII typing proves Chinese composition.
- Review preview remains on 4176. Use Save & update and verify loaded script before judging a new build. Do not clear project storage.

## Implemented UI follow-ups

Root and generated nested circuit clearance, hollow selected pins, bridge separation/scaling, rounded stroke corners, and running electron animation are implemented. Generated nested routes are built by `npm run generate:layouts`; they avoid costly layout search while opening examples. Saved layouts are not silently rearranged.

Electron dots use a separate non-listening layer, follow actual bridge curves, and stop on pause, hidden documents and reduced motion. Active dense animation measured 33.3 ms P95 over 60 frames; paused pan/drag remains about 16.8 ms P95.

## Remaining work

Finish final current-format validation/browser checks, refresh artifacts and evidence, and report the unresolved native/manual gates honestly. `docs/V2-PHASES.md` is the current ledger. External CI, publishing and deployment have not occurred. Prior all-phase release-signoff claims are not warranted.

## Final checks after compatibility removal

- 84 domain tests passed across 24 files.
- 12 focused production browser checks passed in Chromium/WebKit: unsupported-format import preservation, writer handover, library update/fork, ROM file round trip, calculator/rewind/failure/capture/export/CLI, and library layout.
- PWA/CLI build and diff checks passed. CLI calculator acceptance passed at cycle 6000. CLI tarball regenerated.
- Review tab loaded `index-DhQFfuRn.js` through Save & update and retained `Loom 8 I/O · Calculator`.
- No old conversion/staging/protected-backup symbols or migration-module imports remain in source/tests/scripts. Earlier Firefox and native Safari results predate this removal; their exact boundaries remain recorded above.
- Native/manual gates remain open, not silently declared passed. External CI and publication have not been performed.

## Parameter and sustained-device follow-up

- Found and fixed invalid parameter definitions being accepted by the form (minimum 0, maximum 33, fractional defaults). `validParameterDefinition` is shared with the edit command. `updateParameters` rejects removal of bound parameters and narrowing bounds below an existing instance argument before mutating the document. No migrations added.
- Chromium/WebKit: eight targeted checks passed for parameter creation/persistence, custom rotated pin routing, overlapping pin rollback, unsupported import preservation and writer handover.
- Device/history stress: 12 batches of 64 bytes, 8,400 cycles, all bytes echoed, FIFO drained, retention eviction within budget, exact state hash after oldest-to-head seek.
- Focused parameter/device tests and production build passed; additional instance-bound regression passed separately. Latest built entry is `index-C9MGLM4y.js`. The visible review tab was being used to inspect Memory & I/O, so it was not reloaded during this follow-up; its loaded build may be earlier.
- Native IME/file dialogs remain paused awaiting a clear desktop session. No overall exhaustive manual sign-off is claimed.

## Inspector actions and native Safari file checks

- Inspector action groups now have 4px vertical padding (previously 20px), 6px gaps, visible borders, and consistent button heights. Visually verified on Memory & I/O in the review tab. Build: `index-D6-6zawh.js`.
- Resumed native Safari with the user's explicit instruction. Activated Save & update on isolated port 4180. Native file picker selected `/tmp/loom-qa.json` and imported the current-format echo project. Export produced `/Users/shibang/Downloads/Loom_8_I_O.loom.json` (166 KB), visible in Safari Downloads. CLI validation of that actual downloaded file returned valid with no diagnostics.
- Native IME still blocked: Control+Space and Control+Option+Space followed by real n/i key events produced ASCII `ni`, without a candidate window. SystemUIServer was not accessible; TextInputMenuAgent timed out. A human must select the Chinese source before candidate selection/cancellation/commit can be verified. Restored the QA project name to `Loom 8 I/O`.
- Native import/export is now verified. No native IME pass claimed. The isolated preview on 4180 is running; user review remains on 4176.

## Native IME verified after manual input-source selection

The user selected the Chinese input source and replied Ready. In native Safari on `127.0.0.1:4180`, real key events verified:

- `n`, `i`, Space committed `你` to the project-name field.
- A second `n`, `i`, Escape cancelled the active composition and restored the prior committed name.
- `n`, `i`, `2` selected a different candidate and committed `尼`.
- Tab followed by native reload retained `Loom 8 I/O你尼` and showed Saved locally.
- Removed the two QA characters afterward; name restored to `Loom 8 I/O`.

Native Safari IME selection/cancellation/commit and save/reload gate now passes for the project-name field. This supersedes the prior input-source blocker. The candidate window itself was not captured separately; the real IME key sequences and resulting Chinese committed text were verified in native UI. No source changes or new automated test run were needed in this follow-up.

## Commit verification

The user requested a commit. The full domain suite, production PWA/CLI build, CLI calculator acceptance at cycle 6000, and diff whitespace check passed immediately before staging this v2 snapshot. Browser/native results above were verified in the preceding focused runs. No push or publication requested.
