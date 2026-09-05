import type {
  Component,
  Project,
  Wire,
  Endpoint,
  Diagnostic,
} from "../model/types";
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
  function walk(id: string, prefix: string, stack: string[]) {
    if (stack.includes(id) || stack.length > 16) {
      diagnostics.push({
        code: "recursive",
        severity: "error",
        component: prefix.slice(0, -1),
      });
      return;
    }
    const circuit = project.circuits[id];
    if (!circuit) {
      diagnostics.push({
        code: "missingDefinition",
        severity: "error",
        component: prefix.slice(0, -1),
      });
      return;
    }
    const resolve = (e: Endpoint): Endpoint => {
      const c = circuit.components.find((c) => c.id === e.component);
      if (c?.kind === "instance") {
        const def = project.circuits[c.definitionId!],
          p = def?.ports.find((p) => p.id === e.port);
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
        walk(c.definitionId!, prefix + c.id + "/", [...stack, id]);
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
    .filter((c) => c.kind === "ram" || c.kind === "rom")
    .reduce((n, c) => n + 2 ** (c.params.addressBits ?? 8), 0);
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
        !["register", "dff", "counter"].includes(c.kind) &&
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
