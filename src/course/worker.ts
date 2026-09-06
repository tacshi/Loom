/// <reference lib="webworker" />
import { checkCourse, reverifyCourse } from "./check";
import type { CourseRequest } from "./types";
onmessage = async ({ data }: { data: CourseRequest }) => {
  const progress = (exercise: CourseRequest["exercise"], caseName?: string) =>
    postMessage({
      requestId: data.requestId,
      progress: { exercise, caseName },
    });
  try {
    if (data.reverify) {
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
