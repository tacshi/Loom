import { Builder } from "../src/examples/adder";
import { createComponent } from "../src/model/types";
export function hierarchicalFixture() {
  const b = new Builder("10000 expanded · 1000 visible"),
    inner = new Builder("901-stage buffer");
  inner.add("source", "constant", 0, 0);
  for (let i = 1; i <= 900; i++) {
    inner.add("stage" + i, "buffer", (i % 30) * 180, Math.floor(i / 30) * 140);
    inner.connect(
      i === 1 ? "source" : "stage" + (i - 1),
      "out",
      "stage" + i,
      "in",
    );
  }
  b.p.circuits[inner.c.id] = inner.c;
  for (let i = 0; i < 990; i++)
    b.add("C" + i, "constant", (i % 40) * 180, Math.floor(i / 40) * 140);
  for (let i = 0; i < 10; i++) {
    const n = createComponent(
      "instance",
      ((990 + i) % 40) * 180,
      Math.floor((990 + i) / 40) * 140,
    );
    n.id = "Module" + i;
    n.name = n.id;
    n.definitionId = inner.c.id;
    b.c.components.push(n);
  }
  return b.p;
}
