import { expect, it } from "vitest";
import {
  activeSignal,
  electronPath,
  electronPosition,
} from "../src/editor/electrons";
const wire = {
  id: "w",
  from: { component: "a", port: "out" },
  to: { component: "b", port: "in" },
  points: [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
  ],
};
it("moves from source around bends and wraps without leaving the wire", () => {
  const path = electronPath(wire, []);
  expect(electronPosition(path, 120)).toEqual({ x: 100, y: 20 });
  expect(electronPosition(path, 220)).toEqual({ x: 20, y: 0 });
  expect(
    electronPosition(electronPath({ ...wire, points: [] }, []), 0),
  ).toBeUndefined();
});
it("follows the visible bridge instead of crossing straight through it", () => {
  const path = electronPath(wire, [
    { wire: "w", segment: 0, point: { x: 50, y: 0 } },
  ]);
  const arc = path.segments.filter((s) => s.a.y < 0 || s.b.y < 0);
  expect(arc.length).toBeGreaterThan(0);
  expect(Math.min(...arc.map((s) => s.b.y))).toBeCloseTo(-6.3);
});
it("animates only known nonzero simulated signals", () => {
  expect(["1", "255"].every(activeSignal)).toBe(true);
  expect([undefined, "X", "0", "0b0000", "NaN"].some(activeSignal)).toBe(false);
});

it("animates known nonzero hex but never floating or mixed unknown buses", () => {
  expect(activeSignal("FF")).toBe(true);
  expect(activeSignal("0000")).toBe(false);
  expect(activeSignal("Z")).toBe(false);
  expect(activeSignal("01Z0")).toBe(false);
  expect(activeSignal("1X00")).toBe(false);
});
