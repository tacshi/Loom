import { it, expect } from "vitest";
import { exercises } from "../src/course/registry";
import {
  newCourse,
  activateExercise,
  acceptCheck,
  electricalHash,
} from "../src/course/session";
import { checkCourse, reverifyCourse } from "../src/course/check";
import { runCases } from "../src/verification/runner";
for (const lesson of exercises)
  it(
    lesson.id + " reference passes trusted checks",
    () => {
      const p = lesson.reference();
      const results = runCases(p, p.root, lesson.checks());
      expect(
        results.map((r) => ({
          status: r.status,
          error: r.error,
          failure: r.failure,
        })),
      ).toEqual(
        results.map(() => ({
          status: "passed",
          error: undefined,
          failure: undefined,
        })),
      );
    },
    60000,
  );
it("starter fails, accepted work survives layout changes and imported claims require rechecking", async () => {
  const p = newCourse();
  expect((await checkCourse(p, "nand")).status).not.toBe("passed");
  const ref = exercises[0].reference();
  p.circuits = { ...p.circuits, ...ref.circuits };
  p.root = ref.root;
  p.course!.drafts.nand = ref.root;
  const result = await checkCourse(p, "nand");
  expect(result.status).toBe("passed");
  await acceptCheck(p, result);
  const hash = await electricalHash(p, p.root);
  p.circuits[p.root].components[0].x += 20;
  expect(await electricalHash(p, p.root)).toBe(hash);
  p.course!.needsVerification = true;
  expect((await checkCourse(p, "not")).status).toBe("blocked");
  await reverifyCourse(p);
  expect(p.course!.accepted.nand).toBeDefined();
  activateExercise(p, "not");
  expect(p.course!.active).toBe("not");
});

it("NAND course CPU agrees with the independent instruction oracle at every instruction", async () => {
  const { Oracle } = await import("./cpuOracle");
  const { Engine } = await import("../src/simulator/engine");
  const p = exercises.find((e) => e.id === "cpu")!.reference();
  const rom = p.circuits[p.root].components.find(
    (n) => n.id === "Program",
  )!.image!;
  const oracle = new Oracle(rom),
    engine = new Engine(p);
  for (let i = 0; i < 64 && !oracle.halt; i++) {
    oracle.step();
    engine.step();
    engine.step();
    expect(
      ["PC", "ACC", "Z", "C", "Output", "Halt"].map(
        (id) => engine.get(id, "q").value,
      ),
    ).toEqual([
      oracle.pc,
      oracle.a,
      oracle.z,
      oracle.c,
      oracle.out,
      Number(oracle.halt),
    ]);
  }
  expect(oracle.halt).toBe(true);
  expect(oracle.out).toBe(55);
});
