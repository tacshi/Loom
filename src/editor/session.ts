import {
  uid,
  type Project,
  type Circuit,
  type Component,
  type Endpoint,
  type Net,
  type Wire,
  type NetMarker,
} from "../model/types";
import { canonical, connect, endpointKey, refreshWidths } from "../model/nets";
export type Clipboard = {
  components: Component[];
  nets: Net[];
  wires: Wire[];
  definitions: Project["circuits"];
  markers: NetMarker[];
};
export function editProject(
  project: Project,
  command: (draft: Project) => void,
): Project {
  const draft = structuredClone(project);
  command(draft);
  for (const c of Object.values(draft.circuits)) refreshWidths(c, draft);
  for (const c of Object.values(project.circuits))
    if (c.library && canonical(draft.circuits[c.id]) !== canonical(c))
      throw new Error("libraryReadOnly");
  draft.updatedAt = Date.now();
  return draft;
}
export function copySelection(
  project: Project,
  id: string,
  selection: string[],
): Clipboard {
  const c = project.circuits[id];
  return {
    components: structuredClone(
      c.components.filter((n) => selection.includes(n.id)),
    ),
    nets: structuredClone(
      c.nets
        .map((n) => ({
          ...n,
          ports: n.ports.filter((e) => selection.includes(e.component)),
        }))
        .filter((n) => n.ports.length),
    ),
    wires: structuredClone(
      c.wires.filter(
        (w) =>
          selection.includes(w.from.component) &&
          selection.includes(w.to.component),
      ),
    ),
    definitions: structuredClone(project.circuits),
    markers: structuredClone(
      c.markers.filter(
        (m) => m.endpoint && selection.includes(m.endpoint.component),
      ),
    ),
  };
}
export function pasteSelection(
  project: Project,
  id: string,
  clipboard: Clipboard,
): string[] {
  const c = project.circuits[id],
    mapping = new Map<string, string>(),
    nets = new Map<string, string>();
  for (const original of clipboard.components) {
    const copy = structuredClone(original);
    copy.id = uid();
    mapping.set(original.id, copy.id);
    copy.x += 40;
    copy.y += 40;
    c.components.push(copy);
    const visit = (id: string) => {
      if (project.circuits[id]) return;
      const def = clipboard.definitions[id];
      if (!def) throw new Error("missingDefinition");
      project.circuits[id] = structuredClone(def);
      for (const n of def.components) if (n.definitionId) visit(n.definitionId);
    };
    if (copy.definitionId) visit(copy.definitionId);
  }
  for (const n of clipboard.nets) {
    const nid = uid();
    nets.set(n.id, nid);
    c.nets.push({
      ...structuredClone(n),
      id: nid,
      ports: n.ports.map((e) => ({
        ...e,
        component: mapping.get(e.component)!,
      })),
    });
  }
  for (const w of clipboard.wires)
    c.wires.push({
      ...structuredClone(w),
      id: uid(),
      netId: nets.get(w.netId!),
      from: { ...w.from, component: mapping.get(w.from.component)! },
      to: { ...w.to, component: mapping.get(w.to.component)! },
      points: w.points.map((p) => ({ x: p.x + 40, y: p.y + 40 })),
    });
  for (const m of clipboard.markers)
    c.markers.push({
      ...structuredClone(m),
      id: uid(),
      netId: nets.get(m.netId)!,
      x: m.x + 40,
      y: m.y + 40,
      endpoint: m.endpoint
        ? { ...m.endpoint, component: mapping.get(m.endpoint.component)! }
        : undefined,
    });
  return [...mapping.values()];
}
export function addConnection(project: Project, circuitId: string, wire: Wire) {
  connect(project.circuits[circuitId], project, wire);
}
export function remapComponent(
  c: Circuit,
  id: string,
  mapping: Record<string, string>,
) {
  for (const n of c.nets)
    for (const e of n.ports)
      if (e.component === id) e.port = mapping[e.port] ?? e.port;
  for (const w of c.wires) {
    if (w.from.component === id)
      w.from.port = mapping[w.from.port] ?? w.from.port;
    if (w.to.component === id) w.to.port = mapping[w.to.port] ?? w.to.port;
  }
}
