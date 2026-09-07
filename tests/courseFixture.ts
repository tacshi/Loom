import {
  newCourse,
  activateExercise,
  acceptCheck,
} from "../src/course/session";
import { exercises } from "../src/course/registry";
import { checkCourse } from "../src/course/check";
import { prepareCourseSubmission } from "../scripts/course-submission";
import type { ExerciseId } from "../src/course/types";
export async function courseAt(id: ExerciseId, completed = false) {
  const p = newCourse();
  for (const e of exercises) {
    if (e.id !== "signals") activateExercise(p, e.id);
    if (e.id === id && !completed) break;
    prepareCourseSubmission(p, e.id);
    await acceptCheck(p, await checkCourse(p, e.id));
    if (e.id === id) break;
  }
  p.course!.stages = { ...p.course!.stages, [id]: "challenge" };
  return p;
}
