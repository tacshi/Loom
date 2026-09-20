import { describe, it, expect } from "vitest";
import { exercises } from "../src/course/registry";
import {
  newCourse,
  activateExercise,
  acceptCheck,
  acceptedRoots,
} from "../src/course/session";
import { checkCourse } from "../src/course/check";
import { prepareCourseSubmission } from "../scripts/course-submission";
// Keep one real course journey, but time and report each mission independently.
// A single deadline for all 100 references exceeds five minutes on CI runners.
describe.sequential("authoritative course progression", () => {
  const p = newCourse();
  for (const spec of exercises) {
    it(`${spec.id} accepts its reference`, async () => {
      if (spec.id !== "core-01") activateExercise(p, spec.id);
      prepareCourseSubmission(p, spec.id);
      const result = await checkCourse(p, spec.id);
      expect({
        id: spec.id,
        status: result.status,
        message: result.message,
        failed: result.results.find((r) => r.status !== "passed")?.failure,
      }).toEqual({
        id: spec.id,
        status: "passed",
        message: undefined,
        failed: undefined,
      });
      await acceptCheck(p, result);
    }, 120000);
  }
  it("optional projects never become core dependencies", () => {
    activateExercise(p, "core-06");
    expect(
      acceptedRoots(p).every(
        (root) => !p.circuits[root].library?.id.startsWith("course-project-"),
      ),
    ).toBe(true);
  });
});
