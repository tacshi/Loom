# Loom CLI

Run `bun ci` then `bun run build:cli` to build the CLI. It requires Bun 1.4.2 or newer.

```sh
bun dist-cli/loom.mjs validate project.loom.json
bun dist-cli/loom.mjs test project.loom.json --json
bun dist-cli/loom.mjs test project.loom.json --circuit circuit-id --report ./report
```

`validate` reports structural diagnostics. `test` executes current-format sequential cases or truth-table vectors through the shared assertion runner. JSON output goes to stdout and diagnostics to stderr. Reports contain deterministic `results.json` and an escaped, static `index.html`. No project-provided code executes.

Exit codes: 0 passed; 1 assertion failure; 2 invalid input/project; 3 execution limit/internal failure. Cases declare cycle limits and seeds. The digital engine is deterministic and currently uses no randomness.

Browser and CLI share validation, compilation, logic evaluation, state semantics, and test assertion code. Headless success does not establish native browser, IME, file-dialog or rendering correctness.

## Course checks

`bun dist-cli/loom.mjs course-check course.loom.json --json` revalidates imported completion claims and checks the active exercise against the built-in registry. It does not modify the file. Results include prerequisite/construction failures, behavioral failures, passing checks and execution limits. Exit code 0 means all reported checks passed; 1 means a course check did not pass; malformed input uses 2.

Course files use the current 100-mission curriculum (`course.curriculum: 3`, `core-01`–`core-60` and `project-01`–`project-40`). `course-check` validates foundation AND/NOT construction and verified NAND reuse, including packaged dependency contents. Test JSON reports include per-step `checkpoints` with applied inputs and expected/actual assertions. The aggregate `course-check` report includes case/checkpoint counts and details of failing cases, rather than repeating all passing test inputs and playback details; replay snapshots are not serialized.

Project files are bounded at 32 MiB, 2,048 circuit definitions, and 40,000 stored components. These aggregate limits include course drafts and verified snapshots; active simulation limits remain separate.
