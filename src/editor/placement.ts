import { snap, type Point } from "../model/types";
import { nearestAlignment, type Alignment } from "./alignment";
export type Guides = { axis: "x" | "y"; value: number }[];
export function placementOrigin(
  client: Point,
  rect: Point,
  view: Point & { scale: number },
  size: { w: number; h: number },
): Point {
  return {
    x: (client.x - rect.x - view.x) / view.scale - size.w / 2,
    y: (client.y - rect.y - view.y) / view.scale - size.h / 2,
  };
}
export function snapPlacement(
  raw: Point,
  targets: { x: number[]; y: number[] },
  offsets: { x: number[]; y: number[] },
  scale: number,
  held: { x?: Alignment; y?: Alignment },
) {
  const position = { x: snap(raw.x), y: snap(raw.y) },
    guides: Guides = [];
  for (const axis of ["x", "y"] as const) {
    const previous = held[axis];
    const target =
      previous && Math.abs(raw[axis] - previous.position) <= 12 / scale
        ? previous
        : nearestAlignment(targets[axis], raw[axis], offsets[axis], 8 / scale);
    held[axis] = target;
    if (target) {
      position[axis] = target.position;
      guides.push({ axis, value: target.line });
    }
  }
  return { position, guides };
}
export function placementHaptics(
  vibrate: (ms: number) => unknown,
  now = () => performance.now(),
) {
  let previous = "",
    last = -Infinity;
  const pulse = (ms: number) => {
    try {
      vibrate(ms);
    } catch {
      /* Optional device capability. */
    }
  };
  return {
    align(guides: Guides) {
      const key = guides.map((g) => `${g.axis}:${g.value}`).join(",");
      if (key && key !== previous && now() - last >= 80) {
        pulse(8);
        last = now();
      }
      previous = key;
    },
    drop() {
      pulse(12);
    },
  };
}
