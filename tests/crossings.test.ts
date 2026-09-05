import { it, expect } from "vitest";
import { crossings, overlapping } from "../src/editor/crossings";
import type { Wire } from "../src/model/types";
const wire = (
  id: string,
  points: { x: number; y: number }[],
  source = id,
): Wire => ({
  id,
  from: { component: source, port: "out" },
  to: { component: id + "to", port: "in" },
  points,
});
it("uses bridges for different signals and dots only for real branches", () => {
  const horizontal = wire("a", [
    { x: 0, y: 40 },
    { x: 100, y: 40 },
  ]);
  const vertical = wire("b", [
    { x: 60, y: 0 },
    { x: 60, y: 80 },
  ]);
  expect(crossings([horizontal, vertical])).toEqual({
    bridges: [{ wire: "a", segment: 0, point: { x: 60, y: 40 } }],
    junctions: [],
  });
  vertical.from = horizontal.from;
  expect(crossings([horizontal, vertical])).toEqual({
    bridges: [],
    junctions: [{ x: 60, y: 40 }],
  });
});
it("detects collinear overlap without treating crossings as overlap", () => {
  expect(
    overlapping(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 40, y: 0 },
      { x: 140, y: 0 },
    ),
  ).toBe(true);
  expect(
    overlapping(
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 40, y: -20 },
      { x: 40, y: 20 },
    ),
  ).toBe(false);
});
