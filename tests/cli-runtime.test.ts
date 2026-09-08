import { beforeAll, afterAll, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import { Builder } from "../src/examples/adder";

let directory: string, bundle: string, runtime: string;
beforeAll(() => {
  directory = mkdtempSync(join(tmpdir(), "loom-bun-cli-"));
  bundle = join(directory, "loom.mjs");
  runtime = execFileSync(
    "bun",
    ["-e", "process.stdout.write(process.execPath)"],
    { encoding: "utf8" },
  );
  const build = spawnSync(
    runtime,
    [
      "build",
      resolve("src/cli/main.ts"),
      "--target=bun",
      "--format=esm",
      `--outfile=${bundle}`,
    ],
    { encoding: "utf8" },
  );
  expect(build.status, build.stderr).toBe(0);
});
afterAll(() => rmSync(directory, { recursive: true, force: true }));
function run(...args: string[]) {
  // No Node executable is discoverable by the CLI or any child process.
  return spawnSync(runtime, [bundle, ...args], {
    encoding: "utf8",
    env: { ...process.env, PATH: directory },
  });
}
function fixture(expected = 1, cycles = 0) {
  const b = new Builder("Bun CLI");
  b.add("A", "input", 0, 0, 1, 1);
  b.add("P", "probe", 240, 0);
  b.connect("A", "out", "P", "in");
  b.c.tests = [
    {
      id: "output",
      name: "<script>test name</script>",
      maxCycles: 1,
      seed: 0,
      steps: [
        {
          cycles,
          assertions: [
            {
              type: "signal",
              ref: { instancePath: [], componentId: "P", portId: "in" },
              value: expected,
            },
          ],
        },
      ],
    },
  ];
  const path = join(directory, `project-${expected}-${cycles}.loom.json`);
  writeFileSync(path, JSON.stringify(b.p));
  return path;
}
it("builds a Bun executable and validates projects without Node on PATH", () => {
  expect(readFileSync(bundle, "utf8").split("\n")[0]).toBe(
    "#!/usr/bin/env bun",
  );
  const result = run("validate", fixture());
  expect(result.status, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout)).toMatchObject({
    valid: true,
    diagnostics: [],
  });
});
it("preserves success, mismatch, invalid-input, and execution-limit exit codes", () => {
  const passed = run("test", fixture(), "--json");
  expect(passed.status, passed.stderr).toBe(0);
  expect(JSON.parse(passed.stdout).results[0].status).toBe("passed");
  const failed = run("test", fixture(0), "--json");
  expect(failed.status).toBe(1);
  expect(JSON.parse(failed.stdout).results[0].failure.actual.value).toBe(1);
  const invalid = join(directory, "invalid.json");
  writeFileSync(invalid, "{");
  expect(run("validate", invalid).status).toBe(2);
  const limited = run("test", fixture(1, 2), "--json");
  expect(limited.status).toBe(3);
  expect(JSON.parse(limited.stdout).results[0].status).toBe("limit");
});
it("writes JSON and safely escaped HTML reports under Bun", () => {
  const report = join(directory, "report");
  const result = run("test", fixture(), "--report", report);
  expect(result.status, result.stderr).toBe(0);
  expect(
    JSON.parse(readFileSync(join(report, "results.json"), "utf8")).results[0]
      .status,
  ).toBe("passed");
  const html = readFileSync(join(report, "index.html"), "utf8");
  expect(html).toContain("&lt;script&gt;");
  expect(html).not.toContain("<script>");
});
