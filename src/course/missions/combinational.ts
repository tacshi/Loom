import { layoutMission } from "./layout";
import { GateBuilder, layoutGateProject } from "../logic";
import type { Project, TestCase } from "../../model/types";
import { ref, removeRouteConnection } from "../../model/nets";

type Pin = [string, string];
export type LogicTask = {
  inputs: Record<string, number>;
  outputs: Record<string, number>;
  build: (b: GateBuilder, input: Record<string, Pin>) => Record<string, Pin>;
  expected: (input: Record<string, number>) => Record<string, number>;
};
export class MissionBuilder extends GateBuilder {
  private sums = new Map<string, string>();
  override sumBus(
    a: Pin,
    c: Pin,
    width: number,
    subtract = false,
  ): { out: Pin; carry: Pin } {
    const key = `${width}:${subtract}`;
    let definition = this.sums.get(key);
    if (!definition) {
      const cell = new GateBuilder(subtract ? "Subtract" : "Add");
      const left = cell.input("a", width),
        right = cell.input("b", width);
      const result = cell.sumBus(left, right, width, subtract);
      cell.output("out", result.out, width);
      cell.output("carry", result.carry);
      definition = cell.p.root;
      Object.assign(this.p.circuits, cell.p.circuits);
      this.sums.set(key, definition);
    }
    const node = this.node("instance", width);
    this.c.components.at(-1)!.definitionId = definition;
    this.connect(...a, node[0], "a");
    this.connect(...c, node[0], "b");
    return { out: node, carry: [node[0], "carry"] };
  }
  private muxes = new Map<number, string>();
  override mux(a: Pin, c: Pin, sel: Pin, width = 1): Pin {
    let definition = this.muxes.get(width);
    if (!definition) {
      const cell = new GateBuilder("Selector");
      const left = cell.input("a", width),
        right = cell.input("b", width),
        choice = cell.input("sel");
      cell.output("out", cell.mux(left, right, choice, width), width);
      definition = cell.p.root;
      Object.assign(this.p.circuits, cell.p.circuits);
      this.muxes.set(width, definition);
    }
    const node = this.node("instance", width);
    this.c.components.at(-1)!.definitionId = definition;
    this.connect(...a, node[0], "a");
    this.connect(...c, node[0], "b");
    this.connect(...sel, node[0], "sel");
    return node;
  }
}
export function logicReference(task: LogicTask, name: string) {
  const b = new MissionBuilder(name);
  const input = Object.fromEntries(
    Object.entries(task.inputs).map(([id, width]) => [id, b.input(id, width)]),
  );
  const outputs = task.build(b, input);
  for (const [id, width] of Object.entries(task.outputs))
    b.output(id, outputs[id], width);
  return layoutMission(b.p);
}
export function logicStarter(task: LogicTask, name: string): Project {
  if (name === "project-01") {
    const p = logicReference(task, name),
      c = p.circuits[p.root];
    const wire = c.wires.find((w) => w.to.component === "out");
    if (!wire) throw new Error("Repair connection is missing");
    removeRouteConnection(c, wire.id);
    return p;
  }

  const b = new GateBuilder(name);
  Object.entries(task.inputs).forEach(([id, width], i) => {
    b.input(id, width);
    Object.assign(b.c.components.at(-1)!, { x: 0, y: i * 160 });
  });
  Object.entries(task.outputs).forEach(([id, width], i) => {
    b.node("portOut", width, id);
    Object.assign(b.c.components.at(-1)!, { x: 640, y: i * 160 });
    b.c.ports.push({ id, name: id, direction: "out", componentId: id, width });
  });
  if (name === "project-02") {
    b.connect("a", "out", "right", "in");
    b.connect("b", "out", "left", "in");
  }
  return b.p;
}
/** Expectations come from arithmetic/boolean rules, never from the reference simulator. */
export function logicChecks(task: LogicTask): TestCase[] {
  const fields = Object.entries(task.inputs);
  const bits = fields.reduce((n, [, w]) => n + w, 0);
  const values: Record<string, number>[] = [];
  if (bits <= 10) {
    for (let n = 0; n < 2 ** bits; n++) {
      let offset = 0;
      values.push(
        Object.fromEntries(
          fields.map(([id, width]) => {
            const value = (n >>> offset) & (2 ** width - 1);
            offset += width;
            return [id, value];
          }),
        ),
      );
    }
  } else {
    const edges = [0, 1, 2, 3, 15, 16, 63, 64, 127, 128, 129, 254, 255];
    // Cross boundary values for two-operand circuits; additional controls vary too.
    for (const a of edges)
      for (const b of edges) {
        values.push(
          Object.fromEntries(
            fields.map(([id, width], i) => [
              id,
              (i === 0 ? a : i === 1 ? b : a ^ b) & (2 ** width - 1),
            ]),
          ),
        );
      }
    let seed = 0x51f15e;
    for (let i = 0; i < 128; i++)
      values.push(
        Object.fromEntries(
          fields.map(([id, width]) => {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            return [id, (seed >>> 8) & (2 ** width - 1)];
          }),
        ),
      );
  }
  return values.map((input, i) => ({
    id: `case-${i + 1}`,
    name: Object.entries(input)
      .map(([k, v]) => `${k}=${v}`)
      .join(", "),
    seed: 1,
    maxCycles: 1,
    steps: [
      {
        cycles: 0,
        inputs: Object.entries(input).map(([id, value]) => ({
          ref: ref(id, "out"),
          value,
        })),
        assertions: Object.entries(task.expected(input)).map(([id, value]) => ({
          type: "signal" as const,
          ref: ref(id, "in"),
          value,
        })),
      },
    ],
  }));
}
const primitive = (
  b: GateBuilder,
  kind: "and" | "not",
  a: Pin,
  c?: Pin,
): Pin => {
  const node = b.node(kind);
  b.connect(...a, node[0], "a");
  if (c) b.connect(...c, node[0], "b");
  return node;
};
const binary = (
  build: LogicTask["build"],
  expected: LogicTask["expected"],
): LogicTask => ({
  inputs: { a: 1, b: 1 },
  outputs: { out: 1 },
  build,
  expected,
});
export const logicTasks: Record<string, LogicTask> = {
  "core-01": {
    inputs: { a: 1 },
    outputs: { out: 1 },
    build: (_b, { a }) => ({ out: a }),
    expected: ({ a }) => ({ out: a }),
  },
  "core-02": {
    inputs: { a: 1 },
    outputs: { left: 1, right: 1 },
    build: (_b, { a }) => ({ left: a, right: a }),
    expected: ({ a }) => ({ left: a, right: a }),
  },
  "core-03": binary(
    (b, { a, b: c }) => ({ out: primitive(b, "and", a, c) }),
    ({ a, b }) => ({ out: a & b }),
  ),
  "core-04": {
    inputs: { a: 1 },
    outputs: { out: 1 },
    build: (b, { a }) => ({ out: primitive(b, "not", a) }),
    expected: ({ a }) => ({ out: a ^ 1 }),
  },
  "core-05": binary(
    (b, { a, b: c }) => ({
      out: primitive(b, "not", primitive(b, "and", a, c)),
    }),
    ({ a, b }) => ({ out: (a & b) ^ 1 }),
  ),
  "core-06": {
    inputs: { a: 1 },
    outputs: { out: 1 },
    build: (b, { a }) => ({ out: b.not(a) }),
    expected: ({ a }) => ({ out: a ^ 1 }),
  },
  "core-07": binary(
    (b, { a, b: c }) => ({ out: b.and(a, c) }),
    ({ a, b }) => ({ out: a & b }),
  ),
  "core-08": binary(
    (b, { a, b: c }) => ({ out: b.or(a, c) }),
    ({ a, b }) => ({ out: a | b }),
  ),
  "core-09": binary(
    (b, { a, b: c }) => ({ out: b.xor(a, c) }),
    ({ a, b }) => ({ out: a ^ b }),
  ),
  "core-10": binary(
    (b, { a, b: c }) => ({ out: b.not(b.xor(a, c)) }),
    ({ a, b }) => ({ out: a ^ b ^ 1 }),
  ),
  "core-11": {
    inputs: { a: 1, b: 1, sel: 1 },
    outputs: { out: 1 },
    build: (b, { a, b: c, sel }) => ({ out: b.mux(a, c, sel) }),
    expected: ({ a, b, sel }) => ({ out: sel ? b : a }),
  },
  "core-12": {
    inputs: { a: 1, b: 1, c: 1, d: 1, select0: 1, select1: 1 },
    outputs: { out: 1 },
    build: (b, { a, b: c, c: d, d: e, select0, select1 }) => ({
      out: b.mux(b.mux(a, c, select0), b.mux(d, e, select0), select1),
    }),
    expected: ({ a, b, c, d, select0, select1 }) => ({
      out: [a, b, c, d][select0 + 2 * select1],
    }),
  },
  "project-01": {
    inputs: { a: 1 },
    outputs: { out: 1 },
    build: (b, { a }) => ({ out: b.not(b.not(a)) }),
    expected: ({ a }) => ({ out: a }),
  },
  "project-02": {
    inputs: { a: 1, b: 1 },
    outputs: { left: 1, right: 1 },
    build: (_b, { a, b }) => ({ left: a, right: b }),
    expected: ({ a, b }) => ({ left: a, right: b }),
  },
  "project-03": {
    inputs: { a: 1, b: 1, c: 1 },
    outputs: { out: 1 },
    build: (b, { a, b: c, c: d }) => ({ out: b.and(b.and(a, c), d) }),
    expected: ({ a, b, c }) => ({ out: a & b & c }),
  },
  "project-04": {
    inputs: { master: 1, a: 1, b: 1 },
    outputs: { left: 1, right: 1 },
    build: (b, { master, a, b: c }) => ({
      left: b.and(master, a),
      right: b.and(master, c),
    }),
    expected: ({ master, a, b }) => ({ left: master & a, right: master & b }),
  },
  "project-05": {
    inputs: { a: 1, b: 1, c: 1 },
    outputs: { out: 1 },
    build: (b, { a, b: c, c: d }) => ({
      out: b.or(b.or(b.and(a, c), b.and(a, d)), b.and(c, d)),
    }),
    expected: ({ a, b, c }) => ({ out: Number(a + b + c >= 2) }),
  },
  "project-06": {
    inputs: { a: 1, b: 1, c: 1 },
    outputs: { out: 1 },
    build: (b, { a, b: c, c: d }) => ({
      out: b.and(b.xor(b.xor(a, c), d), b.not(b.and(b.and(a, c), d))),
    }),
    expected: ({ a, b, c }) => ({ out: Number(a + b + c === 1) }),
  },
  "project-07": {
    inputs: { armed: 1, door: 1, window: 1 },
    outputs: { alarm: 1 },
    build: (b, { armed, door, window }) => ({
      alarm: b.and(armed, b.or(door, window)),
    }),
    expected: ({ armed, door, window }) => ({ alarm: armed & (door | window) }),
  },
  "project-08": {
    inputs: { a: 1, b: 1, c: 1 },
    outputs: { unlocked: 1 },
    build: (b, { a, b: c, c: d }) => ({
      unlocked: b.and(b.and(a, b.not(c)), d),
    }),
    expected: ({ a, b, c }) => ({
      unlocked: Number(a === 1 && b === 0 && c === 1),
    }),
  },
};
const fold = (b: GateBuilder, pins: Pin[], op: "or" | "and" | "xor") =>
  pins.reduce((a, c) => b[op](a, c));
const eq = (b: GateBuilder, a: Pin, c: Pin, w = 8) =>
  b.not(fold(b, b.bits(b.xor(a, c, w), w), "or"));
const unsignedLess = (b: GateBuilder, a: Pin, c: Pin, w = 8) =>
  b.not(b.sumBus(a, c, w, true).carry);
const signedLess = (b: GateBuilder, a: Pin, c: Pin) => {
  const aa = b.bits(a, 8),
    bb = b.bits(c, 8);
  return b.mux(unsignedLess(b, a, c), aa[7], b.xor(aa[7], bb[7]));
};
const signed = (a: number) => (a & 128 ? a - 256 : a);
const word = (
  build: LogicTask["build"],
  expected: LogicTask["expected"],
  outputs: Record<string, number> = { out: 8 },
): LogicTask => ({ inputs: { a: 8, b: 8 }, outputs, build, expected });
Object.assign(logicTasks, {
  "core-13": {
    inputs: { b0: 1, b1: 1, b2: 1, b3: 1 },
    outputs: { value: 4 },
    build: (b, i) => ({ value: b.join([i.b0, i.b1, i.b2, i.b3]) }),
    expected: ({ b0, b1, b2, b3 }: Record<string, number>) => ({
      value: b0 + 2 * b1 + 4 * b2 + 8 * b3,
    }),
  },
  "core-14": {
    inputs: { value: 8 },
    outputs: { low: 4, high: 4, swapped: 8 },
    build: (b, { value }) => {
      const bits = b.bits(value, 8);
      return {
        low: b.join(bits.slice(0, 4)),
        high: b.join(bits.slice(4)),
        swapped: b.join([...bits.slice(4), ...bits.slice(0, 4)]),
      };
    },
    expected: ({ value }: Record<string, number>) => ({
      low: value & 15,
      high: value >>> 4,
      swapped: ((value << 4) | (value >>> 4)) & 255,
    }),
  },
  "core-15": word(
    (b, { a, b: c }) => ({
      and: b.and(a, c, 8),
      or: b.or(a, c, 8),
      xor: b.xor(a, c, 8),
    }),
    ({ a, b }) => ({ and: a & b, or: a | b, xor: a ^ b }),
    { and: 8, or: 8, xor: 8 },
  ),
  "core-16": {
    inputs: { a: 8, b: 8, sel: 1 },
    outputs: { out: 8 },
    build: (b, { a, b: c, sel }) => ({ out: b.mux(a, c, sel, 8) }),
    expected: ({ a, b, sel }: Record<string, number>) => ({ out: sel ? b : a }),
  },
  "core-17": {
    inputs: { select: 3 },
    outputs: { out: 8 },
    build: (b, { select }) => {
      const bits = b.bits(select, 3);
      return {
        out: b.join(
          Array.from({ length: 8 }, (_, i) =>
            fold(
              b,
              bits.map((p, k) => (i & (1 << k) ? p : b.not(p))),
              "and",
            ),
          ),
        ),
      };
    },
    expected: ({ select }: Record<string, number>) => ({ out: 1 << select }),
  },
  "core-19": binary(
    (b, { a, b: c }) => ({ sum: b.xor(a, c), carry: b.and(a, c) }),
    ({ a, b }) => ({ sum: a ^ b, carry: a & b }),
  ),
  "core-20": {
    inputs: { a: 1, b: 1, cin: 1 },
    outputs: { sum: 1, carry: 1 },
    build: (b, { a, b: c, cin }) => {
      const x = b.xor(a, c);
      return { sum: b.xor(x, cin), carry: b.or(b.and(a, c), b.and(x, cin)) };
    },
    expected: ({ a, b, cin }: Record<string, number>) => ({
      sum: (a + b + cin) & 1,
      carry: (a + b + cin) >>> 1,
    }),
  },
  "core-21": word(
    (b, { a, b: c }) => b.sumBus(a, c, 8),
    ({ a, b }) => ({ out: (a + b) & 255, carry: (a + b) >>> 8 }),
    { out: 8, carry: 1 },
  ),
  "core-22": {
    inputs: { a: 8 },
    outputs: { out: 8, carry: 1 },
    build: (b, { a }) => b.sumBus(a, b.constant(1, 8), 8),
    expected: ({ a }: Record<string, number>) => ({
      out: (a + 1) & 255,
      carry: Number(a === 255),
    }),
  },
  "core-23": {
    inputs: { a: 8 },
    outputs: { out: 8 },
    build: (b, { a }) => ({ out: b.sumBus(b.constant(0, 8), a, 8, true).out }),
    expected: ({ a }: Record<string, number>) => ({ out: -a & 255 }),
  },
  "core-24": word(
    (b, { a, b: c }) => b.sumBus(a, c, 8, true),
    ({ a, b }) => ({ out: (a - b) & 255, carry: Number(a >= b) }),
    { out: 8, carry: 1 },
  ),
  "core-25": word(
    (b, { a, b: c }) => ({ less: unsignedLess(b, a, c), equal: eq(b, a, c) }),
    ({ a, b }) => ({ less: Number(a < b), equal: Number(a === b) }),
    { less: 1, equal: 1 },
  ),
  "core-26": word(
    (b, { a, b: c }) => ({ less: signedLess(b, a, c), equal: eq(b, a, c) }),
    ({ a, b }) => ({
      less: Number(signed(a) < signed(b)),
      equal: Number(a === b),
    }),
    { less: 1, equal: 1 },
  ),
  "core-27": word(
    (b, { a, b: c }) => {
      const sum = b.sumBus(a, c, 8),
        aa = b.bits(a, 8),
        cc = b.bits(c, 8),
        ss = b.bits(sum.out, 8);
      return {
        out: sum.out,
        carry: sum.carry,
        zero: b.not(fold(b, ss, "or")),
        overflow: b.and(b.not(b.xor(aa[7], cc[7])), b.xor(aa[7], ss[7])),
      };
    },
    ({ a, b }) => ({
      out: (a + b) & 255,
      carry: (a + b) >>> 8,
      zero: Number(((a + b) & 255) === 0),
      overflow: Number(
        signed(a) + signed(b) > 127 || signed(a) + signed(b) < -128,
      ),
    }),
    { out: 8, carry: 1, zero: 1, overflow: 1 },
  ),
  "core-28": {
    inputs: { a: 8 },
    outputs: { left: 8, right: 8 },
    build: (b, { a }) => {
      const bits = b.bits(a, 8),
        z = b.constant(0);
      return {
        left: b.join([z, ...bits.slice(0, 7)]),
        right: b.join([...bits.slice(1), z]),
      };
    },
    expected: ({ a }: Record<string, number>) => ({
      left: (a << 1) & 255,
      right: a >>> 1,
    }),
  },
  "core-29": {
    inputs: { a: 8 },
    outputs: { out: 8 },
    build: (b, { a }) => {
      const bits = b.bits(a, 8);
      return { out: b.join([...bits.slice(1), bits[7]]) };
    },
    expected: ({ a }: Record<string, number>) => ({
      out: (signed(a) >> 1) & 255,
    }),
  },
  "core-30": {
    inputs: { a: 8, b: 8, op: 2 },
    outputs: { out: 8 },
    build: (b, { a, b: c, op }) => {
      const s = b.bits(op, 2);
      return {
        out: b.mux(
          b.mux(b.sumBus(a, c, 8).out, b.sumBus(a, c, 8, true).out, s[0], 8),
          b.mux(b.and(a, c, 8), b.xor(a, c, 8), s[0], 8),
          s[1],
          8,
        ),
      };
    },
    expected: ({ a, b, op }: Record<string, number>) => ({
      out: [(a + b) & 255, (a - b) & 255, a & b, a ^ b][op],
    }),
  },
  "project-09": {
    inputs: { data: 8, parity: 1 },
    outputs: { parityOut: 1, error: 1 },
    build: (b, { data, parity }) => {
      const p = fold(b, b.bits(data, 8), "xor");
      return { parityOut: p, error: b.xor(p, parity) };
    },
    expected: ({ data, parity }: Record<string, number>) => {
      const p = (data.toString(2).split("1").length % 2) ^ 1;
      return { parityOut: p, error: p ^ parity };
    },
  },
  "project-10": {
    inputs: { requests: 8 },
    outputs: { index: 3, valid: 1 },
    build: (b, { requests }) => {
      const bits = b.bits(requests, 8);
      let index = b.constant(0, 3);
      bits.forEach((p, i) => (index = b.mux(index, b.constant(i, 3), p, 3)));
      return { index, valid: fold(b, bits, "or") };
    },
    expected: ({ requests }: Record<string, number>) => ({
      index: requests ? 31 - Math.clz32(requests) : 0,
      valid: Number(requests !== 0),
    }),
  },
  "project-11": {
    inputs: { a: 8 },
    outputs: { count: 4 },
    build: (b, { a }) => {
      const bits = b.bits(a, 8);
      let count = b.constant(8, 4);
      bits.forEach(
        (p, i) => (count = b.mux(count, b.constant(7 - i, 4), p, 4)),
      );
      return { count };
    },
    expected: ({ a }: Record<string, number>) => ({
      count: a ? Math.clz32(a) - 24 : 8,
    }),
  },
  "project-12": {
    inputs: { a: 8 },
    outputs: { out: 8 },
    build: (b, { a }) => ({ out: b.join(b.bits(a, 8).reverse()) }),
    expected: ({ a }: Record<string, number>) => ({
      out: parseInt(
        a.toString(2).padStart(8, "0").split("").reverse().join(""),
        2,
      ),
    }),
  },
  "project-13": {
    inputs: { a: 8 },
    outputs: { out: 8 },
    build: (b, { a }) => ({
      out: b.mux(
        a,
        b.sumBus(b.constant(0, 8), a, 8, true).out,
        b.bits(a, 8)[7],
        8,
      ),
    }),
    expected: ({ a }: Record<string, number>) => ({ out: Math.abs(signed(a)) }),
  },
  "project-14": word(
    (b, { a, b: c }) => {
      const s = b.sumBus(a, c, 8);
      return { out: b.mux(s.out, b.constant(255, 8), s.carry, 8) };
    },
    ({ a, b }) => ({ out: Math.min(a + b, 255) }),
  ),
  "project-17": word(
    (b, { a, b: c }) => {
      const less = unsignedLess(b, a, c);
      return { min: b.mux(c, a, less, 8), max: b.mux(a, c, less, 8) };
    },
    ({ a, b }) => ({ min: Math.min(a, b), max: Math.max(a, b) }),
    { min: 8, max: 8 },
  ),
  "project-18": {
    inputs: { value: 8, low: 8, high: 8 },
    outputs: { inside: 1 },
    build: (b, { value, low, high }) => ({
      inside: b.and(
        b.not(unsignedLess(b, value, low)),
        b.not(unsignedLess(b, high, value)),
      ),
    }),
    expected: ({ value, low, high }: Record<string, number>) => ({
      inside: Number(value >= low && value <= high),
    }),
  },
  "project-19": {
    inputs: { a: 8 },
    outputs: { out: 1 },
    build: (b, { a }) => {
      const minus = b.sumBus(a, b.constant(1, 8), 8, true).out;
      return {
        out: b.and(
          b.not(eq(b, a, b.constant(0, 8))),
          eq(b, b.and(a, minus, 8), b.constant(0, 8)),
        ),
      };
    },
    expected: ({ a }: Record<string, number>) => ({
      out: Number(a !== 0 && (a & (a - 1)) === 0),
    }),
  },
  "project-20": {
    inputs: { a: 8, right: 1 },
    outputs: { out: 8 },
    build: (b, { a, right }) => {
      const bits = b.bits(a, 8);
      return {
        out: b.mux(
          b.join([bits[7], ...bits.slice(0, 7)]),
          b.join([...bits.slice(1), bits[0]]),
          right,
          8,
        ),
      };
    },
    expected: ({ a, right }: Record<string, number>) => ({
      out: right ? ((a >>> 1) | (a << 7)) & 255 : ((a << 1) | (a >>> 7)) & 255,
    }),
  },
} satisfies Record<string, LogicTask>);
logicTasks["core-19"].outputs = { sum: 1, carry: 1 };
logicTasks["project-15"] = word(
  (b, { a, b: c }) => {
    const aa = b.bits(a, 8),
      bb = b.bits(c, 8),
      z = b.constant(0);
    let result = b.constant(0, 16);
    for (let i = 0; i < 8; i++) {
      const row = Array.from({ length: 16 }, (_, j) =>
        j >= i && j < i + 8 ? b.and(aa[j - i], bb[i]) : z,
      );
      result = b.sumBus(result, b.join(row), 16).out;
    }
    return { out: result };
  },
  ({ a, b }) => ({ out: a * b }),
  { out: 16 },
);
logicTasks["project-16"] = word(
  (b, { a, b: c }) => {
    const aa = b.bits(a, 8),
      z = b.constant(0),
      divisor = b.join([...b.bits(c, 8), z]);
    let remainder = b.constant(0, 9);
    const quotient: Pin[] = [];
    for (let i = 7; i >= 0; i--) {
      const shifted = b.join([aa[i], ...b.bits(remainder, 9).slice(0, 8)]);
      const difference = b.sumBus(shifted, divisor, 9, true);
      quotient[i] = difference.carry;
      remainder = b.mux(shifted, difference.out, difference.carry, 9);
    }
    return {
      quotient: b.join(quotient),
      remainder: b.join(b.bits(remainder, 9).slice(0, 8)),
    };
  },
  ({ a, b }) => ({
    quotient: b ? Math.floor(a / b) : 255,
    remainder: b ? a % b : a,
  }),
  { quotient: 8, remainder: 8 },
);
