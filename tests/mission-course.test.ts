import { it, expect } from "vitest";
import { exercises } from "../src/course/registry";
import {
  newCourse,
  activateExercise,
  acceptCheck,
  acceptedRoots,
} from "../src/course/session";
import { checkCourse } from "../src/course/check";
import { prepareCourseSubmission } from "../scripts/course-submission";
it("authoritative checks accept all 100 references and optional projects never become core dependencies", async () => {
  const p = newCourse();
  for (const spec of exercises) {
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
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  activateExercise(p, "core-06");
  expect(
    acceptedRoots(p).every(
      (root) => !p.circuits[root].library?.id.startsWith("course-project-"),
    ),
  ).toBe(true);
}, 300000);
