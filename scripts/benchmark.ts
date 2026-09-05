import { writeFileSync, mkdirSync } from "node:fs";
import { denseFixture } from "./fixture";
import { Engine } from "../src/simulator/engine";
import { crossings } from "../src/editor/crossings";
const p = denseFixture();
const start = performance.now();
const e = new Engine(p);
const compiled = performance.now() - start;
const snap = performance.now();
for (let i = 0; i < 20; i++) e.snapshot();
const snapshot = (performance.now() - snap) / 20;
const crosses = performance.now();
const count = crossings(p.circuits[p.root].wires);
const geometry = performance.now() - crosses;
mkdirSync("docs/verification", { recursive: true });
writeFileSync("docs/verification/dense.loom.json", JSON.stringify(p));
console.log(
  JSON.stringify(
    {
      components: p.circuits[p.root].components.length,
      connections: p.circuits[p.root].wires.length,
      compileMs: compiled,
      snapshotMs: snapshot,
      crossingsMs: geometry,
      bridgeCount: count.bridges.length,
      valid: e.valid,
    },
    null,
    2,
  ),
);
