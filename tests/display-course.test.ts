import { it, expect } from "vitest";
import { exercises, exercise } from "../src/course/registry";
import {
  newCourse,
  activateExercise,
  acceptCheck,
  counterWithAcceptedDecoder,
} from "../src/course/session";
import { checkCourse } from "../src/course/check";
import { prepareCourseSubmission } from "../scripts/course-submission";
import { Engine } from "../src/simulator/engine";
import { createComponent } from "../src/model/types";
import { parseProject } from "../src/persistence/validation";
import { exportProject } from "../src/persistence/serialization";

it("accepts a decoder after mux8 and reuses the immutable learner circuit in a separate counter", async () => {
  const p = newCourse();
  for (const spec of exercises) {
    if (spec.id !== "nand") activateExercise(p, spec.id);
    if (spec.id === "seven-segment")
      expect((await checkCourse(p, spec.id)).status).not.toBe("passed");
    prepareCourseSubmission(p, spec.id);
    const checked = await checkCourse(p, spec.id);
    expect(checked.status, checked.message).toBe("passed");
    await acceptCheck(p, checked);
    if (spec.id === "seven-segment") break;
  }
  const before = exportProject(p);
  const sandbox = counterWithAcceptedDecoder(p);
  expect(sandbox.id).not.toBe(p.id);
  expect(sandbox.course).toBeUndefined();
  expect(exportProject(p)).toBe(before);
  const e = new Engine(parseProject(exportProject(sandbox)));
  e.step();
  expect(e.get("Decoder", "segments").value).toBe(6);
  sandbox.circuits[
    sandbox.circuits[sandbox.root].components.find(
      (c) => c.id === "Decoder",
    )!.definitionId!
  ].name = "Edited copy";
  expect(exportProject(p)).toBe(before);
  activateExercise(p, "half-adder");
  expect(p.course!.active).toBe("half-adder");
}, 15000);

it("trusted decoder checks reject disconnection, swapped segments, decimal point and hidden ROM", async () => {
  const reference = exercise("seven-segment").reference();
  const draft = () => {
    const p = structuredClone(reference);
    p.course = {
      id: "build-computer",
      active: "seven-segment",
      drafts: { "seven-segment": p.root },
      accepted: {},
    };
    return p;
  };
  for (const fault of ["disconnect", "swap", "decimal", "rom"] as const) {
    const p = draft(),
      c = p.circuits[p.root];
    if (fault === "rom") {
      const nested = Object.values(p.circuits).find((d) => d.id !== p.root)!;
      nested.components.push(createComponent("rom", 0, 0, 8));
    } else {
      for (const net of c.nets)
        for (const pin of net.ports) {
          if (pin.component !== "Digit") continue;
          if (fault === "disconnect" && pin.port === "a")
            pin.component = "missing";
          if (fault === "swap" && ["a", "b"].includes(pin.port))
            pin.port = pin.port === "a" ? "b" : "a";
          if (fault === "decimal" && ["a", "dp"].includes(pin.port))
            pin.port = pin.port === "a" ? "dp" : "a";
        }
    }
    const result = await checkCourse(p, "seven-segment", true);
    expect(result.status, fault).not.toBe("passed");
    if (fault === "rom") expect(result.message).toContain("rom");
  }
}, 15000);
