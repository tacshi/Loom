import { it, expect } from "vitest";
import { fullAdder } from "../src/examples/adder";
import { extract } from "../src/model/hierarchy";
import { Engine, runVectors } from "../src/simulator/engine";
import { parseProject } from "../src/persistence/validation";
it("packaging NAND gates preserves all eight full-adder outcomes", () => {
  const p = fullAdder(),
    c = p.circuits[p.root];
  extract(
    p,
    c.id,
    c.components.filter((c) => c.kind === "nand").map((c) => c.id),
    "Full adder",
  );
  const e = new Engine(p);
  expect(e.compiled.diagnostics).toEqual([]);
  expect(runVectors(p, p.root, c.vectors).every((r) => r.passed)).toBe(true);
  const def = Object.values(p.circuits).find((c) => c.id !== p.root)!;
  def.ports[0].name = "Renamed input";
  expect(runVectors(p, p.root, c.vectors).every((r) => r.passed)).toBe(true);
});
it("project round-trip retains manually arranged routes", () => {
  const p = fullAdder();
  p.circuits[p.root].wires[0].pinned = true;
  expect(parseProject(JSON.stringify(p))).toEqual(p);
});
it("rejects invalid imports without mutating the open project", () => {
  const p = fullAdder(),
    before = JSON.stringify(p);
  const invalid = structuredClone(p);
  invalid.circuits[p.root].components[0].width = 0;
  expect(() => parseProject(JSON.stringify(invalid))).toThrow("invalidProject");
  expect(JSON.stringify(p)).toBe(before);
  expect(() => parseProject("{")).toThrow("invalidProject");
  expect(() =>
    parseProject(JSON.stringify({ ...p, schemaVersion: 7 })),
  ).toThrow("unsupportedVersion");
});
it("deleting an interface port removes external bindings and leaves a loadable project", async () => {
  const { removeSelection } = await import("../src/model/hierarchy");
  const p = fullAdder(),
    c = p.circuits[p.root];
  extract(
    p,
    c.id,
    c.components.filter((c) => c.kind === "nand").map((c) => c.id),
    "Adder",
  );
  const def = Object.values(p.circuits).find((c) => c.id !== p.root)!;
  const id = def.ports[0].componentId;
  removeSelection(p, def.id, [id]);
  expect(parseProject(JSON.stringify(p))).toEqual(p);
  expect(
    new Engine(p).compiled.diagnostics.some((d) => d.code === "missingPort"),
  ).toBe(false);
});
it("transient empty names remain loadable", () => {
  const p = fullAdder();
  p.name = "";
  p.circuits[p.root].components[0].name = "";
  expect(parseProject(JSON.stringify(p))).toEqual(p);
});
