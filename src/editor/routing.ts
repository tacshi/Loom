import {
  GRID,
  snap,
  type Point,
  type Circuit,
  type Project,
  type Wire,
  type Endpoint,
} from "../model/types";
import { overlapping } from "./crossings";
import { geometry, pinPosition, ports } from "../model/components";
export function simplify(points: Point[]): Point[] {
  return points
    .filter((p, i) => !i || p.x !== points[i - 1].x || p.y !== points[i - 1].y)
    .filter(
      (p, i, a) =>
        !i ||
        i === a.length - 1 ||
        !(
          (a[i - 1].x === p.x && p.x === a[i + 1].x) ||
          (a[i - 1].y === p.y && p.y === a[i + 1].y)
        ),
    );
}
export function orthogonal(a: Point, b: Point, horizontal = true): Point[] {
  return simplify([a, horizontal ? { x: b.x, y: a.y } : { x: a.x, y: b.y }, b]);
}
type Box = { x: number; y: number; w: number; h: number };
function search(
  a: Point,
  b: Point,
  boxes: Box[],
  horizontal: boolean,
  occupied: { a: Point; b: Point }[] = [],
): Point[] {
  const blocked = (x: number, y: number) =>
    boxes.some(
      (o) =>
        x > o.x - 10 &&
        x < o.x + o.w + 10 &&
        y > o.y - 10 &&
        y < o.y + o.h + 10,
    );
  const dirs = horizontal
    ? [
        [1, 0],
        [0, 1],
        [0, -1],
        [-1, 0],
      ]
    : [
        [0, 1],
        [1, 0],
        [-1, 0],
        [0, -1],
      ];
  type Node = {
    x: number;
    y: number;
    dir: number;
    g: number;
    f: number;
    parent?: Node;
  };
  const open: Node[] = [];
  const push = (n: Node) => {
    open.push(n);
    let i = open.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (open[p].f <= n.f) break;
      open[i] = open[p];
      i = p;
    }
    open[i] = n;
  };
  const pop = () => {
    const first = open[0],
      last = open.pop()!;
    if (open.length) {
      let i = 0;
      while (i * 2 + 1 < open.length) {
        let child = i * 2 + 1;
        if (child + 1 < open.length && open[child + 1].f < open[child].f)
          child++;
        if (open[child].f >= last.f) break;
        open[i] = open[child];
        i = child;
      }
      open[i] = last;
    }
    return first;
  };
  push({ ...a, dir: -1, g: 0, f: 0 });
  const costs = new Map<string, number>();
  let steps = 0;
  while (open.length && steps++ < 12000) {
    const current = pop();
    if (current.x === b.x && current.y === b.y) {
      const result: Point[] = [];
      let n: Node | undefined = current;
      while (n) {
        result.unshift({ x: n.x, y: n.y });
        n = n.parent;
      }
      return simplify(result);
    }
    for (let d = 0; d < dirs.length; d++) {
      const x = current.x + dirs[d][0] * GRID,
        y = current.y + dirs[d][1] * GRID;
      if (blocked(x, y) && !(x === b.x && y === b.y)) continue;
      if (occupied.some((s) => overlapping(current, { x, y }, s.a, s.b)))
        continue;
      const crossingCost =
        occupied.filter((s) =>
          s.a.x === s.b.x
            ? current.y === y &&
              s.a.x > Math.min(current.x, x) &&
              s.a.x <= Math.max(current.x, x) &&
              y >= Math.min(s.a.y, s.b.y) &&
              y <= Math.max(s.a.y, s.b.y)
            : current.x === x &&
              s.a.y > Math.min(current.y, y) &&
              s.a.y <= Math.max(current.y, y) &&
              x >= Math.min(s.a.x, s.b.x) &&
              x <= Math.max(s.a.x, s.b.x),
        ).length * 50;
      const g =
        current.g +
        GRID +
        crossingCost +
        (current.dir >= 0 && current.dir !== d ? 14 : 0);
      const key = `${x},${y},${d}`;
      if ((costs.get(key) ?? Infinity) <= g) continue;
      costs.set(key, g);
      push({
        x,
        y,
        dir: d,
        g,
        f: g + Math.abs(b.x - x) + Math.abs(b.y - y),
        parent: current,
      });
    }
  }
  throw new Error("routeBlocked");
}
export function route(
  circuit: Circuit,
  project: Project,
  from: Endpoint,
  to: Endpoint,
  waypoints: Point[] = [],
  horizontal = true,
): Point[] {
  const a = circuit.components.find((c) => c.id === from.component)!,
    b = circuit.components.find((c) => c.id === to.component)!;
  const start = pinPosition(a, from.port, project),
    end = pinPosition(b, to.port, project);
  const exit = { x: start.x + GRID, y: start.y },
    entry = { x: end.x - GRID, y: end.y };
  const boxes = circuit.components.map((c) => ({
    x: c.x,
    y: c.y,
    ...geometry(c, project),
  }));
  const occupied = circuit.wires
    .filter(
      (w) =>
        !(w.from.component === from.component && w.from.port === from.port),
    )
    .flatMap((w) => w.points.slice(1).map((b, i) => ({ a: w.points[i], b })));
  const nodes = [
    exit,
    ...waypoints.map((p) => ({ x: snap(p.x), y: snap(p.y) })),
    entry,
  ];
  const result = [start];
  for (let i = 0; i < nodes.length - 1; i++)
    result.push(...search(nodes[i], nodes[i + 1], boxes, horizontal, occupied));
  result.push(end);
  return simplify(result);
}
export function protectTerminals(points: Point[]): Point[] {
  if (points.length < 2) return points;
  const ps = structuredClone(points),
    start = ps[0],
    end = ps[ps.length - 1];
  if (ps.length <= 3 && start.x + 2 * GRID <= end.x) {
    const x = Math.max(
      start.x + GRID,
      Math.min(end.x - GRID, snap((start.x + end.x) / 2)),
    );
    return simplify([start, { x, y: start.y }, { x, y: end.y }, end]);
  }
  const exit = { x: start.x + GRID, y: start.y },
    entry = { x: end.x - GRID, y: end.y };
  const middle = ps.slice(1, -1);
  if (!middle.length)
    return simplify([start, exit, ...orthogonal(exit, entry), end]);
  if (middle[0].x === start.x) middle[0].x = exit.x;
  if (middle.at(-1)!.x === end.x) middle.at(-1)!.x = entry.x;
  return simplify([
    start,
    exit,
    ...orthogonal(exit, middle[0], false),
    ...middle,
    ...orthogonal(middle.at(-1)!, entry),
    entry,
    end,
  ]);
}
export function moveComponents(
  circuit: Circuit,
  project: Project,
  ids: string[],
  delta: Point,
) {
  for (const c of circuit.components)
    if (ids.includes(c.id)) {
      c.x += delta.x;
      c.y += delta.y;
    }
  for (const w of circuit.wires) {
    const a = ids.includes(w.from.component),
      b = ids.includes(w.to.component);
    if (!a && !b) continue;
    if (a && b) {
      w.points = w.points.map((p) => ({ x: p.x + delta.x, y: p.y + delta.y }));
      if (w.junction)
        w.junction = { x: w.junction.x + delta.x, y: w.junction.y + delta.y };
      continue;
    }
    const start = pinPosition(
        circuit.components.find((c) => c.id === w.from.component)!,
        w.from.port,
        project,
      ),
      end = pinPosition(
        circuit.components.find((c) => c.id === w.to.component)!,
        w.to.port,
        project,
      );
    const middle = w.points.slice(1, -1);
    if (middle.length) {
      w.points = simplify([
        ...orthogonal(start, middle[0]),
        ...middle,
        ...orthogonal(middle[middle.length - 1], end, false),
      ]);
    } else w.points = orthogonal(start, end);
    w.points = protectTerminals(w.points);
    if (!w.pinned) {
      try {
        const boxes = circuit.components
          .filter((c) => c.id !== w.from.component && c.id !== w.to.component)
          .map((c) => ({ x: c.x, y: c.y, ...geometry(c, project) }));
        const collision = w.points.slice(1).some((p, i) =>
          boxes.some((o) => {
            const q = w.points[i];
            return p.x === q.x
              ? p.x > o.x &&
                  p.x < o.x + o.w &&
                  Math.max(p.y, q.y) > o.y &&
                  Math.min(p.y, q.y) < o.y + o.h
              : p.y > o.y &&
                  p.y < o.y + o.h &&
                  Math.max(p.x, q.x) > o.x &&
                  Math.min(p.x, q.x) < o.x + o.w;
          }),
        );
        const overlap = circuit.wires.some(
          (other) =>
            other.id !== w.id &&
            !(
              other.from.component === w.from.component &&
              other.from.port === w.from.port
            ) &&
            w.points
              .slice(1)
              .some((b, i) =>
                other.points
                  .slice(1)
                  .some((d, j) =>
                    overlapping(w.points[i], b, other.points[j], d),
                  ),
              ),
        );
        if (collision || overlap)
          w.points = route(circuit, project, w.from, w.to);
      } catch {
        /* Preserve connectivity and geometry when crowded; explicit reroute can be requested. */
      }
    }
  }
}
export function moveSegment(wire: Wire, index: number, point: Point): Point[] {
  const ps = structuredClone(wire.points);
  if (index < 0 || index >= ps.length - 1) return ps;
  const a = ps[index],
    b = ps[index + 1];
  const horizontal = a.y === b.y;
  if (index === 0) {
    ps.splice(1, 0, { ...a });
    index++;
  }
  if (index + 1 === ps.length - 1) ps.splice(ps.length - 1, 0, { ...b });
  if (horizontal) {
    ps[index].y = snap(point.y);
    ps[index + 1].y = snap(point.y);
  } else {
    ps[index].x = snap(point.x);
    ps[index + 1].x = snap(point.x);
  }
  return protectTerminals(simplify(ps));
}
export function validDirection(
  project: Project,
  circuit: Circuit,
  e: Endpoint,
) {
  const c = circuit.components.find((c) => c.id === e.component);
  return c && ports(c, project).find((p) => p.id === e.port)?.direction;
}
