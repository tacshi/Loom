# Loom v2 implementation and verification

Status: runnable development build. Loom has never been released; see `../AGENTS.md` for the current-format-only compatibility policy. Public deployment and registry publication are outside the current task.

## Implementation

| Area | Implemented | Verification / remaining work |
| --- | --- | --- |
| Current project format | Explicit nets, routes, structured refs, appearance, tests and library metadata; strict import validation | Format round trip, malformed/unsupported import rejection, inherited-root rejection |
| Persistence | Local saves, eight ordinary recovery snapshots, export/import, writer lock | Chromium/WebKit/Firefox recovery, quota failure and secondary-tab copy checks passed; latest-writer handover covered separately |
| Editing | Hierarchy, named nets, rotation/custom pins, pinned routes, atomic routing, clear nested examples, hollow pins, rounded wires | Pointer workflows and geometry regressions pass; rotated custom pin and overlapping-slot rollback browser checks pass; exhaustive combinations remain unverified |
| Simulation/history | Real circuit execution, known masks, RAM checkpoints, seek, branching runs, breakpoints, source tracing | CPU oracle and browser source-breakpoint/rewind/failure workflows pass; 8,400-cycle batched device/history retention test passes; multi-hour stress is not claimed |
| Libraries | Immutable packages, dependency closure, embedded versions, update review/tests, local forks and parameters | Domain coverage and Chromium/WebKit update/test/fork browser workflow pass; invalid-bound creation and reload checks pass; bound deletion and instance-bound narrowing have atomic domain regressions |
| Memory/devices | ROM/RAM editor, byte order, keyboard FIFO, UTF-8 terminal, pixel display | Domain tests and Chromium/WebKit binary import/export/rejection/persistence workflow pass; native Safari project import/export now passes (actual exported file validated) |
| Verification/CLI | Sequential cases, truth-table vectors, isolated debugger, capture, Node CLI, deterministic reports | Calculator/capture/export/CLI agreement passed in Chromium/WebKit/Firefox |
| PWA/native | Offline app and explicit Save & update | Chromium and Firefox offline pass. Native Safari origin-offline reload, simulation, save and reload passed with the isolated server stopped. Native Safari project-name IME selection, cancellation, commit and save/reload now pass |
| Rendering | Electron dots on active wires while running; pause/hidden/reduced-motion handling | Chromium/WebKit/Firefox moving-pixel and reduced-motion checks pass; dense running P95 about 33.3 ms (60-frame sample) |

## Validation runs

- After compatibility removal: **84 domain tests across 24 files passed**. Current-format round-trip and unsupported-format rejection replace obsolete conversion tests.
- Final current-format production follow-up: **12 Chromium/WebKit checks passed**, including import preservation, writer handover, library update/fork, memory binary round trip and calculator/export/CLI. Build, CLI acceptance and refreshed package passed.
- Full production Chromium/WebKit run: **38 passed, 6 intentional skips** (engine-specific measurements/update/offline exclusions).
- Current Linux Firefox follow-up in the official Playwright container: **15 passed, 1 intentional performance skip**. Included offline, writer locks, recovery, calculator, capture/export/CLI, animation, and project-name persistence.
- Library update/fork and ROM binary round-trip checks passed in both Chromium and WebKit.
- Native Safari at isolated `127.0.0.1:4180`: loaded the counter, stopped that origin's server, reloaded from PWA cache, stepped to value 1, saved `Safari offline v2 QA`, and retained the name after another offline reload. This is origin-offline evidence, not a system-wide network toggle.
- Native Safari project import/export passed on the resumed attempt; the downloaded JSON validated successfully. After the user selected the Chinese input source, native Safari committed 你 with Space, cancelled another composition with Escape, selected 尼 with candidate key 2, and retained the name after reload. The original QA name was then restored.

Current totals after compatibility removal and final artifact checks are recorded in `../HANDOFF.md`.

## Performance context

Apple M1 Pro, 16 GiB, Chromium 153.0.8010.12. Historical measurements are in `verification/v2/`. Paused pan/drag P95 is about 16.8 ms. Active electron animation on 1,000 components / 2,000 connections is about 33.3 ms P95 after zoom-aware density; these are different workloads. The latest release run overlapped other QA, so selection and single-sample save/pause measurements are not isolated performance claims.

## Remaining boundaries

Exhaustive custom-pin/parameter combinations and multi-hour device/history stress remain open. Native Safari project-name IME, project file import/export, and origin-offline checks have passed. External CI has not run. Do not treat the completed automated checks as full native/manual sign-off.
