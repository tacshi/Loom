import { it, expect } from "vitest";
import {
  acceptCheck,
  activateExercise,
  electricalHash,
  newCourse,
  replaceCourseDependency,
} from "../src/course/session";
import { checkCourse, reverifyCourse } from "../src/course/check";
import { exercises } from "../src/course/registry";
import { parseProject, validateProject } from "../src/persistence/validation";
import { exportProject } from "../src/persistence/serialization";
import { prepareCourseSubmission } from "../scripts/course-submission";
import type { Project } from "../src/model/types";

async function throughCore06() {
  const p = newCourse();
  for (const e of exercises.slice(0, 6)) {
    if (e.id !== "core-01") activateExercise(p, e.id);
    prepareCourseSubmission(p, e.id);
    await acceptCheck(p, await checkCourse(p, e.id));
  }
  return p;
}
/** Doubles the inverter at the output, so the circuit behaves the same but hashes differently. */
function reviseNand(p: Project) {
  activateExercise(p, "core-05");
  const c = p.circuits[p.course!.drafts["core-05"]!];
  const output = c.components.find((n) => n.kind === "portOut")!.id;
  const net = c.nets.find((n) => n.ports.some((e) => e.component === output))!;
  net.ports = net.ports.filter((e) => e.component !== output);
  net.ports.push({ component: "n1", port: "a" });
  c.components.push(
    { id: "n1", kind: "not", name: "n1", x: 0, y: 0, width: 1, params: {} },
    { id: "n2", kind: "not", name: "n2", x: 0, y: 0, width: 1, params: {} },
  );
  c.nets.push(
    {
      id: "x1",
      width: 1,
      ports: [
        { component: "n1", port: "out" },
        { component: "n2", port: "a" },
      ],
    },
    {
      id: "x2",
      width: 1,
      ports: [
        { component: "n2", port: "out" },
        { component: output, port: "in" },
      ],
    },
  );
}
async function reacceptNand(p: Project) {
  reviseNand(p);
  const checked = await checkCourse(p, "core-05");
  expect(checked.status).toBe("passed");
  await acceptCheck(p, checked);
}

it("a dependent keeps verifying after the mission it used is re-accepted", async () => {
  const p = await throughCore06();
  const original = p.course!.accepted["core-05"]!;
  await reacceptNand(p);

  expect(p.course!.accepted["core-05"]!.superseded?.[0].hash).toBe(
    original.hash,
  );
  expect(() => validateProject(p)).not.toThrow();

  const imported = parseProject(exportProject(p));
  const results = await reverifyCourse(imported);
  expect(results.map((r) => [r.exercise, r.status])).toEqual(
    exercises.slice(0, 6).map((e) => [e.id, "passed"]),
  );
  expect(imported.course!.accepted["core-06"]).toBeDefined();
  expect(imported.course!.accepted["core-05"]!.superseded).toHaveLength(1);
}, 30000);

it("a draft still built on the replaced version can be checked again", async () => {
  const p = await throughCore06();
  await reacceptNand(p);
  activateExercise(p, "core-06");

  expect((await checkCourse(p, "core-06")).status).toBe("passed");
}, 30000);

it("a forged earlier version is not trusted even with a matching hash", async () => {
  const p = await throughCore06();
  await reacceptNand(p);
  const forged = parseProject(exportProject(p));
  const entry = forged.course!.accepted["core-05"]!.superseded![0];
  const part = forged.circuits[entry.acceptedRoot].components.find(
    (n) => n.kind === "and",
  )!;
  part.kind = "or";
  entry.hash = await electricalHash(forged, entry.acceptedRoot);

  await reverifyCourse(forged);

  expect(forged.course!.accepted["core-05"]!.superseded).toBeUndefined();
  expect(forged.course!.accepted["core-06"]).toBeUndefined();
}, 30000);

it("a replaced version is released once nothing depends on it", async () => {
  const p = await throughCore06();
  const replaced = p.course!.accepted["core-05"]!.acceptedRoot;
  await reacceptNand(p);
  activateExercise(p, "core-06");
  const draft = p.circuits[p.root];
  for (const n of draft.components.filter(
    (n) => n.definitionId === replaced,
  ))
    replaceCourseDependency(p, n.id, "core-05");

  await acceptCheck(p, await checkCourse(p, "core-06"));

  expect(p.course!.accepted["core-05"]!.superseded).toBeUndefined();
  expect(p.circuits[replaced]).toBeUndefined();
  expect(() => validateProject(p)).not.toThrow();
}, 30000);

it("the project format bounds earlier versions and refuses nesting", async () => {
  const p = await throughCore06();
  await reacceptNand(p);
  const record = p.course!.accepted["core-05"]!,
    entry = record.superseded![0];

  const nested = structuredClone(p);
  Object.assign(nested.course!.accepted["core-05"]!.superseded![0], {
    superseded: [entry],
  });
  expect(() => validateProject(nested)).toThrow("invalidProject");

  const crowded = structuredClone(p);
  crowded.course!.accepted["core-05"]!.superseded = Array(65).fill(entry);
  expect(() => validateProject(crowded)).toThrow("invalidProject");
}, 30000);
