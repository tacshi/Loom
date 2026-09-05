import { Builder } from "./adder";
export function counterExample() {
  const b = new Builder("Clocked counter");
  b.add("Enable", "input", 0, 0, 1, 1);
  b.add("Reset", "input", 0, 140);
  b.add("Count", "counter", 240, 0, 8);
  b.add("Value", "probe", 480, 0, 8);
  b.connect("Enable", "out", "Count", "en");
  b.connect("Reset", "out", "Count", "rst");
  b.connect("Count", "q", "Value", "in");
  b.c.vectors = [
    {
      name: "Count 3",
      inputs: { Enable: 1, Reset: 0 },
      cycles: 3,
      outputs: { "Value:in": 3 },
    },
    {
      name: "Hold",
      inputs: { Enable: 0, Reset: 0 },
      cycles: 5,
      outputs: { "Value:in": 0 },
    },
    {
      name: "Reset",
      inputs: { Enable: 1, Reset: 1 },
      cycles: 4,
      outputs: { "Value:in": 0 },
    },
    {
      name: "Wrap",
      inputs: { Enable: 1, Reset: 0 },
      cycles: 256,
      outputs: { "Value:in": 0 },
    },
  ];
  return b.p;
}
export function swapExample() {
  const b = new Builder("Simultaneous register swap");
  b.add("Enable", "constant", 0, 0, 1, 1);
  b.add("Reset", "constant", 0, 180);
  b.add("A", "register", 240, 0, 8);
  b.add("B", "register", 480, 140, 8);
  b.c.components.find((c) => c.id === "A")!.params.initial = 3;
  b.c.components.find((c) => c.id === "B")!.params.initial = 9;
  for (const id of ["A", "B"]) {
    b.connect("Enable", "out", id, "en");
    b.connect("Reset", "out", id, "rst");
  }
  b.connect("A", "q", "B", "d");
  b.connect("B", "q", "A", "d");
  b.c.vectors = [
    { name: "Swap", inputs: {}, cycles: 1, outputs: { "A:q": 9, "B:q": 3 } },
    {
      name: "Swap back",
      inputs: {},
      cycles: 2,
      outputs: { "A:q": 3, "B:q": 9 },
    },
  ];
  return b.p;
}
