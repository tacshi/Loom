import { rerouteAutomatic } from "../editor/routing";
import { LogicBuilder, cpuProject } from "./referenceCircuit";
import { Builder } from "../examples/adder";
import { assemble } from "./assembler";
import { createComponent } from "../model/types";
import { deriveNets } from "../model/nets";
export const echoSource = `; Echo UTF-8 bytes through the memory-mapped keyboard and terminal.
wait:
LDA 0xF0
JZ wait
LDA 0xF1
STA 0xF2
JMP wait`;
export const pixelSource = `; Draw pixel (12, 9), then echo keyboard input.
LDI 12
STA 0xF4
LDI 9
STA 0xF5
LDI 1
STA 0xF6
${echoSource}`;
export function ioDefinition() {
  const b = new LogicBuilder("Memory & I/O");
  b.c.name = "Memory & I/O";
  const addr = b.input("addr", 8),
    data = b.input("data", 8),
    write = b.input("we"),
    read = b.input("read"),
    low = b.constant("LOW", 1, 0),
    zero = b.constant("ZERO", 8, 0);
  const limit = b.constant("RAM limit", 8, 240);
  b.binary("RAM address", "compare", addr, limit, 8);
  const ramWrite = b.binary("RAM write", "and", ["RAM address", "lt"], write);
  b.node("Data RAM", "ram", 8);
  b.connect(...addr, "Data RAM", "addr");
  b.connect(...data, "Data RAM", "data");
  b.connect(...ramWrite, "Data RAM", "we");
  const selects = Array.from({ length: 7 }, (_, i) =>
    b.equal("Address F" + i, addr, 240 + i),
  );
  b.node("Keyboard", "keyboard", 8);
  const consume = b.binary("Consume byte", "and", selects[1], read);
  b.connect(...consume, "Keyboard", "read");
  b.connect(...low, "Keyboard", "clear");
  b.node("Terminal", "terminal", 8);
  b.connect(...data, "Terminal", "data");
  const terminalWrite = b.binary("Terminal write", "and", selects[2], write);
  b.connect(...terminalWrite, "Terminal", "write");
  b.node("Control bits", "split", 8);
  b.connect(...data, "Control bits", "in");
  const clear = b.binary("Clear write", "and", selects[3], write),
    clearTerminal = b.binary("Clear terminal", "and", clear, [
      "Control bits",
      "b0",
    ]),
    clearDisplay = b.binary("Clear display", "and", clear, [
      "Control bits",
      "b1",
    ]);
  b.connect(...clearTerminal, "Terminal", "clear");
  b.node("X", "register", 8);
  b.node("Y", "register", 8);
  for (const [id, select] of [
    ["X", selects[4]],
    ["Y", selects[5]],
  ] as const) {
    b.node(id + " value", "join", 8);
    for (let bit = 0; bit < 8; bit++) {
      if (bit < (id === "X" ? 6 : 5))
        b.connect("Control bits", "b" + bit, id + " value", "b" + bit);
      else b.connect(...low, id + " value", "b" + bit);
    }
    b.connect(id + " value", "out", id, "d");
    b.connect(...low, id, "rst");
    const en = b.binary(id + " write", "and", select, write);
    b.connect(...en, id, "en");
  }
  b.node("X bits", "split", 8);
  b.connect("X", "q", "X bits", "in");
  b.node("Y bits", "split", 8);
  b.connect("Y", "q", "Y bits", "in");
  b.node("Pixel X", "join", 6);
  b.node("Pixel Y", "join", 5);
  for (let i = 0; i < 6; i++) b.connect("X bits", "b" + i, "Pixel X", "b" + i);
  for (let i = 0; i < 5; i++) b.connect("Y bits", "b" + i, "Pixel Y", "b" + i);
  b.node("Display", "display");
  b.connect("Pixel X", "out", "Display", "x");
  b.connect("Pixel Y", "out", "Display", "y");
  b.connect("Control bits", "b0", "Display", "data");
  b.connect(...clearDisplay, "Display", "clear");
  const pixelWrite = b.binary("Pixel write", "and", selects[6], write);
  b.connect(...pixelWrite, "Display", "write");
  b.node("Ready byte", "join", 8);
  b.connect("Keyboard", "ready", "Ready byte", "b0");
  b.node("Pixel byte", "join", 8);
  b.connect("Display", "out", "Pixel byte", "b0");
  for (let i = 1; i < 8; i++) {
    b.connect(...low, "Ready byte", "b" + i);
    b.connect(...low, "Pixel byte", "b" + i);
  }
  let output = b.mux(
    "RAM read",
    zero,
    ["Data RAM", "out"],
    ["RAM address", "lt"],
  );
  for (const [i, value] of [
    [0, ["Ready byte", "out"]],
    [1, ["Keyboard", "data"]],
    [4, ["X", "q"]],
    [5, ["Y", "q"]],
    [6, ["Pixel byte", "out"]],
  ] as const)
    output = b.mux("Device read " + i, output, value, selects[i]);
  b.output("out", output, 8);
  return b.finish();
}
export function ioProject(source = echoSource) {
  const p = cpuProject(),
    c = p.circuits[p.root],
    io = ioDefinition();
  p.name = "Loom 8 I/O";
  p.circuits[io.id] = io;
  const ram = c.components.find((n) => n.id === "RAM")!;
  ram.kind = "instance";
  ram.definitionId = io.id;
  ram.name = "Memory & I/O";
  ram.appearance = { rotation: 0, width: 180, height: 140 };
  p.cpu!.ram = "RAM/Data RAM";
  const b = new Builder(p.name);
  b.p = p;
  const startX = 1800;
  let index = 0;
  const ops = [2, 4, 5, 6, 7, 8];
  for (const op of ops) {
    b.add("Read opcode " + op, "constant", startX, index * 140, 8, op);
    b.add("Read match " + op, "compare", startX + 200, index * 140, 8);
    b.connect("Fields", "opcode", "Read match " + op, "a");
    b.connect("Read opcode " + op, "out", "Read match " + op, "b");
    index++;
  }
  let prev = ["Read match 2", "eq"];
  for (const op of ops.slice(1)) {
    const id = "Read or " + op;
    b.add(id, "or", startX + 420, (op - 4) * 140);
    b.connect(prev[0], prev[1], id, "a");
    b.connect("Read match " + op, "eq", id, "b");
    prev = [id, "out"];
  }
  b.add("Qualified read", "and", startX + 640, 300);
  b.connect(prev[0], prev[1], "Qualified read", "a");
  b.connect("Signals", "b1", "Qualified read", "b");
  b.connect("Qualified read", "out", "RAM", "read");
  // Existing endpoints remain explicit; only the RAM primitive is replaced by an editable interface.
  deriveNets(c, p);
  rerouteAutomatic(c, p);
  const assembly = assemble(source);
  if (assembly.errors.length) throw new Error(JSON.stringify(assembly.errors));
  p.source = p.assembledSource = source;
  p.sourceMap = assembly.sourceMap;
  c.components.find((n) => n.id === "Program")!.image = assembly.image;
  c.vectors = [];
  c.tests = [];
  return p;
}
