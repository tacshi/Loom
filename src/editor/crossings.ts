import type { Point, Wire } from "../model/types";
export type Bridge = { wire: string; segment: number; point: Point };
export function crossings(wires: Wire[]): {
  bridges: Bridge[];
  junctions: Point[];
} {
  const bridges: Bridge[] = [],
    junctions: Point[] = [],
    seen = new Set<string>();
  const candidates = new Map<string, { point: Point; arms: Set<string> }>();
  const vertical = wires
    .flatMap((w) =>
      w.points
        .slice(1)
        .map((b, i) => ({ w, a: w.points[i], b }))
        .filter((s) => s.a.x === s.b.x && s.a.y !== s.b.y),
    )
    .sort((a, b) => a.a.x - b.a.x);
  const lower = (x: number) => {
    let lo = 0,
      hi = vertical.length;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (vertical[mid].a.x < x) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  };
  for (const w of wires)
    for (let i = 1; i < w.points.length; i++) {
      const a = w.points[i - 1],
        b = w.points[i];
      if (a.y !== b.y) continue;
      const left = Math.min(a.x, b.x),
        right = Math.max(a.x, b.x);
      for (
        let j = lower(left);
        j < vertical.length && vertical[j].a.x <= right;
        j++
      ) {
        const v = vertical[j];
        if (v.w.id === w.id) continue;
        const x = v.a.x,
          y = a.y;
        if (y < Math.min(v.a.y, v.b.y) || y > Math.max(v.a.y, v.b.y)) continue;
        const same =
          w.netId && v.w.netId
            ? w.netId === v.w.netId
            : w.from.component === v.w.from.component &&
              w.from.port === v.w.from.port;
        if (same) {
          const k = (w.netId ?? JSON.stringify(w.from)) + ":" + x + ":" + y;
          let candidate = candidates.get(k);
          if (!candidate)
            candidates.set(
              k,
              (candidate = { point: { x, y }, arms: new Set() }),
            );
          if (x > left) candidate.arms.add("left");
          if (x < right) candidate.arms.add("right");
          if (y > Math.min(v.a.y, v.b.y)) candidate.arms.add("up");
          if (y < Math.max(v.a.y, v.b.y)) candidate.arms.add("down");
        } else if (x > left && x < right) {
          const k = w.id + ":" + i + ":" + x + ":" + y;
          if (!seen.has(k)) {
            bridges.push({ wire: w.id, segment: i - 1, point: { x, y } });
            seen.add(k);
          }
        }
      }
    }
  for (const { point, arms } of candidates.values()) {
    const k = "j:" + point.x + ":" + point.y;
    if (arms.size >= 3 && !seen.has(k)) {
      junctions.push(point);
      seen.add(k);
    }
  }
  return { bridges, junctions };
}
export function overlapping(a: Point, b: Point, c: Point, d: Point) {
  if (a.y === b.y && c.y === d.y && a.y === c.y)
    return (
      Math.min(Math.max(a.x, b.x), Math.max(c.x, d.x)) >
      Math.max(Math.min(a.x, b.x), Math.min(c.x, d.x))
    );
  if (a.x === b.x && c.x === d.x && a.x === c.x)
    return (
      Math.min(Math.max(a.y, b.y), Math.max(c.y, d.y)) >
      Math.max(Math.min(a.y, b.y), Math.min(c.y, d.y))
    );
  return false;
}

/** Visual geometry is in circuit units; only pointer hit targets use screen units. */
export function wireMetrics(scale: number, selected = false) {
  return {
    strokeWidth: selected ? 3 : 2,
    bridgeRadius: 6,
    bridgeHalo: 2,
    hitStrokeWidth: Math.max(12, 12 / scale),
  };
}
