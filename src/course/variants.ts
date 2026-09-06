import type { Project, TestCase } from "../model/types";
import type { ExerciseId } from "./types";
import { ref } from "../model/nets";
import { runCases } from "../verification/runner";
/** Widening is verified on the accepted graph, not inferred from its one-bit result. */
export function verifyWidthVariants(p: Project, id: ExerciseId) {
  const c = p.circuits[p.root],
    parameter = c.parameters?.find((p) => p.name === "width");
  if (!parameter)
    return {
      widths: [] as number[],
      results: [] as ReturnType<typeof runCases>,
    };
  if (
    !["nand", "not", "and-or", "xor", "mux", "adder8", "subtract"].includes(
      id,
    ) ||
    c.parameters!.length !== 1
  )
    throw new Error(
      "This exercise has a fixed interface; use width variants on gate, mux or arithmetic components.",
    );
  const widths: number[] = [],
    results: ReturnType<typeof runCases> = [];
  for (let width = parameter.min; width <= parameter.max; width++) {
    const copy = structuredClone(p);
    copy.circuits[p.root].parameters![0].default = width;
    const max = 2 ** width - 1,
      values = [0, 1, max, Math.floor(max / 2)],
      steps: TestCase["steps"] = [];
    for (const a of values)
      for (const b of values)
        for (const sel of id === "mux" ? [0, 1] : [0]) {
          const output: Record<string, number> =
            id === "nand"
              ? { out: (~(a & b) & max) >>> 0 }
              : id === "not"
                ? { out: (~a & max) >>> 0 }
                : id === "and-or"
                  ? { and: (a & b) >>> 0, or: (a | b) >>> 0 }
                  : id === "xor"
                    ? { out: (a ^ b) >>> 0 }
                    : id === "mux"
                      ? { out: sel ? b : a }
                      : id === "adder8"
                        ? {
                            out: ((a + b) & max) >>> 0,
                            carry: Number(a + b > max),
                          }
                        : { out: ((a - b) & max) >>> 0, carry: Number(a >= b) };
          steps.push({
            cycles: 0,
            inputs: c.ports
              .filter((p) => p.direction === "in")
              .map((p) => ({
                ref: ref(p.componentId, "out"),
                value: p.id === "a" ? a : p.id === "b" ? b : sel,
              })),
            assertions: c.ports
              .filter((p) => p.direction === "out")
              .map((p) => ({
                type: "signal",
                ref: ref(p.componentId, "in"),
                value: output[p.id],
              })),
          });
        }
    const r = runCases(copy, p.root, [
      {
        id: "width-" + width,
        name: "Width " + width,
        maxCycles: 0,
        seed: 1,
        steps,
      },
    ]);
    results.push(...r);
    if (r.some((r) => r.status !== "passed")) return { widths, results };
    widths.push(width);
  }
  return { widths, results };
}
