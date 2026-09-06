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
