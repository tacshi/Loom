import { MissionBuilder } from "./combinational";
import { layoutMission } from "./layout";
import { courseReference } from "../referenceExercises";
import { closure } from "../../library/package";
import type { ExerciseId } from "../types";
import type { Project } from "../../model/types";
type Pin = [string, string];

/** Adapts verified arithmetic blocks to the fixed Loom instruction interface. */
export function supplyCpuBlocks(project: Project, root: string) {
  const b = new MissionBuilder("Arithmetic unit");
  const a = b.input("a", 8),
    data = b.input("data", 8),
    immediate = b.input("immediate", 8),
    opcode = b.input("opcode", 8);
  function part(name: string, id: ExerciseId): Pin {
    const record = project.course!.accepted[id];
    if (!record) throw new Error("Complete prerequisite checks first");
    Object.assign(b.p.circuits, closure(project, record.acceptedRoot));
    const node = b.node("instance", 8, name);
    b.c.components.at(-1)!.definitionId = record.acceptedRoot;
    b.connect(...a, node[0], "a");
    b.connect(...data, node[0], "b");
    return node;
  }
  const compute = part("Arithmetic", "core-30"),
    logic = part("Logic", "core-15"),
    add = part("Add carry", "core-21"),
    sub = part("Subtract carry", "core-24");
  const bits = b.bits(opcode, 8),
    is = (n: number) =>
      bits
        .map((pin, i) => (n & (1 << i) ? pin : b.not(pin)))
        .reduce((x, y) => b.and(x, y));
  const selectors = new Map([1, 2, 4, 5, 6, 7, 8].map((n) => [n, is(n)]));
  const low = b.or(selectors.get(5)!, selectors.get(8)!),
    high = b.or(selectors.get(6)!, selectors.get(8)!);
  b.connect(...b.join([low, high]), compute[0], "op");
  let result = b.mux(a, immediate, selectors.get(1)!, 8);
  result = b.mux(result, data, selectors.get(2)!, 8);
  result = b.mux(
    result,
    compute,
    [4, 5, 6, 8].map((n) => selectors.get(n)!).reduce((x, y) => b.or(x, y)),
    8,
  );
  result = b.mux(result, [logic[0], "or"], selectors.get(7)!, 8);
  b.output("result", result, 8);
  b.output(
    "carry",
    b.mux([add[0], "carry"], [sub[0], "carry"], selectors.get(5)!),
  );
  b.output("zero", b.not(b.bits(result, 8).reduce((x, y) => b.or(x, y))));
  layoutMission(b.p);
  for (const [id, c] of Object.entries(b.p.circuits))
    if (!project.circuits[id]) project.circuits[id] = c;
  const template = courseReference("cpu").circuits[courseReference("cpu").root];
  const bindings = {
    Fields: project.course!.accepted["core-43"]!.acceptedRoot,
    Control: project.course!.accepted["core-45"]!.acceptedRoot,
    Increment: project.course!.accepted["core-21"]!.acceptedRoot,
    ALU: b.p.root,
  };
  for (const [role, definitionId] of Object.entries(bindings)) {
    const node = structuredClone(
      template.components.find((n) => n.id === role)!,
    );
    node.definitionId = definitionId;
    project.circuits[root].components.push(node);
  }
  project.circuits[root].components.push(
    structuredClone(template.components.find((n) => n.id === "Signals")!),
  );
}
