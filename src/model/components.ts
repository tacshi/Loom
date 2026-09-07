import { parameters, parameterValue } from "./parameters";
import type { Component, Port, Project } from "./types";
export const categories = [
  { id: "sources", kinds: ["input", "button", "constant", "probe"] },
  { id: "gates", kinds: ["not", "and", "or", "xor", "nand", "nor", "xnor", "triState"] },
  {
    id: "arithmetic",
    kinds: [
      "mux",
      "decoder",
      "split",
      "join",
      "adder",
      "subtractor",
      "compare",
    ],
  },
  { id: "devices", kinds: ["keyboard", "terminal", "display", "sevenSegment"] },
  { id: "storage", kinds: ["dff", "register", "counter", "ram", "rom"] },
] as const;
export function ports(c: Component, project?: Project): Port[] {
  const i = (id: string, width = c.width): Port => ({
    id,
    name: id,
    direction: "in",
    width,
  });
  const o = (id: string, width = c.width): Port => ({
    id,
    name: id,
    direction: "out",
    width,
  });
  switch (c.kind) {
    case "keyboard":
      return [i("read", 1), i("clear", 1), o("data", 8), o("ready", 1)];
    case "terminal":
      return [i("data", 8), i("write", 1), i("clear", 1)];
    case "sevenSegment":
      return ["a", "b", "c", "d", "e", "f", "g", "dp"].map((id) => i(id, 1));
    case "display":
      return [
        i("x", 6),
        i("y", 5),
        i("data", 1),
        i("write", 1),
        i("clear", 1),
        o("out", 1),
      ];
    case "triState":
      return [i("data"), i("enable", 1), o("out")];
    case "button":
      return [o("out", 1)];
    case "input":
    case "constant":
    case "portIn":
      return [o("out")];
    case "probe":
    case "portOut":
      return [i("in")];
    case "buffer":
      return [i("in"), o("out")];
    case "not":
      return [i("a"), o("out")];
    case "and":
    case "or":
    case "xor":
    case "nand":
    case "nor":
    case "xnor":
      return [i("a"), i("b"), o("out")];
    case "mux":
      return [i("a"), i("b"), i("sel", 1), o("out")];
    case "adder":
    case "subtractor":
      return [i("a"), i("b"), o("out"), o("carry", 1)];
    case "compare":
      return [i("a"), i("b"), o("eq", 1), o("lt", 1)];
    case "decoder":
      return [
        i("in", Math.min(c.width, 5)),
        ...Array.from({ length: 2 ** Math.min(c.width, 5) }, (_, n) =>
          o("o" + n, 1),
        ),
      ];
    case "split":
      return [
        i("in"),
        ...Array.from({ length: c.width }, (_, n) => o("b" + n, 1)),
      ];
    case "join":
      return [
        ...Array.from({ length: c.width }, (_, n) => i("b" + n, 1)),
        o("out"),
      ];
    case "dff":
    case "register":
      return [i("d"), i("en", 1), i("rst", 1), o("q")];
    case "counter":
      return [i("en", 1), i("rst", 1), o("q")];
    case "ram":
      return [
        i("addr", c.params.addressBits ?? 8),
        i("data"),
        i("we", 1),
        o("out"),
      ];
    case "rom":
      return [i("addr", c.params.addressBits ?? 8), o("out")];
    case "instance": {
      const def = project?.circuits[c.definitionId!];
      if (!def || !Array.isArray(def.ports)) return [];
      try {
        const values = parameters(def, c.arguments);
        return def.ports.map((p) => ({
          ...p,
          width: parameterValue(p.widthParameter, p.width, values),
        }));
      } catch {
        return def.ports;
      }
    }
  }
}
export function appearance(c: Component, p?: Project) {
  return {
    ...(c.definitionId ? p?.circuits[c.definitionId]?.appearance : undefined),
    ...c.appearance,
    rotation: c.appearance?.rotation ?? 0,
  };
}
export function baseGeometry(c: Component, p?: Project) {
  const ps = ports(c, p),
    a = appearance(c, p);
  return {
    w: a.width ?? 120,
    h:
      a.height ??
      Math.max(
        80,
        (Math.max(
          ps.filter((p) => p.direction === "in").length,
          ps.filter((p) => p.direction === "out").length,
        ) +
          2) *
          20,
      ),
  };
}
export function geometry(c: Component, p?: Project) {
  const g = baseGeometry(c, p),
    r = appearance(c, p).rotation;
  return r === 90 || r === 270 ? { w: g.h, h: g.w } : g;
}
export function pinLayout(c: Component, id: string, p?: Project) {
  const ps = ports(c, p),
    port = ps.find((p) => p.id === id);
  const a = appearance(c, p),
    custom = a.pins && Object.hasOwn(a.pins, id) ? a.pins[id] : undefined;
  return (
    custom ?? {
      side: port?.direction === "out" ? ("right" as const) : ("left" as const),
      slot:
        ps
          .filter((p) => p.direction === port?.direction)
          .findIndex((p) => p.id === id) + 1,
    }
  );
}
export function pinPosition(c: Component, id: string, p?: Project) {
  const g = baseGeometry(c, p),
    l = pinLayout(c, id, p),
    r = appearance(c, p).rotation;
  let x = l.side === "left" ? 0 : l.side === "right" ? g.w : l.slot * 20,
    y = l.side === "top" ? 0 : l.side === "bottom" ? g.h : l.slot * 20;
  if (r === 90) [x, y] = [g.h - y, x];
  else if (r === 180) [x, y] = [g.w - x, g.h - y];
  else if (r === 270) [x, y] = [y, g.w - x];
  return { x: c.x + x, y: c.y + y };
}
export function pinNormal(c: Component, id: string, p?: Project) {
  const side = pinLayout(c, id, p).side;
  let [x, y] =
    side === "left"
      ? [-1, 0]
      : side === "right"
        ? [1, 0]
        : side === "top"
          ? [0, -1]
          : [0, 1];
  for (let i = 0; i < appearance(c, p).rotation / 90; i++) [x, y] = [-y, x];
  return { x, y };
}
export function validateAppearance(c: Component, p?: Project) {
  const g = baseGeometry(c, p),
    used = new Set<string>();
  if (g.w < 80 || g.h < 80 || g.w > 4000 || g.h > 4000 || g.w % 20 || g.h % 20)
    throw new Error("appearanceInvalid");
  for (const port of ports(c, p)) {
    const l = pinLayout(c, port.id, p),
      limit = (l.side === "left" || l.side === "right" ? g.h : g.w) - 20;
    const key = l.side + ":" + l.slot;
    if (
      l.slot < 1 ||
      l.slot * 20 > limit ||
      !Number.isInteger(l.slot) ||
      used.has(key)
    )
      throw new Error("appearanceInvalid");
    used.add(key);
  }
}
