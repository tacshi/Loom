import type { Project } from "../model/types";
const ids = new Set([
  ...Array.from(
    { length: 60 },
    (_, i) => `core-${String(i + 1).padStart(2, "0")}`,
  ),
  ...Array.from(
    { length: 40 },
    (_, i) => `project-${String(i + 1).padStart(2, "0")}`,
  ),
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
    c.curriculum !== 3 ||
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
  if ("stages" in c || "practice" in c) throw new Error("invalidProject");
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
    if (
      r.source !== undefined &&
      (!object(r.source) ||
        typeof r.source.source !== "string" ||
        r.source.source.length > 100000 ||
        (r.source.assembledSource !== undefined &&
          (typeof r.source.assembledSource !== "string" ||
            r.source.assembledSource.length > 100000)))
    )
      throw new Error("invalidProject");
    if (
      r.source?.sourceMap !== undefined &&
      (!object(r.source.sourceMap) ||
        Object.entries(r.source.sourceMap).some(
          ([key, line]) =>
            !Number.isInteger(Number(key)) ||
            Number(key) < 0 ||
            Number(key) > 255 ||
            !Number.isInteger(line) ||
            line < 1 ||
            line > 10000,
        ))
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
