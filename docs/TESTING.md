# Testing

Install dependencies with `bun ci`. Routine verification runs fast tests and the build:

```sh
bun run test:fast
bun run build
```

The fast suite excludes the exhaustive mission sweeps and CPU integration checks that use the completed-course fixture. Simulator, CPU instruction, persistence, CLI, and prerequisite-security regressions remain included. Run a specific file when it covers the change:

```sh
bun run test tests/component-label.test.ts
```

`bun run test` runs every Vitest test, including the exhaustive mission checks. `bun test` invokes a different runner.

## Browser checks

```sh
bun run playwright install --with-deps chromium firefox webkit
bun run test:browser tests/browser/missions.spec.ts --project=chromium
```

Playwright starts the development server automatically. For production checks, run `bun run build` and `bun run preview`, then in another terminal:

```sh
LOOM_BASE_URL=http://127.0.0.1:4173 bun run test:browser
```

Browser tests cover editing, course progression, saved projects, libraries, peripherals, and offline/update behavior. Native file dialogs, OS input-method composition, and actual Safari offline behavior require separate native checks. Fixture-assisted course journeys verify progression and circuit execution, not beginner usability.

## CLI and course fixtures

After `bun run build`, CLI fixtures can be checked explicitly:

```sh
bun dist-cli/loom.mjs validate tests/fixtures/v2/calculator.loom.json
bun dist-cli/loom.mjs test tests/fixtures/v2/calculator.loom.json --report test-results/cli
bun dist-cli/loom.mjs course-check tests/fixtures/v3/course-completed.loom.json --json
```

When mission definitions or checks change, `bun run fixture:course` regenerates the completed-course fixture by submitting and verifying each reference in order. Browser and CLI course checks share the same verifier. The CPU tests compare circuit execution against an independent instruction model that is only used in tests.

## Performance and soak tests

`tests/browser/performance.spec.ts` measures pan, drag, selection, pause, and save behavior on the 1,000-component fixture. `tests/browser/electrons.spec.ts` records running animation frame times and checks pause and reduced-motion behavior. Measurements include host-dependent scheduling and rendering costs; compare results on the same controlled host.

To enforce a calibrated animation budget:

```sh
LOOM_BASE_URL=http://127.0.0.1:4173 LOOM_ELECTRON_P95_BUDGET_MS=60 bun run test:browser tests/browser/electrons.spec.ts --project=chromium
```

Without a configured budget, the animation test records frame times and checks sample validity and functional behavior.

Run the extended soak against a production preview:

```sh
LOOM_BASE_URL=http://127.0.0.1:4173 LOOM_SOAK_MINUTES=60 bun run test:browser tests/browser/release-soak.spec.ts --project=chromium
```

The soak exercises a running I/O CPU, input, rewind, saves, exports, and reload. It records elapsed time and checkpoints in `soak.json` under the test output directory. It is skipped unless explicitly enabled.

## GitHub Actions

The [workflow](../.github/workflows/check.yml) runs `bun run test:fast` and `bun run build` for pull requests and pushes to `main`. It does not install browsers or run exhaustive course checks. New commits cancel older runs for the same pull request or branch.
