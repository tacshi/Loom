import { prepareCourseSubmission } from "./course-submission";
/** Development QA submission fixture. Not an in-app solution or completion shortcut. */
import { writeFileSync, mkdirSync } from "node:fs";
import {
  newCourse,
  activateExercise,
  acceptCheck,
} from "../src/course/session";
import { exercises } from "../src/course/registry";
import { checkCourse } from "../src/course/check";
import { exportProject } from "../src/persistence/serialization";
const p = newCourse();
p.name = "Course verification fixture";
for (const e of exercises) {
  if (e.id !== "signals") activateExercise(p, e.id);
  prepareCourseSubmission(p, e.id);
  const checked = await checkCourse(p, e.id);
  if (checked.status !== "passed")
    throw new Error(e.id + ": " + checked.message);
  await acceptCheck(p, checked);
}
mkdirSync("tests/fixtures/v3", { recursive: true });
writeFileSync("tests/fixtures/v3/course-completed.loom.json", exportProject(p));
