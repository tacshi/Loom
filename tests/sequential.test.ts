import { it, expect } from "vitest";
import { Engine, runVectors } from "../src/simulator/engine";
import { counterExample, swapExample } from "../src/examples/sequential";
import { Builder } from "../src/examples/adder";
import { extract } from "../src/model/hierarchy";
it("simultaneous registers exchange old state, independent of evaluation order", () => {
  const p = swapExample();
  expect(
    runVectors(p, p.root, p.circuits[p.root].vectors).every((v) => v.passed),
  ).toBe(true);
  p.circuits[p.root].components.reverse();
  expect(
    runVectors(p, p.root, p.circuits[p.root].vectors).every((v) => v.passed),
  ).toBe(true);
});
it("counter holds, resets and wraps", () => {
  const p = counterExample();
  expect(
    runVectors(p, p.root, p.circuits[p.root].vectors).every((v) => v.passed),
  ).toBe(true);
});
it("RAM samples old data then exposes committed writes", () => {
  const b = new Builder("RAM");
  for (const [id, value] of [
    ["addr", 2],
    ["data", 71],
    ["we", 1],
  ] as const)
    b.add(id, "input", 0, 0, id === "we" ? 1 : 8, value);
  b.add("ram", "ram", 0, 0, 8);
  for (const id of ["addr", "data", "we"]) b.connect(id, "out", "ram", id);
  const e = new Engine(b.p);
  expect(e.get("ram", "out").value).toBe(0);
  e.step();
  expect(e.get("ram", "out").value).toBe(71);
  e.setInput("data", 33);
  e.setInput("we", 0);
  e.step();
  expect(e.get("ram", "out").value).toBe(71);
  e.reset();
  expect(e.get("ram", "out").value).toBe(0);
});
it("packaged register instances hold independent state", () => {
  const p = swapExample(),
    c = p.circuits[p.root];
  extract(p, c.id, ["A"], "Register A");
  extract(p, c.id, ["B"], "Register B");
  const e = new Engine(p);
  expect(e.compiled.diagnostics).toEqual([]);
  e.step();
  const values = [...e.state.values()].map((v) => v.value).sort();
  expect(values).toEqual([3, 9]);
  e.step();
  expect([...e.state.values()].map((v) => v.value).sort()).toEqual([3, 9]);
});
