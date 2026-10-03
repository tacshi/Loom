import type { Project } from "./types";

/** Definition references must form a bounded DAG, including unused definitions. */
export function validateDefinitions(project: Pick<Project, "circuits">) {
  const active = new Set<string>();
  const depths = new Map<string, number>();
  function visit(id: string): number {
    if (active.has(id)) throw new Error("recursive");
    if (depths.has(id)) return depths.get(id)!;
    const circuit = Object.hasOwn(project.circuits, id) && project.circuits[id];
    if (!circuit) throw new Error("missingDefinition");
    active.add(id);
    let depth = 1;
    for (const component of circuit.components)
      if (component.definitionId)
        depth = Math.max(depth, 1 + visit(component.definitionId));
    active.delete(id);
    if (depth > 17) throw new Error("recursive");
    depths.set(id, depth);
    return depth;
  }
  for (const id of Object.keys(project.circuits)) visit(id);
}

/** Copies an edit's definition closure and every definition that consumes it. */
export function editingScope(project: Project, root: string) {
  const ids = new Set<string>();
  const visit = (id: string) => {
    if (ids.has(id)) return;
    const circuit = project.circuits[id];
    if (!circuit) throw new Error("missingDefinition");
    ids.add(id);
    for (const n of circuit.components)
      if (n.definitionId) visit(n.definitionId);
  };
  visit(root);
  const consumers = new Set([root]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of Object.values(project.circuits))
      if (
        !consumers.has(c.id) &&
        c.components.some(
          (n) => n.definitionId && consumers.has(n.definitionId),
        )
      ) {
        consumers.add(c.id);
        ids.add(c.id);
        changed = true;
      }
  }
  return ids;
}
