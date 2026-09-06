import { it, expect } from "vitest";
import { Builder } from "../src/examples/adder";
import { createComponent } from "../src/model/types";
import { Engine } from "../src/simulator/engine";
it("resolves width parameters independently for each instance and validates mismatches", () => {
  const b = new Builder("Width variants"),
    def = new Builder("Buffer").c;
  def.parameters = [{ name: "width", default: 8, min: 1, max: 32 }];
  for (const [id, kind] of [
    ["in", "portIn"],
    ["out", "portOut"],
  ] as const) {
    const n = createComponent(kind, 0, 0, 8);
    n.id = id;
    n.widthParameter = "width";
    def.components.push(n);
    def.ports.push({
      id,
      name: id,
      direction: id === "in" ? "in" : "out",
      width: 8,
      widthParameter: "width",
      componentId: id,
    });
  }
  def.nets = [
    {
      id: "n",
      width: 8,
      ports: [
        { component: "in", port: "out" },
        { component: "out", port: "in" },
      ],
    },
  ];
  b.p.circuits[def.id] = def;
  for (const width of [4, 8]) {
    const n = createComponent("instance", 200, width * 20, width);
    n.id = "buffer" + width;
    n.definitionId = def.id;
    n.arguments = { width };
    b.c.components.push(n);
    b.add("value" + width, "constant", 0, width * 20, width, 2 ** width - 1);
    b.add("result" + width, "probe", 400, width * 20, width);
    b.connect("value" + width, "out", n.id, "in");
    b.connect(n.id, "out", "result" + width, "in");
  }
  const e = new Engine(b.p);
  expect(e.compiled.diagnostics).toEqual([]);
  expect(e.get("result4", "in").value).toBe(15);
  expect(e.get("result8", "in").value).toBe(255);
  b.c.components.find((n) => n.id === "buffer4")!.arguments = { width: 33 };
  expect(new Engine(b.p).valid).toBe(false);
});

it("rejects invalid definitions and used-parameter deletion without changing the project", async () => {
  const { updateParameters } = await import("../src/model/parameters");
  const b = new Builder("Bounds");
  b.add("source", "input", 0, 0, 8);
  updateParameters(b.p, b.c.id, [
    { name: "width", min: 1, max: 32, default: 8 },
  ]);
  b.c.components[0].widthParameter = "width";
  const before = JSON.stringify(b.p);
  expect(() => updateParameters(b.p, b.c.id, [])).toThrow("parameterInUse");
  for (const p of [
    { name: "width", min: 0, max: 32, default: 8 },
    { name: "width", min: 1, max: 33, default: 8 },
    { name: "width", min: 1, max: 32, default: 1.5 },
  ])
    expect(() => updateParameters(b.p, b.c.id, [p])).toThrow("parameterBounds");
  expect(JSON.stringify(b.p)).toBe(before);
});

it("rejects narrowed bounds while an existing instance uses a larger value", async () => {
  const { updateParameters } = await import("../src/model/parameters");
  const b = new Builder("Instance bounds"),
    definition = new Builder("Buffer").c;
  definition.parameters = [{ name: "width", min: 1, max: 32, default: 8 }];
  b.p.circuits[definition.id] = definition;
  const instance = createComponent("instance", 200, 0);
  instance.definitionId = definition.id;
  instance.arguments = { width: 16 };
  b.c.components.push(instance);
  const before = JSON.stringify(b.p);
  expect(() =>
    updateParameters(b.p, definition.id, [
      { name: "width", min: 1, max: 8, default: 8 },
    ]),
  ).toThrow("parameterBounds");
  expect(JSON.stringify(b.p)).toBe(before);
});
