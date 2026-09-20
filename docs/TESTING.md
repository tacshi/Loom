# Testing

Install dependencies with `bun ci`. Use `bun run test` for Vitest; `bun test` invokes a different runner. Run the smallest set of tests that covers a change.

```sh
bun run test tests/component-label.test.ts
bun run test tests/mission-course.test.ts
```

The course progression test verifies all 100 missions in order, carrying accepted components into later submissions. Each mission has a separate timeout so a slow or failing mission is identified without imposing one deadline on the entire course.

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

After `bun run build`, run the CLI checks used by CI:

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

Shared CI records animation measurements without an absolute frame-time budget. Sample validity and functional assertions always apply.

Run the extended soak against a production preview:

```sh
LOOM_BASE_URL=http://127.0.0.1:4173 LOOM_SOAK_MINUTES=60 bun run test:browser tests/browser/release-soak.spec.ts --project=chromium
```

The soak exercises a running I/O CPU, input, rewind, saves, exports, and reload. It records elapsed time and checkpoints in `soak.json` under the test output directory. It is skipped unless explicitly enabled.

## GitHub Actions

The [workflow](../.github/workflows/check.yml) runs the full Vitest suite, builds the app and CLI, verifies CLI fixtures, then tests the production preview in Chromium, Firefox, and WebKit. Successful runs upload the web and CLI artifacts. Failure artifacts include browser evidence and preview logs.
