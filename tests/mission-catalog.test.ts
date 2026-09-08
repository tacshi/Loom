import { expect, it } from "vitest";
import { missions } from "../src/course/missions";
it("contains exactly 60 core missions and 40 independent chapter projects", () => {
  expect(missions).toHaveLength(100);
  expect(new Set(missions.map((m) => m.id)).size).toBe(100);
  expect(missions.filter((m) => m.track === "core")).toHaveLength(60);
  for (const m of missions) {
    expect(m.title.every(Boolean)).toBe(true);
    expect(m.hints).toHaveLength(3);
    for (const id of m.prerequisites)
      expect(missions.find((m) => m.id === id)?.track).toBe("core");
  }
});
