import type { Point, Wire } from "../model/types";
import type { Bridge } from "./crossings";

export function electronPath(wire: Wire, bridges: Bridge[]) {
  const points: Point[] = wire.points.length ? [wire.points[0]] : [];
  for (let i = 1; i < wire.points.length; i++) {
    const a = wire.points[i - 1],
      b = wire.points[i];
    const direction = a.x < b.x ? 1 : -1;
    for (const bridge of bridges
      .filter((v) => v.wire === wire.id && v.segment === i - 1)
      .sort((l, r) => direction * (l.point.x - r.point.x))) {
      const { x, y } = bridge.point;
      const radius = Math.min(6, Math.abs(x - a.x) / 2, Math.abs(b.x - x) / 2);
      points.push({ x: x - direction * radius, y });
      // Sample the same cubic used for the visible bridge.
      for (let step = 1; step <= 12; step++) {
        const t = step / 12,
          u = 1 - t;
        points.push({
          x:
            x +
            direction *
              radius *
              (-u * u * u - 3 * u * u * t + 3 * u * t * t + t * t * t),
          y: y - 4.2 * radius * u * t,
        });
      }
    }
    points.push(b);
  }
  let length = 0;
  const segments = points.slice(1).flatMap((b, i) => {
    const a = points[i],
      size = Math.hypot(b.x - a.x, b.y - a.y);
    if (!size) return [];
    const start = length;
    length += size;
    return [{ a, b, start, end: length }];
  });
  return { segments, length };
}

export function electronPosition(
  path: ReturnType<typeof electronPath>,
  distance: number,
): Point | undefined {
  if (!path.length) return;
  const at = ((distance % path.length) + path.length) % path.length;
  const segment = path.segments.find((s) => at < s.end)!;
  const t = (at - segment.start) / (segment.end - segment.start);
  return {
    x: segment.a.x + (segment.b.x - segment.a.x) * t,
    y: segment.a.y + (segment.b.y - segment.a.y) * t,
  };
}

export function activeSignal(value: string | undefined) {
  return value !== undefined && /^[0-9A-F]+$/.test(value) && /[1-9A-F]/.test(value);
}
