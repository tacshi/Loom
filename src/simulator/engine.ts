import { initialDevice, sampleDevice } from "./devices";
import {
  fingerprint,
  PAGE_WORDS,
  type ExecutionState,
  type PeripheralState,
  type Transaction,
} from "./state";
import type { Project, Component, TestVector } from "../model/types";
import { ports } from "../model/components";
import { compile, key, type Compiled } from "./compiler";
import {
  signal,
  unknown,
  defined,
  logic,
  merge,
  mask,
  type Signal,
} from "./signal";
export type Snapshot = {
  cycle: number;
  values: Record<string, Signal>;
  memory: Record<string, number[]>;
  devices?: Record<string, PeripheralState>;
  transactions?: Transaction[];
};
export class Engine {
  readonly compiled: Compiled;
  readonly byId: Map<string, Component>;
  readonly pinMap: Map<string, ReturnType<typeof ports>>;
  private access = new Map<
    Component,
    {
      read: (port: string) => Signal;
      put: (port: string, value: Signal) => void;
    }
  >();
  values = new Map<string, Signal>();
  state = new Map<string, Signal>();
  memory = new Map<string, Signal[]>();
  inputs = new Map<string, number>();
  devices = new Map<string, PeripheralState>();
  transactions: Transaction[] = [];
  eventOrder = 0;
  readonly fingerprint: string;
  cycle = 0;
  constructor(
    public project: Project,
    root = project.root,
  ) {
    this.fingerprint = fingerprint({ ...project, root });
    this.compiled = compile(project, root);
    this.byId = new Map(this.compiled.components.map((c) => [c.id, c]));
    this.pinMap = new Map(
      this.compiled.components.map((c) => [c.id, ports(c)]),
    );
    for (const c of this.compiled.components) {
      const reads = new Map<string, { key?: string; fallback: Signal }>(),
        outputs = new Map<string, string>();
      for (const port of this.pinMap.get(c.id)!) {
        const source = this.compiled.sources.get(c.id + ":" + port.id);
        reads.set(port.id, {
          key: source ? key(source) : undefined,
          fallback: unknown(port.width),
        });
        outputs.set(port.id, c.id + ":" + port.id);
      }
      this.access.set(c, {
        read: (port) => {
          const entry = reads.get(port);
          return entry?.key
            ? (this.values.get(entry.key) ?? entry.fallback)
            : (entry?.fallback ?? unknown(c.width));
        },
        put: (port, value) => {
          this.values.set(outputs.get(port)!, value);
        },
      });
    }
    this.reset();
  }
  get valid() {
    return !this.compiled.diagnostics.some((d) => d.severity === "error");
  }
  read(c: Component, p: string): Signal {
    return this.access.get(c)!.read(p);
  }
  get(id: string, port: string): Signal {
    const alias = this.compiled.aliases.get(id + ":" + port);
    if (alias) {
      const at = alias.lastIndexOf(":");
      return this.get(alias.slice(0, at), alias.slice(at + 1));
    }
    const c = this.byId.get(id);
    if (!c) return unknown(1);
    return this.pinMap.get(c.id)!.find((p) => p.id === port)?.direction === "in"
      ? this.read(c, port)
      : (this.values.get(id + ":" + port) ?? unknown(c.width));
  }
  reset() {
    this.cycle = 0;
    this.eventOrder = 0;
    this.devices.clear();
    this.transactions = [];
    this.values.clear();
    this.state.clear();
    this.memory.clear();
    if (!this.valid) return;
    for (const c of this.compiled.components) {
      if (c.kind === "button") this.inputs.delete(c.id);
      const device = initialDevice(c.kind);
      if (device) this.devices.set(c.id, device);
      if (["register", "dff", "counter"].includes(c.kind))
        this.state.set(c.id, signal(c.params.initial ?? 0, c.width));
      if (c.kind === "ram")
        this.memory.set(
          c.id,
          Array.from({ length: 2 ** (c.params.addressBits ?? 8) }, () =>
            signal(0, c.width),
          ),
        );
      if (c.kind === "rom")
        this.memory.set(
          c.id,
          Array.from({ length: 2 ** (c.params.addressBits ?? 8) }, (_, i) =>
            signal(c.image?.[i] ?? 0, c.width),
          ),
        );
    }
    this.settle();
  }
  setInput(id: string, value: number) {
    this.inputs.set(id, value);
    this.settle();
  }
  settle() {
    if (!this.valid) return;
    for (const c of this.compiled.order) {
      const { read, put } = this.access.get(c)!;
      const a = () => read("a"),
        b = () => read("b");
      switch (c.kind) {
        case "button":
          put("out", signal(this.inputs.get(c.id) ?? 0, 1));
          break;
        case "input":
        case "constant":
        case "portIn":
          put(
            "out",
            signal(this.inputs.get(c.id) ?? c.params.value ?? 0, c.width),
          );
          break;
        case "buffer":
          put("out", read("in"));
          break;
        case "sevenSegment":
        case "probe":
        case "portOut":
          break;
        case "not":
          put("out", logic("not", a()));
          break;
        case "and":
        case "or":
        case "xor":
        case "nand":
        case "nor":
        case "xnor":
          put("out", logic(c.kind, a(), b()));
          break;
        case "mux": {
          const sel = read("sel");
          put("out", defined(sel) ? (sel.value ? b() : a()) : merge(a(), b()));
          break;
        }
        case "adder":
        case "subtractor": {
          const av = a(),
            bv = b();
          if (!defined(av) || !defined(bv)) {
            put("out", unknown(c.width));
            put("carry", unknown(1));
            break;
          }
          const result =
            c.kind === "adder" ? av.value + bv.value : av.value - bv.value;
          put("out", signal(result, c.width));
          put(
            "carry",
            signal(
              c.kind === "adder"
                ? Number(result > mask(c.width))
                : Number(result >= 0),
              1,
            ),
          );
          break;
        }
        case "compare": {
          const av = a(),
            bv = b();
          put(
            "eq",
            defined(av) && defined(bv)
              ? signal(Number(av.value === bv.value), 1)
              : unknown(1),
          );
          put(
            "lt",
            defined(av) && defined(bv)
              ? signal(Number(av.value < bv.value), 1)
              : unknown(1),
          );
          break;
        }
        case "split": {
          const v = read("in");
          for (let i = 0; i < c.width; i++)
            put("b" + i, signal((v.value >>> i) & 1, 1, (v.known >>> i) & 1));
          break;
        }
        case "join": {
          let value = 0,
            known = 0;
          for (let i = 0; i < c.width; i++) {
            const v = read("b" + i);
            value = (value | (v.value << i)) >>> 0;
            known = (known | (v.known << i)) >>> 0;
          }
          put("out", signal(value, c.width, known));
          break;
        }
        case "decoder": {
          const v = read("in");
          for (let i = 0; i < 2 ** Math.min(c.width, 5); i++)
            put(
              "o" + i,
              defined(v) ? signal(Number(v.value === i), 1) : unknown(1),
            );
          break;
        }
        case "register":
        case "dff":
        case "counter":
          put("q", this.state.get(c.id)!);
          break;
        case "keyboard": {
          const d = this.devices.get(c.id)!;
          if (d.kind === "keyboard") {
            put("data", d.uncertain ? unknown(8) : signal(d.queue[0] ?? 0, 8));
            put(
              "ready",
              d.uncertain ? unknown(1) : signal(Number(d.queue.length > 0), 1),
            );
          }
          break;
        }
        case "terminal":
          break;
        case "display": {
          const d = this.devices.get(c.id)!,
            x = read("x"),
            y = read("y");
          put(
            "out",
            d.kind === "display" && defined(x) && defined(y)
              ? d.pixels[y.value * 64 + x.value]
              : unknown(1),
          );
          break;
        }
        case "ram":
        case "rom": {
          const addr = read("addr");
          put(
            "out",
            defined(addr)
              ? (this.memory.get(c.id)?.[addr.value] ?? unknown(c.width))
              : unknown(c.width),
          );
          break;
        }
      }
    }
  }
  step() {
    if (!this.valid) return;
    this.settle();
    const next = new Map<string, Signal>();
    const writes: { id: string; addr: number; data: Signal }[] = [];
    for (const c of this.compiled.components) {
      if (["register", "dff", "counter"].includes(c.kind)) {
        const old = this.state.get(c.id)!,
          rst = this.read(c, "rst"),
          en = this.read(c, "en");
        const data =
          c.kind === "counter"
            ? defined(old)
              ? signal(old.value + 1, c.width)
              : unknown(c.width)
            : this.read(c, "d");
        const enabled = defined(en)
          ? en.value
            ? data
            : old
          : merge(old, data);
        const reset = signal(c.params.initial ?? 0, c.width);
        next.set(
          c.id,
          defined(rst) ? (rst.value ? reset : enabled) : merge(reset, enabled),
        );
      }
      if (c.kind === "ram") {
        const we = this.read(c, "we"),
          addr = this.read(c, "addr");
        if (defined(we) && we.value && defined(addr))
          writes.push({
            id: c.id,
            addr: addr.value,
            data: this.read(c, "data"),
          });
        else if ((!defined(we) || we.value) && !defined(addr)) {
          const mem = this.memory.get(c.id)!;
          for (let i = 0; i < mem.length; i++)
            writes.push({ id: c.id, addr: i, data: unknown(c.width) });
        } else if (!defined(we) && defined(addr)) {
          writes.push({
            id: c.id,
            addr: addr.value,
            data: merge(
              this.memory.get(c.id)![addr.value],
              this.read(c, "data"),
            ),
          });
        }
      }
    }
    for (const [id, d] of this.devices) {
      const c = this.byId.get(id)!;
      const enabled = this.read(c, d.kind === "keyboard" ? "read" : "write"),
        clear = this.read(c, "clear");
      if (defined(clear) && clear.value)
        this.transactions.push({
          cycle: this.cycle + 1,
          component: id,
          kind: "clear",
          value: 1,
          known: 1,
        });
      else if (defined(enabled) && enabled.value) {
        const data =
          d.kind === "keyboard" ? this.get(id, "data") : this.read(c, "data");
        this.transactions.push({
          cycle: this.cycle + 1,
          component: id,
          kind: d.kind === "keyboard" ? "read" : "write",
          value: data.value,
          known: data.known,
          ...(d.kind === "display"
            ? {
                address: this.read(c, "y").value * 64 + this.read(c, "x").value,
              }
            : {}),
        });
      }
    }
    for (const w of writes)
      this.transactions.push({
        cycle: this.cycle + 1,
        component: w.id,
        kind: "write",
        address: w.addr,
        value: w.data.value,
        known: w.data.known,
      });
    this.transactions = this.transactions.slice(-128);
    const devices = new Map(
      [...this.devices].map(([id, d]) => [
        id,
        sampleDevice(d, (p) => this.read(this.byId.get(id)!, p)),
      ]),
    );
    this.devices = devices;
    for (const [id, value] of next) this.state.set(id, value);
    for (const w of writes) this.memory.get(w.id)![w.addr] = w.data;
    this.cycle++;
    this.settle();
  }
  enqueue(id: string, text: string) {
    const d = this.devices.get(id);
    if (d?.kind !== "keyboard") throw new Error("missingKeyboard");
    const bytes = Array.from(new TextEncoder().encode(text));
    if (d.queue.length + bytes.length > 256)
      throw new Error("keyboardOverflow");
    this.devices.set(id, { ...d, queue: [...d.queue, ...bytes] });
    this.settle();
  }
  capture(previous?: ExecutionState): ExecutionState {
    const memory: ExecutionState["memory"] = {};
    for (const [id, words] of this.memory) {
      const pages: (readonly Signal[])[] = [];
      for (let i = 0; i < words.length; i += PAGE_WORDS) {
        const old = previous?.memory[id]?.[i / PAGE_WORDS];
        pages.push(
          old && old.every((v, j) => v === words[i + j])
            ? old
            : words.slice(i, i + PAGE_WORDS),
        );
      }
      memory[id] = pages;
    }
    return {
      transactions: structuredClone(this.transactions),
      fingerprint: this.fingerprint,
      cycle: this.cycle,
      eventOrder: this.eventOrder,
      registers: Object.fromEntries(this.state),
      memory,
      inputs: Object.fromEntries(this.inputs),
      devices: structuredClone(Object.fromEntries(this.devices)),
    };
  }
  restore(saved: ExecutionState) {
    if (saved.fingerprint !== this.fingerprint)
      throw new Error("historyMismatch");
    this.transactions = structuredClone(saved.transactions);
    this.cycle = saved.cycle;
    this.eventOrder = saved.eventOrder;
    this.state = new Map(Object.entries(saved.registers));
    this.memory = new Map(
      Object.entries(saved.memory).map(([id, pages]) => [id, pages.flat()]),
    );
    this.inputs = new Map(Object.entries(saved.inputs));
    this.devices = new Map(Object.entries(structuredClone(saved.devices)));
    this.values.clear();
    this.settle();
  }
  editMemory(id: string, address: number, value: number, known?: number) {
    const c = this.byId.get(id),
      m = this.memory.get(id);
    if (
      c?.kind !== "ram" ||
      !m ||
      !Number.isInteger(address) ||
      address < 0 ||
      address >= m.length
    )
      throw new Error("invalidMemoryAddress");
    m[address] = signal(value, c.width, known);
    this.settle();
  }
  snapshot(memoryIds: string[] = []): Snapshot {
    const values: Record<string, Signal> = {};
    for (const c of this.compiled.components)
      for (const p of this.pinMap.get(c.id)!)
        values[c.id + ":" + p.id] = this.get(c.id, p.id);
    for (const [id] of this.compiled.aliases) {
      const at = id.lastIndexOf(":");
      values[id] = this.get(id.slice(0, at), id.slice(at + 1));
    }
    return {
      cycle: this.cycle,
      devices: structuredClone(Object.fromEntries(this.devices)),
      transactions: this.transactions,
      values,
      memory: Object.fromEntries(
        memoryIds
          .filter((id) => this.memory.has(id))
          .map((id) => [
            id,
            this.memory.get(id)!.map((v) => (defined(v) ? v.value : -1)),
          ]),
      ),
    };
  }
}
export type VectorResult = {
  name: string;
  passed: boolean;
  expected: Record<string, number>;
  actual: Record<string, number | null>;
};
export function runVectors(
  project: Project,
  root: string,
  vectors: TestVector[],
): VectorResult[] {
  return vectors.map((v) => {
    const e = new Engine(project, root);
    for (const [id, value] of Object.entries(v.inputs)) e.setInput(id, value);
    for (let i = 0; i < (v.cycles ?? 0); i++) e.step();
    const actual: Record<string, number | null> = {};
    for (const [id] of Object.entries(v.outputs)) {
      const split = id.lastIndexOf(":");
      const s = e.get(id.slice(0, split), id.slice(split + 1));
      actual[id] = defined(s) ? s.value : null;
    }
    return {
      name: v.name,
      expected: v.outputs,
      actual,
      passed:
        e.valid &&
        Object.entries(v.outputs).every(([id, value]) => actual[id] === value),
    };
  });
}
