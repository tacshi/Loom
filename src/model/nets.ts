import type {
  Circuit,
  Component,
  Endpoint,
  Net,
  Project,
  SignalRef,
  Wire,
} from "./types";
import { ports } from "./components";
export const endpointKey = (e: Endpoint) =>
  JSON.stringify([e.component, e.port]);
export const signalKey = (r: SignalRef) =>
  JSON.stringify([r.instancePath, r.componentId, r.portId]);
export const ref = (
  componentId: string,
  portId: string,
  instancePath: string[] = [],
): SignalRef => ({ instancePath, componentId, portId });
export const signalLabel = (r: SignalRef) =>
  [...r.instancePath, r.componentId].join("/") + ":" + r.portId;
export function stableId(value: string) {
  let a = 0x811c9dc5,
    b = 0x9e3779b9;
  for (const c of value) {
    a = Math.imul(a ^ c.charCodeAt(0), 16777619);
    b = Math.imul(b ^ c.charCodeAt(0), 2246822519);
  }
  return (
    (a >>> 0).toString(16).padStart(8, "0") +
    (b >>> 0).toString(16).padStart(8, "0")
  );
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value !== null && typeof value === "object")
    return (
      "{" +
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b, "en"))
        .map(([k, v]) => JSON.stringify(k) + ":" + canonical(v))
        .join(",") +
      "}"
    );
  return JSON.stringify(value) ?? "null";
}
export function portAt(c: Circuit, p: Project, e: Endpoint) {
  const component = c.components.find((n) => n.id === e.component);
  return component && ports(component, p).find((port) => port.id === e.port);
}
/** Only for circuit construction and explicit graph commands. Never used by layout edits or compilation. */
export function deriveNets(c: Circuit, p: Project): Net[] {
  const parent = new Map<string, string>(),
    endpoints = new Map<string, Endpoint>();
  function find(k: string): string {
    let root = k;
    while (parent.get(root) !== root) root = parent.get(root)!;
    while (k !== root) {
      const next = parent.get(k)!;
      parent.set(k, root);
      k = next;
    }
    return root;
  }
  for (const w of c.wires) {
    for (const e of [w.from, w.to]) {
      const k = endpointKey(e);
      if (!parent.has(k)) parent.set(k, k);
      endpoints.set(k, e);
    }
    parent.set(find(endpointKey(w.to)), find(endpointKey(w.from)));
  }
  const groups = new Map<string, Endpoint[]>();
  for (const [k, e] of endpoints) {
    const root = find(k);
    const group = groups.get(root) ?? [];
    group.push({ ...e });
    groups.set(root, group);
  }
  const used = new Set<string>(),
    nets: Net[] = [];
  for (const group of groups.values()) {
    const keys = new Set(group.map(endpointKey));
    const prior = c.nets.find(
      (n) => !used.has(n.id) && n.ports.some((e) => keys.has(endpointKey(e))),
    );
    const id = prior?.id ?? "net-" + stableId(c.id + [...keys].sort().join());
    used.add(id);
    nets.push({
      id,
      width: portAt(c, p, group[0])?.width ?? 1,
      name: prior?.name,
      ports: group,
    });
    for (const w of c.wires) if (keys.has(endpointKey(w.from))) w.netId = id;
  }
  for (const marker of c.markers)
    if (marker.endpoint) {
      const net = nets.find((n) =>
        n.ports.some((e) => endpointKey(e) === endpointKey(marker.endpoint!)),
      );
      if (net) marker.netId = net.id;
    }
  return nets;
}

export function electricalWires(c: Circuit, p: Project): Wire[] {
  const result: Wire[] = [];
  for (const n of c.nets ?? []) {
    const outputs = n.ports.filter((e) => portAt(c, p, e)?.direction === "out"),
      inputs = n.ports.filter((e) => portAt(c, p, e)?.direction === "in");
    if (result.length + outputs.length * inputs.length > 200000)
      throw new Error("sizeLimit");
    for (const from of outputs)
      for (const to of inputs) {
        const drawn = c.wires.find(
          (w) =>
            w.netId === n.id &&
            endpointKey(w.from) === endpointKey(from) &&
            endpointKey(w.to) === endpointKey(to),
        );
        result.push(
          drawn ?? {
            id: n.id + "-" + stableId(endpointKey(from) + endpointKey(to)),
            netId: n.id,
            from: { ...from },
            to: { ...to },
            points: [],
          },
        );
      }
  }
  return result;
}
export function attachNet(c: Circuit, p: Project, netId: string, e: Endpoint) {
  const n = c.nets.find((n) => n.id === netId),
    port = portAt(c, p, e);
  if (!n || !port) throw new Error("missingPort");
  if (port.width !== n.width) throw new Error("widthMismatch");
  const existing = c.nets.find((other) =>
    other.ports.some((m) => endpointKey(m) === endpointKey(e)),
  );
  if (existing && existing.id !== netId) throw new Error("alreadyConnected");
  if (!n.ports.some((m) => endpointKey(m) === endpointKey(e)))
    n.ports.push({ ...e });
}
export function connect(c: Circuit, p: Project, w: Wire) {
  const from = portAt(c, p, w.from),
    to = portAt(c, p, w.to);
  if (!from || !to) throw new Error("missingPort");
  if (from.direction !== "out" || to.direction !== "in")
    throw new Error("directionError");
  if (from.width !== to.width) throw new Error("widthMismatch");
  let net = c.nets.find((n) =>
    n.ports.some((e) => endpointKey(e) === endpointKey(w.from)),
  );
  const sinkNet = c.nets.find((n) =>
    n.ports.some((e) => endpointKey(e) === endpointKey(w.to)),
  );
  if (sinkNet && sinkNet.id !== net?.id) {
    if (net) {
      const sourceId = net.id;
      for (const e of net.ports)
        if (!sinkNet.ports.some((m) => endpointKey(m) === endpointKey(e)))
          sinkNet.ports.push({ ...e });
      sinkNet.name ??= net.name;
      for (const route of c.wires)
        if (route.netId === sourceId) route.netId = sinkNet.id;
      for (const marker of c.markers)
        if (marker.netId === sourceId) marker.netId = sinkNet.id;
      c.nets = c.nets.filter((n) => n.id !== sourceId);
    }
    net = sinkNet;
  }
  if (!net) {
    net = {
      id: "net-" + stableId(c.id + endpointKey(w.from)),
      width: from.width,
      ports: [{ ...w.from }],
    };
    c.nets.push(net);
  }
  attachNet(c, p, net.id, w.from);
  attachNet(c, p, net.id, w.to);
  w.netId = net.id;
  if (
    !c.wires.some(
      (old) =>
        endpointKey(old.from) === endpointKey(w.from) &&
        endpointKey(old.to) === endpointKey(w.to),
    )
  )
    c.wires.push(w);
}
export function removeRouteConnection(c: Circuit, id: string) {
  const wire = c.wires.find((w) => w.id === id);
  if (!wire) return;
  const net = c.nets.find((n) => n.id === wire.netId);
  const before = c.wires.filter((w) => w.netId === net?.id);
  const represented = new Set(
    before.flatMap((w) => [endpointKey(w.from), endpointKey(w.to)]),
  );
  c.wires = c.wires.filter((w) => w.id !== id);
  if (!net) return;
  const remaining = c.wires.filter((w) => w.netId === net.id);
  const used = new Set(
    remaining.flatMap((w) => [endpointKey(w.from), endpointKey(w.to)]),
  );
  const implicit = net.ports.some((e) => !represented.has(endpointKey(e)));
  net.ports = net.ports.filter((e) => {
    const k = endpointKey(e);
    return (
      ![wire.from, wire.to].some((end) => endpointKey(end) === k) ||
      used.has(k) ||
      c.markers.some(
        (m) =>
          m.netId === net.id && m.endpoint && endpointKey(m.endpoint) === k,
      )
    );
  });
  // Route endpoints carry explicit connections; positions never do. Named-only
  // members retain their declared bus membership when a drawn route is removed.
  if (!implicit && net.ports.length) {
    const neighbours = new Map(
      net.ports.map((e) => [endpointKey(e), new Set<string>()]),
    );
    for (const w of remaining) {
      const a = endpointKey(w.from),
        b = endpointKey(w.to);
      neighbours.get(a)?.add(b);
      neighbours.get(b)?.add(a);
    }
    const seen = new Set<string>(),
      groups: Endpoint[][] = [];
    for (const e of net.ports) {
      const key = endpointKey(e);
      if (seen.has(key)) continue;
      const pending = [key],
        keys = new Set<string>();
      while (pending.length) {
        const k = pending.pop()!;
        if (seen.has(k)) continue;
        seen.add(k);
        keys.add(k);
        for (const next of neighbours.get(k) ?? []) pending.push(next);
      }
      groups.push(net.ports.filter((e) => keys.has(endpointKey(e))));
    }
    if (groups.length > 1) {
      const split = groups.map((ports, i) => ({
        ...net,
        id: i
          ? "net-" + stableId(net.id + ports.map(endpointKey).sort().join())
          : net.id,
        name: i ? undefined : net.name,
        ports,
      }));
      c.nets.splice(c.nets.indexOf(net), 1, ...split);
      for (const w of remaining)
        w.netId = split.find((n) =>
          n.ports.some((e) => endpointKey(e) === endpointKey(w.from)),
        )!.id;
      for (const m of c.markers)
        if (m.netId === net.id && m.endpoint) {
          const n = split.find((n) =>
            n.ports.some((e) => endpointKey(e) === endpointKey(m.endpoint!)),
          );
          if (n) m.netId = n.id;
        }
    }
  }
  c.nets = c.nets.filter((n) => n.ports.length > 0);
}
export function resolveSignalRef(
  p: Project,
  root: string,
  text: string,
): SignalRef {
  const matches: SignalRef[] = [];
  function walk(id: string, path: string[], seen: string[]) {
    if (seen.includes(id) || seen.length > 16) return;
    for (const c of p.circuits[id]?.components ?? []) {
      for (const port of ports(c, p)) {
        const r = ref(c.id, port.id, path);
        if (signalLabel(r) === text) matches.push(r);
      }
      if (c.definitionId) walk(c.definitionId, [...path, c.id], [...seen, id]);
    }
  }
  walk(root, [], []);
  if (matches.length !== 1) throw new Error("ambiguousSignal");
  return matches[0];
}
export function refreshWidths(c: Circuit, p: Project) {
  for (const net of c.nets) {
    const widths = net.ports
      .map((e) => portAt(c, p, e)?.width)
      .filter((w): w is number => w !== undefined);
    if (widths.length && widths.every((w) => w === widths[0]))
      net.width = widths[0];
  }
}
