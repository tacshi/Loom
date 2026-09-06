import { it, expect } from "vitest";
import { counterExample as counter } from "../src/examples/sequential";
import { Engine } from "../src/simulator/engine";
import { Timeline } from "../src/simulator/timeline";
import { stateHash } from "../src/simulator/state";
it("restores and branches without changing the old run", () => {
  const e = new Engine(counter()),
    t = new Timeline(e);
  for (let i = 0; i < 200; i++) t.step();
  const head = stateHash(e.capture()),
    run = t.info().selected;
  t.seek(run, { cycle: 90, eventOrder: 0 });
  expect(e.cycle).toBe(90);
  t.seek(run, { cycle: 200, eventOrder: 0 });
  expect(stateHash(e.capture())).toBe(head);
  t.seek(run, { cycle: 90, eventOrder: 0 });
  t.step();
  expect(t.info().runs).toHaveLength(2);
  expect(e.cycle).toBe(91);
  t.seek(run, { cycle: 200, eventOrder: 0 });
  expect(stateHash(e.capture())).toBe(head);
});
it("replays multiple events at one cycle in order", () => {
  const e = new Engine(counter()),
    t = new Timeline(e),
    id = e.compiled.components.find((c) => c.kind === "input")!.id;
  const run = t.info().selected;
  t.input({ kind: "input", id, value: 1 });
  const first = stateHash(e.capture());
  t.input({ kind: "input", id, value: 0 });
  const second = stateHash(e.capture());
  t.step();
  t.seek(run, { cycle: 0, eventOrder: 1 });
  expect(stateHash(e.capture())).toBe(first);
  t.seek(run, { cycle: 0, eventOrder: 2 });
  expect(stateHash(e.capture())).toBe(second);
});
it("evicts whole segments while retaining a usable anchor and bounded runs", () => {
  const e = new Engine(counter()),
    t = new Timeline(e, 128, 100000, 16);
  for (let i = 0; i < 512; i++) t.step();
  const info = t.info();
  expect(info.runs[0].oldest.cycle).toBeGreaterThan(0);
  t.seek(info.selected, info.runs[0].oldest);
  for (let i = 0; i < 8; i++) {
    t.step();
    t.back();
  }
  expect(t.info().runs.length).toBeLessThanOrEqual(4);
  expect(t.info().bytes).toBeLessThan(100000);
});
