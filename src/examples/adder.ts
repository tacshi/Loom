import {
  emptyProject,
  createComponent,
  uid,
  type Project,
  type Kind,
  type Endpoint,
} from "../model/types";
import { connect as connectNet } from "../model/nets";
import { pinPosition } from "../model/components";
import { orthogonal, protectTerminals } from "../editor/routing";
export class Builder {
  p: Project;
  constructor(name: string) {
    this.p = emptyProject(name);
  }
  get c() {
    return this.p.circuits[this.p.root];
  }
  add(id: string, kind: Kind, x: number, y: number, width = 1, value = 0) {
    const c = createComponent(kind, x, y, width);
    c.id = id;
    c.name = id;
    c.params.value = value;
    this.c.components.push(c);
    return id;
  }
  connect(a: string, ap: string, b: string, bp: string) {
    const from: Endpoint = { component: a, port: ap },
      to: Endpoint = { component: b, port: bp };
    const start = pinPosition(
        this.c.components.find((c) => c.id === a)!,
        ap,
        this.p,
      ),
      end = pinPosition(
        this.c.components.find((c) => c.id === b)!,
        bp,
        this.p,
      );
    connectNet(this.c, this.p, {
      id: uid(),
      from,
      to,
      points: protectTerminals(orthogonal(start, end)),
    });
  }
}
export function fullAdder() {
  const b = new Builder("NAND full adder");
  for (const [id, y] of [
    ["A", 0],
    ["B", 140],
    ["Cin", 280],
  ] as const)
    b.add(id, "input", 0, y);
  const layout = [
    ["n1", 200, 0],
    ["n2", 400, 0],
    ["n3", 400, 140],
    ["xorAB", 600, 60],
    ["n4", 800, 80],
    ["n5", 1000, 0],
    ["n6", 1000, 140],
    ["sum", 1200, 60],
    ["carry", 1000, 300],
  ] as const;
  for (const [id, x, y] of layout) b.add(id, "nand", x, y);
  for (const [a, ap, c, cp] of [
    ["A", "out", "n1", "a"],
    ["B", "out", "n1", "b"],
    ["A", "out", "n2", "a"],
    ["n1", "out", "n2", "b"],
    ["B", "out", "n3", "a"],
    ["n1", "out", "n3", "b"],
    ["n2", "out", "xorAB", "a"],
    ["n3", "out", "xorAB", "b"],
    ["xorAB", "out", "n4", "a"],
    ["Cin", "out", "n4", "b"],
    ["xorAB", "out", "n5", "a"],
    ["n4", "out", "n5", "b"],
    ["Cin", "out", "n6", "a"],
    ["n4", "out", "n6", "b"],
    ["n5", "out", "sum", "a"],
    ["n6", "out", "sum", "b"],
    ["n1", "out", "carry", "a"],
    ["n4", "out", "carry", "b"],
  ])
    b.connect(a, ap, c, cp);
  b.add("Sum", "probe", 1420, 60);
  b.add("Carry", "probe", 1420, 300);
  b.connect("sum", "out", "Sum", "in");
  b.connect("carry", "out", "Carry", "in");
  for (let a = 0; a < 2; a++)
    for (let n = 0; n < 2; n++)
      for (let cin = 0; cin < 2; cin++) {
        const result = a + n + cin;
        b.c.vectors.push({
          name: "" + a + n + cin,
          inputs: { A: a, B: n, Cin: cin },
          outputs: { "Sum:in": result & 1, "Carry:in": result >> 1 },
        });
      }
  return b.p;
}
