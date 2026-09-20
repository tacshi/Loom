import { expect, it } from "vitest";
import { checkCourse } from "../src/course/check";
import { newCourse } from "../src/course/session";
import { prepareCourseSubmission } from "../scripts/course-submission";
import { createComponent } from "../src/model/types";
import { exercise } from "../src/course/registry";

it("optional and future course components cannot bypass a core mission", async () => {
  for (const identity of ["course-project-01", "course-core-60"]) {
    const p = newCourse();
    prepareCourseSubmission(p, "core-01");
    const dependency = exercise("core-06").reference();
    Object.assign(p.circuits, dependency.circuits);
    dependency.circuits[dependency.root].libraryOrigin = {
      id: identity,
      version: 1,
      hash: "0".repeat(64),
    };
    const n = createComponent("instance", 300, 300);
    n.definitionId = dependency.root;
    p.circuits[p.root].components.push(n);
    expect((await checkCourse(p, "core-01")).message).toBe(
      "courseDependencyUnavailable",
    );
  }
});
