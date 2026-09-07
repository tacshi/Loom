import { expect, it, vi } from "vitest";
import {
  placementOrigin,
  snapPlacement,
  placementHaptics,
} from "../src/editor/placement";
import type { Alignment } from "../src/editor/alignment";
it("centers the component through canvas bounds, pan, and zoom", () => {
  expect(
    placementOrigin(
      { x: 600, y: 400 },
      { x: 200, y: 100 },
      { x: 40, y: -20, scale: 2 },
      { w: 120, h: 80 },
    ),
  ).toEqual({ x: 120, y: 120 });
});
it("uses grid snapping and retains alignment until the screen-space release threshold", () => {
  const held: { x?: Alignment; y?: Alignment } = {};
  const snap = (x: number) =>
    snapPlacement(
      { x, y: 31 },
      { x: [200], y: [] },
      { x: [0], y: [0] },
      2,
      held,
    );
  expect(snap(195).guides).toEqual([]);
  expect(snap(196).position).toEqual({ x: 200, y: 40 });
  expect(snap(206).guides).toEqual([{ axis: "x", value: 200 }]);
  expect(snap(207).guides).toEqual([]);
});
it("aligns pins and centers while retaining grid-compatible origins", () => {
  expect(
    snapPlacement(
      { x: 142, y: 182 },
      { x: [200], y: [200] },
      { x: [0, 60, 120], y: [0, 20, 80] },
      1,
      {},
    ).position,
  ).toEqual({ x: 140, y: 180 });
});
it("deduplicates held alignment, throttles changes, and pulses once on drop", () => {
  const vibrate = vi.fn();
  let time = 0;
  const feedback = placementHaptics(vibrate, () => time);
  feedback.align([{ axis: "x", value: 100 }]);
  time = 100;
  feedback.align([{ axis: "x", value: 100 }]);
  expect(vibrate).toHaveBeenCalledTimes(1);
  feedback.align([{ axis: "y", value: 200 }]);
  time = 110;
  feedback.align([{ axis: "y", value: 300 }]);
  expect(vibrate).toHaveBeenCalledTimes(2);
  feedback.align([]);
  time = 200;
  feedback.align([{ axis: "y", value: 300 }]);
  feedback.drop();
  expect(vibrate.mock.calls).toEqual([[8], [8], [8], [12]]);
});
it("does not fail placement if vibration is declined or throws", () => {
  expect(() =>
    placementHaptics(() => {
      throw new Error("unsupported");
    }).drop(),
  ).not.toThrow();
  expect(() =>
    placementHaptics(() => false).align([{ axis: "x", value: 0 }]),
  ).not.toThrow();
});

it("keyboard alignment never pulls a grid step back to a nearby target", () => {
  const result = snapPlacement(
    { x: 220, y: 100 },
    { x: [200], y: [100] },
    { x: [0], y: [0] },
    Infinity,
    { x: { position: 200, line: 200 } },
  );
  expect(result.position).toEqual({ x: 220, y: 100 });
  expect(result.guides).toEqual([{ axis: "y", value: 100 }]);
});
