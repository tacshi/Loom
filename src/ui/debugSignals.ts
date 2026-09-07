import type { Project, Circuit, SignalRef, TestCase } from "../model/types";
import { ports } from "../model/components";
import { ref } from "../model/nets";
export function observedSignals(
  circuit: Circuit,
  project: Project,
  path: string[] = [],
) {
  return circuit.components.flatMap((c) => {
    const direction = ["input", "portIn", "button"].includes(c.kind)
      ? "input"
      : ["probe", "portOut"].includes(c.kind)
        ? "output"
        : ["register", "counter", "dff"].includes(c.kind)
          ? "state"
          : undefined;
    if (!direction) return [];
    const port =
      direction === "output" ? "in" : direction === "state" ? "q" : "out";
    return [
      {
        label: c.name,
        direction,
        width: c.width,
        ref: ref(c.id, port, path),
        interactive: direction === "input",
      },
    ];
  });
}
export function savedCases(circuit: Circuit): TestCase[] {
  return [
    ...circuit.tests,
    ...circuit.vectors.map((v, i) => ({
      id: "vector-" + i,
      name: v.name,
      seed: 0,
      maxCycles: Math.max(v.cycles ?? 0, 1),
      steps: [
        {
          cycles: v.cycles ?? 0,
          inputs: Object.entries(v.inputs).map(([id, value]) => ({
            ref: ref(id, "out"),
            value,
          })),
          assertions: Object.entries(v.outputs).map(([key, value]) => {
            const at = key.lastIndexOf(":");
            return {
              type: "signal" as const,
              ref: ref(key.slice(0, at), key.slice(at + 1)),
              value,
            };
          }),
        },
      ],
    })),
  ];
}
export function circuitMode(
  project: Project,
  root: string,
): "logic" | "clock" | "cpu" {
  if (project.cpu || project.debugProfile) return "cpu";
  const seen = new Set<string>();
  function stateful(id: string): boolean {
    if (seen.has(id)) return false;
    seen.add(id);
    return (
      project.circuits[id]?.components.some(
        (c) =>
          [
            "register",
            "counter",
            "dff",
            "ram",
            "keyboard",
            "terminal",
            "display",
          ].includes(c.kind) ||
          (c.kind === "instance" && stateful(c.definitionId!)),
      ) ?? false
    );
  }
  return stateful(root) ? "clock" : "logic";
}
