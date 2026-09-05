import {
  emptyProject,
  createComponent,
  type Project,
  type Component,
  type Kind,
} from "./types";
import { ports } from "./components";
import { Engine } from "../simulator/engine";
import { same } from "../simulator/signal";
export type Replacement = {
  component: Component;
  mapping: Record<string, string>;
};
export type Comparison = { passed: boolean; cases: number; reason?: string };
export function automaticMapping(
  project: Project,
  old: Component,
  next: Component,
) {
  const before = ports(old, project),
    after = ports(next, project),
    used = new Set<string>(),
    mapping: Record<string, string> = {};
  for (const p of before) {
    const candidates = after.filter(
      (q) =>
        q.direction === p.direction && q.width === p.width && !used.has(q.id),
    );
    const q =
      candidates.find((q) => q.id === p.id) ??
      candidates.find((q) => q.name === p.name) ??
      candidates[0];
    if (q) {
      mapping[p.id] = q.id;
      used.add(q.id);
    }
  }
  return mapping;
}
export function compatible(
  project: Project,
  old: Component,
  next: Component,
  mapping: Record<string, string>,
) {
  const before = ports(old, project),
    after = ports(next, project);
  return (
    before.length === after.length &&
    new Set(Object.values(mapping)).size === before.length &&
    before.every((p) =>
      after.some(
        (q) =>
          q.id === mapping[p.id] &&
          q.direction === p.direction &&
          q.width === p.width,
      ),
    )
  );
}
export function compareReplacement(
  project: Project,
  old: Component,
  next: Component,
  mapping: Record<string, string>,
): Comparison {
  if (!compatible(project, old, next, mapping))
    return { passed: false, cases: 0, reason: "interfaceMismatch" };
  const oldPorts = ports(old, project),
    inputs = oldPorts.filter((p) => p.direction === "in"),
    outputs = oldPorts.filter((p) => p.direction === "out");
  function harness(component: Component, candidate: boolean) {
    const p = emptyProject();
    p.circuits = { ...structuredClone(project.circuits), ...p.circuits };
    const c = p.circuits[p.root];
    c.components.push({ ...structuredClone(component), id: "target" });
    for (const input of inputs) {
      const driver = createComponent("input", 0, 0, input.width);
      driver.id = "drive_" + input.id;
      c.components.push(driver);
      c.wires.push({
        id: driver.id,
        from: { component: driver.id, port: "out" },
        to: {
          component: "target",
          port: candidate ? mapping[input.id] : input.id,
        },
        points: [],
      });
    }
    return new Engine(p);
  }
  const a = harness(old, false),
    b = harness(next, true);
  if (a.compiled.diagnostics.length || b.compiled.diagnostics.length)
    return { passed: false, cases: 0, reason: "replacementInvalid" };
  const stateful = [...a.compiled.components, ...b.compiled.components].some(
    (c) => ["register", "dff", "counter", "ram"].includes(c.kind),
  );
  const bits = inputs.reduce((n, p) => n + p.width, 0);
  const total = !stateful && bits <= 10 ? 2 ** bits : 128;
  let seed = 12345,
    cases = 0;
  for (let n = 0; n < total; n++) {
    a.reset();
    b.reset();
    for (let cycle = 0; cycle < (stateful ? 8 : 1); cycle++) {
      let offset = 0;
      for (const input of inputs) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const max = input.width === 32 ? 0xffffffff : 2 ** input.width - 1;
        const value =
          !stateful && bits <= 10
            ? (n >>> offset) & max
            : n < 4
              ? [0, max, 1, max - 1][n]
              : seed & max;
        offset += input.width;
        a.setInput("drive_" + input.id, value >>> 0);
        b.setInput("drive_" + input.id, value >>> 0);
      }
      for (const p of outputs)
        if (!same(a.get("target", p.id), b.get("target", mapping[p.id])))
          return { passed: false, cases, reason: "behaviorMismatch" };
      if (stateful) {
        a.step();
        b.step();
        for (const p of outputs)
          if (!same(a.get("target", p.id), b.get("target", mapping[p.id])))
            return { passed: false, cases, reason: "behaviorMismatch" };
      }
      cases++;
    }
  }
  return { passed: true, cases };
}
export const replacementKinds: Kind[] = [
  "not",
  "and",
  "or",
  "xor",
  "nand",
  "nor",
  "xnor",
  "mux",
  "adder",
  "subtractor",
  "compare",
  "register",
  "dff",
  "counter",
  "ram",
  "rom",
];
