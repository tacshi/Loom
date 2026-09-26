import { it, expect } from "vitest";
import { emptyProject, createComponent } from "../src/model/types";
import {
  copySelection,
  pasteSelection,
  offsetClipboard,
  addConnection,
} from "../src/editor/session";

function branchedCircuit() {
  const p = emptyProject(),
    c = p.circuits[p.root];
  const a = createComponent("input", 0, 0),
    b = createComponent("probe", 240, 0),
    d = createComponent("probe", 240, 120);
  c.components = [a, b, d];
  addConnection(p, p.root, {
    id: "trunk",
    from: { component: a.id, port: "out" },
    to: { component: b.id, port: "in" },
    points: [
      { x: 120, y: 20 },
      { x: 240, y: 20 },
    ],
  });
  addConnection(p, p.root, {
    id: "branch",
    from: { component: a.id, port: "out" },
    to: { component: d.id, port: "in" },
    points: [
      { x: 180, y: 20 },
      { x: 180, y: 140 },
      { x: 240, y: 140 },
    ],
    junction: { x: 180, y: 20 },
    pinned: true,
  });
  return { p, ids: [a.id, b.id, d.id] };
}

it("pasted branch junctions move with their wires", () => {
  const { p, ids } = branchedCircuit();
  const pasted = pasteSelection(p, p.root, copySelection(p, p.root, ids));
  const wire = p.circuits[p.root].wires.find(
    (w) => pasted.includes(w.to.component) && w.junction,
  )!;
  expect(wire.junction).toEqual({ x: 220, y: 60 });
  expect(wire.points[0]).toEqual(wire.junction);
});

it("offset clipboards cascade repeated pastes", () => {
  const { p, ids } = branchedCircuit();
  const copied = copySelection(p, p.root, ids);
  const first = pasteSelection(p, p.root, copied);
  const second = pasteSelection(p, p.root, offsetClipboard(copied, 40));
  const at = (id: string) =>
    p.circuits[p.root].components.find((c) => c.id === id)!;
  expect(at(second[0]).x - at(first[0]).x).toBe(40);
  expect(at(second[0]).y - at(first[0]).y).toBe(40);
  const junctions = p.circuits[p.root].wires
    .filter((w) => w.junction)
    .map((w) => w.junction);
  expect(junctions).toEqual([
    { x: 180, y: 20 },
    { x: 220, y: 60 },
    { x: 260, y: 100 },
  ]);
});
