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
import { geometry, pinPosition, ports, pinNormal } from "../model/components";
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
  searchLimit = 12000,
): Point[] {
  const buckets = new Map<string, Box[]>();
  for (const box of boxes)
    for (
      let x = Math.floor((box.x - 10) / 200);
      x <= Math.floor((box.x + box.w + 10) / 200);
      x++
    )
      for (
        let y = Math.floor((box.y - 10) / 200);
        y <= Math.floor((box.y + box.h + 10) / 200);
        y++
      ) {
        const key = x + "," + y;
        let list = buckets.get(key);
        if (!list) buckets.set(key, (list = []));
        list.push(box);
      }
  const blocked = (x: number, y: number) =>
    (buckets.get(Math.floor(x / 200) + "," + Math.floor(y / 200)) ?? []).some(
      (o) =>
        x > o.x - 10 &&
        x < o.x + o.w + 10 &&
        y > o.y - 10 &&
        y < o.y + o.h + 10,
    );
  type Segment = { a: Point; b: Point };
  const rows = new Map<number, Segment[]>(),
    columns = new Map<number, Segment[]>();
  for (const segment of occupied) {
    const map = segment.a.y === segment.b.y ? rows : columns,
      k = map === rows ? segment.a.y : segment.a.x;
    let list = map.get(k);
    if (!list) map.set(k, (list = []));
    list.push(segment);
  }
  const rowKeys = [...rows.keys()].sort((a, b) => a - b),
    columnKeys = [...columns.keys()].sort((a, b) => a - b);
  function crossingCount(
    map: Map<number, Segment[]>,
    keys: number[],
    min: number,
    max: number,
    at: number,
    horizontal: boolean,
  ) {
    let lo = 0,
      hi = keys.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (keys[m] <= min) lo = m + 1;
      else hi = m;
    }
    let count = 0;
    for (let i = lo; i < keys.length && keys[i] <= max; i++)
      for (const s of map.get(keys[i])!) {
        const a = horizontal ? s.a.y : s.a.x,
          b = horizontal ? s.b.y : s.b.x;
        if (at >= Math.min(a, b) && at <= Math.max(a, b)) count++;
      }
    return count;
  }
  if (blocked(a.x, a.y) || blocked(b.x, b.y)) throw new Error("routeBlocked");
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
  while (open.length && steps++ < searchLimit) {
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
      const horizontalMove = current.y === y;
      const parallel = (horizontalMove ? rows.get(y) : columns.get(x)) ?? [];
      if (parallel.some((s) => overlapping(current, { x, y }, s.a, s.b)))
        continue;
      const crossingCost =
        50 *
        (horizontalMove
          ? crossingCount(
              columns,
              columnKeys,
              Math.min(current.x, x),
              Math.max(current.x, x),
              y,
              true,
            )
          : crossingCount(
              rows,
              rowKeys,
              Math.min(current.y, y),
              Math.max(current.y, y),
              x,
              false,
            ));
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
function relatedNetIds(circuit: Circuit, from: Endpoint, to: Endpoint) {
  return new Set(
    circuit.nets
      .filter((n) =>
        n.ports.some(
          (e) =>
            (e.component === from.component && e.port === from.port) ||
            (e.component === to.component && e.port === to.port),
        ),
      )
      .map((n) => n.id),
  );
}
export function route(
  circuit: Circuit,
  project: Project,
  from: Endpoint,
  to: Endpoint,
  waypoints: Point[] = [],
  horizontal = true,
  searchLimit = 12000,
): Point[] {
  const a = circuit.components.find((c) => c.id === from.component)!,
    b = circuit.components.find((c) => c.id === to.component)!;
  const start = pinPosition(a, from.port, project),
    end = pinPosition(b, to.port, project);
  const an = pinNormal(a, from.port, project),
    bn = pinNormal(b, to.port, project);
  const exit = { x: start.x + an.x * GRID, y: start.y + an.y * GRID },
    entry = { x: end.x + bn.x * GRID, y: end.y + bn.y * GRID };
  const boxes = circuit.components.map((c) => ({
    x: c.x,
    y: c.y,
    ...geometry(c, project),
  }));
  const related = relatedNetIds(circuit, from, to);
  const occupied = circuit.wires
    .filter(
      (w) =>
        !(w.netId && related.has(w.netId)) &&
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
    result.push(
      ...search(
        nodes[i],
        nodes[i + 1],
        boxes,
        horizontal,
        occupied,
        searchLimit,
      ),
    );
  result.push(end);
  const points = simplify(result);
  if (!routeClear(circuit, project, { id: "preview", from, to, points }))
    throw new Error("routeBlocked");
  return points;
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
export function routeClear(
  circuit: Circuit,
  project: Project,
  wire: Wire,
  points = wire.points,
) {
  if (points.length < 2) return false;
  const source = circuit.components.find((c) => c.id === wire.from.component),
    sink = circuit.components.find((c) => c.id === wire.to.component);
  if (!source || !sink) return false;
  const first = points[0],
    second = points[1],
    end = points.at(-1)!,
    before = points.at(-2)!,
    a = pinNormal(source, wire.from.port, project),
    b = pinNormal(sink, wire.to.port, project);
  if (
    (second.x - first.x) * a.x + (second.y - first.y) * a.y < GRID ||
    (before.x - end.x) * b.x + (before.y - end.y) * b.y < GRID
  )
    return false;
  for (let i = 1; i < points.length; i++) {
    const x = points[i - 1],
      y = points[i];
    if (x.x !== y.x && x.y !== y.y) return false;
    for (const c of circuit.components) {
      if (
        (i === 1 && c.id === source.id) ||
        (i === points.length - 1 && c.id === sink.id)
      )
        continue;
      const g = geometry(c, project);
      if (
        x.x === y.x
          ? x.x >= c.x &&
            x.x <= c.x + g.w &&
            Math.max(x.y, y.y) > c.y &&
            Math.min(x.y, y.y) < c.y + g.h
          : x.y >= c.y &&
            x.y <= c.y + g.h &&
            Math.max(x.x, y.x) > c.x &&
            Math.min(x.x, y.x) < c.x + g.w
      )
        return false;
    }
  }
  const related = wire.netId
    ? new Set([wire.netId])
    : relatedNetIds(circuit, wire.from, wire.to);
  return !circuit.wires.some(
    (other) =>
      other.id !== wire.id &&
      (!other.netId || !related.has(other.netId)) &&
      !(
        other.from.component === wire.from.component &&
        other.from.port === wire.from.port
      ) &&
      points
        .slice(1)
        .some((b, i) =>
          other.points
            .slice(1)
            .some((d, j) => overlapping(points[i], b, other.points[j], d)),
        ),
  );
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
  const affected = circuit.wires.filter(
    (w) => ids.includes(w.from.component) || ids.includes(w.to.component),
  );
  for (const w of affected) {
    const a = ids.includes(w.from.component),
      b = ids.includes(w.to.component);
    if (a && b) {
      w.points = w.points.map((p) => ({ x: p.x + delta.x, y: p.y + delta.y }));
      if (w.junction)
        w.junction = { x: w.junction.x + delta.x, y: w.junction.y + delta.y };
      if (!routeClear(circuit, project, w)) throw new Error("routeBlocked");
      continue;
    }
    const source = circuit.components.find((c) => c.id === w.from.component)!,
      sink = circuit.components.find((c) => c.id === w.to.component)!;
    const start = pinPosition(source, w.from.port, project),
      end = pinPosition(sink, w.to.port, project),
      sn = pinNormal(source, w.from.port, project),
      tn = pinNormal(sink, w.to.port, project);
    const middle = w.points.slice(1, -1);
    const exit = { x: start.x + sn.x * GRID, y: start.y + sn.y * GRID },
      entry = { x: end.x + tn.x * GRID, y: end.y + tn.y * GRID };
    const candidate = simplify([
      start,
      exit,
      ...(middle.length
        ? [
            ...orthogonal(exit, middle[0], sn.y !== 0),
            ...middle,
            ...orthogonal(middle.at(-1)!, entry, tn.y === 0),
          ]
        : orthogonal(exit, entry)),
      entry,
      end,
    ]);
    if (!w.pinned && routeClear(circuit, project, w, candidate))
      w.points = candidate;
    else {
      const constrained = w.pinned ? middle : [];
      w.points = route(circuit, project, w.from, w.to, constrained);
      if (!routeClear(circuit, project, w)) throw new Error("routeBlocked");
    }
  }
}
export function previewMove(
  circuit: Circuit,
  project: Project,
  ids: string[],
  delta: Point,
) {
  const c = {
    ...circuit,
    components: circuit.components.map((n) =>
      ids.includes(n.id) ? { ...n } : n,
    ),
    wires: circuit.wires.map((w) =>
      ids.includes(w.from.component) || ids.includes(w.to.component)
        ? { ...w, points: [...w.points] }
        : w,
    ),
  };
  try {
    moveComponents(c, project, ids, delta);
    return { circuit: c, valid: true };
  } catch {
    return { circuit: c, valid: false };
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
  const start = wire.points[0],
    end = wire.points.at(-1)!,
    next = wire.points[1],
    previous = wire.points.at(-2)!;
  const sn = { x: Math.sign(next.x - start.x), y: Math.sign(next.y - start.y) },
    tn = { x: Math.sign(previous.x - end.x), y: Math.sign(previous.y - end.y) };
  const exit = { x: start.x + sn.x * GRID, y: start.y + sn.y * GRID },
    entry = { x: end.x + tn.x * GRID, y: end.y + tn.y * GRID },
    middle = ps.slice(1, -1);
  if (middle.length) {
    if (sn.x) middle[0].x = exit.x;
    else middle[0].y = exit.y;
    if (tn.x) middle.at(-1)!.x = entry.x;
    else middle.at(-1)!.y = entry.y;
  }
  return simplify([start, exit, ...middle, entry, end]);
}
export function validDirection(
  project: Project,
  circuit: Circuit,
  e: Endpoint,
) {
  const c = circuit.components.find((c) => c.id === e.component);
  return c && ports(c, project).find((p) => p.id === e.port)?.direction;
}

/** Reroute automatic geometry atomically, reserving long connections first. */
export function rerouteAutomatic(
  circuit: Circuit,
  project: Project,
  options: { attempts?: number; searchLimit?: number } = {},
) {
  const nodes = new Map(circuit.components.map((c) => [c.id, c]));
  const automatic = circuit.wires.filter((w) => !w.pinned);
  const saved = new Map(automatic.map((w) => [w.id, w.points]));
  const distance = (w: Wire) => {
    const a = pinPosition(nodes.get(w.from.component)!, w.from.port, project);
    const b = pinPosition(nodes.get(w.to.component)!, w.to.port, project);
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  };
  const ordered = automatic
    .map((wire, index) => ({ wire, index, distance: distance(wire) }))
    .sort((a, b) => b.distance - a.distance || a.index - b.index);
  try {
    for (let attempt = 0; attempt < (options.attempts ?? 1); attempt++) {
      for (const w of automatic) w.points = [];
      for (let i = 0; i < ordered.length; i++) {
        const w = ordered[i].wire;
        try {
          w.points = route(
            circuit,
            project,
            w.from,
            w.to,
            w.junction ? [w.junction] : [],
            true,
            options.searchLimit,
          );
        } catch (error) {
          if (attempt + 1 >= (options.attempts ?? 1)) throw error;
          // Reserve the failed connection first on the next bounded attempt.
          ordered.unshift(...ordered.splice(i, 1));
          break;
        }
        if (i === ordered.length - 1) return;
      }
      if (!ordered.length) return;
    }
  } catch (error) {
    for (const w of automatic) w.points = saved.get(w.id)!;
    throw error;
  }
}
