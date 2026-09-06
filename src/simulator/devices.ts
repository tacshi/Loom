import type { Component } from "../model/types";
import type { PeripheralState } from "./state";
import { defined, signal, unknown, merge, type Signal } from "./signal";
export const TERMINAL_BYTES = 65536;
export function initialDevice(
  kind: Component["kind"],
): PeripheralState | undefined {
  if (kind === "keyboard") return { kind, queue: [], uncertain: false };
  if (kind === "terminal") return { kind, bytes: [], uncertain: false };
  if (kind === "display")
    return { kind, pixels: Array.from({ length: 2048 }, () => signal(0, 1)) };
}
export function sampleDevice(
  old: PeripheralState,
  read: (p: string) => Signal,
): PeripheralState {
  const clear = read("clear"),
    certainClear = defined(clear) && clear.value === 1;
  if (certainClear) return initialDevice(old.kind)!;
  if (old.kind === "keyboard") {
    const r = read("read");
    return {
      kind: old.kind,
      queue: defined(r) && r.value ? old.queue.slice(1) : old.queue,
      uncertain: old.uncertain || !defined(clear) || !defined(r),
    };
  }
  if (old.kind === "terminal") {
    const w = read("write"),
      data = read("data");
    return {
      kind: old.kind,
      bytes:
        defined(w) && w.value
          ? [...old.bytes, defined(data) ? data.value : 63].slice(
              -TERMINAL_BYTES,
            )
          : old.bytes,
      uncertain:
        old.uncertain ||
        !defined(clear) ||
        !defined(w) ||
        (!!w.value && !defined(data)),
    };
  }
  const w = read("write"),
    x = read("x"),
    y = read("y"),
    data = read("data");
  let pixels = old.pixels;
  if (!defined(clear)) {
    pixels = pixels.map((v) => merge(v, signal(0, 1)));
  }
  if (!defined(w) || w.value) {
    pixels = pixels.slice();
    if (!defined(x) || !defined(y)) pixels = pixels.map(() => unknown(1));
    else {
      const i = y.value * 64 + x.value;
      pixels[i] = defined(w) ? data : merge(pixels[i], data);
    }
  }
  return { kind: "display", pixels };
}
