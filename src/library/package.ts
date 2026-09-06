import type { Project, Circuit } from "../model/types";
import { emptyProject, uid } from "../model/types";
import { canonical, stableId } from "../model/nets";
import { validateProject, MAX_FILE_BYTES } from "../persistence/validation";
import { vectorCases } from "../verification/vectors";
import { moveComponents } from "../editor/routing";
export type ComponentPackage = {
  format: "loom-component";
  schemaVersion: 2;
  id: string;
  version: number;
  root: string;
  circuits: Record<string, Circuit>;
  hash: string;
};
export async function contentHash(data: unknown) {
  const bytes = new TextEncoder().encode(canonical(data));
  return Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
}
export function closure(project: Pick<Project, "circuits">, root: string) {
  const result: Record<string, Circuit> = {},
    active = new Set<string>();
  function visit(id: string) {
    if (active.has(id)) throw new Error("recursive");
    if (result[id]) return;
    const c = project.circuits[id];
    if (!c) throw new Error("missingDefinition");
    active.add(id);
    for (const n of c.components) if (n.definitionId) visit(n.definitionId);
    active.delete(id);
    result[id] = structuredClone(c);
  }
  visit(root);
  return result;
}
export async function createPackage(
  p: Project,
  root: string,
  id = p.circuits[root].library?.id ??
    p.circuits[root].libraryOrigin?.id ??
    stableId(p.id + root),
  version = 1,
): Promise<ComponentPackage> {
  if (!Number.isInteger(version) || version < 1 || version > 0x7fffffff)
    throw new Error("invalidLibrary");
  const data = {
    format: "loom-component" as const,
    schemaVersion: 2 as const,
    id,
    version,
    root,
    circuits: closure(p, root),
  };
  for (const c of Object.values(data.circuits)) {
    delete c.library;
    delete c.libraryOrigin;
  }
  return { ...data, hash: await contentHash(data) };
}
export async function parsePackage(text: string): Promise<ComponentPackage> {
  if (new TextEncoder().encode(text).length > MAX_FILE_BYTES)
    throw new Error("fileTooLarge");
  let raw: ComponentPackage;
  try {
    raw = JSON.parse(text) as ComponentPackage;
  } catch {
    throw new Error("invalidLibrary");
  }
  if (!raw || typeof raw !== "object") throw new Error("invalidLibrary");
  if (
    raw.format !== "loom-component" ||
    raw.schemaVersion !== 2 ||
    typeof raw.id !== "string" ||
    !raw.id.length ||
    raw.id.length > 200 ||
    !Number.isInteger(raw.version) ||
    raw.version < 1 ||
    typeof raw.hash !== "string"
  )
    throw new Error("invalidLibrary");
  const { hash, ...body } = raw;
  if ((await contentHash(body)) !== hash)
    throw new Error("libraryHashMismatch");
  const base = emptyProject();
  validateProject({ ...base, root: raw.root, circuits: raw.circuits });
  const deps = closure(raw, raw.root);
  if (Object.keys(deps).length !== Object.keys(raw.circuits).length)
    throw new Error("invalidLibrary");
  return structuredClone(raw);
}
export function embedPackage(p: Project, pkg: ComponentPackage) {
  const ids = new Map(
    Object.keys(pkg.circuits).map((id) => [
      id,
      `lib-${pkg.hash.slice(0, 20)}-${stableId(id)}`,
    ]),
  );
  for (const [id, original] of Object.entries(pkg.circuits)) {
    const c = structuredClone(original);
    c.id = ids.get(id)!;
    for (const n of c.components)
      if (n.definitionId) n.definitionId = ids.get(n.definitionId)!;
    c.library = {
      id: id === pkg.root ? pkg.id : stableId(pkg.id + id),
      version: pkg.version,
      hash: pkg.hash,
    };
    if (p.circuits[c.id] && canonical(p.circuits[c.id]) !== canonical(c))
      throw new Error("libraryConflict");
    p.circuits[c.id] = c;
  }
  return ids.get(pkg.root)!;
}
export function forkDefinition(p: Project, id: string) {
  const defs = closure(p, id),
    mapping = new Map(Object.keys(defs).map((id) => [id, uid()]));
  for (const [old, c] of Object.entries(defs)) {
    c.id = mapping.get(old)!;
    c.libraryOrigin = c.library ?? c.libraryOrigin;
    delete c.library;
    for (const n of c.components)
      if (n.definitionId) n.definitionId = mapping.get(n.definitionId)!;
    p.circuits[c.id] = c;
  }
  return mapping.get(id)!;
}
export function reviewUpdate(p: Project, id: string, pkg: ComponentPackage) {
  const old = p.circuits[id],
    next = pkg.circuits[pkg.root];
  if (!old || old.library?.id !== pkg.id)
    throw new Error("libraryIdentityMismatch");
  return {
    interface: canonical(old.ports) !== canonical(next.ports),
    parameters:
      canonical(old.parameters ?? []) !== canonical(next.parameters ?? []),
    appearance:
      canonical(old.appearance ?? {}) !== canonical(next.appearance ?? {}),
    tests:
      canonical(old.tests) !== canonical(next.tests) ||
      canonical(old.vectors) !== canonical(next.vectors),
    cases: next.tests.length
      ? next.tests
      : vectorCases(
          { ...emptyProject(), root: pkg.root, circuits: pkg.circuits },
          next,
        ),
  };
}
export function applyUpdate(
  p: Project,
  id: string,
  pkg: ComponentPackage,
  mapping: Record<string, string>,
) {
  reviewUpdate(p, id, pkg);
  const old = p.circuits[id],
    next = pkg.circuits[pkg.root];
  for (const port of old.ports) {
    const replacement = next.ports.find(
      (q) => q.id === (mapping[port.id] ?? port.id),
    );
    if (
      !replacement ||
      replacement.direction !== port.direction ||
      replacement.width !== port.width
    )
      throw new Error("libraryInterfaceMismatch");
  }
  const fresh = embedPackage(p, pkg);
  for (const c of Object.values(p.circuits).filter((c) => !c.library))
    for (const n of c.components)
      if (n.definitionId === id) {
        n.definitionId = fresh;
        for (const net of c.nets)
          for (const e of net.ports)
            if (e.component === n.id) e.port = mapping[e.port] ?? e.port;
        for (const route of c.wires)
          for (const e of [route.from, route.to])
            if (e.component === n.id) e.port = mapping[e.port] ?? e.port;
        if (
          canonical(old.appearance ?? {}) !==
            canonical(next.appearance ?? {}) ||
          canonical(old.ports) !== canonical(next.ports)
        )
          moveComponents(c, p, [n.id], { x: 0, y: 0 });
      }
  return fresh;
}
