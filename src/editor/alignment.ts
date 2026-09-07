import { snap, type Circuit, type Project } from "../model/types";
import { geometry, ports, pinPosition } from "../model/components";
export type Alignment = { position: number; line: number };
export function nearestAlignment(
  values: number[],
  raw: number,
  offsets: number[],
  tolerance: number,
): Alignment | undefined {
  let result: Alignment | undefined,
    best = Infinity;
  for (const offset of offsets) {
    const target = raw + offset;
    let lo = 0,
      hi = values.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (values[mid] < target - tolerance) lo = mid + 1;
      else hi = mid;
    }
    for (
      let i = lo;
      i < values.length && values[i] <= target + tolerance;
      i++
    ) {
      const position = values[i] - offset,
        distance = Math.abs(position - raw);
      if (position === snap(position) && distance < best) {
        best = distance;
        result = { position, line: values[i] };
      }
    }
  }
  return result;
}

export function alignmentTargets(
  circuit: Circuit,
  project: Project,
  excluded: string[] = [],
) {
  const x = new Set<number>(),
    y = new Set<number>();
  const ignored = new Set(excluded);
  for (const c of circuit.components) {
    if (ignored.has(c.id)) continue;
    const g = geometry(c, project);
    [c.x, c.x + g.w / 2, c.x + g.w].forEach((n) => x.add(n));
    [
      c.y,
      c.y + g.h / 2,
      c.y + g.h,
      ...ports(c, project).map((p) => pinPosition(c, p.id, project).y),
    ].forEach((n) => y.add(n));
  }
  for (const wire of circuit.wires) {
    if (ignored.has(wire.from.component) || ignored.has(wire.to.component))
      continue;
    for (let i = 1; i < wire.points.length; i++) {
      const a = wire.points[i - 1],
        b = wire.points[i];
      if (a.x === b.x) x.add(a.x);
      if (a.y === b.y) y.add(a.y);
    }
  }
  return { x: [...x].sort((a, b) => a - b), y: [...y].sort((a, b) => a - b) };
}
