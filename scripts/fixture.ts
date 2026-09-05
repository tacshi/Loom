import { Builder } from "../src/examples/adder";
export function denseFixture() {
  const b = new Builder("1000 components · 2000 connections");
  b.add("A", "input", 0, 0, 1, 1);
  b.add("B", "input", 180, 0);
  for (let i = 2; i < 1000; i++) {
    const id = "G" + i;
    b.add(id, i < 6 ? "mux" : "and", (i % 40) * 180, Math.floor(i / 40) * 140);
    const a = i === 2 ? "A" : "G" + (i - 1),
      c = i <= 3 ? "B" : "G" + (i - 2);
    b.connect(a, "out", id, "a");
    b.connect(c, "out", id, "b");
    if (i < 6) b.connect("B", "out", id, "sel");
  }
  return b.p;
}
