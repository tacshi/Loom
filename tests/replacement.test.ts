import { it, expect } from "vitest";
import { compareReplacement, automaticMapping } from "../src/model/replacement";
import { createComponent, emptyProject } from "../src/model/types";
import { nandAdder } from "../src/cpu/nandAdder";
it("requires matching interfaces and detects incorrect arithmetic", () => {
  const p = emptyProject(),
    a = createComponent("adder", 0, 0, 8),
    wrong = createComponent("subtractor", 0, 0, 8);
  expect(
    compareReplacement(p, a, wrong, automaticMapping(p, a, wrong)).passed,
  ).toBe(false);
  wrong.width = 4;
  expect(
    compareReplacement(p, a, wrong, automaticMapping(p, a, wrong)).reason,
  ).toBe("interfaceMismatch");
});
it("checks a custom NAND adder against the built-in model", () => {
  const p = emptyProject(),
    a = createComponent("adder", 0, 0, 8),
    b = createComponent("instance", 0, 0, 8),
    def = nandAdder(8);
  p.circuits[def.id] = def;
  b.definitionId = def.id;
  expect(compareReplacement(p, a, b, automaticMapping(p, a, b))).toMatchObject({
    passed: true,
    cases: 128,
  });
});
