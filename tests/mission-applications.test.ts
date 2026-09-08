import { expect, it } from "vitest";
import {
  applicationTasks,
  applicationReference,
  applicationStarter,
} from "../src/course/missions/applications";
import { runCases } from "../src/verification/runner";
for (const [id, t] of Object.entries(applicationTasks))
  it(`${id} verifies visible device behavior and rejects untouched code`, () => {
    const p = applicationReference(t),
      checks = t.checks();
    expect(
      runCases(p, p.root, checks)
        .filter((r) => r.status !== "passed")
        .map((r) => ({ name: r.name, error: r.error, failure: r.failure })),
    ).toEqual([]);
    const s = applicationStarter(t);
    expect(runCases(s, s.root, checks).some((r) => r.status !== "passed")).toBe(
      true,
    );
  }, 60000);
