import { it, expect } from "vitest";
import { exercise } from "../src/course/referenceExercises";
import { runCase } from "../src/verification/runner";
import { replayCheckpoint } from "../src/verification/replay";
import { Engine } from "../src/simulator/engine";
import { sourceChain } from "../src/simulator/debug";
it("reports every NAND input and actual output without retaining full snapshots", () => {
  const p = exercise("nand").reference(),
    test = exercise("nand").checks()[0];
  const result = runCase(p, p.root, test);
  expect(result.checkpoints).toHaveLength(4);
  expect(
    result.checkpoints!.map((c) => (c.assertions[0].actual as any).value),
  ).toEqual([1, 1, 1, 0]);
  expect(result.checkpoints!.every((c) => c.inputs.length === 2)).toBe(true);
  expect(result.trace).toHaveLength(0);
  const replay = replayCheckpoint(p, p.root, test, 3);
  expect(replay.get("out", "in").value).toBe(0);
  expect(sourceChain(replay, "out", "in").some((c) => c.id === "a")).toBe(true);
});
it("replaying a sequential checkpoint starts from the same initial state and preserves the document", () => {
  const p = exercise("register").reference(),
    before = JSON.stringify(p),
    test = exercise("register").checks()[0];
  const first = replayCheckpoint(p, p.root, test, 2),
    second = replayCheckpoint(p, p.root, test, 2);
  expect(first.snapshot()).toEqual(second.snapshot());
  expect(JSON.stringify(p)).toBe(before);
});
it("bounds checkpoint history independently of the number of simulation cycles", () => {
  const p = exercise("signals").reference(),
    test = exercise("signals").checks()[0];
  test.steps = Array.from({ length: 600 }, () =>
    structuredClone(test.steps[0]),
  );
  const r = runCase(p, p.root, test);
  expect(r.status).toBe("passed");
  expect(r.checkpoints).toHaveLength(600);
  expect(r.trace.length).toBeLessThanOrEqual(64);
});
it("a changed input causes a concrete mismatch and stops at its checkpoint", () => {
  const p = exercise("signals").reference(),
    test = exercise("signals").checks()[0];
  (test.steps[0].assertions[0] as any).value = 1;
  const r = runCase(p, p.root, test);
  expect(r.status).toBe("failed");
  expect(r.checkpoints).toHaveLength(1);
  expect(r.checkpoints![0].assertions[0]).toMatchObject({
    passed: false,
    actual: { value: 0 },
    expected: { value: 1 },
  });
});
