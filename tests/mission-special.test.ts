import { expect, it } from "vitest";
import { specialTasks } from "../src/course/missions/special";
import { runCases } from "../src/verification/runner";
for (const [id, t] of Object.entries(specialTasks))
  it(`${id} checks its supplied hardware and unfinished boundary`, () => {
    const p = t.reference(),
      checks = t.checks();
    expect(
      runCases(p, p.root, checks)
        .filter((r) => r.status !== "passed")
        .map((r) => ({ name: r.name, error: r.error, failure: r.failure })),
    ).toEqual([]);
    const s = t.starter();
    expect(runCases(s, s.root, checks).some((r) => r.status !== "passed")).toBe(
      true,
    );
  }, 60000);
