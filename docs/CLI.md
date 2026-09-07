# Loom CLI

Requires Node.js 24 or newer. Run `npm ci` then `npm run build:cli`. The generated executable is `dist-cli/loom.mjs`; `npm pack` includes it as the `loom` command. Public registry publication is separate.

```sh
node dist-cli/loom.mjs validate tests/fixtures/v2/calculator.loom.json
node dist-cli/loom.mjs test tests/fixtures/v2/calculator.loom.json --json
node dist-cli/loom.mjs test project.loom.json --circuit circuit-id --report ./report
```

`validate` reports structural diagnostics. `test` executes current-format sequential cases or truth-table vectors through the shared assertion runner. JSON output goes to stdout and diagnostics to stderr. Reports contain deterministic `results.json` and an escaped, static `index.html`. No project-provided code executes.

Exit codes: 0 passed; 1 assertion failure; 2 invalid input/project; 3 execution limit/internal failure. Cases declare cycle limits and seeds. The digital engine is deterministic and currently uses no randomness.

Browser and CLI share validation, compilation, logic evaluation, state semantics, and test assertion code. Headless success does not establish native browser, IME, file-dialog or rendering correctness.

## Course checks

`loom course-check course.loom.json --json` revalidates imported completion claims and checks the active exercise against the built-in registry. It does not modify the file. Results include prerequisite/construction failures, behavioral failures, passing checks and execution limits. Exit code 0 means all reported checks passed; 1 means a course check did not pass; malformed input uses 2.

Course files use the current 23-lesson curriculum (`course.curriculum: 2`). `course-check` validates foundation AND/NOT construction and verified NAND reuse, including packaged dependency contents. Test JSON reports include per-step `checkpoints` with applied inputs and expected/actual assertions. The aggregate `course-check` report includes checkpoint counts rather than duplicating these playback details for every completed lesson; replay snapshots are not serialized.
