import { it, expect } from "vitest";
import { assemble } from "../src/cpu/assembler";
import { calculatorSource, calculatorProject } from "../src/cpu/calculator";
import { Engine } from "../src/simulator/engine";
import { runCase } from "../src/verification/runner";
it("fits ROM and performs the acceptance calculations on the editable CPU", () => {
  const a = assemble(calculatorSource);
  expect(a.errors).toEqual([]);
  expect(a.image.length).toBeLessThanOrEqual(256);
  const p = calculatorProject();
  expect(runCase(p, p.root, p.circuits[p.root].tests[0]).status).toBe("passed");
});
it("handles zero, carries, signs, invalid input and recovery in software", () => {
  const e = new Engine(calculatorProject());
  const expressions = [
    "0+0",
    "255-255",
    "100+156",
    "5-10",
    "255+0",
    "256+0",
    "12x3",
    "1++2",
    "3+4",
  ];
  e.enqueue("RAM/Keyboard", expressions.join("\n") + "\n");
  for (let i = 0; i < 12000; i++) e.step();
  const d = e.devices.get("RAM/Terminal");
  expect(
    d?.kind === "terminal" && new TextDecoder().decode(new Uint8Array(d.bytes)),
  ).toBe("0\n0\n256\n-5\n255\n?\n?\n?\n7\n");
});
