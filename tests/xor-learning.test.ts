import { expect, test } from "vitest";
import { courseAt } from "./courseFixture";
import { checkCourse } from "../src/course/check";
import { createComponent } from "../src/model/types";
import { connect } from "../src/model/nets";
import { missionApproaches } from "../src/course/missions/approaches";
import { exercises } from "../src/course/registry";

test("the taught OR AND NOT(AND) solution passes XOR using earlier learner parts", async () => {
  const p = await courseAt("core-09"),
    c = p.circuits[p.root];
  const interfaces = new Set(c.ports.map((port) => port.componentId));
  c.components = c.components.filter((n) => interfaces.has(n.id));
  c.wires = [];
  c.nets = [];
  for (const [id, lesson] of [
    ["either", "core-08"],
    ["both", "core-07"],
    ["permission", "core-06"],
    ["result", "core-07"],
  ] as const) {
    const part = createComponent("instance", 200, 200);
    part.id = id;
    part.definitionId = p.course!.accepted[lesson]!.acceptedRoot;
    c.components.push(part);
  }
  const wire = (from: string, to: string, port: string) =>
    connect(c, p, {
      id: `${from}-${to}-${port}`,
      from: { component: from, port: "out" },
      to: { component: to, port },
      points: [],
    });
  for (const part of ["either", "both"]) {
    wire("a", part, "a");
    wire("b", part, "b");
  }
  wire("both", "permission", "a");
  wire("either", "result", "a");
  wire("permission", "result", "b");
  wire("result", "out", "in");
  const result = await checkCourse(p, "core-09");
  expect(result.status, result.message).toBe("passed");
  expect(result.results.every((r) => r.status === "passed")).toBe(true);
}, 30000);

test("visible approaches cover valid lessons in both languages", () => {
  for (const [id, copy] of Object.entries(missionApproaches)) {
    expect(
      exercises.some((e) => e.id === id),
      id,
    ).toBe(true);
    expect(
      copy!.every((text) => text.trim().length > 0),
      id,
    ).toBe(true);
  }
  expect(missionApproaches["core-09"]![0]).toContain(
    "four-NAND design is optional",
  );
});
