import type { Project, Circuit, TestCase } from "../model/types";
import { resolveSignalRef, stableId, ref } from "../model/nets";

function vectorRef(p: Project, c: Circuit, key: string) {
  try {
    return resolveSignalRef(p, c.id, key);
  } catch {
    // Removed endpoints remain visible as invalid tests rather than crashing their editor.
    const at = key.lastIndexOf(":"),
      path = key.slice(0, at).split("/");
    return ref(path.pop()!, key.slice(at + 1), path);
  }
}

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
          ref: vectorRef(p, c, id + ":out"),
          value,
        })),
        cycles: v.cycles ?? 0,
        assertions: Object.entries(v.outputs).map(([id, value]) => ({
          type: "signal" as const,
          ref: vectorRef(p, c, id),
          value,
        })),
      },
    ],
  }));
}

export function circuitCases(p: Project, c: Circuit): TestCase[] {
  return [...c.tests, ...vectorCases(p, c)];
}
