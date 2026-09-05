import { describe, it, expect } from "vitest";
import { History } from "../src/editor/history";
import { emptyProject } from "../src/model/types";
describe("atomic history", () => {
  it("restores snapshots and discards redo after divergent editing", () => {
    const h = new History<{ x: number }>();
    h.push({ x: 0 });
    expect(h.undo({ x: 1 })).toEqual({ x: 0 });
    expect(h.redo({ x: 0 })).toEqual({ x: 1 });
    h.undo({ x: 1 });
    h.push({ x: 3 });
    expect(h.canRedo).toBe(false);
  });
  it("uses independent identities for new projects", () => {
    expect(emptyProject().root).not.toBe(emptyProject().root);
  });
});
