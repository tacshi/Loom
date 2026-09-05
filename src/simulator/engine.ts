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
};
export class Engine {
  readonly compiled: Compiled;
  readonly byId: Map<string, Component>;
  readonly pinMap: Map<string, ReturnType<typeof ports>>;
  values = new Map<string, Signal>();
  state = new Map<string, Signal>();
  memory = new Map<string, Signal[]>();
  inputs = new Map<string, number>();
  cycle = 0;
  constructor(
    public project: Project,
    root = project.root,
  ) {
    this.compiled = compile(project, root);
    this.byId = new Map(this.compiled.components.map((c) => [c.id, c]));
    this.pinMap = new Map(
      this.compiled.components.map((c) => [c.id, ports(c)]),
    );
    this.reset();
  }
  get valid() {
    return !this.compiled.diagnostics.some((d) => d.severity === "error");
  }
  read(c: Component, p: string): Signal {
    const port = this.pinMap.get(c.id)!.find((x) => x.id === p),
      source = this.compiled.sources.get(c.id + ":" + p);
    return source
      ? (this.values.get(key(source)) ?? unknown(port?.width ?? c.width))
      : unknown(port?.width ?? c.width);
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
    this.values.clear();
    this.state.clear();
    this.memory.clear();
    if (!this.valid) return;
    for (const c of this.compiled.components) {
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
      const read = (p: string) => this.read(c, p),
        put = (p: string, s: Signal) => this.values.set(c.id + ":" + p, s);
      const a = () => read("a"),
        b = () => read("b");
      switch (c.kind) {
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
    for (const [id, value] of next) this.state.set(id, value);
    for (const w of writes) this.memory.get(w.id)![w.addr] = w.data;
    this.cycle++;
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
