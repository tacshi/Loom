import { it, expect } from "vitest";
import { counterExample } from "../src/examples/sequential";
import { Engine } from "../src/simulator/engine";
import { Timeline } from "../src/simulator/timeline";
it("bounds event-only history and leaves an exact event restoration anchor", () => {
  const e = new Engine(counterExample()),
    t = new Timeline(e, 10000, 100000, 64);
  for (let i = 0; i < 5000; i++)
    t.input({ kind: "input", id: "Enable", value: i % 2 });
  const info = t.info();
  expect(info.bytes).toBeLessThanOrEqual(100000);
  expect(info.runs[0].oldest.eventOrder).toBeGreaterThan(0);
  t.seek(info.selected, info.runs[0].oldest);
  expect(e.eventOrder).toBe(info.runs[0].oldest.eventOrder);
});
