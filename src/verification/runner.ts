import { validateTest } from "../persistence/v2Validation";
import type {
  Project,
  TestCase,
  TestAssertion,
  SignalRef,
} from "../model/types";
import { Engine, type Snapshot } from "../simulator/engine";
import { readRef } from "../simulator/debug";
import { mask, type Signal } from "../simulator/signal";
import { signalLabel } from "../model/nets";
export type TestFailure = {
  step: number;
  cycle: number;
  assertion: TestAssertion;
  expected: unknown;
  actual: unknown;
};
export type TestResult = {
  id: string;
  name: string;
  status: "passed" | "failed" | "invalid" | "limit";
  cycles: number;
  failure?: TestFailure;
  error?: string;
  trace: Snapshot[];
};
export const componentKey = (r: SignalRef) =>
  [...r.instancePath, r.componentId].join("/");
export function assertionValue(
  e: Engine,
  a: TestAssertion,
): { expected: unknown; actual: unknown; passed: boolean } {
  const id = componentKey(a.ref);
  if (a.type === "signal" || a.type === "memory") {
    const s =
      a.type === "signal" ? readRef(e, a.ref) : e.memory.get(id)?.[a.address];
    if (!s) return { expected: a.value, actual: null, passed: false };
    const expected = { value: a.value, known: a.known ?? mask(s.width) },
      actual = { value: s.value, known: s.known };
    return {
      expected,
      actual,
      passed:
        expected.known === actual.known &&
        (expected.value & expected.known) >>> 0 ===
          (actual.value & expected.known) >>> 0,
    };
  }
  const d = e.devices.get(id);
  if (a.type === "terminal") {
    const actual =
      d?.kind === "terminal"
        ? new TextDecoder().decode(new Uint8Array(d.bytes))
        : null;
    return {
      expected: a.text,
      actual,
      passed: actual === a.text && d?.kind === "terminal" && !d.uncertain,
    };
  }
  const s = d?.kind === "display" ? d.pixels[a.y * 64 + a.x] : undefined;
  return {
    expected: a.value,
    actual: s?.known === 1 ? s.value : null,
    passed: s?.known === 1 && s.value === a.value,
  };
}
export function runCase(
  project: Project,
  root: string,
  test: TestCase,
  onStep?: (engine: Engine) => void,
): TestResult {
  validateTest(test);
  const e = new Engine(project, root),
    trace: Snapshot[] = [];
  const result = (
    status: TestResult["status"],
    extra: Partial<TestResult> = {},
  ): TestResult => ({
    id: test.id,
    name: test.name,
    status,
    cycles: e.cycle,
    trace,
    ...extra,
  });
  if (!e.valid)
    return result("invalid", {
      error: e.compiled.diagnostics
        .filter((d) => d.severity === "error")
        .map((d) => d.code)
        .join(", "),
    });
  if (
    !Number.isInteger(test.maxCycles) ||
    test.maxCycles < 0 ||
    test.maxCycles > 1000000
  )
    return result("invalid", { error: "testLimit" });
  try {
    for (let i = 0; i < test.steps.length; i++) {
      const step = test.steps[i];
      if (!Number.isInteger(step.cycles) || step.cycles < 0)
        return result("invalid", { error: "testLimit" });
      if (e.cycle + step.cycles > test.maxCycles)
        return result("limit", { error: "testLimit" });
      for (const input of step.inputs ?? []) {
        const c = e.byId.get(componentKey(input.ref));
        if (!c || !["input", "portIn"].includes(c.kind))
          return result("invalid", { error: "testInput" });
        e.setInput(c.id, input.value);
      }
      for (const input of step.keyboard ?? [])
        e.enqueue(componentKey(input.component), input.text);
      for (const m of step.memory ?? [])
        e.editMemory(componentKey(m.ref), m.address, m.value, m.known);
      for (let n = 0; n < step.cycles; n++) {
        e.step();
        onStep?.(e);
        if (n >= step.cycles - 32) {
          const values: Snapshot["values"] = {};
          for (const a of step.assertions)
            if (a.type === "signal")
              values[signalLabel(a.ref)] = readRef(e, a.ref);
          trace.push({ cycle: e.cycle, values, memory: {} });
          if (trace.length > 64) trace.shift();
        }
      }
      for (const assertion of step.assertions) {
        const id = componentKey(assertion.ref),
          c = e.byId.get(id),
          key = signalLabel(assertion.ref);
        if (
          assertion.type === "signal" &&
          !e.compiled.aliases.has(key) &&
          !e.pinMap.get(id)?.some((p) => p.id === assertion.ref.portId)
        )
          return result("invalid", { error: "testInput" });
        if (
          assertion.type === "memory" &&
          (!c ||
            !["ram", "rom"].includes(c.kind) ||
            assertion.address >= (e.memory.get(id)?.length ?? 0))
        )
          return result("invalid", { error: "testInput" });
        if (
          (assertion.type === "terminal" && c?.kind !== "terminal") ||
          (assertion.type === "pixel" && c?.kind !== "display")
        )
          return result("invalid", { error: "testInput" });
        const { expected, actual, passed } = assertionValue(e, assertion);
        if (!passed)
          return result("failed", {
            failure: { step: i, cycle: e.cycle, assertion, expected, actual },
          });
      }
    }
    return result("passed");
  } catch (error) {
    return result("invalid", { error: (error as Error).message });
  }
}
export function runCases(project: Project, root: string, cases: TestCase[]) {
  return cases.map((t) => runCase(project, root, t));
}
export function reportCode(results: TestResult[]) {
  return results.some((r) => r.status === "invalid")
    ? 2
    : results.some((r) => r.status === "limit")
      ? 3
      : results.some((r) => r.status === "failed")
        ? 1
        : 0;
}
