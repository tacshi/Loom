export type Signal = {
  value: number;
  known: number;
  highZ: number;
  width: number;
};
export const mask = (width: number) =>
  width === 32 ? 0xffffffff : 2 ** width - 1;
export const signal = (
  value: number,
  width: number,
  known = mask(width),
  highZ = 0,
): Signal => ({
  value: (value & mask(width)) >>> 0,
  known: (known & ~highZ & mask(width)) >>> 0,
  highZ: (highZ & mask(width)) >>> 0,
  width,
});
export const unknown = (width: number) => signal(0, width, 0);
export const defined = (s: Signal) => s.known === mask(s.width);
export const same = (a: Signal, b: Signal) =>
  a.value === b.value &&
  a.known === b.known &&
  a.highZ === b.highZ &&
  a.width === b.width;
export function merge(a: Signal, b: Signal) {
  const known = (a.known & b.known & ~(a.value ^ b.value)) >>> 0;
  return signal(a.value, a.width, known, a.highZ & b.highZ);
}
export function logic(op: string, a: Signal, b?: Signal): Signal {
  const m = mask(a.width);
  if (op === "not") return signal(~a.value, a.width, a.known);
  b ??= unknown(a.width);
  let value = 0,
    known = 0;
  if (op === "and" || op === "nand") {
    value = a.value & b.value;
    known = (a.known & b.known) | (a.known & ~a.value) | (b.known & ~b.value);
  } else if (op === "or" || op === "nor") {
    value = a.value | b.value;
    known = (a.known & b.known) | (a.known & a.value) | (b.known & b.value);
  } else {
    value = a.value ^ b.value;
    known = a.known & b.known;
  }
  if (op === "nand" || op === "nor" || op === "xnor") value = ~value & m;
  return signal(value, a.width, known);
}
export function format(s: Signal | undefined, base: 2 | 10 | 16 = 10): string {
  if (!s) return "X";
  if (s.highZ === mask(s.width)) return "Z";
  if (!defined(s)) {
    if (base !== 2) return "X";
    return Array.from({ length: s.width }, (_, i) => {
      const bit = s.width - i - 1;
      return (s.highZ >>> bit) & 1
        ? "Z"
        : (s.known >>> bit) & 1
          ? String((s.value >>> bit) & 1)
          : "X";
    }).join("");
  }
  return base === 2
    ? s.value.toString(2).padStart(s.width, "0")
    : base === 16
      ? s.value
          .toString(16)
          .toUpperCase()
          .padStart(Math.ceil(s.width / 4), "0")
      : String(s.value);
}

export const floating = (width: number) => signal(0, width, 0, mask(width));
export const asLogic = (s: Signal): Signal =>
  s.highZ ? signal(s.value, s.width, s.known) : s;
export function resolveDrivers(
  drivers: readonly Signal[],
  width: number,
): { signal: Signal; contention: number } {
  let ones = 0,
    zeros = 0,
    uncertain = 0,
    active = 0;
  for (const d of drivers) {
    ones |= d.value & d.known;
    zeros |= ~d.value & d.known;
    uncertain |= ~(d.known | d.highZ);
    active |= ~d.highZ;
  }
  const contention = (ones & zeros & mask(width)) >>> 0;
  const known = ((ones | zeros) & ~contention & ~uncertain & mask(width)) >>> 0;
  return {
    signal: signal(ones & known, width, known, ~active & mask(width)),
    contention,
  };
}
