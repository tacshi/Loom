import { compile } from "../simulator/compiler";
import { verifyWidthVariants } from "./variants";
import type { Project } from "../model/types";
import type { CourseCheck, ExerciseId } from "./types";
import { exercise, exercises, courseReference } from "./registry";
import {
  courseProject,
  dependencyHashes,
  electricalHash,
  available,
} from "./session";
import { closure } from "../library/package";
import { runCase } from "../verification/runner";
import { canonical } from "../model/nets";
export async function checkCourse(
  p: Project,
  id: ExerciseId,
  verifySnapshot = false,
  progress?: (exercise: ExerciseId, caseName?: string) => void,
): Promise<CourseCheck> {
  progress?.(id);
  const result: CourseCheck = {
    exercise: id,
    status: "invalid",
    results: [],
    cases: [],
  };
  if (!p.course || p.courseReference) {
    result.message = "Check your own course draft";
    return result;
  }
  if (!verifySnapshot && !available(p, id))
    return {
      ...result,
      status: "blocked",
      message: "Complete prerequisite checks first",
    };
  try {
    const spec = exercise(id),
      draft = courseProject(p, id),
      c = draft.circuits[draft.root],
      r = courseReference(id).circuits[courseReference(id).root];
    const shape = (ports: typeof c.ports) =>
      ports
        .map(({ id, width, direction, componentId }) => ({
          id,
          width,
          direction,
          componentId,
        }))
        .sort((a, b) => a.id.localeCompare(b.id));
    if (canonical(shape(c.ports)) !== canonical(shape(r.ports)))
      throw new Error(
        "Match the exercise interface: port IDs, directions and widths",
      );
    const trusted = new Set<string>();
    const dependencyFingerprints = new Map<string, string>();
    const index = exercises.findIndex((e) => e.id === id);
    for (const prior of exercises.slice(0, index)) {
      if (["signals", "and-basics", "invert-basics"].includes(prior.id))
        continue;
      const record = p.course.accepted[prior.id];
      if (!record || record.exerciseRevision !== prior.revision) continue;
      const acceptedLibrary = p.circuits[record.acceptedRoot]?.library;
      if (
        acceptedLibrary?.id !== "course-" + prior.id ||
        (await electricalHash(p, record.acceptedRoot)) !== record.hash
      )
        continue;
      // Packaging remaps definition IDs. Trust the approved identity and actual
      // electrical content, never an embedded library label alone.
      for (const candidate of Object.values(draft.circuits)) {
        const directIdentity =
          candidate.library?.id === acceptedLibrary.id &&
          candidate.library.hash === acceptedLibrary.hash;
        const packagedIdentity =
          verifySnapshot &&
          candidate.id !== draft.root &&
          candidate.library?.hash ===
            draft.circuits[draft.root].library?.hash &&
          Object.values(p.course.accepted[id]?.dependencies ?? {}).includes(
            acceptedLibrary.hash,
          );
        if (
          !(directIdentity || packagedIdentity) ||
          candidate.components.length !==
            p.circuits[record.acceptedRoot].components.length
        )
          continue;
        let fingerprint = dependencyFingerprints.get(candidate.id);
        if (!fingerprint) {
          fingerprint = await electricalHash(p, candidate.id);
          dependencyFingerprints.set(candidate.id, fingerprint);
        }
        if (fingerprint === record.hash) trusted.add(candidate.id);
      }
    }
    const visited = new Set<string>();
    function validateParts(root: string) {
      if (visited.has(root)) return;
      visited.add(root);
      if (root !== draft.root && trusted.has(root)) return;
      for (const n of draft.circuits[root].components) {
        if (n.kind === "instance") validateParts(n.definitionId!);
        else if (!spec.allowed.includes(n.kind))
          throw new Error(
            "Component not allowed: " + n.kind + " (" + n.name + ")",
          );
      }
    }
    validateParts(draft.root);
    result.cases = spec.checks();
    if (["cpu", "calculator"].includes(id)) {
      const undriven = compile(draft, draft.root).diagnostics.find(
        (d) => d.code === "undriven",
      );
      if (undriven)
        throw new Error(
          "undriven: " + undriven.component + "." + undriven.port,
        );
    }
    for (const test of result.cases) {
      progress?.(id, test.name);
      const checked = runCase(draft, draft.root, test);
      result.results.push(checked);
      if (checked.status !== "passed") break;
    }
    result.status = result.results.some((r) => r.status === "limit")
      ? "limit"
      : result.results.some((r) => r.status === "invalid")
        ? "invalid"
        : result.results.every((r) => r.status === "passed")
          ? "passed"
          : "failed";
    result.message = result.results.find((r) => r.error)?.error;
    if (result.status === "passed") {
      const variants = verifyWidthVariants(draft, id);
      result.verifiedWidths = variants.widths;
      const failure = variants.results.find((r) => r.status !== "passed");
      if (failure) {
        result.status = "invalid";
        result.message = "Width variant did not pass: " + failure.name;
      }
    }
    result.hash = await electricalHash(p, draft.root);
    result.dependencies = dependencyHashes(p, id);
  } catch (e) {
    result.status = "invalid";
    result.message = (e as Error).message;
  }
  return result;
}
/** Imported completion claims are rechecked against the trusted registry and actual embedded snapshots. */
export async function reverifyCourse(
  p: Project,
  progress?: (exercise: ExerciseId, caseName?: string) => void,
) {
  if (!p.course) return [];
  const results: CourseCheck[] = [];
  for (const spec of exercises) {
    const record = p.course.accepted[spec.id];
    if (!record) continue;
    if (spec.prerequisites.some((k) => !p.course!.accepted[k])) {
      delete p.course.accepted[spec.id];
      continue;
    }
    const copy = structuredClone(p);
    copy.course!.drafts[spec.id] = record.acceptedRoot;
    const result = await checkCourse(copy, spec.id, true, progress);
    results.push(result);
    // The electrical hash normalizes remapped definition IDs.
    if (
      result.status !== "passed" ||
      record.exerciseRevision !== spec.revision ||
      record.hash !== result.hash
    )
      delete p.course.accepted[spec.id];
  }
  p.course.needsVerification = false;
  return results;
}
