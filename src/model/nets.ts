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
  const old = c.nets ?? [];
  const grouped = new Map<string, Net>();
  for (const w of c.wires) {
    const key = endpointKey(w.from);
    let net = grouped.get(key);
    if (!net) {
      const prior = old.find(
        (n) =>
          n.ports.some((e) => endpointKey(e) === key) &&
          portAt(c, p, w.from)?.direction === "out",
      );
      net = {
        id: prior?.id ?? "net-" + stableId(c.id + key),
        width: portAt(c, p, w.from)?.width ?? 1,
        name: prior?.name,
        ports: [{ ...w.from }],
      };
      grouped.set(key, net);
    }
    if (!net.ports.some((e) => endpointKey(e) === endpointKey(w.to)))
      net.ports.push({ ...w.to });
    w.netId = net.id;
  }
  return [...grouped.values()];
}
export function electricalWires(c: Circuit, p: Project): Wire[] {
  const result: Wire[] = [];
  for (const n of c.nets ?? []) {
    const outputs = n.ports.filter((e) => portAt(c, p, e)?.direction === "out"),
      inputs = n.ports.filter((e) => portAt(c, p, e)?.direction === "in");
    for (const from of outputs.slice(0, 2))
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
  if (
    port.direction === "out" &&
    n.ports.some(
      (m) =>
        portAt(c, p, m)?.direction === "out" &&
        endpointKey(m) !== endpointKey(e),
    )
  )
    throw new Error("multipleDrivers");
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
  if (sinkNet && sinkNet.id !== net?.id) throw new Error("multipleDrivers");
  if (!net) {
    net = {
      id: "net-" + stableId(c.id + endpointKey(w.from)),
      width: from.width,
      ports: [{ ...w.from }],
    };
    c.nets.push(net);
  }
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
  c.wires = c.wires.filter((w) => w.id !== id);
  const net = c.nets.find((n) => n.id === wire.netId);
  if (
    net &&
    !c.wires.some(
      (w) => w.netId === net.id && endpointKey(w.to) === endpointKey(wire.to),
    )
  )
    net.ports = net.ports.filter(
      (e) => endpointKey(e) !== endpointKey(wire.to),
    );
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
