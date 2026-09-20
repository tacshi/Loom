# Loom

[简体中文](README.zh-CN.md)

A digital logic workbench that runs in your browser. Build circuits from logic gates, turn them into reusable components, and program an editable 8-bit computer. A guided course takes you from signals and NAND gates to a working CPU and calculator.

## What you can build

- **Logic circuits:** connect gates, buses, registers, memory, and tri-state buffers on an editable canvas.
- **Reusable components:** package your circuits into libraries and use them in larger designs.
- **An 8-bit computer:** edit the CPU's circuits, assemble programs, and connect keyboard, terminal, and seven-segment displays. Programs execute through the simulated circuit.
- **Testable designs:** save input/output test cases, replay failures, inspect signal history, and set breakpoints. The CLI validates and tests exported projects.

## Run locally

Requires Bun 1.4.2 and Node.js 24 or newer.

```sh
git clone https://github.com/tacshi/Loom.git
cd Loom
bun ci
bun run dev
```

Open `http://127.0.0.1:5173` in a desktop browser.

## Try it

Open **Learn → Start course** to work through 60 core missions and 40 optional projects. Each mission introduces the concept and offers hints and worked examples. Use **Run tests** to check your solution and unlock the next mission.

To explore a complete computer:

1. Open **Open example… → Loom 8 CPU**.
2. Select **Assemble & load**, then **Run clock**. The included sum program outputs **55**.
3. Use **Circuit** to find components and open subcircuits, or **Debug** to inspect inputs and outputs.

For an interactive example, open **Loom 8 I/O · Calculator** and try decimal addition and subtraction through its keyboard and terminal. You can also start a blank project and build freely.

## Save and work offline

Use **Projects → Export file** to save a portable `.loom.json` copy, and **Import file** to open it elsewhere. Browser storage is tied to the site's address, including its port: the development server (`5173`) and production preview (`4173`) have separate project stores. Clearing site data removes locally stored projects.

The production app works offline after its first successful online load. To build and preview it:

```sh
bun run build
bun run preview
```

See [deployment](docs/DEPLOYMENT.md) to host the app.

Loom is under development. Only the current project format is supported; incompatible files are rejected without changing the file or replacing the open project.

## Development

```sh
# Unit and integration tests
bun run test

# Type-check and build the app and CLI
bun run build

# Install browser test dependencies, then run Playwright
bun run playwright install --with-deps chromium firefox webkit
bun run test:browser
```

Run a specific test file with `bun run test tests/component-label.test.ts`. See [testing](docs/TESTING.md) for browser, CLI, and performance checks.

## Documentation

- [User guide and shortcuts](docs/USER_GUIDE.md)
- [Guided course and visual test playback](docs/LEARNING.md)
- [CPU instruction set and timing](docs/CPU.md)
- [Architecture and simulation contracts](docs/ARCHITECTURE.md)
- [CLI commands and reports](docs/CLI.md)
- [Deployment and offline updates](docs/DEPLOYMENT.md)

## Contributing and reporting bugs

Keep pull requests focused and include tests for changed behavior. Read the [development policy](AGENTS.md) before changing project formats.

To [report a bug](https://github.com/tacshi/Loom/issues), include reproduction steps, the expected result, and what happened. **Help → Copy bug report** provides the app version, build commit, and browser details. It does not include project contents or upload anything; attach an exported project yourself if it is needed to reproduce the issue.
