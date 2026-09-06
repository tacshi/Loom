import type { Project, Circuit, TestCase } from "../model/types";
import { resolveSignalRef, stableId } from "../model/nets";

/** Run current truth-table vectors through the shared sequential assertion runner. */
export function vectorCases(p: Project, c: Circuit): TestCase[] {
  return c.vectors.map((v, index) => ({
    id: "test-" + stableId(c.id + ":" + index),
    name: v.name,
    maxCycles: Math.max(10000, v.cycles ?? 0),
    seed: 12345,
    steps: [
      {
        inputs: Object.entries(v.inputs).map(([id, value]) => ({
          ref: resolveSignalRef(p, c.id, id + ":out"),
          value,
        })),
        cycles: v.cycles ?? 0,
        assertions: Object.entries(v.outputs).map(([id, value]) => ({
          type: "signal" as const,
          ref: resolveSignalRef(p, c.id, id),
          value,
        })),
      },
    ],
  }));
}
