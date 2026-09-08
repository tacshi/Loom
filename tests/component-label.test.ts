import { expect, test } from "vitest";
import { createComponent, emptyProject } from "../src/model/types";
import { componentLabel } from "../src/ui/componentLabel";

test("default gate names follow language without mutating saved names", () => {
  const project = emptyProject(),
    gate = createComponent("nand", 0, 0);
  for (const name of ["NAND", "与非门"]) {
    gate.name = name;
    expect(componentLabel(gate, project, "en")).toBe("NAND");
    expect(componentLabel(gate, project, "zh")).toBe("与非门");
    expect(gate.name).toBe(name);
  }
  gate.name = "Alarm inhibit";
  expect(componentLabel(gate, project, "zh")).toBe("Alarm inhibit");
});

test("course instances translate default names and preserve custom names", () => {
  const project = emptyProject(),
    definition = project.circuits[project.root];
  definition.name = "Build NOT AND: NAND";
  definition.library = { id: "course-core-05", version: 1, hash: "test" };
  const gate = createComponent("instance", 0, 0);
  gate.definitionId = definition.id;
  for (const name of ["与非门", "NAND", definition.name]) {
    gate.name = name;
    expect(componentLabel(gate, project, "en")).toBe("NAND");
    expect(componentLabel(gate, project, "zh")).toBe("与非门");
  }
  gate.name = "First stage";
  expect(componentLabel(gate, project, "zh")).toBe("First stage");
});
