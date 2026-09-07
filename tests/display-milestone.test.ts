import { it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { sevenSegmentExample, segmentPins } from "../src/examples/sevenSegment";
import { Engine } from "../src/simulator/engine";
import { signal } from "../src/simulator/signal";
import { ioProject, sevenSegmentSource } from "../src/cpu/ioCircuit";
import { decodeMemory, encodeMemory } from "../src/persistence/memoryFile";
import { exportProject } from "../src/persistence/serialization";
import { parseProject } from "../src/persistence/validation";
import { Timeline } from "../src/simulator/timeline";

const expected = [
  63, 6, 91, 79, 102, 109, 125, 7, 127, 111, 119, 124, 57, 94, 121, 113,
];
function digit(e: Engine, mask: number) {
  segmentPins.forEach((pin, bit) =>
    expect(e.get("Digit", pin)).toEqual(signal((mask >> bit) & 1, 1)),
  );
}
it.each(["manual", "rom"] as const)(
  "%s decodes every hexadecimal input after project round trip",
  (mode) => {
    const p = sevenSegmentExample(mode);
    const e = new Engine(parseProject(exportProject(p)));
    expect(e.valid).toBe(true);
    expected.forEach((mask, value) => {
      e.setInput("Value", value);
      digit(e, mask);
    });
  },
  15000,
);
it("counter steps, holds, resets and wraps", () => {
  const e = new Engine(sevenSegmentExample("counter"));
  for (const mask of expected) {
    digit(e, mask);
    e.step();
  }
  digit(e, expected[0]);
  e.setInput("Enable", 0);
  e.step();
  digit(e, expected[0]);
  e.setInput("Enable", 1);
  e.step();
  digit(e, expected[1]);
  e.setInput("Reset", 1);
  e.step();
  digit(e, expected[0]);
}, 15000);
it("lookup asset matches hex/binary exports and rejects invalid images", () => {
  const words = decodeMemory(
    readFileSync("public/rom/seven-segment.hex", "utf8"),
    8,
    0,
    16,
  );
  expect(words).toEqual(expected);
  expect(decodeMemory(encodeMemory(words, 8), 8, 0, 16)).toEqual(expected);
  expect(() => decodeMemory("100", 8, 0, 16)).toThrow("invalidMemoryImage");
  expect(() => decodeMemory(encodeMemory(words, 8), 8, 1, 16)).toThrow(
    "invalidMemoryImage",
  );
});
it("CPU writes the full sequence at execute edges and restores the visible digit", () => {
  const e = new Engine(ioProject(sevenSegmentSource)),
    timeline = new Timeline(e);
  expect(e.valid).toBe(true);
  digit(e, 0);
  for (let i = 0; i < expected.length; i++) {
    for (let edge = 0; edge < 3; edge++) {
      timeline.step();
      digit(e, i ? expected[i - 1] : 0);
    }
    timeline.step();
    digit(e, expected[i]);
    e.settle();
    digit(e, expected[i]);
  }
  const head = timeline.info();
  timeline.seek(head.selected, { cycle: 4, eventOrder: 0 });
  digit(e, expected[0]);
  timeline.seek(head.selected, { cycle: 64, eventOrder: 0 });
  digit(e, expected[15]);
  e.step();
  e.step();
  expect(e.get("Halt", "q").value).toBe(1);
  e.reset();
  digit(e, 0);
});
it("F7 reads back and holds across reserved writes and F3 clear", () => {
  const e = new Engine(
    ioProject("LDI 191\nSTA 0xF7\nLDI 3\nSTA 0xF3\nSTA 0xF8\nLDA 0xF7\nHLT"),
  );
  for (let i = 0; i < 14; i++) e.step();
  digit(e, 191);
  expect(e.get("ACC", "q").value).toBe(191);
});

it("example routes keep clear of component bodies", async () => {
  const { routeClear } = await import("../src/editor/routing");
  for (const mode of ["manual", "counter", "rom"] as const) {
    const p = sevenSegmentExample(mode),
      c = p.circuits[p.root];
    expect(
      c.wires.filter((w) => !routeClear(c, p, w)).map((w) => [w.from, w.to]),
      mode,
    ).toEqual([]);
  }
});
