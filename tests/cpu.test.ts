import { describe, it, expect } from "vitest";
import { cpuProject } from "../src/cpu/referenceCircuit";
import { assemble, programs } from "../src/cpu/assembler";
import { Engine } from "../src/simulator/engine";
function load(source: string) {
  const p = cpuProject();
  p.circuits[p.root].components.find((c) => c.id === "Program")!.image =
    assemble(source).image;
  return new Engine(p);
}
// Independent instruction-level oracle. This file is never imported by application code.
class Oracle {
  a = 0;
  pc = 0;
  z = 0;
  c = 0;
  out = 0;
  halt = false;
  ram = new Uint8Array(256);
  constructor(public rom: number[]) {}
  step() {
    const word = this.rom[this.pc] ?? 0,
      op = word >>> 8,
      n = word & 255;
    this.pc = (this.pc + 1) & 255;
    const old = this.a;
    switch (op) {
      case 0:
        break;
      case 1:
        this.a = n;
        break;
      case 2:
        this.a = this.ram[n];
        break;
      case 3:
        this.ram[n] = this.a;
        break;
      case 4:
        this.a = (old + this.ram[n]) & 255;
        this.c = Number(old + this.ram[n] > 255);
        break;
      case 5:
        this.a = (old - this.ram[n]) & 255;
        this.c = Number(old >= this.ram[n]);
        break;
      case 6:
        this.a &= this.ram[n];
        break;
      case 7:
        this.a |= this.ram[n];
        break;
      case 8:
        this.a ^= this.ram[n];
        break;
      case 9:
        this.pc = n;
        break;
      case 10:
        if (this.z) this.pc = n;
        break;
      case 11:
        if (this.c) this.pc = n;
        break;
      case 12:
        this.out = this.a;
        break;
      default:
        this.halt = true;
    }
    if ([1, 2, 4, 5, 6, 7, 8].includes(op)) this.z = Number(this.a === 0);
  }
}
describe("circuit CPU", () => {
  it("runs sum to 55 and matches the independent oracle at every instruction", () => {
    const e = load(programs.sum);
    expect(e.compiled.diagnostics).toEqual([]);
    const oracle = new Oracle(assemble(programs.sum).image);
    let instructions = 0;
    while (!oracle.halt && instructions++ < 200) {
      e.step();
      e.step();
      oracle.step();
      for (const [id, value] of [
        ["ACC", oracle.a],
        ["PC", oracle.pc],
        ["Z", oracle.z],
        ["C", oracle.c],
        ["Output", oracle.out],
      ] as const)
        expect(e.get(id, "q").value, id).toBe(value);
      expect(e.snapshot(["RAM"]).memory.RAM).toEqual([...oracle.ram]);
    }
    expect(oracle.halt).toBe(true);
    expect(e.get("Output", "q").value).toBe(55);
    expect(e.get("Halt", "q").value).toBe(1);
  });
  it("covers all arithmetic, logic, carry and conditional branch instructions", () => {
    const source =
      "LDI 250\nSTA 0\nLDI 10\nADD 0\nJC carry\nHLT\ncarry: SUB 0\nAND 0\nOR 0\nXOR 0\nJZ done\nHLT\ndone: NOP\nOUT\nHLT";
    const e = load(source),
      ref = new Oracle(assemble(source).image);
    for (let i = 0; i < 20 && !ref.halt; i++) {
      e.step();
      e.step();
      ref.step();
      expect(e.get("ACC", "q").value).toBe(ref.a);
      expect(e.get("PC", "q").value).toBe(ref.pc);
      expect(e.get("C", "q").value).toBe(ref.c);
      expect(e.get("Z", "q").value).toBe(ref.z);
    }
    expect(ref.halt).toBe(true);
  });
  it("changing ADD to subtraction changes program execution", () => {
    const p = cpuProject();
    Object.values(p.circuits)
      .flatMap((c) => c.components)
      .find((c) => c.id === "ADD")!.kind = "subtractor";
    const e = new Engine(p);
    for (let i = 0; i < 400 && !e.get("Halt", "q").value; i++) e.step();
    expect(e.get("Output", "q").value).not.toBe(55);
  });
  it("unassigned opcodes halt through the invalid-instruction circuit", () => {
    const e = load("NOP");
    e.memory.get("Program")![0] = { value: 0xff00, width: 16, known: 65535 };
    e.settle();
    e.step();
    e.step();
    expect(e.get("Halt", "q").value).toBe(1);
    expect(e.get(e.project.cpu!.invalid, "out").value).toBe(1);
  });
});
it("assembler handles labels and rejects malformed instructions", () => {
  expect(assemble("loop: LDI 0xff\nJMP loop").image).toEqual([0x01ff, 0x0900]);
  for (const source of [
    "LDI 256",
    "JMP missing",
    "bad: NOP\nbad: HLT",
    "HLT 1",
    "WAT",
  ])
    expect(assemble(source).errors.length).toBeGreaterThan(0);
});
