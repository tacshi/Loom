import { it, expect } from "vitest";
import { emptyProject, createComponent } from "../src/model/types";
import { route, moveComponents, moveSegment } from "../src/editor/routing";
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
