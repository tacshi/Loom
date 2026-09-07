import { validateTest } from "../persistence/v2Validation";
import { Engine } from "../simulator/engine";
import { componentKey } from "./runner";
import type { Project, TestCase } from "../model/types";
/** Recompute one checkpoint without retaining a snapshot for every cycle. */
export function replayCheckpoint(
  project: Project,
  root: string,
  test: TestCase,
  stepIndex: number,
) {
  validateTest(test);
  if (
    !Number.isInteger(stepIndex) ||
    stepIndex < 0 ||
    stepIndex >= test.steps.length
  )
    throw new Error("testInput");
  const e = new Engine(project, root);
  if (!e.valid) throw new Error("testInput");
  for (let i = 0; i <= stepIndex; i++) {
    const step = test.steps[i];
    if (
      e.cycle + step.cycles > test.maxCycles ||
      e.cycle + step.cycles > 1000000
    )
      throw new Error("testLimit");
    for (const input of step.inputs ?? [])
      e.setInput(componentKey(input.ref), input.value);
    for (const input of step.keyboard ?? [])
      e.enqueue(componentKey(input.component), input.text);
    for (const input of step.memory ?? [])
      e.editMemory(
        componentKey(input.ref),
        input.address,
        input.value,
        input.known,
      );
    for (let n = 0; n < step.cycles; n++) e.step();
  }
  return e;
}
