import { it, expect } from "vitest";
import { wireMetrics } from "../src/editor/crossings";
it("preserves bridge opening relative to wire thickness at every editor zoom", () => {
  for (const selected of [false, true]) {
    const reference = wireMetrics(1, selected);
    for (const zoom of [0.1, 0.5, 1, 2, 3]) {
      const m = wireMetrics(zoom, selected);
      expect(m.bridgeRadius / m.strokeWidth).toBe(
        reference.bridgeRadius / reference.strokeWidth,
      );
      expect((m.bridgeRadius - m.strokeWidth / 2) * zoom).toBeGreaterThan(0);
    }
  }
});
it("retains generous pointer targets independently of visual scaling", () => {
  for (const zoom of [0.1, 0.5, 1, 2, 3])
    expect(wireMetrics(zoom).hitStrokeWidth * zoom).toBeGreaterThanOrEqual(12);
});
