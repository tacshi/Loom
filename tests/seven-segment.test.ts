import { expect, it } from "vitest";
import { Builder } from "../src/examples/adder";
import { Engine } from "../src/simulator/engine";
import { parseProject } from "../src/persistence/validation";
import { exportProject } from "../src/persistence/serialization";
import { signal, floating } from "../src/simulator/signal";

it("round trips a wired digit and follows individual inputs without clocking", () => {
  const b = new Builder("Digit");
  b.add("Digit", "sevenSegment", 280, 0);
  const pins = ["a", "b", "c", "d", "e", "f", "g", "dp"];
  pins.forEach((pin, i) => {
    b.add(pin, "input", 0, i * 100);
    b.connect(pin, "out", "Digit", pin);
  });
  const project = parseProject(exportProject(b.p));
  const e = new Engine(project);
  expect(e.valid).toBe(true);
  for (const selected of pins) {
    e.setInput(selected, 1);
    for (const pin of pins)
      expect(e.snapshot().values["Digit:" + pin]).toEqual(
        signal(pin === selected ? 1 : 0, 1),
      );
    e.setInput(selected, 0);
  }
  expect(e.cycle).toBe(0);
});

it("retains floating segment inputs instead of treating them as off", () => {
  const b = new Builder("Unconnected digit");
  b.add("Digit", "sevenSegment", 0, 0);
  const e = new Engine(b.p);
  expect(e.valid).toBe(true);
  expect(e.snapshot().values["Digit:a"]).toEqual(floating(1));
  expect(e.snapshot().values["Digit:dp"]).toEqual(floating(1));
});
