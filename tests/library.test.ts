import { it, expect } from "vitest";
import { cpuProject } from "../src/cpu/referenceCircuit";
import { emptyProject } from "../src/model/types";
import { Builder } from "../src/examples/adder";
import {
  createPackage,
  parsePackage,
  embedPackage,
  forkDefinition,
  applyUpdate,
  contentHash,
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

it("rejects import versions that cannot be embedded in the current project format", async () => {
  const p = emptyProject();
  const pkg = await createPackage(p, p.root);
  const {hash, ...body} = pkg;
  body.version = 0x80000000;
  await expect(parsePackage(JSON.stringify({...body, hash: await contentHash(body)}))).rejects.toThrow("invalidLibrary");
});

it("rejects colliding update mappings without changing connected instances", async () => {
  const def = new Builder("Pair");
  for (const id of ["left", "right"]) {
    def.add(id, "portIn", 0, id === "left" ? 0 : 120);
    def.c.ports.push({id, name: id, direction: "in", componentId: id, width: 1});
  }
  const first = await createPackage(def.p, def.c.id, "pair", 1);
  const parent = new Builder("Connected pair");
  const installed = embedPackage(parent.p, first);
  parent.add("part", "instance", 400, 0);
  parent.c.components[0].definitionId = installed;
  for (const id of ["left", "right"]) {
    parent.add(id, "input", 0, id === "left" ? 0 : 120);
    parent.connect(id, "out", "part", id);
  }
  const next = await createPackage(def.p, def.c.id, "pair", 2);
  const before = JSON.stringify(parent.p);
  expect(() => applyUpdate(parent.p, installed, next, {left: "left", right: "left"})).toThrow("libraryInterfaceMismatch");
  expect(JSON.stringify(parent.p)).toBe(before);
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
