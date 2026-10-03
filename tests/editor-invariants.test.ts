import { expect, it } from "vitest";
import { emptyProject, createComponent } from "../src/model/types";
import { setComponentWidth, writeRomWord } from "../src/model/editing";
import { suffixedName } from "../src/model/names";
import { editProject, remapComponent } from "../src/editor/session";
import { parseProject } from "../src/persistence/validation";
import { exportProject } from "../src/persistence/serialization";
import { editSnapshot, restoreSnapshot } from "../src/editor/snapshot";
import { newCourse } from "../src/course/session";

it("ROM writes beyond the initial image round trip with zero-filled gaps", () => {
  const p = emptyProject();
  const rom = createComponent("rom", 0, 0, 8);
  p.circuits[p.root].components.push(rom);
  writeRomWord(p, p.root, rom.id, 10, 42);
  const copy = parseProject(exportProject(p));
  expect(copy.circuits[copy.root].components[0].image).toEqual([
    ...Array(10).fill(0),
    42,
  ]);
  const before = exportProject(p);
  expect(() => setComponentWidth(p, p.root, rom.id, 1)).toThrow(
    "memoryWidthRange",
  );
  expect(exportProject(p)).toBe(before);
});

it("width edits retain decoder bounds and synchronize interface declarations", () => {
  const p = emptyProject();
  const input = createComponent("portIn", 0, 0);
  const decoder = createComponent("decoder", 200, 0);
  p.circuits[p.root].components.push(input, decoder);
  p.circuits[p.root].ports.push({
    id: "in",
    name: "in",
    width: 1,
    componentId: input.id,
    direction: "in",
  });
  setComponentWidth(p, p.root, input.id, 8);
  expect(p.circuits[p.root].ports[0].width).toBe(8);
  expect(() => setComponentWidth(p, p.root, decoder.id, 6)).toThrow(
    "widthMismatch",
  );
  expect(decoder.width).toBe(1);
});

it("scoped edits preserve unrelated course definitions and remain atomic", () => {
  const p = emptyProject();
  const other = emptyProject();
  Object.assign(p.circuits, other.circuits);
  const next = editProject(
    p,
    (draft) => {
      draft.circuits[draft.root].name = "Edited";
    },
    p.root,
  );
  expect(p.circuits[p.root].name).toBe("Main");
  expect(next.circuits[other.root]).toBe(p.circuits[other.root]);
  expect(() =>
    editProject(
      p,
      (draft) => {
        const instance = createComponent("instance", 0, 0);
        instance.definitionId = draft.root;
        draft.circuits[draft.root].components.push(instance);
      },
      p.root,
    ),
  ).toThrow("recursive");
  expect(p.circuits[p.root].components).toEqual([]);
});

it("port mappings update named marker endpoints", () => {
  const p = emptyProject();
  const c = p.circuits[p.root];
  c.markers.push({
    id: "m",
    netId: "n",
    x: 0,
    y: 0,
    rotation: 0,
    endpoint: { component: "part", port: "old" },
  });
  remapComponent(c, "part", { old: "new" });
  expect(c.markers[0].endpoint).toEqual({ component: "part", port: "new" });
});

it("project-level ROM edits copy sibling definitions before mutation", () => {
  const p = emptyProject();
  const a = emptyProject(), b = emptyProject();
  const rom = createComponent("rom", 0, 0, 8);
  b.circuits[b.root].components.push(rom);
  Object.assign(p.circuits, a.circuits, b.circuits);
  for (const definitionId of [a.root, b.root]) {
    const instance = createComponent("instance", 0, 0); instance.definitionId = definitionId;
    p.circuits[p.root].components.push(instance);
  }
  const edited = editProject(p, draft => writeRomWord(draft, b.root, rom.id, 0, 42), p.root);
  expect(p.circuits[b.root].components[0].image).toBeUndefined();
  expect(edited.circuits[b.root].components[0].image).toEqual([42]);
});

it("copy and recovery suffixes keep project names within the current format", () => {
  const p = emptyProject(suffixedName("a".repeat(200), " — copy"));
  expect(p.name).toHaveLength(200);
  expect(p.name.endsWith(" — copy")).toBe(true);
  expect(parseProject(exportProject(p)).name).toBe(p.name);
});

it("mission undo stores only its graph and preserves other drafts and completion records", () => {
  const p = newCourse();
  const unrelated = emptyProject();
  Object.assign(p.circuits, unrelated.circuits);
  const snapshot = editSnapshot(p);
  expect(
    "mission" in snapshot && Object.keys(snapshot.mission.circuits),
  ).toEqual([p.root]);
  p.circuits[unrelated.root].name = "Other mission change";
  const record = p.course;
  const restored = restoreSnapshot(p, snapshot);
  expect(restored.course).toBe(record);
  expect(restored.circuits[unrelated.root].name).toBe("Other mission change");
});
