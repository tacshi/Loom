import { layoutMission } from "./layout";
import { MissionBuilder } from "./combinational";
import { GateBuilder, layoutGateProject } from "../logic";
import type { Project, TestCase } from "../../model/types";
import { ref } from "../../model/nets";
type Pin = [string, string];
type State = Record<string, number>;
export type StateTask = {
  inputs: Record<string, number>;
  outputs: Record<string, number>;
  initial: State;
  actions: { input: State; cycles: number }[];
  transition: (state: State, input: State) => State;
  observe: (state: State, input: State) => State;
  build: (b: GateBuilder, input: Record<string, Pin>) => Record<string, Pin>;
  supplied: string[];
};
const storage = (
  b: GateBuilder,
  name: string,
  width: number,
  initial = 0,
): Pin => {
  const node = b.node("register", width, name);
  b.c.components.at(-1)!.params.initial = initial;
  return [node[0], "q"];
};
const drive = (b: GateBuilder, q: Pin, data: Pin, en: Pin, rst: Pin) => {
  b.connect(...data, q[0], "d");
  b.connect(...en, q[0], "en");
  b.connect(...rst, q[0], "rst");
};
const actions = (values: State[]) =>
  values.flatMap((input) => [
    { input, cycles: 0 },
    { input, cycles: 1 },
  ]);
const controls = [
  { data: 5, en: 1, rst: 0 },
  { data: 129, en: 0, rst: 0 },
  { data: 129, en: 1, rst: 0 },
  { data: 255, en: 0, rst: 1 },
  { data: 3, en: 1, rst: 1 },
  { data: 64, en: 1, rst: 0 },
];
export const stateTasks: Record<string, StateTask> = {};
for (const [id, width] of [
  ["core-31", 1],
  ["core-32", 8],
  ["core-33", 8],
] as const) {
  const controlled = id === "core-33";
  stateTasks[id] = {
    inputs: { data: width, ...(controlled ? { en: 1, rst: 1 } : {}) },
    outputs: { q: width },
    initial: { q: 0 },
    supplied: id === "core-31" ? ["bit0"] : [],
    actions: actions(
      controls.map((v) =>
        controlled ? v : { data: v.data & (2 ** width - 1) },
      ),
    ),
    transition: (s, i) => ({
      q: controlled ? (i.rst ? 0 : i.en ? i.data : s.q) : i.data,
    }),
    observe: (s) => s,
    build: (b, { data, en, rst }) => {
      const bits = width === 1 ? [data] : b.bits(data, width),
        out: Pin[] = [];
      for (let i = 0; i < width; i++) {
        const n = b.node("dff", 1, `bit${i}`),
          q: Pin = [n[0], "q"];
        drive(b, q, bits[i], en ?? b.constant(1), rst ?? b.constant(0));
        out.push(q);
      }
      return { q: width === 1 ? out[0] : b.join(out) };
    },
  };
}
for (const id of ["core-34", "core-35", "core-36", "project-21"]) {
  const accum = id === "core-35",
    pc = id === "core-36",
    countdown = id === "project-21";
  stateTasks[id] = {
    inputs: {
      en: 1,
      rst: 1,
      ...(accum ? { data: 8 } : {}),
      ...(pc ? { target: 8, jump: 1 } : {}),
      ...(countdown ? { load: 1, data: 8 } : {}),
    },
    outputs: { q: 8 },
    initial: { q: 0 },
    supplied: ["storage"],
    actions: actions([
      { en: 1, rst: 0, data: 3, target: 250, jump: 1, load: 1 },
      { en: 1, rst: 0, data: 255, target: 18, jump: 0, load: 0 },
      { en: 0, rst: 0, data: 7, target: 19, jump: 1, load: 0 },
      { en: 0, rst: 1, data: 5, target: 55, jump: 1, load: 1 },
      { en: 1, rst: 0, data: 2, target: 255, jump: 1, load: 1 },
      { en: 1, rst: 0, data: 1, target: 1, jump: 0, load: 0 },
    ]),
    transition: (s, i) => ({
      q: i.rst
        ? 0
        : !i.en
          ? s.q
          : countdown
            ? i.load
              ? i.data
              : Math.max(0, s.q - 1)
            : pc && i.jump
              ? i.target
              : (s.q + (accum ? i.data : 1)) & 255,
    }),
    observe: (s) => s,
    build: (b, { en, rst, data, target, jump, load }) => {
      const q = storage(b, "storage", 8);
      let next = b.sumBus(q, accum ? data : b.constant(1, 8), 8, countdown).out;
      if (pc) next = b.mux(next, target, jump, 8);
      if (countdown) {
        const nonzero = b.bits(q, 8).reduce((a, c) => b.or(a, c));
        next = b.mux(q, next, nonzero, 8);
        next = b.mux(next, data, load, 8);
      }
      drive(b, q, next, en, rst);
      return { q };
    },
  };
}
stateTasks["core-37"] = {
  inputs: { address: 2, data: 8, write: 1 },
  outputs: { out: 8 },
  initial: { m0: 0, m1: 0, m2: 0, m3: 0 },
  supplied: ["memory"],
  actions: actions([
    { address: 0, data: 42, write: 1 },
    { address: 1, data: 99, write: 1 },
    { address: 0, data: 8, write: 0 },
    { address: 3, data: 255, write: 1 },
    { address: 1, data: 0, write: 0 },
    { address: 0, data: 7, write: 1 },
    { address: 3, data: 0, write: 0 },
  ]),
  transition: (s, i) => (i.write ? { ...s, ["m" + i.address]: i.data } : s),
  observe: (s, i) => ({ out: s["m" + i.address] }),
  build: (b, { address, data, write }) => {
    const memory = b.node("ram", 8, "memory");
    b.c.components.at(-1)!.params.addressBits = 2;
    b.connect(...address, memory[0], "addr");
    b.connect(...data, memory[0], "data");
    b.connect(...write, memory[0], "we");
    return { out: memory };
  },
};
stateTasks["project-22"] = {
  inputs: { en: 1, rst: 1 },
  outputs: { lights: 8 },
  initial: { q: 1 },
  supplied: ["storage"],
  actions: actions([
    { en: 1, rst: 0 },
    { en: 1, rst: 0 },
    { en: 0, rst: 0 },
    { en: 1, rst: 0 },
    { en: 0, rst: 1 },
    ...Array.from({ length: 9 }, () => ({ en: 1, rst: 0 })),
  ]),
  transition: (s, i) => ({
    q: i.rst ? 1 : i.en ? ((s.q << 1) | (s.q >>> 7)) & 255 : s.q,
  }),
  observe: (s) => ({ lights: s.q }),
  build: (b, { en, rst }) => {
    const q = storage(b, "storage", 8, 1),
      bits = b.bits(q, 8);
    drive(b, q, b.join([bits[7], ...bits.slice(0, 7)]), en, rst);
    return { lights: q };
  },
};
stateTasks["project-23"] = {
  inputs: { pressed: 1, rst: 1 },
  outputs: { count: 8 },
  initial: { q: 0, previous: 0 },
  supplied: ["storage", "previous"],
  actions: actions(
    [0, 1, 1, 1, 0, 1, 0, 1, 1, 0]
      .map((pressed) => ({ pressed, rst: 0 }))
      .concat([
        { pressed: 0, rst: 1 },
        { pressed: 1, rst: 0 },
      ]),
  ),
  transition: (s, i) => ({
    q: i.rst ? 0 : (s.q + (i.pressed && !s.previous ? 1 : 0)) & 255,
    previous: i.rst ? 0 : i.pressed,
  }),
  observe: (s) => ({ count: s.q }),
  build: (b, { pressed, rst }) => {
    const q = storage(b, "storage", 8),
      prev = storage(b, "previous", 1);
    drive(b, prev, pressed, b.constant(1), rst);
    drive(
      b,
      q,
      b.sumBus(q, b.constant(1, 8), 8).out,
      b.and(pressed, b.not(prev)),
      rst,
    );
    return { count: q };
  },
};
stateTasks["core-42"] = {
  inputs: { bit: 1, en: 1, rst: 1 },
  outputs: { match: 1 },
  initial: { q: 0 },
  supplied: ["storage"],
  actions: actions(
    [1, 0, 1, 0, 1, 1, 1, 0, 1]
      .map((bit) => ({ bit, en: 1, rst: 0 }))
      .concat([
        { bit: 1, en: 0, rst: 0 },
        { bit: 0, en: 1, rst: 1 },
      ]),
  ),
  transition: (s, i) => ({
    q: i.rst ? 0 : i.en ? ((s.q << 1) | i.bit) & 7 : s.q,
  }),
  observe: (s) => ({ match: Number(s.q === 5) }),
  build: (b, { bit, en, rst }) => {
    const q = storage(b, "storage", 3),
      bits = b.bits(q, 3);
    drive(b, q, b.join([bit, bits[0], bits[1]]), en, rst);
    return { match: b.and(b.and(bits[2], b.not(bits[1])), bits[0]) };
  },
};
export function stateReference(task: StateTask, name: string): Project {
  const b = new MissionBuilder(name),
    inputs = Object.fromEntries(
      Object.entries(task.inputs).map(([id, width]) => [
        id,
        b.input(id, width),
      ]),
    ),
    outputs = task.build(b, inputs);
  Object.entries(task.outputs).forEach(([id, width]) =>
    b.output(id, outputs[id], width),
  );
  return layoutMission(b.p);
}
export function stateStarter(task: StateTask, name: string): Project {
  const p = stateReference(task, name),
    c = p.circuits[p.root];
  c.wires = [];
  c.nets = [];
  c.markers = [];
  c.components = c.components.filter(
    (n) =>
      ["portIn", "portOut"].includes(n.kind) || task.supplied.includes(n.id),
  );
  return p;
}
export function stateChecks(task: StateTask): TestCase[] {
  let state = { ...task.initial };
  return [
    {
      id: "behavior",
      name: "Load, observe, and change",
      seed: 1,
      maxCycles: task.actions.reduce((n, a) => n + a.cycles, 0) + 1,
      steps: task.actions.map((a) => {
        const input = Object.fromEntries(
          Object.keys(task.inputs).map((k) => [k, a.input[k] ?? 0]),
        );
        for (let i = 0; i < a.cycles; i++)
          state = task.transition(state, input);
        return {
          cycles: a.cycles,
          inputs: Object.entries(input).map(([id, value]) => ({
            ref: ref(id, "out"),
            value,
          })),
          assertions: Object.entries(task.observe(state, input)).map(
            ([id, value]) => ({
              type: "signal" as const,
              ref: ref(id, "in"),
              value,
            }),
          ),
        };
      }),
    },
  ];
}
stateTasks["core-38"] = {
  inputs: { address: 3, data: 8, write: 1 },
  outputs: { out: 8 },
  initial: Object.fromEntries(
    Array.from({ length: 8 }, (_, i) => ["m" + i, 0]),
  ),
  supplied: ["bank0", "bank1"],
  actions: actions([
    { address: 0, data: 42, write: 1 },
    { address: 4, data: 99, write: 1 },
    { address: 0, data: 0, write: 0 },
    { address: 4, data: 0, write: 0 },
    { address: 7, data: 255, write: 1 },
    { address: 3, data: 11, write: 1 },
    { address: 7, data: 0, write: 0 },
  ]),
  transition: (s, i) => (i.write ? { ...s, ["m" + i.address]: i.data } : s),
  observe: (s, i) => ({ out: s["m" + i.address] }),
  build: (b, { address, data, write }) => {
    const bits = b.bits(address, 3),
      low = b.join(bits.slice(0, 2)),
      banks: Pin[] = [];
    for (let i = 0; i < 2; i++) {
      const n = b.node("ram", 8, "bank" + i);
      b.c.components.at(-1)!.params.addressBits = 2;
      b.connect(...low, n[0], "addr");
      b.connect(...data, n[0], "data");
      b.connect(...b.and(write, i ? bits[2] : b.not(bits[2])), n[0], "we");
      banks.push(n);
    }
    return { out: b.mux(banks[0], banks[1], bits[2], 8) };
  },
};
stateTasks["core-41"] = {
  inputs: { advance: 1, rst: 1 },
  outputs: { red: 1, green: 1, yellow: 1 },
  initial: { q: 0 },
  supplied: ["storage"],
  actions: actions([
    { advance: 1, rst: 0 },
    { advance: 1, rst: 0 },
    { advance: 0, rst: 0 },
    { advance: 1, rst: 0 },
    { advance: 1, rst: 0 },
    { advance: 0, rst: 1 },
  ]),
  transition: (s, i) => ({ q: i.rst ? 0 : i.advance ? (s.q + 1) % 3 : s.q }),
  observe: (s) => ({
    red: Number(s.q === 0),
    green: Number(s.q === 1),
    yellow: Number(s.q === 2),
  }),
  build: (b, { advance, rst }) => {
    const q = storage(b, "storage", 2),
      bits = b.bits(q, 2),
      red = b.and(b.not(bits[0]), b.not(bits[1])),
      green = b.and(bits[0], b.not(bits[1])),
      yellow = b.and(b.not(bits[0]), bits[1]);
    drive(b, q, b.join([red, green]), advance, rst);
    return { red, green, yellow };
  },
};
stateTasks["project-24"] = {
  inputs: { bit: 1, en: 1, rst: 1 },
  outputs: { byte: 8, ready: 1 },
  initial: { shift: 0, count: 0, byte: 0, ready: 0 },
  supplied: ["shift", "count", "received", "readyLatch"],
  actions: actions(
    [1, 0, 1, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 0, 0, 0]
      .map((bit) => ({ bit, en: 1, rst: 0 }))
      .concat([
        { bit: 1, en: 0, rst: 0 },
        { bit: 1, en: 1, rst: 1 },
      ]),
  ),
  transition: (s, i) => {
    if (i.rst) return { shift: 0, count: 0, byte: 0, ready: 0 };
    if (!i.en)
      return { shift: s.shift, count: s.count, byte: s.byte, ready: 0 };
    const shift = ((s.shift << 1) | i.bit) & 255;
    return {
      shift,
      count: (s.count + 1) % 8,
      byte: s.count === 7 ? shift : s.byte,
      ready: Number(s.count === 7),
    };
  },
  observe: (s) => ({ byte: s.byte, ready: s.ready }),
  build: (b, { bit, en, rst }) => {
    const shift = storage(b, "shift", 8),
      count = storage(b, "count", 3),
      received = storage(b, "received", 8),
      ready = storage(b, "readyLatch", 1),
      bits = b.bits(shift, 8),
      next = b.join([bit, ...bits.slice(0, 7)]),
      last = b.bits(count, 3).reduce((a, c) => b.and(a, c)),
      save = b.and(en, last);
    drive(b, shift, next, en, rst);
    drive(b, count, b.sumBus(count, b.constant(1, 3), 3).out, en, rst);
    drive(b, received, next, save, rst);
    drive(b, ready, save, b.constant(1), rst);
    return { byte: received, ready };
  },
};
stateTasks["project-27"] = {
  inputs: { digit: 2, enter: 1, rst: 1 },
  outputs: { unlocked: 1 },
  initial: { q: 0 },
  supplied: ["storage"],
  actions: actions([
    { digit: 1, enter: 1, rst: 0 },
    { digit: 3, enter: 1, rst: 0 },
    { digit: 1, enter: 1, rst: 0 },
    { digit: 2, enter: 0, rst: 0 },
    { digit: 2, enter: 1, rst: 0 },
    { digit: 3, enter: 1, rst: 0 },
    { digit: 0, enter: 1, rst: 0 },
    { digit: 0, enter: 0, rst: 1 },
  ]),
  transition: (s, i) => ({
    q: i.rst
      ? 0
      : !i.enter || s.q === 3
        ? s.q
        : i.digit === s.q + 1
          ? s.q + 1
          : 0,
  }),
  observe: (s) => ({ unlocked: Number(s.q === 3) }),
  build: (b, { digit, enter, rst }) => {
    const q = storage(b, "storage", 2),
      bits = b.bits(q, 2),
      unlocked = b.and(bits[0], bits[1]),
      next = b.sumBus(q, b.constant(1, 2), 2).out,
      equal = b.not(
        b.bits(b.xor(digit, next, 2), 2).reduce((a, c) => b.or(a, c)),
      );
    drive(
      b,
      q,
      b.mux(b.constant(0, 2), next, equal, 2),
      b.and(enter, b.not(unlocked)),
      rst,
    );
    return { unlocked };
  },
};
const equals = (b: GateBuilder, a: Pin, value: number, width: number) =>
  b.not(
    b
      .bits(b.xor(a, b.constant(value, width), width), width)
      .reduce((x, y) => b.or(x, y)),
  );
for (const [id, stack] of [
  ["project-25", false],
  ["project-26", true],
] as const) {
  stateTasks[id] = {
    inputs: { data: 8, push: 1, pop: 1, rst: 1 },
    outputs: { out: 8, empty: 1, full: 1 },
    initial: { count: 0, m0: 0, m1: 0, m2: 0, m3: 0 },
    supplied: ["count", "slot0", "slot1", "slot2", "slot3"],
    actions: actions([
      { data: 7, push: 1, pop: 0, rst: 0 },
      { data: 19, push: 1, pop: 0, rst: 0 },
      { data: 0, push: 0, pop: 1, rst: 0 },
      { data: 42, push: 1, pop: 0, rst: 0 },
      { data: 88, push: 1, pop: 0, rst: 0 },
      { data: 99, push: 1, pop: 0, rst: 0 },
      { data: 255, push: 1, pop: 0, rst: 0 },
      ...Array.from({ length: 5 }, () => ({
        data: 0,
        push: 0,
        pop: 1,
        rst: 0,
      })),
      { data: 3, push: 1, pop: 1, rst: 0 },
      { data: 0, push: 0, pop: 0, rst: 1 },
    ]),
    transition: (s, i) => {
      if (i.rst) return { count: 0, m0: 0, m1: 0, m2: 0, m3: 0 };
      if (i.pop && s.count > 0)
        return stack
          ? { ...s, count: s.count - 1 }
          : { ...s, count: s.count - 1, m0: s.m1, m1: s.m2, m2: s.m3, m3: 0 };
      if (!i.pop && i.push && s.count < 4)
        return { ...s, count: s.count + 1, ["m" + s.count]: i.data };
      return s;
    },
    observe: (s) => ({
      out: s.count ? s["m" + (stack ? s.count - 1 : 0)] : 0,
      empty: Number(s.count === 0),
      full: Number(s.count === 4),
    }),
    build: (b, { data, push, pop, rst }) => {
      const count = storage(b, "count", 3),
        slots = Array.from({ length: 4 }, (_, i) => storage(b, "slot" + i, 8)),
        empty = equals(b, count, 0, 3),
        full = equals(b, count, 4, 3),
        remove = b.and(pop, b.not(empty)),
        insert = b.and(b.and(push, b.not(pop)), b.not(full));
      drive(
        b,
        count,
        b.mux(
          b.sumBus(count, b.constant(1, 3), 3).out,
          b.sumBus(count, b.constant(1, 3), 3, true).out,
          remove,
          3,
        ),
        b.or(remove, insert),
        rst,
      );
      slots.forEach((q, i) => {
        const put = b.and(insert, equals(b, count, i, 3));
        drive(
          b,
          q,
          stack
            ? data
            : b.mux(data, slots[i + 1] ?? b.constant(0, 8), remove, 8),
          stack ? put : b.or(put, remove),
          rst,
        );
      });
      let top = slots[0];
      if (stack)
        for (let i = 1; i < 4; i++)
          top = b.mux(top, slots[i], equals(b, count, i + 1, 3), 8);
      return { out: b.mux(top, b.constant(0, 8), empty, 8), empty, full };
    },
  };
}
stateTasks["project-28"] = {
  inputs: { en: 1, rst: 1, address: 2 },
  outputs: { out: 8, done: 1 },
  initial: { index: 0, done: 0, m0: 0, m1: 0, m2: 0, m3: 0 },
  supplied: ["source", "destination", "index", "doneLatch"],
  actions: [
    { input: { en: 1, rst: 0, address: 0 }, cycles: 1 },
    { input: { en: 0, rst: 0, address: 1 }, cycles: 1 },
    { input: { en: 1, rst: 0, address: 1 }, cycles: 1 },
    { input: { en: 1, rst: 0, address: 2 }, cycles: 1 },
    { input: { en: 1, rst: 0, address: 3 }, cycles: 1 },
    ...Array.from({ length: 4 }, (_, address) => ({
      input: { en: 1, rst: 0, address },
      cycles: 1,
    })),
  ],
  transition: (s, i) =>
    i.rst
      ? { ...s, index: 0, done: 0 }
      : i.en && !s.done
        ? {
            ...s,
            ["m" + s.index]: [17, 42, 99, 255][s.index],
            index: (s.index + 1) & 3,
            done: Number(s.index === 3),
          }
        : s,
  observe: (s, i) => ({
    out: s["m" + (i.en && !s.done && !i.rst ? s.index : i.address)],
    done: s.done,
  }),
  build: (b, { en, rst, address }) => {
    const index = storage(b, "index", 2),
      done = storage(b, "doneLatch", 1),
      source = b.node("rom", 8, "source");
    Object.assign(b.c.components.at(-1)!, {
      params: { addressBits: 2 },
      image: [17, 42, 99, 255],
    });
    const destination = b.node("ram", 8, "destination");
    b.c.components.at(-1)!.params.addressBits = 2;
    const write = b.and(b.and(en, b.not(done)), b.not(rst));
    b.connect(...index, source[0], "addr");
    b.connect(...b.mux(address, index, write, 2), destination[0], "addr");
    b.connect(...source, destination[0], "data");
    b.connect(...write, destination[0], "we");
    drive(b, index, b.sumBus(index, b.constant(1, 2), 2).out, write, rst);
    drive(b, done, equals(b, index, 3, 2), write, rst);
    return { out: destination, done };
  },
};

stateTasks["core-34"].actions.push({ input: { en: 1, rst: 0 }, cycles: 256 });
stateTasks["project-21"].actions.push({
  input: { en: 1, rst: 0, load: 0, data: 0 },
  cycles: 3,
});
