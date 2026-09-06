import { it, expect } from "vitest";
import { counterExample } from "../src/examples/sequential";
import { runCase, reportCode } from "../src/verification/runner";
import { decodeMemory, encodeMemory } from "../src/persistence/memoryFile";
import { Engine } from "../src/simulator/engine";
import { Timeline } from "../src/simulator/timeline";
import { captureRun } from "../src/verification/capture";
import { stateHash } from "../src/simulator/state";
it("captures ordered stimuli as a reproducible sequential test", () => {
  const p = counterExample(),
    e = new Engine(p),
    t = new Timeline(e);
  t.input({ kind: "input", id: "Enable", value: 1 });
  for (let i = 0; i < 3; i++) t.step();
  t.input({ kind: "input", id: "Enable", value: 0 });
  for (let i = 0; i < 2; i++) t.step();
  const test = captureRun(e, t, [
      {
        type: "signal",
        ref: { instancePath: [], componentId: "Count", portId: "q" },
        value: 3,
      },
    ]),
    before = stateHash(e.capture());
  expect(runCase(p, p.root, test).status).toBe("passed");
  test.steps.at(-1)!.assertions[0] = {
    type: "signal",
    ref: { instancePath: [], componentId: "Count", portId: "q" },
    value: 4,
  };
  const fail = runCase(p, p.root, test);
  expect(fail.failure?.cycle).toBe(5);
  expect(reportCode([fail])).toBe(1);
  expect(stateHash(e.capture())).toBe(before);
  test.maxCycles = 1;
  expect(reportCode([runCase(p, p.root, test)])).toBe(3);
});
it("decodes explicit byte order and rejects overflow before applying any words", () => {
  expect(decodeMemory(new Uint8Array([0x34, 0x12]), 16, 0, 1)).toEqual([
    0x1234,
  ]);
  expect(decodeMemory(new Uint8Array([0x12, 0x34]), 16, 0, 1, "big")).toEqual([
    0x1234,
  ]);
  expect(encodeMemory([0x12345678], 32, "big")).toEqual(
    new Uint8Array([0x12, 0x34, 0x56, 0x78]),
  );
  expect(() => decodeMemory("100", 8, 0, 1)).toThrow("invalidMemoryImage");
  expect(() => decodeMemory("00 01", 8, 0, 1)).toThrow("invalidMemoryImage");
  expect(() => decodeMemory(new Uint8Array([1]), 16, 0, 1)).toThrow(
    "invalidMemoryImage",
  );
});
