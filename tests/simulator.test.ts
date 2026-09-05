import { describe, it, expect } from "vitest";
import {
  emptyProject,
  createComponent,
  type Kind,
  type Project,
} from "../src/model/types";
import { Engine } from "../src/simulator/engine";
import {
  logic,
  signal,
  unknown,
  format,
  defined,
} from "../src/simulator/signal";
function fixture(kind: Kind, width = 1) {
  const p = emptyProject(),
    c = p.circuits[p.root],
    a = createComponent("input", 0, 0, width),
    b = createComponent("input", 0, 120, width),
    gate = createComponent(kind, 200, 0, width);
  a.id = "a";
  b.id = "b";
  gate.id = "g";
  c.components = [a, b, gate];
  c.wires = [
    {
      id: "wa",
      from: { component: "a", port: "out" },
      to: { component: "g", port: "a" },
      points: [],
    },
    {
      id: "wb",
      from: { component: "b", port: "out" },
      to: { component: "g", port: "b" },
      points: [],
    },
  ];
  return p;
}
describe("combinational kernel", () => {
  for (const kind of ["and", "or", "xor", "nand", "nor", "xnor"] as Kind[])
    it(kind + " truth table", () => {
      const e = new Engine(fixture(kind));
      for (let a = 0; a < 2; a++)
        for (let b = 0; b < 2; b++) {
          e.setInput("a", a);
          e.setInput("b", b);
          const expected =
            kind === "and"
              ? a & b
              : kind === "or"
                ? a | b
                : kind === "xor"
                  ? a ^ b
                  : kind === "nand"
                    ? 1 - (a & b)
                    : kind === "nor"
                      ? 1 - (a | b)
                      : 1 - (a ^ b);
          expect(e.get("g", "out").value).toBe(expected);
        }
    });
  it("resolves controlling bits with unknown inputs", () => {
    expect(format(logic("and", signal(0, 4), unknown(4)), 2)).toBe("0000");
    expect(format(logic("or", signal(15, 4), unknown(4)), 2)).toBe("1111");
    expect(defined(logic("xor", signal(0, 4), unknown(4)))).toBe(false);
  });
  it("supports 32-bit unsigned overflow", () => {
    const e = new Engine(fixture("adder", 32));
    e.setInput("a", 0xffffffff);
    e.setInput("b", 1);
    expect(e.get("g", "out").value).toBe(0);
    expect(e.get("g", "carry").value).toBe(1);
  });
  it("subtract carry means no borrow", () => {
    const e = new Engine(fixture("subtractor", 8));
    e.setInput("a", 0);
    e.setInput("b", 1);
    expect(e.get("g", "out").value).toBe(255);
    expect(e.get("g", "carry").value).toBe(0);
  });
  it("rejects cycles and multiple drivers", () => {
    const p = fixture("and");
    const c = p.circuits[p.root];
    c.wires.push({
      id: "loop",
      from: { component: "g", port: "out" },
      to: { component: "g", port: "a" },
      points: [],
    });
    const e = new Engine(p);
    expect(e.valid).toBe(false);
    expect(e.compiled.diagnostics.map((d) => d.code)).toEqual(
      expect.arrayContaining(["multipleDrivers", "combinationalLoop"]),
    );
  });
  it("reports undriven and mismatched widths", () => {
    const p = fixture("and");
    p.circuits[p.root].components[0].width = 8;
    p.circuits[p.root].wires.pop();
    expect(new Engine(p).compiled.diagnostics.map((d) => d.code)).toEqual(
      expect.arrayContaining(["widthMismatch", "undriven"]),
    );
  });
});
export function wire(p: Project, a: string, ap: string, b: string, bp: string) {
  p.circuits[p.root].wires.push({
    id: crypto.randomUUID(),
    from: { component: a, port: ap },
    to: { component: b, port: bp },
    points: [],
  });
}
it("rejects excessive memory before allocating storage", () => {
  const p = emptyProject(),
    c = p.circuits[p.root];
  for (let i = 0; i < 17; i++) {
    const ram = createComponent("ram", 0, 0, 8);
    ram.params.addressBits = 16;
    c.components.push(ram);
  }
  const e = new Engine(p);
  expect(e.valid).toBe(false);
  expect(e.memory.size).toBe(0);
  expect(e.compiled.diagnostics.some((d) => d.code === "memoryLimit")).toBe(
    true,
  );
});
