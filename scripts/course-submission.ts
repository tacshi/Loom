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
  for (const c of Object.values(r.circuits))
    for (const n of c.components) {
      let dependency: ExerciseId | undefined;
      if (n.kind === "instance") {
        const name = r.circuits[n.definitionId!]?.name;
        if (name === "Full adder cell") dependency = "full-adder";
        if (id === "mux8" && name === "mux 1") dependency = "mux";
        if (c.id === r.root) {
          if (n.id === "ALU") dependency = "alu";
          if (n.id === "Control") dependency = "control";
          if (n.id === "Fields") dependency = "pc-fields";
          if (id === "calculator" && n.id === "RAM") dependency = "io";
          if (id === "alu" && n.id === "ADD") dependency = "adder8";
          if (id === "alu" && n.id === "SUB") dependency = "subtract";
        }
      } else if (id === "not" && n.kind === "nand") dependency = "nand";
      const accepted = dependency && p.course!.accepted[dependency];
      if (accepted) {
        n.kind = "instance";
        n.definitionId = accepted.acceptedRoot;
      }
    }
  return p;
}
