import type { Component, Port, Project } from "./types";
export const categories = [
  { id: "sources", kinds: ["input", "constant", "probe"] },
  { id: "gates", kinds: ["not", "and", "or", "xor", "nand", "nor", "xnor"] },
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
    case "instance":
      return (
        project?.circuits[c.definitionId!]?.ports.map((p) => ({ ...p })) ?? []
      );
  }
}
export function geometry(c: Component, p?: Project) {
  const ps = ports(c, p);
  return {
    w: 120,
    h: Math.max(
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
export function pinPosition(c: Component, id: string, p?: Project) {
  const port = ports(c, p).find((p) => p.id === id);
  const list = ports(c, p).filter((p) => p.direction === port?.direction);
  return {
    x: c.x + (port?.direction === "out" ? geometry(c, p).w : 0),
    y: c.y + 20 * (list.findIndex((p) => p.id === id) + 1),
  };
}
