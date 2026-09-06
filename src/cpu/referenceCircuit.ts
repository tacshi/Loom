import generatedLayouts from "./generatedLayouts.json";
import { Builder } from "../examples/adder";
import { assemble, sumSource } from "./assembler";
import { route, protectTerminals, orthogonal } from "../editor/routing";
import { pinPosition } from "../model/components";
import type { Kind, Circuit, Project } from "../model/types";
type Pin = readonly [string, string];
export class LogicBuilder extends Builder {
  serial = 0;
  finish(): Circuit {
    const layouts = generatedLayouts as Record<
      string,
      Record<string, { x: number; y: number }[]>
    >;
    const layout = layouts[this.c.name];
    for (const wire of this.c.wires) {
      const points = layout?.[JSON.stringify([wire.from, wire.to])];
      // New/changed connections retain Builder geometry until layouts are regenerated.
      if (points) wire.points = structuredClone(points);
    }
    return this.c;
  }
  node(id: string, kind: Kind, width = 1): Pin {
    const n = this.serial++;
    this.add(id, kind, 240 + (n % 6) * 360, Math.floor(n / 6) * 360, width);
    return [id, ["register", "counter", "dff"].includes(kind) ? "q" : "out"];
  }
  constant(id: string, width: number, value: number): Pin {
    const p = this.node(id, "constant", width);
    this.c.components.find((c) => c.id === id)!.params.value = value;
    return p;
  }
  input(id: string, width = 1): Pin {
    const p = this.node(id, "portIn", width);
    this.c.ports.push({
      id,
      name: id,
      direction: "in",
      width,
      componentId: id,
    });
    return p;
  }
  output(id: string, value: Pin, width = 1) {
    this.node(id, "portOut", width);
    this.connect(value[0], value[1], id, "in");
    this.c.ports.push({
      id,
      name: id,
      direction: "out",
      width,
      componentId: id,
    });
  }
  unary(id: string, op: Kind, a: Pin, width = 1): Pin {
    const p = this.node(id, op, width);
    this.connect(a[0], a[1], id, "a");
    return p;
  }
  binary(id: string, op: Kind, a: Pin, b: Pin, width = 1): Pin {
    const p = this.node(id, op, width);
    this.connect(a[0], a[1], id, "a");
    this.connect(b[0], b[1], id, "b");
    return p;
  }
  mux(id: string, a: Pin, b: Pin, select: Pin, width = 8): Pin {
    const p = this.node(id, "mux", width);
    this.connect(a[0], a[1], id, "a");
    this.connect(b[0], b[1], id, "b");
    this.connect(select[0], select[1], id, "sel");
    return p;
  }
  any(id: string, items: Pin[]): Pin {
    return items
      .slice(1)
      .reduce((a, b, i) => this.binary(id + i, "or", a, b), items[0]);
  }
  equal(id: string, a: Pin, n: number, width = 8): Pin {
    const constant = this.constant(id + " constant", width, n);
    this.binary(id, "compare", a, constant, width);
    return [id, "eq"];
  }
}
function arithmetic(): Circuit {
  const b = new LogicBuilder("Arithmetic unit");
  b.c.name = b.p.name;
  const a = b.input("a", 8),
    data = b.input("data", 8),
    immediate = b.input("immediate", 8),
    opcode = b.input("opcode", 8);
  const add = b.binary("ADD", "adder", a, data, 8),
    sub = b.binary("SUB", "subtractor", a, data, 8),
    and = b.binary("AND", "and", a, data, 8),
    or = b.binary("OR", "or", a, data, 8),
    xor = b.binary("XOR", "xor", a, data, 8);
  let result: Pin = a;
  const selectors = new Map<number, Pin>();
  for (const [op, value] of [
    [1, immediate],
    [2, data],
    [4, add],
    [5, sub],
    [6, and],
    [7, or],
    [8, xor],
  ] as const) {
    const select = b.equal("Select " + op, opcode, op);
    selectors.set(op, select);
    result = b.mux("Result " + op, result, value, select);
  }
  const carry = b.mux(
      "Carry",
      ["ADD", "carry"],
      ["SUB", "carry"],
      selectors.get(5)!,
      1,
    ),
    zero = b.equal("Zero", result, 0);
  b.output("result", result, 8);
  b.output("carry", carry);
  b.output("zero", zero);
  return b.finish();
}
function control(): Circuit {
  const b = new LogicBuilder("Instruction control");
  b.c.name = b.p.name;
  const opcode = b.input("opcode", 8),
    z = b.input("zero"),
    c = b.input("carry"),
    phase = b.input("phase"),
    halt = b.input("halt");
  const active = b.unary("Active", "not", halt),
    notPhase = b.unary("Not phase", "not", phase),
    fetch = b.binary("Fetch", "and", notPhase, active),
    execute = b.binary("Execute", "and", phase, active);
  const decode = Array.from({ length: 14 }, (_, i) =>
    b.equal("Decode " + i, opcode, i),
  );
  const valid = b.any("Valid", decode),
    invalid = b.unary("Invalid opcode", "not", valid),
    load = b.any("Load", [
      decode[1],
      decode[2],
      decode[4],
      decode[5],
      decode[6],
      decode[7],
      decode[8],
    ]),
    loadEn = b.binary("Load enable", "and", execute, load),
    math = b.any("Math", [decode[4], decode[5]]),
    carryEn = b.binary("Carry enable", "and", execute, math),
    write = b.binary("Write", "and", execute, decode[3]),
    stop = b.any("Stop", [decode[13], invalid]),
    haltEn = b.binary("Halt enable", "and", execute, stop),
    out = b.binary("Output enable", "and", execute, decode[12]);
  const jz = b.binary("Zero jump", "and", decode[10], z),
    jc = b.binary("Carry jump", "and", decode[11], c),
    condition = b.any("Jump", [decode[9], jz, jc]),
    jump = b.binary("Take jump", "and", execute, condition);
  b.node("Control bits", "join", 8);
  [fetch, execute, loadEn, carryEn, write, haltEn, out, jump].forEach(
    (value, i) => b.connect(value[0], value[1], "Control bits", "b" + i),
  );
  b.output("control", ["Control bits", "out"], 8);
  b.output("active", active);
  b.output("invalid", invalid);
  return b.finish();
}
function fields(): Circuit {
  const b = new LogicBuilder("Instruction fields");
  b.c.name = b.p.name;
  const input = b.input("instruction", 16);
  b.node("Bits", "split", 16);
  b.connect(input[0], input[1], "Bits", "in");
  for (const id of ["Opcode", "Operand"]) b.node(id, "join", 8);
  for (let i = 0; i < 8; i++) {
    b.connect("Bits", "b" + i, "Operand", "b" + i);
    b.connect("Bits", "b" + (i + 8), "Opcode", "b" + i);
  }
  b.output("opcode", ["Opcode", "out"], 8);
  b.output("operand", ["Operand", "out"], 8);
  return b.finish();
}
export function cpuProject(): Project {
  const b = new Builder("Loom 8 · CPU"),
    alu = arithmetic(),
    ctrl = control(),
    field = fields();
  for (const def of [alu, ctrl, field]) b.p.circuits[def.id] = def;
  function instance(id: string, def: Circuit, x: number, y: number) {
    b.add(id, "instance", x, y);
    b.c.components.find((c) => c.id === id)!.definitionId = def.id;
  }
  for (const [id, width, x, y] of [
    ["PC", 8, 0, 0],
    ["IR", 16, 480, 0],
    ["ACC", 8, 1320, 0],
    ["Z", 1, 1320, 240],
    ["C", 1, 1320, 380],
    ["Phase", 1, 0, 460],
    ["Halt", 1, 0, 660],
    ["Output", 8, 1560, 0],
  ] as const)
    b.add(id, "register", x, y, width);
  b.add("Program", "rom", 240, 0, 16);
  b.add("RAM", "ram", 840, 240, 8);
  instance("Fields", field, 720, 0);
  instance("ALU", alu, 1080, 0);
  instance("Control", ctrl, 480, 460);
  b.add("Signals", "split", 740, 460, 8);
  b.add("LOW", "constant", 0, 860);
  b.add("HIGH", "constant", 240, 860, 1, 1);
  b.add("ONE8", "constant", 0, 200, 8, 1);
  b.add("Increment", "adder", 240, 200, 8);
  b.add("NextPC", "mux", 0, 320, 8);
  b.add("PC enable", "or", 240, 340);
  b.add("Next phase", "not", 240, 560);
  for (const id of ["PC", "IR", "ACC", "Z", "C", "Phase", "Halt", "Output"])
    b.connect("LOW", "out", id, "rst");
  const connect = (a: string, ap: string, to: string, tp: string) =>
    b.connect(a, ap, to, tp);
  const sig = (i: number, to: string, tp: string) =>
    connect("Signals", "b" + i, to, tp);
  connect("PC", "q", "Program", "addr");
  connect("Program", "out", "IR", "d");
  connect("IR", "q", "Fields", "instruction");
  connect("Fields", "opcode", "Control", "opcode");
  connect("Fields", "opcode", "ALU", "opcode");
  connect("Fields", "operand", "RAM", "addr");
  connect("Fields", "operand", "ALU", "immediate");
  connect("Fields", "operand", "NextPC", "b");
  connect("ACC", "q", "ALU", "a");
  connect("ACC", "q", "RAM", "data");
  connect("RAM", "out", "ALU", "data");
  connect("ALU", "result", "ACC", "d");
  connect("ALU", "zero", "Z", "d");
  connect("ALU", "carry", "C", "d");
  connect("Z", "q", "Control", "zero");
  connect("C", "q", "Control", "carry");
  connect("Phase", "q", "Control", "phase");
  connect("Halt", "q", "Control", "halt");
  connect("Control", "control", "Signals", "in");
  sig(0, "IR", "en");
  sig(0, "PC enable", "a");
  sig(2, "ACC", "en");
  sig(2, "Z", "en");
  sig(3, "C", "en");
  sig(4, "RAM", "we");
  sig(5, "Halt", "en");
  sig(6, "Output", "en");
  sig(7, "NextPC", "sel");
  sig(7, "PC enable", "b");
  connect("PC enable", "out", "PC", "en");
  connect("PC", "q", "Increment", "a");
  connect("ONE8", "out", "Increment", "b");
  connect("Increment", "out", "NextPC", "a");
  connect("NextPC", "out", "PC", "d");
  connect("HIGH", "out", "Halt", "d");
  connect("ACC", "q", "Output", "d");
  connect("Phase", "q", "Next phase", "a");
  connect("Next phase", "out", "Phase", "d");
  connect("Control", "active", "Phase", "en");
  b.p.cpu = {
    pc: "PC",
    ir: "IR",
    accumulator: "ACC",
    zero: "Z",
    carry: "C",
    phase: "Phase",
    halt: "Halt",
    output: "Output",
    rom: "Program",
    ram: "RAM",
    invalid: "Control/Invalid opcode",
  };
  b.p.source = sumSource;
  b.p.assembledSource = sumSource;
  const assembled = assemble(sumSource);
  b.p.sourceMap = assembled.sourceMap;
  b.c.components.find((c) => c.id === "Program")!.image = assembled.image;
  // Layout remains ordinary persisted wire geometry; no CPU-specific drawing code.
  for (const w of b.c.wires) w.points = [];
  for (const w of b.c.wires) {
    try {
      w.points = route(b.c, b.p, w.from, w.to);
    } catch {
      w.points = protectTerminals(
        orthogonal(
          pinPosition(
            b.c.components.find((c) => c.id === w.from.component)!,
            w.from.port,
            b.p,
          ),
          pinPosition(
            b.c.components.find((c) => c.id === w.to.component)!,
            w.to.port,
            b.p,
          ),
        ),
      );
    }
  }
  b.c.vectors = [
    {
      name: "Fetch and execute LDI",
      inputs: {},
      cycles: 2,
      outputs: { "ACC:q": 0, "PC:q": 1 },
    },
    {
      name: "Sum 1–10",
      inputs: {},
      cycles: 198,
      outputs: { "Output:q": 55, "Halt:q": 1 },
    },
  ];
  return b.p;
}
