import { it, expect } from "vitest";
import {
  signal,
  floating,
  unknown,
  format,
  resolveDrivers,
} from "../src/simulator/signal";
import { Builder } from "../src/examples/adder";
import { Engine } from "../src/simulator/engine";
import { removeRouteConnection, ref } from "../src/model/nets";
import {
  busExample,
  embedCircuit,
  priorityEncoder,
  shiftRegister,
} from "../src/examples/components";
import { GateBuilder } from "../src/course/logic";
import { sourceChain } from "../src/simulator/debug";
import { exportProject } from "../src/persistence/serialization";
import { parseProject } from "../src/persistence/validation";
import { runCase } from "../src/verification/runner";

it("resolves all four one-bit states in either driver order", () => {
  const states = [signal(0, 1), signal(1, 1), unknown(1), floating(1)];
  const table = [
    ["0", "X", "X", "0"],
    ["X", "1", "X", "1"],
    ["X", "X", "X", "X"],
    ["0", "1", "X", "Z"],
  ];
  for (let a = 0; a < 4; a++)
    for (let b = 0; b < 4; b++) {
      const r = resolveDrivers([states[a], states[b]], 1);
      expect(format(r.signal)).toBe(table[a][b]);
      expect(r.contention).toBe(
        Number((a === 0 && b === 1) || (a === 1 && b === 0)),
      );
    }
  expect(format(resolveDrivers([], 8).signal)).toBe("Z");
  const partial = resolveDrivers([signal(1, 4, 3, 12), signal(0, 4, 2, 13)], 4);
  expect(format(partial.signal, 2)).toBe("ZZ01");
  expect(format(partial.signal, 16)).toBe("X");
});

it("retains three ordinary drivers, diagnoses contention and removes only the disconnected driver", () => {
  const b = new Builder("Three drivers");
  b.add("P", "probe", 600, 0, 8);
  for (const [i, v] of [85, 85, 170].entries()) {
    b.add("D" + i, "input", 0, i * 140, 8, v);
    b.connect("D" + i, "out", "P", "in");
  }
  let e = new Engine(b.p);
  expect(e.valid).toBe(true);
  expect(format(e.get("P", "in"))).toBe("X");
  expect(e.contentions()[0].args?.bits).toBe("FF");
  expect(
    sourceChain(e, "P", "in").filter((s) => s.id.startsWith("D")),
  ).toHaveLength(3);
  removeRouteConnection(
    b.c,
    b.c.wires.find((w) => w.from.component === "D2")!.id,
  );
  e = new Engine(b.p);
  expect(e.get("P", "in").value).toBe(85);
  expect(e.contentions()).toEqual([]);
});

it("tri-state enable and readback survive project round trips and rewind", () => {
  const e = new Engine(parseProject(exportProject(busExample())));
  expect(e.valid).toBe(true);
  expect(format(e.get("Bus", "in"))).toBe("Z");
  e.setInput("Enable A", 1);
  expect(e.get("Bus", "in").value).toBe(165);
  const saved = e.capture();
  e.setInput("Enable B", 1);
  expect(format(e.get("Bus", "in"))).toBe("X");
  e.restore(saved);
  expect(e.get("Bus", "in").value).toBe(165);
  expect(e.contentions()).toEqual([]);
});

it("preserves floating bits through hierarchy/split/join and converts them at storage and logic", () => {
  const child = new GateBuilder("Tri output");
  const data = child.input("data", 8),
    en = child.input("enable");
  child.node("triState", 8, "Tri");
  child.connect(...data, "Tri", "data");
  child.connect(...en, "Tri", "enable");
  child.output("out", ["Tri", "out"], 8);
  const b = new Builder("Hierarchy");
  b.add("Zero", "constant", 0, 0, 8);
  b.add("Off", "constant", 0, 120);
  for (const id of ["One", "Two"]) {
    embedCircuit(b, child.p, id, 240, 0);
    b.connect("Zero", "out", id, "data");
    b.connect("Off", "out", id, "enable");
  }
  b.add("Split", "split", 480, 0, 8);
  b.add("Join", "join", 720, 0, 8);
  b.connect("One", "out", "Split", "in");
  b.connect("Two", "out", "Split", "in");
  for (let i = 0; i < 8; i++) b.connect("Split", "b" + i, "Join", "b" + i);
  b.add("Store", "register", 960, 0, 8);
  b.add("On", "constant", 0, 240, 1, 1);
  b.connect("Join", "out", "Store", "d");
  b.connect("On", "out", "Store", "en");
  b.connect("Off", "out", "Store", "rst");
  const e = new Engine(b.p);
  expect(e.valid).toBe(true);
  expect(format(e.get("Join", "out"))).toBe("Z");
  expect(sourceChain(e, "Split", "in").some((s) => s.id === "One/Tri")).toBe(
    true,
  );
  expect(sourceChain(e, "Split", "in").some((s) => s.id === "Two/Tri")).toBe(
    true,
  );
  e.step();
  expect(e.get("Store", "q").highZ).toBe(0);
  expect(format(e.get("Store", "q"))).toBe("X");
});

it("validates and executes floating signal assertions", () => {
  const p = busExample();
  const test = {
    id: "z",
    name: "Floating bus",
    seed: 1,
    maxCycles: 1,
    steps: [
      {
        cycles: 0,
        assertions: [
          {
            type: "signal" as const,
            ref: ref("Bus", "in"),
            value: 0,
            known: 0,
            highZ: 255,
          },
        ],
      },
    ],
  };
  p.circuits[p.root].tests = [test];
  const copy = parseProject(exportProject(p));
  expect(runCase(copy, copy.root, test).status).toBe("passed");
});

it("highest known encoder request dominates floating lower requests", () => {
  const b = new Builder("Unknown priority");
  embedCircuit(b, priorityEncoder(), "E", 400, 0);
  b.add("Bits", "join", 200, 0, 8);
  b.add("High", "constant", 0, 0, 1, 1);
  b.connect("High", "out", "Bits", "b7");
  b.connect("Bits", "out", "E", "requests");
  const e = new Engine(b.p);
  expect(e.get("E", "index")).toEqual(signal(7, 3));
  expect(e.get("E", "valid")).toEqual(signal(1, 1));
});

it("parallel loading overrides an unknown shift-register state", () => {
  const e = new Engine(shiftRegister());
  const saved = e.capture();
  saved.registers.Storage = unknown(8);
  e.restore(saved);
  e.setInput("parallelIn", 90);
  e.setInput("load", 1);
  e.step();
  expect(e.get("q", "in")).toEqual(signal(90, 8));
});

it("handles a 32-bit driver and unknown enable without confusing X with Z", () => {
  const b = new Builder("Wide driver");
  b.add("T", "triState", 240, 0, 32);
  b.add("Data", "constant", 0, 0, 32, 0xffffffff);
  b.connect("Data", "out", "T", "data");
  let e = new Engine(b.p);
  expect(e.get("T", "out")).toEqual(unknown(32));
  b.add("Enable", "input", 0, 140);
  b.connect("Enable", "out", "T", "enable");
  e = new Engine(b.p);
  expect(e.get("T", "out")).toEqual(floating(32));
  e.setInput("Enable", 1);
  expect(e.get("T", "out")).toEqual(signal(0xffffffff, 32));
});

it("merges existing nets and reassigns their route and marker references", () => {
  const b = new Builder("Merge buses");
  for (const [id, y] of [
    ["A", 0],
    ["B", 140],
  ] as const) {
    b.add(id, "constant", 0, y, 1, 1);
    b.add(id + "P", "probe", 240, y);
    b.connect(id, "out", id + "P", "in");
  }
  const target = b.c.nets[0].id,
    source = b.c.nets[1].id;
  b.c.markers.push({ id: "m", netId: source, x: 0, y: 0, rotation: 0 });
  b.connect("B", "out", "AP", "in");
  expect(b.c.nets).toHaveLength(1);
  expect(b.c.nets[0].id).toBe(target);
  expect(b.c.markers[0].netId).toBe(target);
  expect(b.c.wires.every((w) => w.netId === target)).toBe(true);
  const e = new Engine(parseProject(exportProject(b.p)));
  expect(e.valid).toBe(true);
  expect(e.get("AP", "in")).toEqual(signal(1, 1));
});

it("disconnecting a bridge splits buses without losing their remaining connections", () => {
  const b = new Builder("Split buses");
  for (const [id, y, value] of [
    ["A", 0, 1],
    ["B", 140, 0],
  ] as const) {
    b.add(id, "constant", 0, y, 1, value);
    b.add(id + "P", "probe", 240, y);
    b.connect(id, "out", id + "P", "in");
  }
  b.connect("B", "out", "AP", "in");
  expect(format(new Engine(b.p).get("AP", "in"))).toBe("X");
  const net = b.c.nets[0].id;
  b.c.markers.push({
    id: "label",
    netId: net,
    endpoint: { component: "BP", port: "in" },
    x: 300,
    y: 140,
    rotation: 0,
  });
  removeRouteConnection(
    b.c,
    b.c.wires.find((w) => w.from.component === "B" && w.to.component === "AP")!
      .id,
  );
  expect(b.c.nets).toHaveLength(2);
  const e = new Engine(parseProject(exportProject(b.p)));
  expect(e.valid).toBe(true);
  expect(e.get("AP", "in")).toEqual(signal(1, 1));
  expect(e.get("BP", "in")).toEqual(signal(0, 1));
  expect(b.c.markers[0].netId).toBe(
    b.c.nets.find((n) => n.ports.some((p) => p.component === "BP"))!.id,
  );
});

it("compilation includes every driver without a driver-by-sink product", async () => {
  const b = new Builder("Many bus taps");
  for (let i = 0; i < 30; i++) {
    b.add("D" + i, "input", 0, i * 100);
    b.add("P" + i, "probe", 200, i * 100);
  }
  b.c.nets = [
    {
      id: "bus",
      width: 1,
      ports: b.c.components.map((c) => ({
        component: c.id,
        port: c.kind === "input" ? "out" : "in",
      })),
    },
  ];
  const e = new Engine(b.p);
  expect(e.valid).toBe(true);
  expect(e.compiled.sources.get("P0:in")).toHaveLength(30);
});

it("extracting a shared bus preserves drivers on both sides without a false cycle", async () => {
  const { extract } = await import("../src/model/hierarchy");
  const b = new Builder("Cross-boundary bus");
  b.add("A", "constant", 0, 0, 1, 0);
  b.add("B", "constant", 0, 160, 1, 1);
  b.add("P", "probe", 240, 0);
  b.add("Q", "probe", 480, 0);
  b.connect("A", "out", "P", "in");
  b.connect("B", "out", "P", "in");
  b.connect("A", "out", "Q", "in");
  expect(format(new Engine(b.p).get("Q", "in"))).toBe("X");
  extract(b.p, b.p.root, ["B", "P"], "Bus cell", false);
  const e = new Engine(b.p);
  expect(e.valid).toBe(true);
  expect(format(e.get("Q", "in"))).toBe("X");
});
