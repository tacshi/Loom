import { Builder } from "../examples/adder";
import { createComponent, type Circuit } from "../model/types";
export function nandAdder(width = 8): Circuit {
  const b = new Builder("NAND adder · " + width + " bit");
  b.c.name = b.p.name;
  b.add("a", "portIn", 0, 0, width);
  b.add("b", "portIn", 0, 200, width);
  b.add("aBits", "split", 220, 0, width);
  b.add("bBits", "split", 420, 0, width);
  b.add("zero", "constant", 420, 800, 1, 0);
  b.add("result", "join", 2500, 0, width);
  b.add("out", "portOut", 2720, 0, width);
  b.add("carry", "portOut", 2720, 240, 1);
  b.connect("a", "out", "aBits", "in");
  b.connect("b", "out", "bBits", "in");
  b.connect("result", "out", "out", "in");
  let carry = "zero";
  for (let bit = 0; bit < width; bit++) {
    const y = bit * 240;
    for (const [n, x, dy] of [
      ["n1", 640, 0],
      ["n2", 820, 0],
      ["n3", 820, 100],
      ["xor", 1000, 0],
      ["n4", 1180, 0],
      ["n5", 1360, 0],
      ["n6", 1360, 100],
      ["sum", 1540, 0],
      ["carry", 1720, 100],
    ] as const)
      b.add(bit + "_" + n, "nand", x, y + dy);
    const n = (name: string) => bit + "_" + name;
    for (const [a, ap, to, tp] of [
      ["aBits", "b" + bit, n("n1"), "a"],
      ["bBits", "b" + bit, n("n1"), "b"],
      ["aBits", "b" + bit, n("n2"), "a"],
      [n("n1"), "out", n("n2"), "b"],
      ["bBits", "b" + bit, n("n3"), "a"],
      [n("n1"), "out", n("n3"), "b"],
      [n("n2"), "out", n("xor"), "a"],
      [n("n3"), "out", n("xor"), "b"],
      [n("xor"), "out", n("n4"), "a"],
      [carry, "out", n("n4"), "b"],
      [n("xor"), "out", n("n5"), "a"],
      [n("n4"), "out", n("n5"), "b"],
      [carry, "out", n("n6"), "a"],
      [n("n4"), "out", n("n6"), "b"],
      [n("n5"), "out", n("sum"), "a"],
      [n("n6"), "out", n("sum"), "b"],
      [n("n1"), "out", n("carry"), "a"],
      [n("n4"), "out", n("carry"), "b"],
      [n("sum"), "out", "result", "b" + bit],
    ])
      b.connect(a, ap, to, tp);
    carry = n("carry");
  }
  b.connect(carry, "out", "carry", "in");
  b.c.ports = [
    { id: "a", name: "a", direction: "in", width, componentId: "a" },
    { id: "b", name: "b", direction: "in", width, componentId: "b" },
    { id: "out", name: "sum", direction: "out", width, componentId: "out" },
    {
      id: "carry",
      name: "carry",
      direction: "out",
      width: 1,
      componentId: "carry",
    },
  ];
  const max = 2 ** width - 1;
  for (const [a, c] of [
    [0, 0],
    [max, 1],
    [max, max],
    [1, max],
    [55, 73],
    [127, 128],
  ])
    b.c.vectors.push({
      name: ((a & max) >>> 0) + " + " + ((c & max) >>> 0),
      inputs: { a: (a & max) >>> 0, b: (c & max) >>> 0 },
      outputs: {
        "out:in": ((((a & max) >>> 0) + ((c & max) >>> 0)) & max) >>> 0,
        "carry:in": Number(((a & max) >>> 0) + ((c & max) >>> 0) > max),
      },
    });
  return b.c;
}
