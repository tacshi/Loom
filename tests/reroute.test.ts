import { expect, it } from "vitest";
import { createComponent, emptyProject, type Wire } from "../src/model/types";
import { rerouteAutomatic, route, routeClear } from "../src/editor/routing";
import { ioProject } from "../src/cpu/ioCircuit";
import { crossings } from "../src/editor/crossings";

it("keeps pinned geometry and restores all automatic routes on failure", () => {
  const p = emptyProject(),
    c = p.circuits[p.root];
  c.components = [
    createComponent("input", 0, 0),
    createComponent("probe", 600, 0),
    createComponent("input", 0, 200),
    createComponent("probe", 400, 200),
  ];
  c.wires = [0, 2].map((i): Wire => ({
    id: `w${i}`,
    from: { component: c.components[i].id, port: "out" },
    to: { component: c.components[i + 1].id, port: "in" },
    points: [],
  }));
  for (const w of c.wires) w.points = route(c, p, w.from, w.to);
  c.wires[1].pinned = true;
  const pinned = structuredClone(c.wires[1]);
  rerouteAutomatic(c, p);
  expect(c.wires[1]).toEqual(pinned);
  expect(c.wires.every((w) => routeClear(c, p, w))).toBe(true);
  c.wires[1].pinned = false;
  c.components.push(createComponent("and", 340, 180));
  const before = structuredClone(c.wires);
  expect(() => rerouteAutomatic(c, p)).toThrow("routeBlocked");
  expect(c.wires).toEqual(before);
});

it("separates the old calculator branch from unrelated crossing geometry", () => {
  const p = ioProject(),
    c = p.circuits[p.root];
  const oldRoutes = [
    {
      from: { component: "Fields", port: "opcode" },
      to: { component: "ALU", port: "opcode" },
      points: [
        { x: 840, y: 20 },
        { x: 1060, y: 20 },
        { x: 1060, y: 80 },
        { x: 1080, y: 80 },
      ],
    },
    {
      from: { component: "ACC", port: "q" },
      to: { component: "ALU", port: "a" },
      points: [
        { x: 1440, y: 20 },
        { x: 1460, y: 20 },
        { x: 1460, y: -20 },
        { x: 1060, y: -20 },
        { x: 1060, y: 20 },
        { x: 1080, y: 20 },
      ],
    },
    {
      from: { component: "Fields", port: "opcode" },
      to: { component: "Read match 2", port: "a" },
      points: [
        { x: 840, y: 20 },
        { x: 2000, y: 20 },
      ],
    },
  ];
  for (const old of oldRoutes) {
    const wire = c.wires.find(
      (w) =>
        JSON.stringify([w.from, w.to]) === JSON.stringify([old.from, old.to]),
    )!;
    wire.points = old.points;
  }
  const before = crossings(c.wires);
  expect(before.junctions).toContainEqual({ x: 1060, y: 20 });
  expect(
    before.bridges.some((b) => b.point.x === 1060 && b.point.y === 20),
  ).toBe(true);
  expect(c.wires.some((w) => !routeClear(c, p, w))).toBe(true);
  rerouteAutomatic(c, p);
  expect(c.wires.every((w) => routeClear(c, p, w))).toBe(true);
  const marks = crossings(c.wires);
  expect(
    marks.bridges.filter((b) =>
      marks.junctions.some((j) => j.x === b.point.x && j.y === b.point.y),
    ),
  ).toEqual([]);
});

it("routes every generated nested I/O definition with clear pin approaches", () => {
  const p = ioProject();
  for (const c of Object.values(p.circuits).filter((c) => c.id !== p.root)) {
    expect(
      c.wires.filter((w) => !routeClear(c, p, w)).map((w) => w.id),
      c.name,
    ).toEqual([]);
  }
});
