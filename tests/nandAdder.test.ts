import { it, expect } from "vitest";
import { nandAdder } from "../src/cpu/nandAdder";
import { cpuProject } from "../src/cpu/referenceCircuit";
import { Engine, runVectors } from "../src/simulator/engine";
import { emptyProject } from "../src/model/types";
it("NAND arithmetic agrees with unsigned addition across widths and carries", () => {
  for (const width of [1, 4, 8, 16, 32]) {
    const def = nandAdder(width),
      p = emptyProject();
    p.root = def.id;
    p.circuits = { [def.id]: def };
    const e = new Engine(p);
    expect(e.valid).toBe(true);
    expect(
      runVectors(p, p.root, def.vectors).every((result) => result.passed),
    ).toBe(true);
    const max = width === 32 ? 0xffffffff : 2 ** width - 1;
    let seed = 1031;
    for (let i = 0; i < 64; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const a = seed & max;
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const b = seed & max;
      e.setInput("a", a >>> 0);
      e.setInput("b", b >>> 0);
      const result = (a >>> 0) + (b >>> 0);
      expect(e.get("out", "in").value).toBe((result & max) >>> 0);
      expect(e.get("carry", "in").value).toBe(Number(result > max));
    }
  }
});
it("replacing the CPU adder with a NAND circuit preserves output 55", () => {
  const p = cpuProject(),
    alu =
      p.circuits[
        p.circuits[p.root].components.find((c) => c.id === "ALU")!.definitionId!
      ];
  const def = nandAdder(8);
  p.circuits[def.id] = def;
  const add = alu.components.find((c) => c.id === "ADD")!;
  add.kind = "instance";
  add.definitionId = def.id;
  const e = new Engine(p);
  expect(e.compiled.diagnostics).toEqual([]);
  for (let i = 0; i < 300 && !e.get("Halt", "q").value; i++) e.step();
  expect(e.get("Halt", "q").value).toBe(1);
  expect(e.get("Output", "q").value).toBe(55);
});
