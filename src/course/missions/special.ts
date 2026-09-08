import { exercise } from "../referenceExercises";
import { GateBuilder } from "../logic";
import { layoutMission } from "./layout";
import { removeRouteConnection, ref } from "../../model/nets";
import type { Project, TestCase } from "../../model/types";
import { stateTasks } from "./sequential";
import { logicTasks } from "./combinational";
export type Factory = {
  reference: () => Project;
  starter: () => Project;
  checks: () => TestCase[];
};
export const specialTasks: Record<string, Factory> = {};
for (const [id, concept] of [
  ["core-18", "seven-segment"],
  ["core-43", "pc-fields"],
  ["core-45", "control"],
  ["core-48", "cpu"],
  ["core-55", "io"],
  ["project-29", "control"],
  ["project-30", "cpu"],
] as const) {
  const spec = exercise(concept);
  specialTasks[id] = {
    reference: spec.reference,
    checks: spec.checks,
    starter: () => {
      if (!id.startsWith("project")) return spec.starter();
      const p = spec.reference(),
        c = p.circuits[p.root];
      const wire =
        id === "project-30"
          ? c.wires.find((w) => w.to.component === "ACC" && w.to.port === "en")
          : c.wires.find((w) => w.to.component === "control");
      if (!wire) throw new Error(`Repair boundary missing for ${id}`);
      removeRouteConnection(c, wire.id);
      return p;
    },
  };
}
const lookup = [0, 1, 1, 2, 3, 5, 8, 13];
specialTasks["core-39"] = {
  reference: () => {
    const b = new GateBuilder("ROM lookup"),
      address = b.input("address", 3),
      rom = b.node("rom", 8, "table");
    Object.assign(b.c.components.at(-1)!, {
      params: { addressBits: 3 },
      image: lookup,
    });
    b.connect(...address, rom[0], "addr");
    b.output("out", rom, 8);
    return layoutMission(b.p);
  },
  starter: () => {
    const p = specialTasks["core-39"].reference(),
      c = p.circuits[p.root];
    c.wires = [];
    c.nets = [];
    return p;
  },
  checks: () =>
    lookup.map((value, address) => ({
      id: `lookup-${address}`,
      name: `Address ${address}`,
      seed: 1,
      maxCycles: 0,
      steps: [
        {
          cycles: 0,
          inputs: [{ ref: ref("address", "out"), value: address }],
          assertions: [{ type: "signal", ref: ref("out", "in"), value }],
        },
      ],
    })),
};
specialTasks["core-40"] = {
  reference: () => {
    const b = new GateBuilder("Shared bus"),
      a = b.input("a", 8),
      c = b.input("b", 8),
      ea = b.input("enableA"),
      eb = b.input("enableB"),
      ta = b.node("triState", 8, "driverA"),
      tb = b.node("triState", 8, "driverB");
    b.connect(...a, ta[0], "data");
    b.connect(...ea, ta[0], "enable");
    b.connect(...c, tb[0], "data");
    b.connect(...eb, tb[0], "enable");
    b.output("out", ta, 8);
    b.connect(...tb, "out", "in");
    return layoutMission(b.p);
  },
  starter: () => {
    const p = specialTasks["core-40"].reference(),
      c = p.circuits[p.root];
    c.wires = [];
    c.nets = [];
    return p;
  },
  checks: () =>
    [0, 1, 2, 3].map((mode) => ({
      id: `bus-${mode}`,
      name: `Enable ${mode}`,
      seed: 1,
      maxCycles: 0,
      steps: [
        {
          cycles: 0,
          inputs: Object.entries({
            a: 85,
            b: 170,
            enableA: mode & 1,
            enableB: mode >>> 1,
          }).map(([id, value]) => ({ ref: ref(id, "out"), value })),
          assertions: [
            {
              type: "signal",
              ref: ref("out", "in"),
              value: mode === 1 ? 85 : mode === 2 ? 170 : 0,
              ...(mode === 0
                ? { highZ: 255, known: 0 }
                : mode === 3
                  ? { known: 0 }
                  : {}),
            },
          ],
        },
      ],
    })),
};
stateTasks["core-44"] = {
  inputs: { address: 2, load: 1, rst: 1 },
  outputs: { instruction: 16 },
  initial: { q: 0 },
  supplied: ["program", "instructionRegister"],
  actions: [
    { input: { address: 0, load: 1, rst: 0 }, cycles: 1 },
    { input: { address: 1, load: 0, rst: 0 }, cycles: 1 },
    { input: { address: 2, load: 1, rst: 0 }, cycles: 1 },
    { input: { address: 3, load: 1, rst: 0 }, cycles: 1 },
    { input: { address: 0, load: 0, rst: 1 }, cycles: 1 },
  ],
  transition: (s, i) => ({
    q: i.rst ? 0 : i.load ? [0x012a, 0x0c00, 0x0d00, 0][i.address] : s.q,
  }),
  observe: (s) => ({ instruction: s.q }),
  build: (b, { address, load, rst }) => {
    const rom = b.node("rom", 16, "program");
    Object.assign(b.c.components.at(-1)!, {
      params: { addressBits: 2 },
      image: [0x012a, 0x0c00, 0x0d00, 0],
    });
    const r = b.node("register", 16, "instructionRegister");
    b.connect(...address, rom[0], "addr");
    b.connect(...rom, r[0], "d");
    b.connect(...load, r[0], "en");
    b.connect(...rst, r[0], "rst");
    return { instruction: [r[0], "q"] };
  },
};
stateTasks["core-46"] = {
  inputs: { data: 8, address: 2, command: 2, rst: 1 },
  outputs: { q: 8, memory: 8 },
  initial: { q: 0, m0: 0, m1: 0, m2: 0, m3: 0 },
  supplied: ["storage", "ram"],
  actions: [
    { input: { data: 42, address: 0, command: 0, rst: 0 }, cycles: 1 },
    { input: { data: 99, address: 1, command: 1, rst: 0 }, cycles: 1 },
    { input: { data: 7, address: 1, command: 2, rst: 0 }, cycles: 1 },
    { input: { data: 88, address: 1, command: 3, rst: 0 }, cycles: 1 },
    { input: { data: 0, address: 1, command: 3, rst: 1 }, cycles: 1 },
  ],
  transition: (s, i) => ({
    ...s,
    q: i.rst
      ? 0
      : i.command === 0
        ? i.data
        : i.command === 2
          ? s["m" + i.address]
          : s.q,
    ...(i.command === 1 && !i.rst ? { ["m" + i.address]: s.q } : {}),
  }),
  observe: (s, i) => ({ q: s.q, memory: s["m" + i.address] }),
  build: (b, { data, address, command, rst }) => {
    const reg = b.node("register", 8, "storage"),
      ram = b.node("ram", 8, "ram");
    b.c.components.at(-1)!.params.addressBits = 2;
    const bits = b.bits(command, 2);
    b.connect(...b.mux(data, ram, bits[1], 8), reg[0], "d");
    b.connect(...b.not(bits[0]), reg[0], "en");
    b.connect(...rst, reg[0], "rst");
    b.connect(...address, ram[0], "addr");
    b.connect(reg[0], "q", ram[0], "data");
    b.connect(
      ...b.and(b.and(bits[0], b.not(bits[1])), b.not(rst)),
      ram[0],
      "we",
    );
    return { q: [reg[0], "q"], memory: ram };
  },
};
logicTasks["core-47"] = {
  inputs: { opcode: 8, zero: 1, carry: 1 },
  outputs: { jump: 1 },
  build: (b, { opcode, zero, carry }) => {
    const bits = b.bits(opcode, 8),
      is = (n: number) =>
        bits
          .map((p, i) => (n & (1 << i) ? p : b.not(p)))
          .reduce((a, c) => b.and(a, c));
    return {
      jump: b.or(is(9), b.or(b.and(is(10), zero), b.and(is(11), carry))),
    };
  },
  expected: ({ opcode, zero, carry }) => ({
    jump: Number(
      opcode === 9 || (opcode === 10 && !!zero) || (opcode === 11 && !!carry),
    ),
  }),
};
stateTasks["project-31"] = {
  inputs: { address: 8, rst: 1 },
  outputs: { out: 8 },
  initial: { q: 0 },
  supplied: ["storage"],
  actions: Array.from({ length: 12 }, (_, i) => ({
    input: { address: i % 3 === 0 ? 247 : 248, rst: Number(i === 6) },
    cycles: 1,
  })),
  transition: (s, i) => ({ q: i.rst ? 0 : (s.q + 1) & 255 }),
  observe: (s, i) => ({ out: i.address === 248 ? s.q : 0 }),
  build: (b, { address, rst }) => {
    const r = b.node("register", 8, "storage"),
      bits = b.bits(address, 8),
      selected = bits
        .map((p, i) => (248 & (1 << i) ? p : b.not(p)))
        .reduce((a, c) => b.and(a, c));
    b.connect(...b.sumBus([r[0], "q"], b.constant(1, 8), 8).out, r[0], "d");
    b.connect(...b.constant(1), r[0], "en");
    b.connect(...rst, r[0], "rst");
    return { out: b.mux(b.constant(0, 8), [r[0], "q"], selected, 8) };
  },
};
const microcode = (
  opcode: number,
  zero: number,
  carry: number,
  phase: number,
  halt: number,
) => {
  const active = halt ^ 1,
    fetch = (phase ^ 1) & active,
    execute = phase & active,
    invalid = Number(opcode > 13);
  return {
    control:
      fetch |
      (execute << 1) |
      ((execute & Number([1, 2, 4, 5, 6, 7, 8].includes(opcode))) << 2) |
      ((execute & Number(opcode === 4 || opcode === 5)) << 3) |
      ((execute & Number(opcode === 3)) << 4) |
      ((execute & Number(opcode === 13 || !!invalid)) << 5) |
      ((execute & Number(opcode === 12)) << 6) |
      ((execute &
        Number(
          opcode === 9 ||
            (opcode === 10 && !!zero) ||
            (opcode === 11 && !!carry),
        )) <<
        7),
    active,
    invalid,
  };
};
specialTasks["project-32"] = {
  reference: () => {
    const b = new GateBuilder("Microcoded control"),
      op = b.input("opcode", 8),
      z = b.input("zero"),
      c = b.input("carry"),
      phase = b.input("phase"),
      halt = b.input("halt"),
      address = b.join([...b.bits(op, 8), z, c, phase, halt]),
      rom = b.node("rom", 10, "microcode");
    const image = Array.from({ length: 4096 }, (_, i) => {
      const v = microcode(
        i & 255,
        (i >>> 8) & 1,
        (i >>> 9) & 1,
        (i >>> 10) & 1,
        (i >>> 11) & 1,
      );
      return v.control | (v.active << 8) | (v.invalid << 9);
    });
    Object.assign(b.c.components.at(-1)!, {
      params: { addressBits: 12 },
      image,
    });
    b.connect(...address, rom[0], "addr");
    const result = b.bits(rom, 10);
    b.output("control", b.join(result.slice(0, 8)), 8);
    b.output("active", result[8]);
    b.output("invalid", result[9]);
    return layoutMission(b.p);
  },
  starter: () => {
    const p = specialTasks["project-32"].reference(),
      c = p.circuits[p.root];
    c.components.find((n) => n.id === "microcode")!.image = [];
    return p;
  },
  checks: () =>
    Array.from({ length: 256 }, (_, i) => i).flatMap((op) =>
      Array.from({ length: 16 }, (_, s) => {
        const i = {
            opcode: op,
            zero: s & 1,
            carry: (s >>> 1) & 1,
            phase: (s >>> 2) & 1,
            halt: (s >>> 3) & 1,
          },
          v = microcode(i.opcode, i.zero, i.carry, i.phase, i.halt);
        return {
          id: `control-${op}-${s}`,
          name: `Opcode ${op}, state ${s}`,
          seed: 1,
          maxCycles: 0,
          steps: [
            {
              cycles: 0,
              inputs: Object.entries(i).map(([id, value]) => ({
                ref: ref(id, "out"),
                value,
              })),
              assertions: Object.entries(v).map(([id, value]) => ({
                type: "signal" as const,
                ref: ref(id, "in"),
                value,
              })),
            },
          ],
        };
      }),
    ),
};
