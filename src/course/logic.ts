import { rerouteAutomatic } from "../editor/routing";
import { Builder } from "../examples/adder";
import { ports, baseGeometry, pinLayout } from "../model/components";
import type { Kind, Project, Circuit } from "../model/types";
type Pin = [string, string];
export class GateBuilder extends Builder {
  constructor(name: string) {
    super(name);
    this.c.name = name;
  }
  serial = 0;
  node(kind: Kind, width = 1, name?: string): Pin {
    const n = this.serial++,
      id = name ?? "g" + n;
    this.add(id, kind, 240 + (n % 6) * 240, Math.floor(n / 6) * 240, width);
    return [id, "out"];
  }
  input(name: string, width = 1): Pin {
    const p = this.node("portIn", width, name);
    this.c.ports.push({
      id: name,
      name,
      direction: "in",
      width,
      componentId: name,
    });
    return p;
  }
  output(name: string, p: Pin, width = 1) {
    this.node("portOut", width, name);
    this.connect(...p, name, "in");
    this.c.ports.push({
      id: name,
      name,
      direction: "out",
      width,
      componentId: name,
    });
  }
  nand(a: Pin, b: Pin, width = 1): Pin {
    const p = this.node("nand", width);
    this.connect(...a, p[0], "a");
    this.connect(...b, p[0], "b");
    return p;
  }
  not(a: Pin, w = 1) {
    return this.nand(a, a, w);
  }
  and(a: Pin, b: Pin, w = 1) {
    return this.not(this.nand(a, b, w), w);
  }
  or(a: Pin, b: Pin, w = 1) {
    return this.nand(this.not(a, w), this.not(b, w), w);
  }
  xor(a: Pin, b: Pin, w = 1) {
    const n = this.nand(a, b, w);
    return this.nand(this.nand(a, n, w), this.nand(b, n, w), w);
  }
  constant(value: number, width = 1): Pin {
    const p = this.node("constant", width);
    this.c.components.find((n) => n.id === p[0])!.params.value = value;
    return p;
  }
  bits(p: Pin, w: number): Pin[] {
    const n = this.node("split", w);
    this.connect(...p, n[0], "in");
    return Array.from({ length: w }, (_, i) => [n[0], "b" + i]);
  }
  join(bits: Pin[]): Pin {
    const p = this.node("join", bits.length);
    bits.forEach((v, i) => this.connect(...v, p[0], "b" + i));
    return p;
  }
  mux(a: Pin, b: Pin, s: Pin, w = 1): Pin {
    const mask = w === 1 ? s : this.join(Array.from({ length: w }, () => s));
    return this.or(this.and(a, this.not(mask, w), w), this.and(b, mask, w), w);
  }
  sumBus(
    a: Pin,
    b: Pin,
    w: number,
    subtract = false,
  ): { out: Pin; carry: Pin } {
    const cell = new GateBuilder("Full adder cell"),
      ca = cell.input("a"),
      cb = cell.input("b"),
      cin = cell.input("cin");
    const x = cell.xor(ca, cb);
    cell.output("sum", cell.xor(x, cin));
    cell.output("carry", cell.or(cell.and(ca, cb), cell.and(x, cin)));
    this.p.circuits[cell.c.id] = cell.c;
    const aa = this.bits(a, w),
      bb = this.bits(b, w),
      result: Pin[] = [];
    let carry = this.constant(subtract ? 1 : 0);
    for (let i = 0; i < w; i++) {
      const v = subtract ? this.not(bb[i]) : bb[i],
        n = this.node("instance", 1, "bit" + i + "_" + this.serial);
      this.c.components.find((c) => c.id === n[0])!.definitionId = cell.c.id;
      this.connect(...aa[i], n[0], "a");
      this.connect(...v, n[0], "b");
      this.connect(...carry, n[0], "cin");
      result.push([n[0], "sum"]);
      carry = [n[0], "carry"];
    }
    return { out: this.join(result), carry };
  }
}
export function layoutGateProject(p: Project): Project {
  for (const c of Object.values(p.circuits)) {
    const rank = new Map<string, number>();
    for (const n of c.components)
      if (
        [
          "input",
          "portIn",
          "constant",
          "register",
          "counter",
          "dff",
          "ram",
          "rom",
          "keyboard",
        ].includes(n.kind)
      )
        rank.set(n.id, 0);
    for (let pass = 0; pass < c.components.length; pass++)
      for (const n of c.components) {
        if (rank.has(n.id)) continue;
        const incoming = c.wires
          .filter((w) => w.to.component === n.id)
          .map((w) => w.from.component);
        if (incoming.every((id) => rank.has(id)))
          rank.set(
            n.id,
            incoming.length
              ? Math.max(...incoming.map((id) => rank.get(id)!)) + 1
              : 0,
          );
      }
    const rows = new Map<number, number>();
    for (const n of c.components) {
      const x = rank.get(n.id) ?? 0,
        y = rows.get(x) ?? 0;
      n.x = x * 280;
      n.y = y * 220;
      rows.set(x, y + 1);
    }
    rerouteAutomatic(c, p, { attempts: 8, searchLimit: 60000 });
  }
  return p;
}
const primitives = new Set<Kind>([
  "input",
  "constant",
  "probe",
  "portIn",
  "portOut",
  "nand",
  "split",
  "join",
  "register",
  "counter",
  "dff",
  "ram",
  "rom",
  "keyboard",
  "terminal",
  "display",
  "instance",
]);
export function gateDefinition(
  kind: Kind,
  width = 1,
  needed?: string[],
): Project {
  const b = new GateBuilder(kind + " " + width),
    dummy = { id: "x", kind, width, params: {}, name: "x", x: 0, y: 0 };
  const pins = new Map(
    ports(dummy)
      .filter((p) => p.direction === "in")
      .map((p) => [p.id, b.input(p.id, p.width)]),
  );
  const a = pins.get("a")!,
    c = pins.get("b")!;
  let out: Pin;
  switch (kind) {
    case "not":
      out = b.not(a, width);
      break;
    case "buffer":
      out = pins.get("in")!;
      break;
    case "and":
      out = b.and(a, c, width);
      break;
    case "or":
      out = b.or(a, c, width);
      break;
    case "xor":
      out = b.xor(a, c, width);
      break;
    case "nor":
      out = b.not(b.or(a, c, width), width);
      break;
    case "xnor":
      out = b.not(b.xor(a, c, width), width);
      break;
    case "mux":
      out = b.mux(a, c, pins.get("sel")!, width);
      break;
    case "adder":
    case "subtractor": {
      const r = b.sumBus(a, c, width, kind === "subtractor");
      out = r.out;
      b.output("carry", r.carry);
      break;
    }
    case "compare": {
      if (!needed || needed.includes("eq")) {
        const bits = b.bits(b.xor(a, c, width), width);
        let any = bits[0];
        for (const bit of bits.slice(1)) any = b.or(any, bit);
        b.output("eq", b.not(any));
      }
      if (!needed || needed.includes("lt")) {
        const result = b.sumBus(a, c, width, true);
        b.output("lt", b.not(result.carry));
      }
      return layoutGateProject(b.p);
    }
    case "decoder": {
      const bits = b.bits(pins.get("in")!, width);
      for (let i = 0; i < 2 ** width; i++) {
        let v = b.constant(1);
        bits.forEach(
          (bit, j) => (v = b.and(v, (i >> j) & 1 ? bit : b.not(bit))),
        );
        b.output("o" + i, v);
      }
      return layoutGateProject(b.p);
    }
    default:
      throw new Error("Unsupported course gate: " + kind);
  }
  b.output("out", out, width);
  const order = ports(dummy).map((p) => p.id);
  b.c.ports.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  return layoutGateProject(b.p);
}
/** Compile authored reference schematics into actual editable NAND logic, never runtime emulation. */
export function lowerToNand(project: Project): Project {
  const p = structuredClone(project),
    definitions = new Map<string, string>();
  for (const c of Object.values(p.circuits))
    for (const n of c.components) {
      if (primitives.has(n.kind)) continue;
      const needed =
        n.kind === "compare"
          ? ["eq", "lt"].filter((port) =>
              c.nets.some(
                (net) =>
                  net.ports.length > 1 &&
                  net.ports.some(
                    (e) => e.component === n.id && e.port === port,
                  ),
              ),
            )
          : undefined;
      const key = n.kind + ":" + n.width + ":" + (needed ?? []).join();
      let id = definitions.get(key);
      if (!id) {
        const generated = gateDefinition(n.kind, n.width, needed);
        id = generated.root;
        Object.assign(p.circuits, generated.circuits);
        definitions.set(key, id);
      }
      const bounds = baseGeometry(n, p),
        pins = Object.fromEntries(
          p.circuits[id].ports.map((port) => [
            port.id,
            pinLayout(n, port.id, p),
          ]),
        );
      n.appearance = {
        ...n.appearance,
        rotation: n.appearance?.rotation ?? 0,
        width: bounds.w,
        height: bounds.h,
        pins,
      };
      n.kind = "instance";
      n.definitionId = id;
    }
  return p;
}
