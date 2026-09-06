import { it, expect } from "vitest";
import { exercise, exercises } from "../src/course/registry";
import {
  newCourse,
  activateExercise,
  acceptCheck,
  electricalHash,
  available,
} from "../src/course/session";
import { checkCourse, reverifyCourse } from "../src/course/check";
import { parseProject, validateProject } from "../src/persistence/validation";
import { exportProject } from "../src/persistence/serialization";
import { createComponent } from "../src/model/types";
function submit(
  p: ReturnType<typeof newCourse>,
  id: Parameters<typeof exercise>[0],
) {
  const r = exercise(id).reference();
  p.circuits = { ...p.circuits, ...r.circuits };
  p.root = r.root;
  p.course!.drafts[id] = r.root;
  p.course!.active = id;
  return p;
}
it("all course starters fail and all submitted references can advance in one saved course", async () => {
  const p = newCourse();
  for (const e of exercises) {
    if (e.id !== "nand") activateExercise(p, e.id);
    expect((await checkCourse(p, e.id)).status, e.id + " starter").not.toBe(
      "passed",
    );
    submit(p, e.id);
    const r = await checkCourse(p, e.id);
    expect(r.status, e.id + " submission " + r.message).toBe("passed");
    await acceptCheck(p, r);
    validateProject(p);
  }
  const imported = parseProject(exportProject(p));
  expect(imported.course!.needsVerification).toBe(true);
  await reverifyCourse(imported);
  expect(Object.keys(imported.course!.accepted)).toHaveLength(exercises.length);
}, 60000);
it("ignores edited project tests, rejects hidden forbidden gates, and prevents references awarding credit", async () => {
  const p = submit(newCourse(), "nand");
  p.circuits[p.root].tests = [];
  p.circuits[p.root].wires = [];
  p.circuits[p.root].nets = [];
  expect((await checkCourse(p, "nand")).status).not.toBe("passed");
  submit(p, "nand");
  const d = exercise("not").reference();
  p.circuits = { ...p.circuits, ...d.circuits };
  d.circuits[d.root].components[0].kind = "not";
  p.circuits[d.root] = d.circuits[d.root];
  const n = createComponent("instance", 0, 0);
  n.definitionId = d.root;
  p.circuits[p.root].components.push(n);
  expect((await checkCourse(p, "nand")).message).toContain("not");
  p.courseReference = true;
  expect((await checkCourse(p, "nand")).status).toBe("invalid");
});
it("preserves accepted snapshots and rejects stale checks after an electrical edit", async () => {
  const p = submit(newCourse(), "nand"),
    r = await checkCourse(p, "nand");
  await acceptCheck(p, r);
  const record = structuredClone(p.course!.accepted.nand!);
  p.circuits[p.root].components.find((n) => n.kind === "nand")!.kind = "and";
  expect(await electricalHash(p, p.root)).not.toBe(record.hash);
  expect(p.course!.accepted.nand).toEqual(record);
  await expect(acceptCheck(p, r)).rejects.toThrow("changed");
  expect(available(p, "not")).toBe(true);
  const imported = parseProject(exportProject(p));
  imported.course!.accepted.nand!.hash = "0".repeat(64);
  await reverifyCourse(imported);
  expect(imported.course!.accepted.nand).toBeUndefined();
});
it("checks declared width variants rather than assuming a one-bit circuit scales", async () => {
  const p = submit(newCourse(), "nand"),
    c = p.circuits[p.root];
  c.parameters = [{ name: "width", min: 1, max: 8, default: 1 }];
  // All interface and gate widths must be bound; partial widening is invalid.
  for (const port of c.ports) {
    port.widthParameter = "width";
    c.components.find((n) => n.id === port.componentId)!.widthParameter =
      "width";
  }
  expect((await checkCourse(p, "nand")).status).toBe("invalid");
  c.components.find((n) => n.kind === "nand")!.widthParameter = "width";
  expect((await checkCourse(p, "nand")).verifiedWidths).toEqual([
    1, 2, 3, 4, 5, 6, 7, 8,
  ]);
});

it("the calculator fails when its NAND adder input or I/O read path is disconnected", async () => {
  const { removeRouteConnection } = await import("../src/model/nets");
  for (const fault of ["adder", "io"]) {
    const p = submit(newCourse(), "calculator");
    const root = p.circuits[p.root];
    const c =
      fault === "adder"
        ? Object.values(p.circuits).find((c) => c.name === "Arithmetic unit")!
        : root;
    const w = c.wires.find((w) =>
      fault === "adder"
        ? w.from.component === "data" && w.to.component === "ADD"
        : w.to.component === "RAM" && w.to.port === "read",
    )!;
    expect(w, fault + " path").toBeDefined();
    removeRouteConnection(c, w.id);
    expect((await checkCourse(p, "calculator", true)).status, fault).not.toBe(
      "passed",
    );
  }
}, 30000);

it("carries the learner’s accepted NAND into NOT and records the actual immutable dependency", async () => {
  const { Builder } = await import("../src/examples/adder");
  const p = submit(newCourse(), "nand");
  await acceptCheck(p, await checkCourse(p, "nand"));
  activateExercise(p, "not");
  const c = p.circuits[p.root],
    n = createComponent("instance", 280, 0);
  n.id = "learnedNand";
  n.definitionId = p.course!.accepted.nand!.acceptedRoot;
  c.components.push(n);
  const b = new Builder("wiring");
  b.p = p;
  b.connect("a", "out", n.id, "a");
  b.connect("a", "out", n.id, "b");
  b.connect(n.id, "out", "out", "in");
  const checked = await checkCourse(p, "not");
  expect(checked.status).toBe("passed");
  expect(Object.keys(checked.dependencies!)[0]).toMatch(/^nand:/);
  await acceptCheck(p, checked);
  validateProject(p);
  expect(Object.keys(p.circuits).every((id) => id.length <= 200)).toBe(true);
  const imported = parseProject(exportProject(p));
  await reverifyCourse(imported);
  expect(imported.course!.accepted.not).toBeDefined();
});

it("layout, labels and root input switches preserve accepted electrical identity", async () => {
  const p = submit(newCourse(), "nand"),
    before = await electricalHash(p, p.root),
    c = p.circuits[p.root];
  c.components[0].name = "Renamed";
  c.components[0].x += 20;
  c.components[0].params.value = 1;
  c.wires[0].points = [];
  c.nets[0].name = "Label";
  expect(await electricalHash(p, p.root)).toBe(before);
});

it("trusted checks catch reset, carry, opcode-bit and phase wiring faults", async () => {
  const { removeRouteConnection, connect } = await import("../src/model/nets");
  for (const id of ["register", "subtract", "pc-fields", "control"] as const) {
    const p = submit(newCourse(), id),
      c = p.circuits[p.root];
    const target =
      id === "register"
        ? ["storage", "rst"]
        : id === "subtract"
          ? ["carry", "in"]
          : id === "pc-fields"
            ? ["Opcode", "b0"]
            : ["Not phase", "a"];
    const wire = c.wires.find(
      (w) => w.to.component === target[0] && w.to.port === target[1],
    )!;
    expect(wire, id + " fault seam").toBeDefined();
    removeRouteConnection(c, wire.id);
    let from =
      id === "register"
        ? { component: "en", port: "out" }
        : id === "pc-fields"
          ? { component: "Bits", port: "b7" }
          : { component: "halt", port: "out" };
    if (id === "subtract") {
      const zero = createComponent("constant", 0, 0);
      zero.id = "wrongCarry";
      zero.params.value = 0;
      c.components.push(zero);
      from = { component: zero.id, port: "out" };
    }
    connect(c, p, { ...wire, from });
    expect(
      (await checkCourse(p, id, true)).status,
      id + " must fail behavior",
    ).toBe("failed");
  }
}, 15000);

it("keeps separate draft assembly text across exercise switches and export", async () => {
  const p = submit(newCourse(), "nand");
  await acceptCheck(p, await checkCourse(p, "nand"));
  p.source = "; unfinished first draft";
  p.assembledSource = "";
  p.sourceMap = {};
  activateExercise(p, "not");
  p.source = "; second draft";
  activateExercise(p, "nand");
  expect(p.source).toBe("; unfinished first draft");
  const loaded = parseProject(exportProject(p));
  await reverifyCourse(loaded);
  activateExercise(loaded, "not");
  expect(loaded.source).toBe("; second draft");
});
