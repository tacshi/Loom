export type Signal = { value: number; known: number; width: number };
export const mask = (width: number) =>
  width === 32 ? 0xffffffff : 2 ** width - 1;
export const signal = (
  value: number,
  width: number,
  known = mask(width),
): Signal => ({
  value: (value & mask(width)) >>> 0,
  known: (known & mask(width)) >>> 0,
  width,
});
export const unknown = (width: number) => signal(0, width, 0);
export const defined = (s: Signal) => s.known === mask(s.width);
export const same = (a: Signal, b: Signal) =>
  a.value === b.value && a.known === b.known && a.width === b.width;
export function merge(a: Signal, b: Signal) {
  const known = (a.known & b.known & ~(a.value ^ b.value)) >>> 0;
  return signal(a.value, a.width, known);
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
  if (!defined(s)) {
    if (base !== 2) return "X";
    return Array.from({ length: s.width }, (_, i) => {
      const bit = s.width - i - 1;
      return (s.known >>> bit) & 1 ? String((s.value >>> bit) & 1) : "X";
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
