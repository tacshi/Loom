# Loom v3 handoff

Workspace: `/Users/shibang/Documents/ChatGPT/Loom`. Date: 2026-09-06. Previous committed baseline: `4a54a98` (v2). The user requested committing the verified v3 snapshot. Do not push or publish unless requested.

## Objective and policy

Implemented the approved Build Your Own Computer plan. Loom has never been released. Follow `AGENTS.md`: current format only, no migrations or compatibility adapters. Preserve unrelated user work.

## Current implementation

- 19 guided exercises: NAND through a learner-component CPU and calculator, including explicit bus widening and program-counter exercises.
- Persistent course drafts/source text; prerequisite checks; immutable accepted packages; normalized electrical hashes; explicit dependency replacement; imported-record revalidation.
- Trusted worker/CLI course checks, cancellation and per-case deadlines; first failing input/cycle/signal; isolated debugger; read-only references; three-level English/Chinese hints; sandbox remains available.
- All reference combinational logic is editable NAND circuitry. Registers, RAM/ROM and devices remain primitives. No runtime instruction emulator supplies calculator results.
- Package IDs remain bounded when accepted components are nested repeatedly. Simulator signal accessors are precomputed. Project-name edits no longer rebuild circuit data.

## Validation

See `docs/V3-VERIFICATION.md` for exact evidence and limits. Final domain suite: 117 passed / 26 files. Production build and CLI course check passed. Chromium, WebKit and Linux Firefox course workflows passed, including a full Chromium UI journey using reference-derived submissions that reuse prior accepted components. Native Safari course import/reverification, project-name IME, origin-offline resume/check and export passed. The native exported course also passed CLI verification.

Normal calculator inputs finish at cycle 1812; recovery inputs at 980. Checks use 2048/1280 cycles instead of 6000 cycles of mostly idle polling. Per-case progress/deadlines resolved the native Safari aggregate timeout.

Performance reference: pan/drag P95 16.8 ms, running animation P95 33.3 ms. Local measurements and concurrency caveats are recorded in `docs/verification/v3/performance.json`.

## Artifacts and live state

- `docs/V3.md`, `docs/V3-VERIFICATION.md`, and `docs/verification/v3/` describe the implementation and evidence.
- `npm run fixture:course` creates `tests/fixtures/v3/course-completed.loom.json`. This is reference-derived QA work, not a product completion shortcut or human-authorship claim.
- `node dist-cli/loom.mjs course-check tests/fixtures/v3/course-completed.loom.json --json` checks the whole imported course plus active exercise.
- `loom-0.3.0.tgz` is generated and ignored by Git.
- Review preview is on 4176, with the manually wired NAND exercise accepted and NOT ready to continue. Earlier user calculator work (including an added pixel-display component) remains in Projects.
- Native Safari QA used 4180; that isolated server is stopped after the offline check. Its course is on the verified NAND exercise. Chinese QA characters were removed from its name.
- Browser tab builds may lag behind new builds; use Save & update and verify the loaded entry asset. Do not clear project storage.

No external CI, publication, multi-hour soak, or human beginner study is claimed.
