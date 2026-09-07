import { attachDigit, sevenSegmentExample } from "../examples/sevenSegment";
import { Builder } from "../examples/adder";
import { emptyProject, uid, type Project, type Kind } from "../model/types";
import {
  closure,
  createPackage,
  embedPackage,
  contentHash,
  forkDefinition,
} from "../library/package";
import { semanticDocument } from "../simulator/state";
import { exercise, exercises, courseReference } from "./registry";
import { canonical } from "../model/nets";
import type { CourseCheck, ExerciseId } from "./types";
export function newCourse(): Project {
  const p = emptyProject("Build your own computer");
  p.course = {
    id: "build-computer",
    curriculum: 2,
    active: "signals",
    drafts: {},
    accepted: {},
  };
  activateExercise(p, "signals");
  return p;
}
export function available(p: Project, id: ExerciseId) {
  return (
    !!p.course &&
    !p.courseReference &&
    !p.course.needsVerification &&
    exercise(id).prerequisites.every(
      (k) => p.course!.accepted[k]?.exerciseRevision === exercise(k).revision,
    )
  );
}
export function allowedKinds(p: Project): Kind[] | undefined {
  return p.course ? exercise(p.course.active).allowed : undefined;
}
export function acceptedRoots(p: Project): string[] {
  if (p.course?.needsVerification) return [];
  const at = exercises.findIndex((e) => e.id === p.course?.active);
  return exercises
    .slice(0, at + 1)
    .filter((e) => !["signals", "and-basics", "invert-basics"].includes(e.id))
    .flatMap((e) =>
      p.course?.accepted[e.id] &&
      p.circuits[p.course.accepted[e.id]!.acceptedRoot]?.ports.length
        ? [p.course.accepted[e.id]!.acceptedRoot]
        : [],
    );
}
export function courseProject(p: Project, id: ExerciseId): Project {
  const root = p.course?.drafts[id];
  if (!root) throw new Error("Missing exercise draft");
  const base = courseReference(id);
  return {
    ...p,
    root,
    circuits: closure(p, root),
    cpu: base.cpu,
    debugProfile: base.debugProfile,
    sourceMap: base.sourceMap,
    source: base.source,
  };
}
export async function electricalHash(p: Project, root: string) {
  const circuits = closure(p, root),
    ids = new Map<string, string>();
  function visit(id: string) {
    if (ids.has(id)) return;
    ids.set(id, "c" + ids.size);
    for (const n of circuits[id].components)
      if (n.definitionId) visit(n.definitionId);
  }
  visit(root);
  const normalized = Object.fromEntries(
    [...ids].map(([id, key]) => {
      const c = structuredClone(circuits[id]);
      c.id = key;
      for (const n of c.components)
        if (n.definitionId) n.definitionId = ids.get(n.definitionId)!;
      return [key, c];
    }),
  );
  return contentHash(
    semanticDocument({
      ...p,
      root: ids.get(root)!,
      circuits: normalized,
      cpu: undefined,
      debugProfile: undefined,
    }),
  );
}
export function activateExercise(p: Project, id: ExerciseId) {
  if (!p.course || !available(p, id))
    throw new Error("Complete prerequisite checks first");
  if (p.course.drafts[p.course.active] === p.root) {
    p.course.sources ??= {};
    p.course.sources[p.course.active] = {
      source: p.source,
      assembledSource: p.assembledSource,
      sourceMap: p.sourceMap,
    };
  }
  if (!p.course.drafts[id]) {
    const r = courseReference(id),
      c = structuredClone(exercise(id).starter().circuits[r.root]);
    c.id = uid();
    c.name = exercise(id).title[0];
    p.circuits[c.id] = c;
    p.course.drafts[id] = c.id;
    // Previously verified components are supplied as disconnected, immutable building blocks.
    if (["adder8", "accumulator", "alu", "control", "cpu"].includes(id)) {
      let index = 0;
      for (const [lesson, record] of Object.entries(p.course.accepted)) {
        if (
          [
            "signals",
            "and-basics",
            "invert-basics",
            "nand",
            "seven-segment",
            "half-adder",
            "register",
            "accumulator",
          ].includes(lesson)
        )
          continue;
        const role =
          lesson === "alu"
            ? "ALU"
            : lesson === "control"
              ? "Control"
              : lesson === "pc-fields"
                ? "Fields"
                : exercise(lesson as ExerciseId).title[0];
        c.components.push({
          id: role,
          kind: "instance",
          definitionId: record!.acceptedRoot,
          name: role,
          width: 1,
          x: 400 + (index % 4) * 300,
          y: 500 + Math.floor(index++ / 4) * 240,
          params: {},
        });
      }
    }
    if (id === "mux8")
      for (let bit = 0; bit < 8; bit++)
        c.components.push({
          id: "bit" + bit,
          kind: "instance",
          definitionId: p.course.accepted.mux!.acceptedRoot,
          name: "bit " + bit,
          width: 1,
          x: 320,
          y: bit * 160,
          params: {},
        });
    if (id === "calculator") {
      const root = forkDefinition(p, p.course.accepted.cpu!.acceptedRoot),
        draft = p.circuits[root];
      delete p.circuits[c.id];
      p.course.drafts[id] = root;
      const ram = draft.components.find((n) => n.id === "RAM")!;
      ram.kind = "instance";
      ram.definitionId = p.course.accepted.io!.acceptedRoot;
      const builder = new Builder("Calculator");
      builder.p = { ...p, root };
      attachDigit(builder, ["RAM", "segments"], 2700, 0);
      draft.components.find((n) => n.id === "Program")!.image = r.circuits[
        r.root
      ].components.find((n) => n.id === "Program")!.image;
    }
  }
  p.course.active = id;
  p.root = p.course.drafts[id]!;
  const r = courseReference(id);
  p.cpu = r.cpu;
  p.debugProfile = r.debugProfile;
  const savedSource = p.course.sources?.[id];
  p.source = savedSource?.source ?? r.source;
  p.sourceMap = savedSource ? savedSource.sourceMap : r.sourceMap;
  p.assembledSource = savedSource
    ? savedSource.assembledSource
    : r.assembledSource;
  p.updatedAt = Date.now();
}
export async function acceptCheck(p: Project, result: CourseCheck) {
  if (
    !p.course ||
    p.courseReference ||
    result.status !== "passed" ||
    !result.hash
  )
    throw new Error("A passing draft check is required");
  const root = p.course.drafts[result.exercise]!;
  if ((await electricalHash(p, root)) !== result.hash)
    throw new Error("Circuit changed; check again");
  if (!available(p, result.exercise))
    throw new Error("Complete prerequisite checks first");
  const prior = p.course.accepted[result.exercise];
  if (
    prior?.hash === result.hash &&
    prior.exerciseRevision === exercise(result.exercise).revision
  )
    return;
  const pkg = await createPackage(
    p,
    root,
    "course-" + result.exercise,
    (prior ? (p.circuits[prior.acceptedRoot].library?.version ?? 0) : 0) + 1,
  );
  const acceptedRoot = embedPackage(p, pkg);
  p.course.accepted[result.exercise] = {
    hash: result.hash,
    verifiedWidths: result.verifiedWidths,
    exerciseRevision: exercise(result.exercise).revision,
    dependencies: result.dependencies ?? {},
    acceptedRoot,
  };
  p.updatedAt = Date.now();
}
export function dependencyHashes(p: Project, id: ExerciseId) {
  const root = p.course?.drafts[id];
  if (!root) return {};
  return Object.fromEntries(
    Object.values(closure(p, root))
      .filter((c) => c.id !== root && c.library?.id.startsWith("course-"))
      .map((c) => [
        c.library!.id.slice(7) + ":" + c.library!.hash,
        c.library!.hash,
      ]),
  );
}
/** Explicit replacement preserves accepted snapshots in all other exercise drafts. */
export function replaceCourseDependency(
  p: Project,
  instanceId: string,
  lesson: ExerciseId,
) {
  const c = p.circuits[p.course!.drafts[p.course!.active]!],
    n = c.components.find((n) => n.id === instanceId),
    record = p.course!.accepted[lesson];
  if (!n || n.kind !== "instance" || !record)
    throw new Error("Select a component and verified exercise");
  const old = p.circuits[n.definitionId!],
    next = p.circuits[record.acceptedRoot];
  const shape = (c: typeof old) =>
    c.ports.map(({ id, width, direction, widthParameter }) => ({
      id,
      width,
      direction,
      widthParameter,
    }));
  if (canonical(shape(old)) !== canonical(shape(next)))
    throw new Error("libraryInterfaceMismatch");
  n.definitionId = record.acceptedRoot;
}
export const nextExercise = (id: ExerciseId) =>
  exercises[exercises.findIndex((e) => e.id === id) + 1];

export function counterWithAcceptedDecoder(p: Project): Project {
  const accepted = p.course?.accepted["seven-segment"];
  if (
    !accepted ||
    p.course?.needsVerification ||
    accepted.exerciseRevision !== exercise("seven-segment").revision
  )
    throw new Error("Complete prerequisite checks first");
  return sevenSegmentExample("counter", { ...p, root: accepted.acceptedRoot });
}
