import { expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { checkCourse } from "../src/course/check";
import {
  acceptCheck,
  activateExercise,
  newCourse,
} from "../src/course/session";
import { prepareCourseSubmission } from "../scripts/course-submission";
import { createComponent, type Project } from "../src/model/types";
import { exercise } from "../src/course/registry";
const complete = () =>
  JSON.parse(
    readFileSync("tests/fixtures/v3/course-completed.loom.json", "utf8"),
  ) as Project;
it("programming starters retain the learner's verified CPU", () => {
  const p = complete(),
    cpu = p.circuits[p.course!.accepted["core-48"]!.acceptedRoot];
  cpu.components.find((c) => c.id === "PC")!.name = "Learner's program counter";
  delete p.course!.drafts["core-50"];
  activateExercise(p, "core-50");
  expect(p.circuits[p.root].components.find((c) => c.id === "PC")!.name).toBe(
    "Learner's program counter",
  );
  expect(p.source).toBe("");
});
it("source edits invalidate pending program approval and mismatched source cannot pass", async () => {
  const p = complete();
  activateExercise(p, "core-50");
  const result = await checkCourse(p, "core-50");
  expect(result.status, result.message).toBe("passed");
  p.source += "\n; edited while checking";
  await expect(acceptCheck(p, result)).rejects.toThrow("changed");
  p.source = p.assembledSource = "LDI 99\nOUT\nHLT";
  expect((await checkCourse(p, "core-50")).message).toBe("sourceChanged");
});
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
it("programs retain approved AND/NOT internals carried through the learner's CPU", async () => {
  const { closure } = await import("../src/library/package");
  const p = complete();
  activateExercise(p, "core-48");
  const circuit = Object.values(closure(p, p.root)).find((c) =>
    c.components.some((n) => n.kind === "nand" && n.width === 1),
  )!;
  const node = p.circuits[circuit.id].components.find(
    (n) => n.kind === "nand" && n.width === 1,
  )!;
  node.kind = "instance";
  node.definitionId = p.course!.accepted["core-05"]!.acceptedRoot;
  const cpuResult = await checkCourse(p, "core-48");
  expect(cpuResult.status, cpuResult.message).toBe("passed");
  await acceptCheck(p, cpuResult);
  delete p.course!.drafts["core-50"];
  activateExercise(p, "core-50");
  const reference = exercise("core-50").reference();
  p.source = reference.source;
  p.assembledSource = reference.assembledSource;
  p.circuits[p.root].components.find((n) => n.id === "Program")!.image =
    reference.circuits[reference.root].components.find(
      (n) => n.id === "Program",
    )!.image;
  const program = await checkCourse(p, "core-50");
  expect(program.status, program.message).toBe("passed");
  await acceptCheck(p, program);
  const snapshot = structuredClone(p);
  snapshot.course!.drafts["core-50"] =
    p.course!.accepted["core-50"]!.acceptedRoot;
  const checkedSnapshot = await checkCourse(snapshot, "core-50", true);
  expect(checkedSnapshot.status, checkedSnapshot.message).toBe("passed");
  const copied = Object.values(closure(p, p.root)).find((c) =>
    c.components.some((n) => n.kind === "and"),
  )!;
  p.circuits[copied.id].components.find((n) => n.kind === "and")!.kind = "or";
  expect((await checkCourse(p, "core-50")).status).toBe("invalid");
});
it("the CPU starter supplies compatible verified blocks that can be wired into a working computer", async () => {
  const { closure } = await import("../src/library/package");
  const p = complete();
  delete p.course!.drafts["core-48"];
  activateExercise(p, "core-48");
  expect((await checkCourse(p, "core-48")).status).not.toBe("passed");
  const c = p.circuits[p.root],
    r = exercise("core-48").reference(),
    template = r.circuits[r.root];
  expect(c.components.find((n) => n.id === "Control")!.definitionId).toBe(
    p.course!.accepted["core-45"]!.acceptedRoot,
  );
  expect(c.components.find((n) => n.id === "Fields")!.definitionId).toBe(
    p.course!.accepted["core-43"]!.acceptedRoot,
  );
  for (const node of template.components)
    if (!c.components.some((n) => n.id === node.id)) {
      c.components.push(structuredClone(node));
      if (node.definitionId)
        Object.assign(p.circuits, closure(r, node.definitionId));
    }
  c.wires = structuredClone(template.wires);
  c.nets = structuredClone(template.nets);
  c.markers = structuredClone(template.markers);
  const result = await checkCourse(p, "core-48");
  expect(result.status, result.message).toBe("passed");
});
