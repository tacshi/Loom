/// <reference lib="webworker" />
import { activateExercise } from "./session";
import { exercise } from "./registry";
import { checkCourse, reverifyCourse } from "./check";
import type { CourseRequest } from "./types";
onmessage = async ({ data }: { data: CourseRequest }) => {
  const progress = (exercise: CourseRequest["exercise"], caseName?: string) =>
    postMessage({
      requestId: data.requestId,
      progress: { exercise, caseName },
    });
  try {
    if (data.practice) {
      const spec = exercise(data.exercise), scene = spec.starter();
      delete scene.course;
      delete scene.courseReference;
      scene.circuits[scene.root].tests = spec.checks();
      postMessage({ requestId: data.requestId, scene });
    } else if (data.example) {
      postMessage({
        requestId: data.requestId,
        scene: exercise(data.exercise).reference(),
      });
    } else if (data.prepare) {
      const project = structuredClone(data.project);
      activateExercise(project, data.exercise);
      postMessage({ requestId: data.requestId, project });
    } else if (data.reverify) {
      const project = structuredClone(data.project);
      const results = await reverifyCourse(project, progress);
      postMessage({ requestId: data.requestId, project, results });
    } else
      postMessage({
        requestId: data.requestId,
        result: await checkCourse(data.project, data.exercise, false, progress),
      });
  } catch (e) {
    postMessage({ requestId: data.requestId, error: (e as Error).message });
  }
};
