# Loom

A local-first digital logic workbench. Build circuits, package reusable components, and run an editable 8-bit CPU. English and Simplified Chinese are included.

## Run

Requires Node.js 24 or newer.

```sh
npm ci
npm run dev
```

Open the address printed by Vite. For the offline-capable production build:

```sh
npm run build
npm run preview
```

The production app caches its assets after the first successful online load. Projects belong to the browser origin: development (`5173`) and preview (`4173`) have separate project stores. Use **Projects → Export file / Import file** to move work between them.

## Start building

- **Learn → Start course** guides you through 20 exercises from NAND to a computer running a calculator, carrying your verified components forward. Sandbox projects remain unrestricted.
- **Open example… → Loom 8 CPU** opens a complete computer. **Assemble & load**, then **Run**: the supplied sum program outputs **55**.
- Use **Circuit** to select a component by name, inspect its signals, connect ports, or open its subcircuit.
- Inside the CPU's **ALU**, replace **ADD** with a NAND-built adder and rerun the same program.

**Open example… → Loom 8 I/O · Calculator** runs interactive decimal addition/subtraction through keyboard and terminal peripherals. **Debug** adds rewind and retained runs; **Libraries** packages versioned components; **Sequential tests** captures and verifies multi-step behavior.

The seven-segment examples connect editable NAND decoding, a counter, ROM lookup and CPU output. The I/O CPU drives segment bits through F7. See [the display guide](docs/USER_GUIDE.md#seven-segment-projects).

Sandbox components include editable eight-bit shift registers and priority encoders, momentary buttons, and tri-state buffers with shared-bus resolution. Their examples are in Open example.

The CPU executes through the circuit. Its instruction-level reference model exists only in tests.

## Checks

```sh
npm test
npm run build
npx playwright install chromium firefox webkit
npm run test:browser
```

To test the production preview, keep `npm run preview` running and use:

```sh
LOOM_BASE_URL=http://127.0.0.1:4173 npm run test:browser -- --project=chromium --project=webkit
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
