import "../src/course/missions/special";
import { expect, it } from "vitest";
import {
  logicTasks,
  logicReference,
  logicStarter,
  logicChecks,
} from "../src/course/missions/combinational";
import { runCases } from "../src/verification/runner";
for (const [id, task] of Object.entries(logicTasks)) {
  it(`${id} has an unfinished starter and an independently checked solution`, () => {
    const checks = logicChecks(task);
    expect(checks.length).toBeGreaterThan(1);
    const reference = logicReference(task, id);
    const results = runCases(reference, reference.root, checks);
    expect(
      results
        .filter((r) => r.status !== "passed")
        .map((r) => ({ name: r.name, error: r.error, failure: r.failure })),
    ).toEqual([]);
    const starter = logicStarter(task, id);
    expect(
      runCases(starter, starter.root, checks).some(
        (r) => r.status !== "passed",
      ),
    ).toBe(true);
  }, 60000);
}
