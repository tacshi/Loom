import { it, expect } from "vitest";
import { fullAdder } from "../src/examples/adder";
import { validateProject, parseProject } from "../src/persistence/validation";
import { exportProject } from "../src/persistence/serialization";
import { runVectors } from "../src/simulator/engine";
it("round trips the current format without rewriting routes", () => {
  const p = fullAdder();
  const copy = parseProject(exportProject(p));
  expect(copy).toEqual(p);
  expect(exportProject(copy)).toBe(exportProject(p));
});
it("rejects other development formats without converting them", () => {
  for (const version of [1, 3]) {
    const p = { ...fullAdder(), schemaVersion: version };
    const before = JSON.stringify(p);
    expect(() => validateProject(p)).toThrow("unsupportedVersion");
    expect(JSON.stringify(p)).toBe(before);
  }
});
it("requires current fields instead of constructing missing nets", () => {
  const p: any = fullAdder();
  delete p.circuits[p.root].nets;
  expect(() => validateProject(p)).toThrow("invalidProject");
});
it("route geometry and labels cannot change electrical connectivity", () => {
  const p = fullAdder(),
    c = p.circuits[p.root];
  c.wires = [];
  c.nets.forEach((n) => (n.name = "same label"));
  expect(runVectors(p, p.root, c.vectors).every((r) => r.passed)).toBe(true);
});
it("rejects an inherited root", () => {
  const p = fullAdder();
  p.root = "constructor";
  expect(() => parseProject(JSON.stringify(p))).toThrow("invalidProject");
});
