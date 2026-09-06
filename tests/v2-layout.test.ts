import { it, expect } from "vitest";
import { emptyProject, createComponent } from "../src/model/types";
import { route, routeClear, moveComponents } from "../src/editor/routing";
import { connect } from "../src/model/nets";
import { editProject } from "../src/editor/session";
import { pinNormal, pinPosition } from "../src/model/components";
for (const rotation of [0, 90, 180, 270] as const)
  it(`routes rotated pins perpendicularly at ${rotation}`, () => {
    const p = emptyProject(),
      c = p.circuits[p.root],
      a = createComponent("input", 0, 0),
      b = createComponent("not", 400, 200);
    b.appearance = { rotation };
    c.components = [a, b];
    const w = {
      id: "w",
      from: { component: a.id, port: "out" },
      to: { component: b.id, port: "a" },
      points: [] as { x: number; y: number }[],
    };
    w.points = route(c, p, w.from, w.to);
    connect(c, p, w);
    expect(routeClear(c, p, w)).toBe(true);
    const n = pinNormal(b, "a", p),
      end = pinPosition(b, "a", p),
      previous = w.points.at(-2)!;
    expect(
      (previous.x - end.x) * n.x + (previous.y - end.y) * n.y,
    ).toBeGreaterThanOrEqual(20);
  });
it("rejects a blocked pin without changing the original document", () => {
  const p = emptyProject(),
    c = p.circuits[p.root],
    a = createComponent("input", 0, 0),
    b = createComponent("not", 400, 0);
  c.components = [a, b];
  const w = {
    id: "w",
    from: { component: a.id, port: "out" },
    to: { component: b.id, port: "a" },
    points: route(
      c,
      p,
      { component: a.id, port: "out" },
      { component: b.id, port: "a" },
    ),
  };
  connect(c, p, w);
  const original = JSON.stringify(p);
  expect(() =>
    editProject(p, (d) =>
      moveComponents(d.circuits[d.root], d, [b.id], { x: -300, y: 0 }),
    ),
  ).toThrow("routeBlocked");
  expect(JSON.stringify(p)).toBe(original);
});
