import { it, expect } from "vitest";
import { nearestAlignment } from "../src/editor/alignment";
it("aligns a pin while keeping the component origin on the grid", () => {
  expect(nearestAlignment([100, 200], 181, [20], 8)).toEqual({
    position: 180,
    line: 200,
  });
  expect(nearestAlignment([200], 195, [10], 8)).toBeUndefined();
});
it("uses the caller’s zoom-adjusted tolerance without snapping to distant guides", () => {
  expect(nearestAlignment([200], 181, [0], 8)).toBeUndefined();
  expect(nearestAlignment([200], 181, [0], 40)).toEqual({
    position: 200,
    line: 200,
  });
});
