import { it, expect } from "vitest";
import { ioProject } from "../src/cpu/ioCircuit";
import { routeClear } from "../src/editor/routing";
it("routes the complete I/O computer without component-edge contact or unrelated overlap", () => {
  const p = ioProject(),
    c = p.circuits[p.root];
  const invalid = c.wires.filter((w) => !routeClear(c, p, w));
  expect(
    invalid.map(
      (w) =>
        `${w.from.component}.${w.from.port} -> ${w.to.component}.${w.to.port}`,
    ),
  ).toEqual([]);
});
