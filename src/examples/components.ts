import { Builder } from "./adder";
import { GateBuilder, layoutGateProject } from "../course/logic";
import { closure } from "../library/package";
import { rerouteAutomatic } from "../editor/routing";
import type { Project } from "../model/types";

export function shiftRegister(): Project {
  const b = new GateBuilder("8-bit shift register");
  const serial = b.input("serialIn"),
    parallel = b.input("parallelIn", 8),
    load = b.input("load"),
    shift = b.input("shift"),
    rst = b.input("rst");
  b.node("register", 8, "Storage");
  const q: [string, string] = ["Storage", "q"],
    bits = b.bits(q, 8);
  const shifted = b.join([serial, ...bits.slice(0, 7)]);
  const selected = b.mux(b.mux(q, shifted, shift, 8), parallel, load, 8);
  b.connect(...selected, "Storage", "d");
  b.connect(...b.constant(1), "Storage", "en");
  b.connect(...rst, "Storage", "rst");
  b.output("q", q, 8);
  b.output("serialOut", bits[7]);
  return layoutGateProject(b.p);
}

export function embedCircuit(
  b: Builder,
  definition: Project,
  id: string,
  x: number,
  y: number,
) {
  Object.assign(b.p.circuits, closure(definition, definition.root));
  b.add(id, "instance", x, y);
  b.c.components.find((c) => c.id === id)!.definitionId = definition.root;
}
export function shiftExample(): Project {
  const b = new Builder("Serial and parallel shift register");
  embedCircuit(b, shiftRegister(), "Shift", 240, 0);
  for (const [id, port, width, y] of [
    ["Serial", "serialIn", 1, 0],
    ["Parallel", "parallelIn", 8, 120],
    ["Load", "load", 1, 240],
    ["Shift enable", "shift", 1, 360],
    ["Reset", "rst", 1, 480],
  ] as const) {
    b.add(id, "input", 0, y, width);
    b.connect(id, "out", "Shift", port);
  }
  b.add("Parallel output", "probe", 480, 0, 8);
  b.add("Serial output", "probe", 480, 140);
  b.connect("Shift", "q", "Parallel output", "in");
  b.connect("Shift", "serialOut", "Serial output", "in");
  rerouteAutomatic(b.c, b.p);
  return b.p;
}
export const builtinCircuits = [
  {
    id: "shiftRegister",
    category: "storage",
    symbol: "SHIFT",
    create: shiftRegister,
  },
];
