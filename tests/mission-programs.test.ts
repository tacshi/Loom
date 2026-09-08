import { expect, it } from "vitest";
import {
  programTasks,
  programReference,
  programStarter,
  programChecks,
} from "../src/course/missions/programs";
import { runCases } from "../src/verification/runner";
import { assemble } from "../src/cpu/assembler";

it("core-54 rejects a hardcoded sum for varying input endpoints", () => {
  const task = programTasks["core-54"],
    p = programStarter(task);
  const ram = p.circuits[p.root].components.find((n) => n.id === p.cpu!.ram)!;
  expect(ram.image?.[0] ?? 0).toBe(0);
  p.circuits[p.root].components.find((n) => n.id === p.cpu!.rom)!.image =
    assemble("LDI 55\nOUT\nHLT").image;
  const results = runCases(p, p.root, programChecks(task));
  expect(results.map((r) => r.status)).toEqual([
    "failed",
    "failed",
    "failed",
    "passed",
    "failed",
  ]);
}, 60000);

for (const [id, task] of Object.entries(programTasks))
  it(`${id} checks real CPU execution and rejects a blank program`, () => {
    const cases = programChecks(task),
      p = programReference(task);
    expect(
      runCases(p, p.root, cases)
        .filter((r) => r.status !== "passed")
        .map((r) => ({ name: r.name, error: r.error, failure: r.failure })),
    ).toEqual([]);
    const starter = programStarter(task);
    expect(
      runCases(starter, starter.root, cases).some((r) => r.status !== "passed"),
    ).toBe(true);
  }, 60000);
