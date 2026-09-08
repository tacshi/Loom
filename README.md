# Loom

A local-first digital logic workbench. Build circuits, package reusable components, and run an editable 8-bit CPU. English and Simplified Chinese are included.

See [Learning and visual tests](docs/LEARNING.md) for the guided course, isolated test playback, and debugging.

## Run

Use Bun 1.4.2 (pinned in `package.json`) and Node.js 24 or newer. Bun manages dependencies, package scripts, and the CLI runtime. Node.js is still used by the existing development tools.


```sh
bun ci
bun run dev
```

Open the address printed by Vite. For the offline-capable production build:

```sh
bun run build
bun run preview
```

The production app caches its assets after the first successful online load. Projects belong to the browser origin: development (`5173`) and preview (`4173`) have separate project stores. Use **Projects → Export file / Import file** to move work between them.

## Start building

- **Learn → Start course** offers 60 hands-on core missions and 40 optional projects, from signals and NAND to a programmed computer and calculator. Missions require working circuits or code; hints and examples are optional. Blank projects remain unrestricted.
- **Open example… → Loom 8 CPU** opens a complete computer. **Assemble & load**, then **Run clock**: the supplied sum program outputs **55**.
- Use **Circuit** to select a component by name, inspect its signals, connect ports, or open its subcircuit.
- Inside the CPU's **ALU**, replace **ADD** with a NAND-built adder and rerun the same program.

**Open example… → Loom 8 I/O · Calculator** runs interactive decimal addition/subtraction through keyboard and terminal peripherals. **Debug** starts with named inputs and outputs; signal history and breakpoints open on demand; **Libraries** packages versioned components; **Saved tests** captures and verifies multi-step behavior.

The seven-segment examples connect editable NAND decoding, a counter, ROM lookup and CPU output. The I/O CPU drives segment bits through F7. See [the display guide](docs/USER_GUIDE.md#seven-segment-projects).

Sandbox components include editable eight-bit shift registers and priority encoders, momentary buttons, and tri-state buffers with shared-bus resolution. Their examples are in Open example.

The CPU executes through the circuit. Its instruction-level reference model exists only in tests.

## Checks

Use `bun run test` to run Vitest. `bun test` invokes Bun's separate built-in runner and is not this project's test command.

The committed `bun.lock` fixes dependency versions; `bun ci` enforces it. Only `esbuild` is listed in `trustedDependencies`; fsevents install hooks remain untrusted. Review `bun pm untrusted` when changing dependencies. Bun's trust list is package-name based, so review esbuild version changes in the lockfile before installing them.

```sh
bun run test
bun run build
bun run playwright install chromium firefox webkit
bun run test:browser
```

To test the production preview, keep `bun run preview` running and use:

```sh
LOOM_BASE_URL=http://127.0.0.1:4173 bun run test:browser --project=chromium --project=webkit
```

See [the v3 course](docs/V3.md) and [v3 verification](docs/V3-VERIFICATION.md). Automated tests supplement Computer-Use checks. Linux Firefox verification is available through the official Playwright container; native macOS IME and browser-specific checks are tracked separately.

## Documentation

- [V3 course and component continuity](docs/V3.md)

- [Using Loom](docs/USER_GUIDE.md)
- [CPU instruction set and timing](docs/CPU.md)
- [Architecture and simulation contracts](docs/ARCHITECTURE.md)
- [Deployment](docs/DEPLOYMENT.md)
- [CLI commands and reports](docs/CLI.md)
- [V2 verification ledger](docs/V2-PHASES.md)
- [V1 verification ledger](docs/PHASES.md)

Desktop release-candidate checks cover mouse/keyboard workflows at 1280×800 and 1920×1080 in English and Chinese. Touch/tablet sign-off is deferred.

**Help** includes getting-started directions, shortcuts and **Copy bug report**. Reports contain the app version, build commit, browser information and blank reproduction fields; they do not include project contents or upload anything.

No account, cloud storage, analytics, or external runtime service is required.

Loom is unreleased. Development iterations support only the current project format; no backward-compatibility migrations are provided. See [development policy](AGENTS.md).
