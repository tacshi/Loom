/** Reference-derived QA designs with earlier verified learner artifacts wired into later designs. */
import type { Project } from "../src/model/types";
import type { ExerciseId } from "../src/course/types";
import { exercise } from "../src/course/registry";
export function prepareCourseSubmission(p: Project, id: ExerciseId) {
  const r = exercise(id).reference();
  r.circuits[r.root].name = exercise(id).title[0];
  Object.assign(p.circuits, r.circuits);
  p.root = r.root;
  p.course!.drafts[id] = r.root;
  p.course!.active = id;
  p.cpu = r.cpu;
  p.source = r.source;
  p.sourceMap = r.sourceMap;
  p.assembledSource = r.assembledSource;
  // The NAND-to-inverter exercise explicitly reuses the verified NAND implementation.
  if (id === "core-06" && p.course!.accepted["core-05"]) {
    for(const n of p.circuits[p.root].components) if(n.kind === "nand") {
      n.kind="instance";n.definitionId=p.course!.accepted["core-05"]!.acceptedRoot;
    }
  }
  return p;
}
