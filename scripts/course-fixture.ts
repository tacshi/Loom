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
  if (e.id !== "core-01") activateExercise(p, e.id);
  prepareCourseSubmission(p, e.id);
  const checked = await checkCourse(p, e.id);
  if (checked.status !== "passed")
    throw new Error(e.id + ": " + checked.message);
  await acceptCheck(p, checked);
}
// QA replaces starters with submissions; do not export the abandoned starter graphs.
const retained = new Set<string>();
function retain(root: string) {
  if (retained.has(root)) return;
  retained.add(root);
  for (const c of p.circuits[root].components)
    if (c.definitionId) retain(c.definitionId);
}
for (const root of [
  p.root,
  ...Object.values(p.course!.drafts),
  ...Object.values(p.course!.accepted).map((r) => r!.acceptedRoot),
])
  if (root) retain(root);
p.circuits = Object.fromEntries(
  Object.entries(p.circuits).filter(([id]) => retained.has(id)),
);
mkdirSync("tests/fixtures/v3", { recursive: true });
writeFileSync("tests/fixtures/v3/course-completed.loom.json", exportProject(p));
