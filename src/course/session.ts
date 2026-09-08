import { supplyCpuBlocks } from "./missions/cpuStarter";
import { MissionBuilder } from "./missions/combinational";
import { layoutMission } from "./missions/layout";
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
    curriculum: 3,
    active: "core-01",
    drafts: {},
    accepted: {},
  };
  activateExercise(p, "core-01");
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
  const current = exercise(p.course!.active).mission!;
  const cutoff =
    current.track === "core"
      ? Number(current.id.slice(5)) - 1
      : current.chapter * 6;
  return exercises
    .filter(
      (e) =>
        e.mission!.track === "core" &&
        Number(e.id.slice(5)) <= cutoff &&
        !["core-01", "core-02", "core-03", "core-04"].includes(e.id),
    )
    .flatMap((e) => {
      const record = p.course!.accepted[e.id];
      return record &&
        record.exerciseRevision === e.revision &&
        p.circuits[record.acceptedRoot]?.ports.length
        ? [record.acceptedRoot]
        : [];
    });
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
    sourceMap: p.sourceMap,
    source: p.source,
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
    const priorDefinitions = new Set(Object.keys(p.circuits));
    const starter = exercise(id).starter();
    const root = uid(),
      c = starter.circuits[starter.root];
    Object.assign(p.circuits, starter.circuits);
    delete p.circuits[starter.root];
    c.id = root;
    c.name = exercise(id).title[0];
    p.circuits[root] = c;
    p.course.drafts[id] = root;
    p.course.sources ??= {};
    p.course.sources[id] = {
      source: starter.source,
      assembledSource: starter.assembledSource,
      sourceMap: starter.sourceMap,
    };
    if (id === "core-48") supplyCpuBlocks(p, root);
    const programming =
      /^core-(49|5[0-4]|5[6-9]|60)$/.test(id) ||
      /^project-(3[3-9]|40)$/.test(id);
    if (programming) {
      const cpu = p.course.accepted["core-48"];
      if (!cpu) throw new Error("Complete prerequisite checks first");
      const cpuRoot = forkDefinition(p, cpu.acceptedRoot),
        cpuCircuit = p.circuits[cpuRoot];
      const image = starter.circuits[starter.root].components.find(
        (n) => n.id === "Program",
      )?.image;
      const rom = cpuCircuit.components.find((n) => n.id === "Program");
      if (!rom) throw new Error("missingDefinition");
      rom.image = structuredClone(image ?? []);
      const ioProgram =
        /^core-(5[6-9]|60)$/.test(id) || /^project-(3[7-9]|40)$/.test(id);
      if (ioProgram) {
        const io = p.course.accepted["core-55"],
          ram = cpuCircuit.components.find((n) => n.id === "RAM");
        if (!io || !ram) throw new Error("Complete prerequisite checks first");
        ram.kind = "instance";
        ram.definitionId = io.acceptedRoot;
        const builder = new MissionBuilder("Device reads");
        builder.p = { ...p, root: cpuRoot };
        builder.serial =
          Math.max(
            100000,
            ...cpuCircuit.components.map((n) =>
              Number(n.id.match(/^g(\d+)$/)?.[1] ?? 0),
            ),
          ) + 1;
        const bits = builder.bits(["IR", "q"], 16).slice(8);
        const selects = [2, 4, 5, 6, 7, 8].map((op) =>
          bits
            .map((pin, i) => (op & (1 << i) ? pin : builder.not(pin)))
            .reduce((a, b) => builder.and(a, b)),
        );
        const read = builder.and(
          selects.reduce((a, b) => builder.or(a, b)),
          builder.and(["Phase", "q"], builder.not(["Halt", "q"])),
        );
        builder.connect(...read, "RAM", "read");
        Object.assign(p.circuits, builder.p.circuits);
        layoutMission(builder.p);
      }
      delete p.circuits[root];
      p.course.drafts[id] = cpuRoot;
    }

    const neededDefinitions = new Set<string>();
    const visitDefinition = (root: string) => {
      if (neededDefinitions.has(root)) return;
      neededDefinitions.add(root);
      for (const n of p.circuits[root].components)
        if (n.definitionId) visitDefinition(n.definitionId);
    };
    for (const root of [
      ...Object.values(p.course.drafts),
      ...Object.values(p.course.accepted).map((r) => r!.acceptedRoot),
    ])
      if (root) visitDefinition(root);
    for (const key of Object.keys(p.circuits))
      if (!priorDefinitions.has(key) && !neededDefinitions.has(key))
        delete p.circuits[key];
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
export async function programSourceHash(p: Project) {
  return contentHash({
    source: p.source,
    assembledSource: p.assembledSource ?? "",
  });
}
export async function acceptCheck(p: Project, result: CourseCheck) {
  if (
    !p.course ||
    p.courseReference ||
    result.status !== "passed" ||
    !result.hash
  )
    throw new Error("A passing draft check is required");
  if (
    exercise(result.exercise).mission!.work === "program" &&
    result.sourceHash !== (await programSourceHash(p))
  )
    throw new Error("Circuit changed; check again");
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
    ...(exercise(result.exercise).mission!.work === "program"
      ? {
          source: {
            source: p.source,
            assembledSource: p.assembledSource,
            sourceMap: p.sourceMap,
          },
        }
      : {}),
  };
  p.updatedAt = Date.now();
}
export function dependencyHashes(p: Project, id: ExerciseId) {
  const root = p.course?.drafts[id];
  if (!root) return {};
  const programming = exercise(id).mission!.work === "program";
  return Object.fromEntries(
    Object.values(closure(p, root)).flatMap((c) => {
      const origin = c.library ?? c.libraryOrigin;
      return origin?.id.startsWith("course-") && (c.id !== root || programming)
        ? [[origin.id.slice(7) + ":" + origin.hash, origin.hash]]
        : [];
    }),
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
export const nextExercise = (id: ExerciseId) => {
  const current = exercise(id).mission!;
  if (current.track === "project") return undefined;
  return exercises.find(
    (e) => e.id === `core-${String(Number(id.slice(5)) + 1).padStart(2, "0")}`,
  );
};

export function counterWithAcceptedDecoder(p: Project): Project {
  const accepted = p.course?.accepted["core-18"];
  if (
    !accepted ||
    p.course?.needsVerification ||
    accepted.exerciseRevision !== exercise("core-18").revision
  )
    throw new Error("Complete prerequisite checks first");
  return sevenSegmentExample("counter", { ...p, root: accepted.acceptedRoot });
}
