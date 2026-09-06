import { writeFileSync } from "node:fs";
import { ioProject } from "../src/cpu/ioCircuit";
import { rerouteAutomatic, routeClear } from "../src/editor/routing";

const project = ioProject();
const layouts: Record<string, Record<string, { x: number; y: number }[]>> = {};
for (const circuit of Object.values(project.circuits).filter(
  (c) => c.id !== project.root,
)) {
  rerouteAutomatic(circuit, project, { attempts: 8, searchLimit: 60000 });
  if (circuit.wires.some((w) => !routeClear(circuit, project, w)))
    throw new Error(`Invalid layout: ${circuit.name}`);
  layouts[circuit.name] = Object.fromEntries(
    circuit.wires.map((w) => [JSON.stringify([w.from, w.to]), w.points]),
  );
}
writeFileSync(
  "src/cpu/generatedLayouts.json",
  JSON.stringify(layouts, null, 2) + "\n",
);
