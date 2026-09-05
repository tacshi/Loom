import { snap } from "../model/types";
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
