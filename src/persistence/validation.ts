import { validateV2 } from "./v2Validation";
import type { Project, Kind } from "../model/types";
const kinds = new Set<Kind>([
  "input",
  "button",
  "triState",
  "constant",
  "probe",
  "not",
  "and",
  "or",
  "xor",
  "nand",
  "nor",
  "xnor",
  "mux",
  "decoder",
  "split",
  "join",
  "adder",
  "subtractor",
  "compare",
  "register",
  "counter",
  "dff",
  "ram",
  "rom",
  "portIn",
  "portOut",
  "instance",
  "buffer",
  "keyboard",
  "terminal",
  "display",
  "sevenSegment",
]);
const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
function assert(condition: unknown): asserts condition {
  if (!condition) throw new Error("invalidProject");
}
const str = (v: unknown, max = 200) =>
  typeof v === "string" && v.length > 0 && v.length <= max;
const integer = (v: unknown, min: number, max: number) =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export function parseProject(text: string): Project {
  if (new TextEncoder().encode(text).length > MAX_FILE_BYTES)
    throw new Error("fileTooLarge");
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("invalidProject");
  }
  const project = validateProject(raw);
  if (project.course) project.course.needsVerification = true;
  return project;
}
export function validateProject(raw: unknown): Project {
  assert(object(raw));
  if (raw.schemaVersion !== 2) throw new Error("unsupportedVersion");
  assert(
    str(raw.id) &&
      typeof raw.name === "string" &&
      raw.name.length <= 200 &&
      str(raw.root) &&
      object(raw.circuits) &&
      typeof raw.source === "string" &&
      raw.source.length <= 100000 &&
      Array.isArray(raw.progress) &&
      raw.progress.every((p) => str(p)),
  );
  assert(Object.keys(raw.circuits).length <= 256);
  let totalComponents = 0,
    totalWires = 0;
  for (const [id, value] of Object.entries(raw.circuits)) {
    assert(
      object(value) &&
        value.id === id &&
        str(id) &&
        typeof value.name === "string" &&
        value.name.length <= 200 &&
        Array.isArray(value.components) &&
        Array.isArray(value.wires) &&
        Array.isArray(value.ports) &&
        Array.isArray(value.vectors),
    );
    totalComponents += value.components.length;
    totalWires += value.wires.length;
    assert(totalComponents <= 20000 && totalWires <= 50000);
    const ids = new Set<string>();
    for (const c of value.components) {
      assert(
        object(c) &&
          str(c.id) &&
          !ids.has(c.id as string) &&
          kinds.has(c.kind as Kind) &&
          integer(c.width, 1, 32) &&
          object(c.params),
      );
      ids.add(c.id as string);
      assert(
        typeof c.name === "string" &&
          c.name.length <= 200 &&
          integer(c.x, -1000000, 1000000) &&
          integer(c.y, -1000000, 1000000),
      );
      for (const [key, v] of Object.entries(c.params)) {
        assert(str(key) && typeof v === "number" && Number.isFinite(v));
      }
      if (c.params.addressBits !== undefined)
        assert(integer(c.params.addressBits, 1, 16));
      if (c.kind === "decoder") assert(integer(c.width, 1, 5));
      if (c.kind === "instance") assert(str(c.definitionId));
      if (c.image !== undefined)
        assert(
          Array.isArray(c.image) &&
            c.image.length <= 65536 &&
            c.image.every((n) => integer(n, 0, 2 ** (c.width as number) - 1)),
        );
    }
    const wireIds = new Set<string>();
    for (const w of value.wires) {
      assert(
        object(w) &&
          str(w.id) &&
          !wireIds.has(w.id as string) &&
          object(w.from) &&
          object(w.to) &&
          Array.isArray(w.points) &&
          w.points.length <= 2048,
      );
      wireIds.add(w.id as string);
      for (const end of [w.from, w.to])
        assert(
          str(end.component) &&
            ids.has(end.component as string) &&
            str(end.port),
        );
      for (const p of w.points)
        assert(
          object(p) &&
            integer(p.x, -1000000, 1000000) &&
            integer(p.y, -1000000, 1000000),
        );
      if (w.junction !== undefined)
        assert(
          object(w.junction) &&
            integer(w.junction.x, -1000000, 1000000) &&
            integer(w.junction.y, -1000000, 1000000),
        );
      if (w.pinned !== undefined) assert(typeof w.pinned === "boolean");
    }
    const portIds = new Set<string>();
    for (const p of value.ports) {
      assert(
        object(p) &&
          str(p.id) &&
          !portIds.has(p.id as string) &&
          str(p.name) &&
          (p.direction === "in" || p.direction === "out") &&
          integer(p.width, 1, 32) &&
          str(p.componentId) &&
          ids.has(p.componentId as string),
      );
      portIds.add(p.id as string);
    }
    assert(value.vectors.length <= 4096);
    for (const v of value.vectors) {
      assert(object(v) && str(v.name) && object(v.inputs) && object(v.outputs));
      for (const n of [...Object.values(v.inputs), ...Object.values(v.outputs)])
        assert(integer(n, 0, 0xffffffff));
      if (v.cycles !== undefined) assert(integer(v.cycles, 0, 10000));
    }
  }
  assert(Object.hasOwn(raw.circuits, raw.root as string));
  if (raw.cpu !== undefined) {
    assert(object(raw.cpu));
    for (const k of [
      "pc",
      "ir",
      "accumulator",
      "zero",
      "carry",
      "phase",
      "halt",
      "output",
      "rom",
      "ram",
      "invalid",
    ])
      assert(str(raw.cpu[k]));
  }
  if (raw.sourceMap !== undefined) {
    assert(object(raw.sourceMap));
    for (const [a, l] of Object.entries(raw.sourceMap))
      assert(integer(Number(a), 0, 255) && integer(l, 1, 10000));
  }
  for (const value of Object.values(raw.circuits)) {
    assert(
      object(value) &&
        Array.isArray(value.nets) &&
        Array.isArray(value.markers) &&
        Array.isArray(value.tests),
    );
    const seen = new Set<string>();
    const memberships = new Set<string>();
    for (const n of value.nets) {
      assert(
        object(n) &&
          str(n.id, 1024) &&
          !seen.has(n.id as string) &&
          integer(n.width, 1, 32) &&
          Array.isArray(n.ports) &&
          n.ports.length <= 50000,
      );
      seen.add(n.id as string);
      for (const e of n.ports) {
        assert(object(e) && str(e.component) && str(e.port));
        const key = JSON.stringify([e.component, e.port]);
        assert(!memberships.has(key));
        memberships.add(key);
      }
      if (n.name !== undefined)
        assert(typeof n.name === "string" && n.name.length <= 200);
    }
    for (const m of value.markers)
      assert(
        object(m) &&
          str(m.id) &&
          seen.has(m.netId as string) &&
          integer(m.x, -1000000, 1000000) &&
          integer(m.y, -1000000, 1000000) &&
          [0, 90, 180, 270].includes(m.rotation as number),
      );
  }
  // Reparse to discard any custom prototypes before treating the object as a document.
  const project = JSON.parse(JSON.stringify(raw)) as Project;
  try {
    validateV2(project);
  } catch {
    throw new Error("invalidProject");
  }
  return project;
}
