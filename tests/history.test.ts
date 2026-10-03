import { describe, it, expect } from "vitest";
import { History, HistoryBudget } from "../src/editor/history";
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
  it("groups consecutive edits of one field into a single undo step", () => {
    const h = new History<{ name: string }>();
    h.push({ name: "" }, "name:a");
    h.push({ name: "x" }, "name:a");
    h.push({ name: "xy" }, "name:a");
    expect(h.undo({ name: "xyz" })).toEqual({ name: "" });
    expect(h.canUndo).toBe(false);
  });
  it("starts a new step after sealing, ungrouped edits or undo", () => {
    const h = new History<{ n: number }>();
    h.push({ n: 0 }, "field");
    h.seal();
    h.push({ n: 1 }, "field");
    h.push({ n: 2 });
    h.push({ n: 3 }, "field");
    expect(h.undo({ n: 4 })).toEqual({ n: 3 });
    h.push({ n: 3 }, "field");
    expect(h.undo({ n: 5 })).toEqual({ n: 3 });
    expect(h.undo({ n: 3 })).toEqual({ n: 2 });
    expect(h.undo({ n: 2 })).toEqual({ n: 1 });
    expect(h.undo({ n: 1 })).toEqual({ n: 0 });
  });
  it("uses independent identities for new projects", () => {
    expect(emptyProject().root).not.toBe(emptyProject().root);
  });
});

it("bounds undo and redo across independent mission histories", () => {
  const budget = new HistoryBudget(1000);
  const a = new History<{text: string}>(100, budget);
  const b = new History<{text: string}>(100, budget);
  for (let i = 0; i < 30; i++) (i % 2 ? a : b).push({text: "a".repeat(100) + i});
  expect(budget.bytes).toBeLessThanOrEqual(1000);
  expect(a.undo({text: "current"})).toBeDefined();
  expect(budget.bytes).toBeLessThanOrEqual(1000);
  a.clear(); b.clear();
  expect(budget.bytes).toBe(0);
});
