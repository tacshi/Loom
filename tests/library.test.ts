import { it, expect } from "vitest";
import { cpuProject } from "../src/cpu/referenceCircuit";
import { emptyProject } from "../src/model/types";
import {
  createPackage,
  parsePackage,
  embedPackage,
  forkDefinition,
  applyUpdate,
} from "../src/library/package";
import { Engine } from "../src/simulator/engine";
it("verifies a self-contained dependency closure and detects tampering", async () => {
  const p = cpuProject(),
    pkg = await createPackage(p, p.root);
  expect(await parsePackage(JSON.stringify(pkg))).toEqual(pkg);
  const copy = structuredClone(pkg);
  copy.circuits[copy.root].name = "altered";
  await expect(parsePackage(JSON.stringify(copy))).rejects.toThrow(
    "libraryHashMismatch",
  );
  const q = emptyProject();
  q.root = embedPackage(q, pkg);
  expect(new Engine(q).valid).toBe(true);
});
it("installed copies and editable forks are independent", async () => {
  const p = cpuProject(),
    pkg = await createPackage(p, p.root),
    a = emptyProject(),
    b = emptyProject(),
    id = embedPackage(a, pkg);
  embedPackage(b, pkg);
  const fork = forkDefinition(a, id);
  a.circuits[fork].name = "local edit";
  expect(a.circuits[id].name).toBe(pkg.circuits[pkg.root].name);
  expect(b.circuits[id].name).toBe(pkg.circuits[pkg.root].name);
});
it("rejects incompatible updates before changing instances", async () => {
  const p = cpuProject(),
    id = Object.values(p.circuits).find((c) => c.ports.length > 0)!.id,
    pkg = await createPackage(p, id, "test", 1),
    q = emptyProject(),
    embedded = embedPackage(q, pkg);
  const nextProject = structuredClone(p);
  nextProject.circuits[id].ports[0].width = 32;
  const next = await createPackage(nextProject, id, "test", 2),
    before = JSON.stringify(q);
  expect(() => applyUpdate(q, embedded, next, {})).toThrow(
    "libraryInterfaceMismatch",
  );
  expect(JSON.stringify(q)).toBe(before);
});
it("keeps package identity stable for repeated exports and local forks", async () => {
  const p = cpuProject(),
    first = await createPackage(p, p.root),
    second = await createPackage(p, p.root, undefined, 2);
  expect(second.id).toBe(first.id);
  const q = emptyProject(),
    pinned = embedPackage(q, first),
    local = forkDefinition(q, pinned);
  const fork = await createPackage(q, local, undefined, 2);
  expect(fork.id).toBe(first.id);
});
