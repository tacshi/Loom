import "../src/course/missions/special";
import { expect, it } from "vitest";
import {
  stateTasks,
  stateReference,
  stateStarter,
  stateChecks,
} from "../src/course/missions/sequential";
import { runCases } from "../src/verification/runner";
for (const [id, task] of Object.entries(stateTasks))
  it(`${id} responds to actions and cannot pass untouched`, () => {
    const cases = stateChecks(task),
      p = stateReference(task, id);
    expect(
      runCases(p, p.root, cases).map((r) => ({
        status: r.status,
        error: r.error,
        failure: r.failure,
      })),
    ).toEqual([{ status: "passed", error: undefined, failure: undefined }]);
    const starter = stateStarter(task, id);
    expect(
      runCases(starter, starter.root, cases).some((r) => r.status !== "passed"),
    ).toBe(true);
  }, 60000);
