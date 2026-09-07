import { it, expect } from "vitest";
import { shiftRegister, priorityEncoder } from "../src/examples/components";
import { Engine } from "../src/simulator/engine";
import { parseProject } from "../src/persistence/validation";
import { exportProject } from "../src/persistence/serialization";
it("shift register loads, shifts, holds, resets and restores state", () => {
  const p = shiftRegister(),
    e = new Engine(parseProject(exportProject(p)));
  expect(e.valid).toBe(true);
  e.setInput("parallelIn", 0x81);
  e.setInput("load", 1);
  e.setInput("shift", 1);
  e.step();
  expect(e.get("q", "in").value).toBe(0x81);
  expect(e.get("serialOut", "in").value).toBe(1);
  e.setInput("load", 0);
  e.setInput("serialIn", 1);
  const saved = e.capture();
  for (let i = 0; i < 8; i++) {
    e.step();
    expect(e.get("q", "in").value).toBe(
      ((0x81 << (i + 1)) | (2 ** (i + 1) - 1)) & 255,
    );
  }
  e.setInput("shift", 0);
  e.step();
  expect(e.get("q", "in").value).toBe(255);
  e.setInput("load", 1);
  e.setInput("rst", 1);
  e.step();
  expect(e.get("q", "in").value).toBe(0);
  e.restore(saved);
  expect(e.get("q", "in").value).toBe(0x81);
}, 15000);

it("priority encoder checks every request byte and preserves highest priority", () => {
  const p = priorityEncoder(),
    e = new Engine(parseProject(exportProject(p)));
  expect(e.valid).toBe(true);
  for (let value = 0; value < 256; value++) {
    e.setInput("requests", value);
    expect(e.get("valid", "in").value).toBe(Number(value !== 0));
    expect(e.get("index", "in").value).toBe(
      value ? Math.floor(Math.log2(value)) : 0,
    );
  }
}, 15000);
