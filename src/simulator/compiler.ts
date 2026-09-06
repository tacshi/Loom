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
import { electricalWires, portAt } from "../model/nets";
import { ports } from "../model/components";
export type Compiled = {
  components: Component[];
  wires: Wire[];
  order: Component[];
  sources: Map<string, Endpoint>;
  diagnostics: Diagnostic[];
  aliases: Map<string, string>;
};
export const key = (e: Endpoint) => e.component + ":" + e.port;
export function compile(project: Project, root = project.root): Compiled {
  const components: Component[] = [],
    wires: Wire[] = [],
    diagnostics: Diagnostic[] = [];
  const aliases = new Map<string, string>();
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
      if (
        net.ports.filter(
          (e) => portAt(circuit, project, e)?.direction === "out",
        ).length > 1
      )
        diagnostics.push({
          code: "multipleDrivers",
          severity: "error",
          component: prefix + net.ports[0]?.component,
        });
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
      } else
        components.push({
          ...structuredClone(c),
          id: prefix + c.id,
          kind:
            prefix && (c.kind === "portIn" || c.kind === "portOut")
              ? "buffer"
              : c.kind,
        });
    }
    for (const w of electricalWires(circuit, project))
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
  const sources = new Map<string, Endpoint>();
  for (const w of wires) {
    const a = byId.get(w.from.component),
      b = byId.get(w.to.component);
    const out = a && ports(a).find((p) => p.id === w.from.port),
      input = b && ports(b).find((p) => p.id === w.to.port);
    if (!out || !input) {
      diagnostics.push({
        code: "missingPort",
        severity: "error",
        component: w.to.component,
        port: w.to.port,
      });
      continue;
    }
    if (out.direction !== "out" || input.direction !== "in") {
      diagnostics.push({
        code: "directionError",
        severity: "error",
        component: b!.id,
        port: input.id,
      });
      continue;
    }
    if (out.width !== input.width)
      diagnostics.push({
        code: "widthMismatch",
        severity: "error",
        component: b!.id,
        port: input.id,
        args: { expected: input.width, actual: out.width },
      });
    const k = key(w.to);
    if (sources.has(k) && key(sources.get(k)!) !== key(w.from))
      diagnostics.push({
        code: "multipleDrivers",
        severity: "error",
        component: b!.id,
        port: input.id,
      });
    sources.set(k, w.from);
  }
  for (const c of components)
    for (const p of ports(c).filter((p) => p.direction === "in"))
      if (!sources.has(c.id + ":" + p.id))
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
        p.direction === "in" &&
        !["register", "dff", "counter", "keyboard", "terminal"].includes(
          c.kind,
        ) &&
        (c.kind !== "display" || p.id === "x" || p.id === "y") &&
        (c.kind !== "ram" || p.id === "addr"),
    )) {
      const src = sources.get(c.id + ":" + p.id);
      if (src) incoming.add(src.component);
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
  return { components, wires, order, sources, diagnostics, aliases };
}
