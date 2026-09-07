import type { Project } from "../model/types";
const ids = new Set([
  "nand",
  "not",
  "and-or",
  "xor",
  "mux",
  "mux8",
  "seven-segment",
  "half-adder",
  "full-adder",
  "adder8",
  "subtract",
  "register",
  "accumulator",
  "pc",
  "pc-fields",
  "alu",
  "control",
  "cpu",
  "io",
  "calculator",
]);
const object = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === "object" && !Array.isArray(v);
export function validateCourse(p: Project) {
  if (p.courseReference !== undefined && typeof p.courseReference !== "boolean")
    throw new Error("invalidProject");
  const c = p.course;
  if (c === undefined) return;
  if (
    !object(c) ||
    c.id !== "build-computer" ||
    !ids.has(c.active) ||
    !object(c.drafts) ||
    !object(c.accepted) ||
    (c.needsVerification !== undefined &&
      typeof c.needsVerification !== "boolean")
  )
    throw new Error("invalidProject");
  if (c.drafts[c.active] !== p.root) throw new Error("invalidProject");
  if (c.sources !== undefined) {
    if (!object(c.sources)) throw new Error("invalidProject");
    for (const [id, value] of Object.entries(c.sources)) {
      if (
        !ids.has(id) ||
        !object(value) ||
        typeof value.source !== "string" ||
        value.source.length > 100000 ||
        (value.assembledSource !== undefined &&
          (typeof value.assembledSource !== "string" ||
            value.assembledSource.length > 100000))
      )
        throw new Error("invalidProject");
      if (value.sourceMap !== undefined) {
        if (
          !object(value.sourceMap) ||
          Object.entries(value.sourceMap).some(
            ([key, line]) =>
              !Number.isInteger(Number(key)) ||
              Number(key) < 0 ||
              Number(key) > 255 ||
              !Number.isInteger(line) ||
              line < 1 ||
              line > 10000,
          )
        )
          throw new Error("invalidProject");
      }
    }
  }
  for (const [id, root] of Object.entries(c.drafts))
    if (
      !ids.has(id) ||
      typeof root !== "string" ||
      !Object.hasOwn(p.circuits, root)
    )
      throw new Error("invalidProject");
  for (const [id, r] of Object.entries(c.accepted)) {
    if (
      !ids.has(id) ||
      !object(r) ||
      !Number.isInteger(r.exerciseRevision) ||
      r.exerciseRevision < 1 ||
      typeof r.hash !== "string" ||
      !/^[a-f0-9]{64}$/.test(r.hash) ||
      !object(r.dependencies) ||
      typeof r.acceptedRoot !== "string" ||
      !Object.hasOwn(p.circuits, r.acceptedRoot)
    )
      throw new Error("invalidProject");
    for (const [key, hash] of Object.entries(r.dependencies))
      if (
        !ids.has(key.split(":")[0]) ||
        typeof hash !== "string" ||
        !/^[a-f0-9]{64}$/.test(hash)
      )
        throw new Error("invalidProject");
  }
}
