import type { Engine } from "../simulator/engine";
import type { Timeline } from "../simulator/timeline";
import type { TestAssertion, TestCase, TestStep } from "../model/types";
import { resolveSignalRef } from "../model/nets";
export function captureRun(
  e: Engine,
  t: Timeline,
  assertions: TestAssertion[],
): TestCase {
  const info = t.info(),
    run = info.runs.find((r) => r.id === info.selected)!;
  if (run.oldest.cycle !== 0 || run.oldest.eventOrder !== 0)
    throw new Error("captureEvicted");
  const steps: TestStep[] = [];
  let cycle = 0;
  for (const event of t.events()) {
    if (event.cycle > cycle) {
      steps.push({ cycles: event.cycle - cycle, assertions: [] });
      cycle = event.cycle;
    }
    const step: TestStep = { cycles: 0, assertions: [] };
    if (event.kind === "input")
      step.inputs = [
        {
          ref: resolveSignalRef(e.project, e.project.root, event.id + ":out"),
          value: event.value,
        },
      ];
    else if (event.kind === "keyboard")
      step.keyboard = [
        {
          component: resolveSignalRef(
            e.project,
            e.project.root,
            event.id + ":data",
          ),
          text: event.text,
        },
      ];
    else
      step.memory = [
        {
          ref: resolveSignalRef(e.project, e.project.root, event.id + ":out"),
          address: event.address,
          value: event.value,
          known: event.known,
        },
      ];
    steps.push(step);
  }
  steps.push({ cycles: e.cycle - cycle, assertions });
  return {
    id: crypto.randomUUID(),
    name: "Recorded run",
    steps,
    maxCycles: Math.max(e.cycle, 1),
    seed: 12345,
  };
}
