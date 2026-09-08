import { missions } from "./missions";
import type { Exercise, ExerciseId } from "./types";
import { ref } from "../model/nets";
export const exercises: Exercise[] = missions.map((m) => ({
  id: m.id,
  revision: m.id === "core-54" ? 2 : 1,
  mission: m,
  title: m.title,
  objective: m.goal,
  hints: m.hints,
  prerequisites: m.prerequisites,
  allowed: m.allowed,
  lesson: {
    chapter:
      m.chapter <= 2
        ? "foundations"
        : m.chapter <= 3
          ? "logic"
          : m.chapter <= 5
            ? "arithmetic"
            : m.chapter <= 7
              ? "memory"
              : "computers",
    mode: m.mode,
    concept: m.concept,
    tryIt: m.goal,
    steps: [],
  },
  demonstration: m.reference,
  reference: m.reference,
  starter: m.starter,
  checks: m.checks,
  observed: () => {
    const p = m.reference();
    return p.circuits[p.root].ports.map((port) =>
      ref(port.componentId, port.direction === "in" ? "out" : "in"),
    );
  },
}));
export function exercise(id: ExerciseId): Exercise {
  const spec = exercises.find((e) => e.id === id);
  if (!spec) throw new Error("Unknown mission");
  return spec;
}
export const courseReference = (id: ExerciseId) => exercise(id).reference();
export const starterProject = (id: ExerciseId) => exercise(id).starter();
