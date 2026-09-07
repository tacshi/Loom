# Loom v3 verification

## Guided curriculum verification — 2026-09-07

- The current curriculum has 23 lessons with separate demonstration, practice and challenge flows. Practice persistence/undo and imported verified NAND dependency identity are covered by regressions.
- Unit suite: 159 tests passed. Production PWA and CLI builds passed. The regenerated completed-course fixture passed all 24 reported CLI checks (23 accepted lessons plus the active draft).
- The full 23-lesson browser submission journey passed. The production Chromium suite's five integration failures were corrected and its affected tests passed on rerun.
- Focused Chromium/WebKit learning, layout, placement and routing checks: 83 passed, one WebKit-only touch-injection case skipped. Final replay/cancellation/paging checks: 20 passed. Final localized-title/layout check: eight passed.
- Inspected the rendered input controls and test playback in the in-app browser, plus English desktop and Chinese narrow-screen screenshots. These are implementation checks, not a human beginner usability study. Firefox was not rerun for this redesign.

## Earlier recorded verification

Date: 2026-09-06. Version: 0.3.0. No migrations or publication performed. The verified implementation was prepared for commit at the user’s request.

## Implemented outcome

The connected 19-exercise course includes persistent drafts and per-exercise source text, prerequisite gating, immutable accepted components, explicit dependency replacement, verified width variants, isolated checks/failure inspection, three-level bilingual hints, read-only references, and a shared CLI verifier. Sandbox projects remain unrestricted. References contain actual editable NAND logic plus the permitted storage/peripheral primitives.

## Automated evidence

- Final domain suite: **117 tests passed across 26 files**.
- All 19 reference circuits pass their trusted checks; every incomplete starter fails. The course can advance, save, export/import and reverify its actual accepted snapshots.
- Negative cases cover hidden forbidden gates, edited project tests, stale results, root-interface errors, width variants, dependency reuse, reset/carry/opcode-bit/phase faults, disconnected calculator adder/read paths and forged completion hashes.
- The course CPU agrees with the independent test-only instruction oracle after every instruction. Controller checks cover all four control flags across valid and representative invalid opcodes; ALU checks cover operation/operand boundary combinations. I/O checks cover qualified reads, terminal writes, coordinate masking, reserved addresses and clearing peripherals.
- Calculator normal sequence completes at cycle 1,812 and recovery at 980 in the reference CPU. Trusted checks use fixed budgets of 2,048 and 1,280 cycles respectively, retaining both complete input sequences and exact terminal assertions. No runtime instruction emulator computes the answer.
- Chromium/WebKit course run: **6 passed, 2 intentional skips**. The full UI progression is run once in Chromium; macOS WebKit offline emulation is replaced by the native Safari check.
- Linux Firefox in the official Playwright container: **4 passed, 1 intentional full-journey skip**. Includes entry/wiring, completed-course import and CLI agreement, offline/two-tab resume, and late-result preservation.
- Final Chromium/WebKit entry and late-result follow-up: **4 passed**. Project-name edits are retained while checks complete.
- Browser/CLI checks agree on the completed course. Compact results are in `verification/v3/course-results.json`.

## Computer Use and native boundaries

- In the actual review tab, connected all three NAND wires through canvas pins, ran Check circuit, observed the saved verified component, and continued to the NOT draft. Reload retained the draft and NAND credit.
- Inspected English and Chinese course layouts; restored English afterward.
- The automated full UI journey starts from fresh storage, imports reference-derived NAND submissions at each exercise, rechecks previous snapshots, presses Check circuit and Continue, and exports the resulting work. Later submissions reuse earlier accepted learner artifacts. This validates workflow and electrical execution; it is not a claim that every later gate was manually drawn or that beginner usability has been established by a human study.
- Native Safari imported the 2.8 MB course through its file picker, reverified completion, and displayed the calculator-passed outcome. The original single whole-course deadline failed on Safari; progress-aware per-case deadlines and measured cycle budgets resolved that failure. Cancellation is available while checking.
- Native Chinese IME committed Chinese text with Space and a numeric candidate key; Escape cancelled an intervening composition. The name survived reload and was restored afterward.
- Stopped the isolated preview on port 4180, reloaded the course from PWA cache, resumed NAND, and completed an isolated check offline. Export worked without the origin server.
- The actual Safari download `/Users/shibang/Downloads/Course_verification_fixture.loom.json` passed CLI course verification (20 reported results including the active exercise). Later checker coverage was expanded and validated in the final domain/fixture run.

## Performance and delivery

On Apple M1 Pro / 16 GiB / Chromium 153 at 1920×1080, the 1,000-component / 2,000-connection fixture measured pan and drag P95 **16.8 ms** and running animation P95 **33.3 ms**. Details and sample limits are in `verification/v3/performance.json`.

Production PWA and Node CLI build passed. `npm run fixture:course` regenerated the completed QA fixture; `course-check` passed; the local CLI package `loom-0.3.0.tgz` was regenerated. CI includes the course CLI check, but external CI and public deployment were not run. No multi-hour soak or human beginner study is claimed.
