# Phase implementation and verification

Implementation covers all eight phases. The checks below distinguish working functionality from release sign-off. Firefox compatibility and native OS input-method composition remain unverified; they are not counted as passes.

## Recorded checks — 2026-09-06, Pacific/Auckland

| Phase | Implemented result | Computer-Use evidence |
|---|---|---|
| 1 — Foundation | Editor shell, placement, selection, properties, history, themes, English/Chinese | Placed and dragged inputs, edited a Chinese name, switched languages/themes, deleted and restored components. Inspected 1280×800 and 1920×1080 layouts. Native Safari's page menu confirmed 200% zoom; normal zoom was restored afterward. |
| 2 — Editing | Orthogonal obstacle-aware routes, grid/pin/wire alignment, marquee, copy/paste, group moves, segment editing, branches | Connected Input → NOT and moved the gate. Reproduced the user's edge-touching route as a failing test; checked the horizontal pin approach after fixing it. Explicit Route separated overlapping paths. Inspected bridge arcs and junction dots at closer zoom. Later checked dense-circuit pan/select and the final CPU routing. |
| 3 — Combinational logic | Width-aware gates, buses, arithmetic, worker simulation, unknown bits, diagnostics, test runner | Ran all eight NAND full-adder input cases. Changed A to 8 bits, observed two width errors and disabled Run, restored 1 bit, and reran successfully. |
| 4 — Projects and hierarchy | Transactional saves, portable files, recovery copies, single-writer locks, extraction, interface mapping, replacement checks | Selected nine NAND gates, packaged them, reran the eight cases, and reloaded the saved project. Imported the dense fixture through the file chooser. Opened a second tab and observed its read-only state. Tried an AND replacement for NAND: verification reported different outputs and kept Replace disabled. |
| 5 — Sequential logic | Registers, counters, RAM/ROM, reset/step/run, probes, memory inspection, bounded traces, breakpoints | Watched Count.q, stepped to 2, then ran to a breakpoint at 5. Canvas, inspector, and trace agreed. Automated checks additionally exercised RAM writes, register swaps, layout/name edits preserving state, and trace reset/bounds. |
| 6 — CPU | Editable 8-bit CPU, assembler, source mapping, instruction stepping, source breakpoints | Assembled the sum program and observed output 55 at cycle 198. Entered ALU, replaced ADD with a NAND subcircuit, and reran to 55. Repeated the CPU run in native Safari 27.0. Final light/dark screenshots show the actual paused result. |
| 7 — Guidance | Seven bilingual starter/reference checkpoints, editable test cases, semantic circuit list | Opened the NAND starter and observed four failures. Completed its connections through visible controls; all four passed. Marked completion and inspected the Chinese guide. The optional WebMCP test command opened the same visible runner and rejected invalid arguments. |
| 8 — Release | Production PWA, bundled fonts/assets, save-before-update, performance work, static deployment/CI configuration | Imported and manipulated the 1,000-component fixture. Inspected both final themes. In Safari, accepted Save & update, stopped the origin server, reloaded, and ran the CPU to 55. A keyboard-entered offline rename survived another reload while the server was still unavailable. Restarted the server afterward. |

## Automated verification

- **47 domain tests passed** across model/history, routing/alignment/crossings, simulation, storage-file validation, hierarchy, replacement, CPU, NAND arithmetic, and checkpoint fixtures.
- **24 production browser checks passed** across Chromium and WebKit. Two WebKit checks were skipped: the Chromium-only reference performance measurement, and this host's failing offline-emulation boundary.
- The CPU reference tests compare accumulator, PC, flags, output, and RAM against an independent instruction-level model after every instruction. The model is not imported by runtime code.
- Fault injection changes ADD to subtraction and changes execution. A real NAND replacement preserves the sum result.
- Browser regressions cover saving/reloading, malformed imports, recovery copies, exports, simultaneous tabs, assembly errors, source breakpoints, trace bounds, keyboard copy/paste/undo, and rejected replacements.
- A final focused check verified generated NAND-adder vectors at widths 1, 4, 8, 16, and 32, including unsigned carry expectations.

## Performance evidence

Reference: Apple M1 Pro, 16 GiB RAM, Chromium 153.0.8010.12, 1920×1080. The fixture is a valid 1,000-component circuit with 2,000 connections. Measurements run against the production preview. Input/pause/save timings begin at their DOM input events and end at the visible update, rather than timing command submission alone.

| Measurement | Target | Final measured value |
|---|---:|---:|
| Pan frame P95 | ≤33 ms | 16.7 ms |
| Component drag frame P95 | ≤33 ms | 16.8 ms |
| Selection response P95, 40 samples | <100 ms | 76.2 ms |
| Pause acknowledgement | <200 ms | 26.3 ms |
| Save confirmation | <1,000 ms | 687.4 ms |

The selection sample maximum was 150.3 ms; the target is P95, not a maximum. These results establish the declared fixture on this host, not a universal performance guarantee. The benchmark is in `tests/browser/performance.spec.ts`; `scripts/fixture.ts` generates the graph.

Earlier measurements exposed slow full-circuit redraws. Crossing lookup was indexed, simulator lookup tables were cached, wire/component/selection rendering was separated, and moving components use a dedicated drag layer. Performance was remeasured after those changes.

## Remaining verification limits

- **Firefox:** the downloaded test browser fails before navigation with `Could not find profile folder`. A retry using `/private/tmp` also failed; native launch showed “Profile Missing.” User profiles were not changed. Mozilla documents a related macOS 27 startup path issue in [bug 2062988](https://bugzilla.mozilla.org/show_bug.cgi?id=2062988). Firefox remains an open compatibility gate, with its CI project retained.
- **WebKit offline emulation on this Mac:** `context.setOffline(true)` followed by reload returns an internal WebKit navigation error. That automated boundary is explicitly skipped on macOS. Native Safari 27.0 was independently checked with Loom's actual server stopped: reload, CPU execution, keyboard editing, saving, and reopening succeeded. Chromium's full offline-emulation test passed.
- **Native IME composition:** Chinese text entry/display and ordinary native text controls were checked, but a complete OS Pinyin composition/candidate-selection sequence was not driven. That physical input-method check remains open.
- **External release:** no public host was provisioned, no container was deployed, and GitHub CI has not run. The static build, container configuration, and CI workflow are supplied for that next boundary.

## Saved visual evidence

- [Final CPU result](verification/loom-cpu.png)
- [Final dark theme](verification/loom-cpu-dark.png)
- [Chinese checkpoint](verification/phase7-chinese.png)
- [Dense fixture](verification/phase8-dense.png)
- [Safari offline save/reload](verification/safari-offline.png)

The implementation is available locally. Release sign-off should retain the open limits above until those specific checks are completed.

## Performance checks on shared CI runners

The dense electron-animation test records `electron-performance.json` on every run. Its functional companion checks that animation moves only while running and respects reduced motion. Shared runners do not use a universal absolute frame-time limit because their scheduling and GPU capacity vary.

On a controlled reference host, set `LOOM_ELECTRON_P95_BUDGET_MS=60` (or that host's calibrated budget) when running `tests/browser/electrons.spec.ts`. The test validates the configured budget and fails if the measured P95 exceeds it. Sample validity checks remain unconditional.
