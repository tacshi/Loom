import { it, expect } from "vitest";
import { emptyProject, createComponent } from "../src/model/types";
import {
  route,
  moveComponents,
  moveSegment,
  previewMove,
  routeClear,
} from "../src/editor/routing";
it("routes orthogonally around a blocking component", () => {
  const p = emptyProject(),
    c = p.circuits[p.root];
  const a = createComponent("input", 0, 0),
    b = createComponent("probe", 440, 0),
    block = createComponent("and", 220, 0);
  c.components = [a, b, block];
  const ps = route(
    c,
    p,
    { component: a.id, port: "out" },
    { component: b.id, port: "in" },
  );
  expect(ps[0]).toEqual({ x: 120, y: 20 });
  expect(ps.at(-1)).toEqual({ x: 440, y: 20 });
  for (let i = 1; i < ps.length; i++)
    expect(ps[i].x === ps[i - 1].x || ps[i].y === ps[i - 1].y).toBe(true);
  expect(ps.some((p) => p.y < 0 || p.y > 80)).toBe(true);
});
it("group movement preserves routes and does not create connectivity", () => {
  const p = emptyProject(),
    c = p.circuits[p.root];
  const a = createComponent("input", 0, 0),
    b = createComponent("probe", 240, 0);
  c.components = [a, b];
  c.wires = [
    {
      id: "w",
      from: { component: a.id, port: "out" },
      to: { component: b.id, port: "in" },
      points: route(
        c,
        p,
        { component: a.id, port: "out" },
        { component: b.id, port: "in" },
      ),
    },
  ];
  const old = structuredClone(c.wires[0]);
  moveComponents(c, p, [a.id, b.id], { x: 40, y: 60 });
  expect(c.wires[0].points).toEqual(
    old.points.map((p) => ({ x: p.x + 40, y: p.y + 60 })),
  );
  expect(c.wires[0].from).toEqual(old.from);
});
it("segment dragging keeps both endpoints fixed", () => {
  const w = {
    id: "w",
    from: { component: "a", port: "out" },
    to: { component: "b", port: "in" },
    points: [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
    ],
  };
  const ps = moveSegment(w, 0, { x: 20, y: 40 });
  expect(ps[0]).toEqual({ x: 0, y: 0 });
  expect(ps.at(-1)).toEqual({ x: 100, y: 0 });
  expect(ps.some((p) => p.y === 40)).toBe(true);
  expect(ps[1].y).toBe(0);
  expect(ps.at(-2)!.y).toBe(0);
  expect(ps.at(-2)!.x).toBeLessThan(100);
});
it("moving a gate keeps the final approach horizontal and away from the component edge", () => {
  const p = emptyProject(),
    c = p.circuits[p.root];
  const a = createComponent("input", 80, 60),
    b = createComponent("not", 260, 60);
  c.components = [a, b];
  c.wires = [
    {
      id: "w",
      from: { component: a.id, port: "out" },
      to: { component: b.id, port: "a" },
      points: route(
        c,
        p,
        { component: a.id, port: "out" },
        { component: b.id, port: "a" },
      ),
    },
  ];
  moveComponents(c, p, [b.id], { x: 80, y: 100 });
  const ps = c.wires[0].points,
    end = ps.at(-1)!,
    approach = ps.at(-2)!;
  expect(approach.y).toBe(end.y);
  expect(approach.x).toBeLessThanOrEqual(end.x - 20);
  expect(ps[1].y).toBe(ps[0].y);
  expect(
    ps.some(
      (point, i) =>
        i > 0 &&
        point.x === end.x &&
        ps[i - 1].x === end.x &&
        point.y !== ps[i - 1].y,
    ),
  ).toBe(false);
});

it("keeps separate NAND inputs from touching at a bend after a move", () => {
  const p = emptyProject(),
    c = p.circuits[p.root];
  const a = createComponent("input", 0, 0),
    b = createComponent("input", 0, 160),
    gate = createComponent("nand", 200, 100);
  c.components = [a, b, gate];
  c.wires = [
    {
      id: "a",
      from: { component: a.id, port: "out" },
      to: { component: gate.id, port: "a" },
      points: [
        { x: 120, y: 20 },
        { x: 140, y: 20 },
        { x: 140, y: 120 },
        { x: 200, y: 120 },
      ],
    },
    {
      id: "b",
      from: { component: b.id, port: "out" },
      to: { component: gate.id, port: "b" },
      points: [
        { x: 120, y: 180 },
        { x: 180, y: 180 },
        { x: 180, y: 140 },
        { x: 200, y: 140 },
      ],
    },
  ];
  moveComponents(c, p, [gate.id], { x: 0, y: -20 });
  const [first, second] = c.wires;
  const touches = first.points.some((point) =>
    second.points.slice(1).some((end, i) => {
      const start = second.points[i];
      return start.x === end.x
        ? point.x === start.x &&
            point.y >= Math.min(start.y, end.y) &&
            point.y <= Math.max(start.y, end.y)
        : point.y === start.y &&
            point.x >= Math.min(start.x, end.x) &&
            point.x <= Math.max(start.x, end.x);
    }),
  );
  expect(touches).toBe(false);
});

it("moves a branched NAND down one grid step without stale outgoing routes blocking its inputs", () => {
  const p = emptyProject(),
    c = p.circuits[p.root];
  const nodes = [
    ["a", "input", 0, 0],
    ["b", "input", 0, 160],
    ["nand", "nand", 200, 60],
    ["upper", "nand", 380, 0],
    ["lower", "nand", 380, 160],
  ] as const;
  c.components = nodes.map(([id, kind, x, y]) => ({
    ...createComponent(kind, x, y),
    id,
  }));
  const add = (
    id: string,
    source: string,
    target: string,
    pin: string,
    points: number[][],
  ) =>
    c.wires.push({
      id,
      from: { component: source, port: "out" },
      to: { component: target, port: pin },
      points: points.map(([x, y]) => ({ x, y })),
    });
  add("a-nand", "a", "nand", "a", [
    [120, 20],
    [180, 20],
    [180, 80],
    [200, 80],
  ]);
  add("b-nand", "b", "nand", "b", [
    [120, 180],
    [180, 180],
    [180, 100],
    [200, 100],
  ]);
  add("a-upper", "a", "upper", "a", [
    [120, 20],
    [380, 20],
  ]);
  add("b-lower", "b", "lower", "b", [
    [120, 180],
    [140, 180],
    [140, 200],
    [380, 200],
  ]);
  add("nand-upper", "nand", "upper", "b", [
    [320, 80],
    [340, 80],
    [340, 40],
    [380, 40],
  ]);
  add("nand-lower", "nand", "lower", "a", [
    [320, 80],
    [340, 80],
    [340, 180],
    [380, 180],
  ]);
  const before = structuredClone(c);
  const preview = previewMove(c, p, ["nand"], { x: 0, y: 20 });
  expect(preview.valid).toBe(true);
  expect(c).toEqual(before);
  expect(() => moveComponents(c, p, ["nand"], { x: 0, y: 20 })).not.toThrow();
  expect(c.wires.every((w) => routeClear(c, p, w))).toBe(true);
  expect(c.wires).toEqual(preview.circuit.wires);
  expect(c.wires.map((w) => [w.from, w.to])).toEqual(
    before.wires.map((w) => [w.from, w.to]),
  );
});
