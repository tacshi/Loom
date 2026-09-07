import {
  parameters,
  resolvedComponent,
  parameterValue,
} from "../model/parameters";
import type {
  Component,
  Project,
  Wire,
  Endpoint,
  Diagnostic,
} from "../model/types";
import { portAt } from "../model/nets";
import { ports } from "../model/components";
export type Compiled = {
  components: Component[];
  wires: Wire[];
  order: Component[];
  sources: Map<string, Endpoint[]>;
  nets: { id: string; width: number; drivers: Endpoint[]; sinks: Endpoint[] }[];
  diagnostics: Diagnostic[];
  aliases: Map<string, string>;
  boundaries: Set<string>;
};
export const key = (e: Endpoint) => e.component + ":" + e.port;
export function compile(project: Project, root = project.root): Compiled {
  const components: Component[] = [],
    wires: Wire[] = [],
    diagnostics: Diagnostic[] = [];
  const aliases = new Map<string, string>();
  const nets: Compiled["nets"] = [];
  const boundaries = new Set<string>();
  let expanded = 0;
  function walk(
    id: string,
    prefix: string,
    stack: string[],
    args: Record<string, number> = {},
  ) {
    if (stack.includes(id) || stack.length > 16) {
      diagnostics.push({
        code: "recursive",
        severity: "error",
        component: prefix.slice(0, -1),
      });
      return;
    }
    let circuit = project.circuits[id];
    if (!circuit || !Array.isArray(circuit.components)) {
      diagnostics.push({
        code: "missingDefinition",
        severity: "error",
        component: prefix.slice(0, -1),
      });
      return;
    }
    try {
      const values = parameters(circuit, args);
      circuit = {
        ...circuit,
        components: circuit.components.map((c) => resolvedComponent(c, values)),
        ports: circuit.ports.map((p) => ({
          ...p,
          width: parameterValue(p.widthParameter, p.width, values),
        })),
      };
      if (circuit.parameters?.length)
        circuit.nets = circuit.nets.map((n) => {
          const widths = n.ports.map((e) => portAt(circuit, project, e)?.width);
          return {
            ...n,
            width: widths.every((w) => w === widths[0])
              ? (widths[0] ?? n.width)
              : n.width,
          };
        });
    } catch {
      diagnostics.push({
        code: "parameterBounds",
        severity: "error",
        component: prefix.slice(0, -1),
      });
      return;
    }
    for (const net of circuit.nets ?? [])
      for (const endpoint of net.ports) {
        const port = portAt(circuit, project, endpoint);
        if (!port)
          diagnostics.push({
            code: "missingPort",
            severity: "error",
            component: prefix + endpoint.component,
            port: endpoint.port,
          });
        else if (port.width !== net.width)
          diagnostics.push({
            code: "widthMismatch",
            severity: "error",
            component: prefix + endpoint.component,
            port: endpoint.port,
          });
      }
    const resolve = (e: Endpoint): Endpoint => {
      const c = circuit.components.find((c) => c.id === e.component);
      if (c?.kind === "instance") {
        const def = project.circuits[c.definitionId!],
          p = def?.ports?.find((p) => p.id === e.port);
        return p
          ? {
              component: prefix + c.id + "/" + p.componentId,
              port: p.direction === "in" ? "in" : "out",
            }
          : { component: prefix + c.id, port: e.port };
      }
      return { component: prefix + e.component, port: e.port };
    };
    for (const c of circuit.components) {
      if (++expanded > 100000) {
        diagnostics.push({ code: "sizeLimit", severity: "error" });
        return;
      }
      if (c.kind === "instance") {
        walk(c.definitionId!, prefix + c.id + "/", [...stack, id], c.arguments);
        for (const port of project.circuits[c.definitionId!]?.ports ?? [])
          aliases.set(
            prefix + c.id + ":" + port.id,
            prefix +
              c.id +
              "/" +
              port.componentId +
              ":" +
              (port.direction === "in" ? "in" : "out"),
          );
      } else {
        if (prefix && (c.kind === "portIn" || c.kind === "portOut"))
          boundaries.add(prefix + c.id);
        components.push({
          ...structuredClone(c),
          id: prefix + c.id,
          kind:
            prefix && (c.kind === "portIn" || c.kind === "portOut")
              ? "buffer"
              : c.kind,
        });
      }
    }
    for (const net of circuit.nets ?? [])
      nets.push({
        id: prefix + net.id,
        width: net.width,
        drivers: net.ports
          .filter((e) => portAt(circuit, project, e)?.direction === "out")
          .map(resolve),
        sinks: net.ports
          .filter((e) => portAt(circuit, project, e)?.direction === "in")
          .map(resolve),
      });
    for (const w of circuit.wires)
      wires.push({
        ...w,
        id: prefix + w.id,
        from: resolve(w.from),
        to: resolve(w.to),
      });
  }
  walk(root, "", []);
  const memoryCells = components
    .filter((c) => c.kind === "ram" || c.kind === "rom" || c.kind === "display")
    .reduce(
      (n, c) =>
        n + (c.kind === "display" ? 2048 : 2 ** (c.params.addressBits ?? 8)),
      0,
    );
  if (memoryCells > 1_048_576)
    diagnostics.push({ code: "memoryLimit", severity: "error" });
  const byId = new Map(components.map((c) => [c.id, c]));
  const sources = new Map<string, Endpoint[]>();
  const netMembership = new Set<string>();
  for (const net of nets) {
    for (const [ends, direction] of [
      [net.drivers, "out"],
      [net.sinks, "in"],
    ] as const)
      for (const end of ends) {
        if (netMembership.has(key(end)))
          diagnostics.push({
            code: "invalidProject",
            severity: "error",
            component: end.component,
            port: end.port,
          });
        netMembership.add(key(end));
        const c = byId.get(end.component),
          pin = c && ports(c).find((p) => p.id === end.port);
        if (!pin)
          diagnostics.push({
            code: "missingPort",
            severity: "error",
            component: end.component,
            port: end.port,
          });
        else if (pin.direction !== direction)
          diagnostics.push({
            code: "directionError",
            severity: "error",
            component: end.component,
            port: end.port,
          });
        else if (pin.width !== net.width)
          diagnostics.push({
            code: "widthMismatch",
            severity: "error",
            component: end.component,
            port: end.port,
          });
      }
  }
  // Interface pins are electrical continuity, not active buffer drivers. Merge
  // nets across both sides before ordering gates, avoiding artificial feedback.
  const roots = nets.map((_, i) => i),
    boundaryNet = new Map<string, number>();
  const find = (i: number): number => {
    let root = i;
    while (roots[root] !== root) root = roots[root];
    while (i !== root) {
      const next = roots[i];
      roots[i] = root;
      i = next;
    }
    return root;
  };
  nets.forEach((net, i) => {
    for (const e of [...net.drivers, ...net.sinks])
      if (boundaries.has(e.component)) {
        const old = boundaryNet.get(e.component);
        if (old !== undefined) roots[find(i)] = find(old);
        boundaryNet.set(e.component, i);
      }
  });
  const merged = new Map<number, Compiled["nets"][number]>();
  const members = new Map<
    number,
    { drivers: Set<string>; sinks: Set<string> }
  >();
  nets.forEach((net, i) => {
    const root = find(i),
      group = merged.get(root) ?? { ...net, drivers: [], sinks: [] };
    const seen = members.get(root) ?? {
      drivers: new Set<string>(),
      sinks: new Set<string>(),
    };
    for (const side of ["drivers", "sinks"] as const)
      for (const e of net[side])
        if (!boundaries.has(e.component) && !seen[side].has(key(e))) {
          group[side].push(e);
          seen[side].add(key(e));
        }
    merged.set(root, group);
    members.set(root, seen);
  });
  nets.length = 0;
  for (const net of merged.values()) nets.push(net);
  for (const net of nets)
    for (const sink of net.sinks) {
      if (sources.has(key(sink)))
        diagnostics.push({
          code: "invalidProject",
          severity: "error",
          component: sink.component,
          port: sink.port,
        });
      sources.set(key(sink), net.drivers);
    }
  for (const [id, index] of boundaryNet) {
    const drivers = merged.get(find(index))!.drivers;
    sources.set(id + ":in", drivers);
    sources.set(id + ":out", drivers);
  }
  for (const c of components)
    for (const p of ports(c).filter((p) => p.direction === "in"))
      if (!sources.get(c.id + ":" + p.id)?.length)
        diagnostics.push({
          code: "undriven",
          severity: "warning",
          component: c.id,
          port: p.id,
        });
  const deps = new Map<string, Set<string>>(),
    followers = new Map<string, Set<string>>();
  for (const c of components) {
    const incoming = new Set<string>();
    for (const p of ports(c).filter(
      (p) =>
        !boundaries.has(c.id) &&
        p.direction === "in" &&
        !["register", "dff", "counter", "keyboard", "terminal"].includes(
          c.kind,
        ) &&
        (c.kind !== "display" || p.id === "x" || p.id === "y") &&
        (c.kind !== "ram" || p.id === "addr"),
    )) {
      const src = sources.get(c.id + ":" + p.id);
      for (const driver of src ?? []) incoming.add(driver.component);
    }
    deps.set(c.id, incoming);
    for (const src of incoming) {
      if (!followers.has(src)) followers.set(src, new Set());
      followers.get(src)!.add(c.id);
    }
  }
  const queue = components.filter((c) => deps.get(c.id)!.size === 0);
  const order: Component[] = [];
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const c = queue[cursor];
    order.push(c);
    for (const id of followers.get(c.id) ?? []) {
      deps.get(id)!.delete(c.id);
      if (!deps.get(id)!.size) queue.push(byId.get(id)!);
    }
  }
  if (order.length !== components.length)
    for (const c of components.filter((c) => deps.get(c.id)!.size))
      diagnostics.push({
        code: "combinationalLoop",
        severity: "error",
        component: c.id,
      });
  return {
    components,
    wires,
    order,
    sources,
    diagnostics,
    aliases,
    nets,
    boundaries,
  };
}
