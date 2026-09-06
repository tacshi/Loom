import type { Circuit, Component, Parameter, Project } from "./types";
export function parameters(c: Circuit, args: Record<string, number> = {}) {
  const values: Record<string, number> = {};
  for (const p of c.parameters ?? []) {
    const n = args[p.name] ?? p.default;
    if (!Number.isInteger(n) || n < p.min || n > p.max)
      throw new Error("parameterBounds");
    values[p.name] = n;
  }
  for (const k of Object.keys(args))
    if (!Object.hasOwn(values, k)) throw new Error("unknownParameter");
  return values;
}
export function parameterValue(
  name: string | undefined,
  literal: number,
  values: Record<string, number>,
  max = 32,
) {
  const n = name ? values[name] : literal;
  if (!Number.isInteger(n) || n < 1 || n > max)
    throw new Error("parameterBounds");
  return n;
}
export function resolvedComponent(
  c: Component,
  values: Record<string, number>,
): Component {
  return {
    ...c,
    width: parameterValue(c.widthParameter, c.width, values),
    params: {
      ...c.params,
      ...(c.addressParameter
        ? {
            addressBits: parameterValue(
              c.addressParameter,
              c.params.addressBits ?? 8,
              values,
              16,
            ),
          }
        : {}),
    },
  };
}

export function validParameterDefinition(p: Parameter) {
  return (
    /^[A-Za-z][A-Za-z0-9_]*$/.test(p.name) &&
    p.name.length <= 200 &&
    [p.min, p.max, p.default].every(
      (n) => Number.isInteger(n) && n >= 1 && n <= 32,
    ) &&
    p.min <= p.default &&
    p.default <= p.max
  );
}
export function updateParameters(
  project: Project,
  id: string,
  next: Parameter[],
) {
  const circuit = project.circuits[id],
    names = new Set(next.map((p) => p.name));
  if (
    next.some((p) => !validParameterDefinition(p)) ||
    names.size !== next.length
  )
    throw new Error("parameterBounds");
  const used = [
    ...circuit.components.flatMap((c) => [
      c.widthParameter,
      c.addressParameter,
    ]),
    ...circuit.ports.map((p) => p.widthParameter),
  ];
  if (used.some((name) => name !== undefined && !names.has(name)))
    throw new Error("parameterInUse");
  const candidate = { ...circuit, parameters: next };
  for (const c of Object.values(project.circuits))
    for (const n of c.components)
      if (n.definitionId === id) parameters(candidate, n.arguments);
  circuit.parameters = next;
}
