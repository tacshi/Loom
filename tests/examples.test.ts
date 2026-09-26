import { it, expect } from "vitest";
import {
  shiftExample,
  encoderExample,
  buttonExample,
  busExample,
} from "../src/examples/components";
import { counterExample, swapExample } from "../src/examples/sequential";
import { fullAdder } from "../src/examples/adder";
import { sevenSegmentExample } from "../src/examples/sevenSegment";
import { compile } from "../src/simulator/compiler";

// Every entry in "Open example…" must build; a routing failure used to
// leave the selector silently doing nothing.
const examples = {
  shift: shiftExample,
  encoder: encoderExample,
  button: buttonExample,
  bus: busExample,
  counter: counterExample,
  swap: swapExample,
  adder: fullAdder,
  segments: () => sevenSegmentExample(),
  segmentCounter: () => sevenSegmentExample("counter"),
  segmentRom: () => sevenSegmentExample("rom"),
};

for (const [name, create] of Object.entries(examples))
  it(`builds the ${name} example without structural errors`, () => {
    const project = create();
    expect(
      compile(project).diagnostics.filter((d) => d.severity === "error"),
    ).toEqual([]);
  });
