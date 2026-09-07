import { rerouteAutomatic } from "../editor/routing";
import { Builder } from "./adder";
import {
  GateBuilder,
  gateDefinition,
  layoutGateProject,
} from "../course/logic";
import { closure } from "../library/package";
import type { Project } from "../model/types";

export const hexSegments = [
  0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f, 0x77, 0x7c, 0x39,
  0x5e, 0x79, 0x71,
];
export const segmentPins = ["a", "b", "c", "d", "e", "f", "g", "dp"];

export function attachDigit(
  b: Builder,
  source: [string, string],
  x: number,
  y: number,
) {
  b.add("Segment bits", "split", x, y, 8);
  b.add("Digit", "sevenSegment", x + 160, y);
  b.connect(...source, "Segment bits", "in");
  segmentPins.forEach((pin, bit) =>
    b.connect("Segment bits", "b" + bit, "Digit", pin),
  );
}

/** Shannon selection built entirely from NAND gates, constants and bus wiring. */
export function sevenSegmentDecoder(): Project {
  const b = new GateBuilder("Hexadecimal decoder");
  const bits = b.bits(b.input("value", 4), 4);
  const mux = gateDefinition("mux", 8);
  Object.assign(b.p.circuits, mux.circuits);
  const constants = new Map<number, [string, string]>();
  function select(values: number[], bit: number): [string, string] {
    if (values.length === 1) {
      let pin = constants.get(values[0]);
      if (!pin) {
        pin = b.constant(values[0], 8);
        constants.set(values[0], pin);
      }
      return pin;
    }
    const half = values.length / 2;
    const low = select(values.slice(0, half), bit - 1);
    const high = select(values.slice(half), bit - 1);
    const node = b.node("instance", 8);
    b.c.components.find((c) => c.id === node[0])!.definitionId = mux.root;
    b.connect(...low, node[0], "a");
    b.connect(...high, node[0], "b");
    b.connect(...bits[bit], node[0], "sel");
    return node;
  }
  const output = select(hexSegments, 3);
  b.output("segments", output, 8);
  attachDigit(b, output, 2400, 0);
  return layoutGateProject(b.p);
}

export function sevenSegmentExample(
  mode: "manual" | "counter" | "rom" = "manual",
  decoder?: Project,
): Project {
  const b = new Builder(
    mode === "counter"
      ? "Hexadecimal counter"
      : mode === "rom"
        ? "ROM hexadecimal display"
        : "Hexadecimal decoder",
  );
  let source: [string, string];
  if (mode === "counter") {
    b.add("Enable", "input", 0, 260, 1, 1);
    b.add("Reset", "input", 160, 260);
    b.add("Count", "counter", 0, 0, 4);
    b.connect("Enable", "out", "Count", "en");
    b.connect("Reset", "out", "Count", "rst");
    source = ["Count", "q"];
  } else {
    b.add("Value", "input", 0, 0, 4);
    source = ["Value", "out"];
  }
  const x = 160;
  if (mode === "rom") {
    b.add("Lookup", "rom", x, 0, 8);
    const rom = b.c.components.find((c) => c.id === "Lookup")!;
    rom.params.addressBits = 4;
    rom.image = [...hexSegments];
    b.connect(...source, "Lookup", "addr");
    source = ["Lookup", "out"];
  } else {
    const definition = decoder ?? sevenSegmentDecoder();
    Object.assign(b.p.circuits, closure(definition, definition.root));
    b.add("Decoder", "instance", x, 0);
    b.c.components.find((c) => c.id === "Decoder")!.definitionId =
      definition.root;
    b.connect(...source, "Decoder", "value");
    source = ["Decoder", "segments"];
  }
  attachDigit(b, source, x + 160, 0);
  rerouteAutomatic(b.c, b.p);
  return b.p;
}
