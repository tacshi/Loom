import { it, expect } from "vitest";
import { createComponent } from "../src/model/types";
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

it("rejects unsafe optional metadata and incomplete ROM images without changing them", () => {
  const p = fullAdder();
  for (const field of ["assembledSource", "checkpoint"] as const)
    expect(() => validateProject({ ...p, [field]: 42 })).toThrow("invalidProject");
  const rom = createComponent("rom", 0, 0, 8);
  rom.image = [];
  rom.image[1] = 42;
  p.circuits[p.root].components.push(rom);
  expect(() => validateProject(p)).toThrow("invalidProject");
  expect(0 in rom.image).toBe(false);
});

it("rejects missing and recursive definitions before opening the project", () => {
  const p = fullAdder();
  const instance = createComponent("instance", 0, 0);
  p.circuits[p.root].components.push(instance);
  for (const id of ["missing", p.root]) {
    instance.definitionId = id;
    const before = JSON.stringify(p);
    expect(() => parseProject(before)).toThrow("invalidProject");
    expect(JSON.stringify(p)).toBe(before);
  }
});
