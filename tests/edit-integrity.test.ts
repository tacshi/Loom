import { it, expect } from "vitest";
import { createComponent, emptyProject, type Project } from "../src/model/types";
import { connect, endpointKey, removeRouteConnection } from "../src/model/nets";
import { extract, removeSelection } from "../src/model/hierarchy";
import {
  addConnection,
  copySelection,
  editProject,
  pasteSelection,
} from "../src/editor/session";
import { validateProject } from "../src/persistence/validation";
import { assemble } from "../src/cpu/assembler";
import {
  acceptCheck,
  activateExercise,
  newCourse,
} from "../src/course/session";
import { checkCourse } from "../src/course/check";
import { exercise } from "../src/course/registry";

const out = (component: string) => ({ component, port: "out" });
const into = (component: string, port = "in") => ({ component, port });
function wire(id: string, from: string, to: string, port = "in") {
  return { id, from: out(from), to: into(to, port), points: [] };
}
function circuit(...kinds: [id: string, kind: "input" | "probe" | "not"][]) {
  const p = emptyProject(),
    c = p.circuits[p.root];
  c.components = kinds.map(([id, kind], i) => {
    const n = createComponent(kind, 100 + i * 200, 100);
    n.id = id;
    return n;
  });
  return { p, c };
}
function parameterized() {
  const p = emptyProject(),
    root = p.circuits[p.root],
    child = {
      ...structuredClone(root),
      id: "child",
      name: "Child",
      parameters: [{ name: "W", min: 1, max: 8, default: 4 }],
    };
  const gate = createComponent("not", 100, 100);
  gate.id = "gate";
  gate.width = 4;
  gate.widthParameter = "W";
  child.components = [gate];
  p.circuits.child = child;
  return p;
}

it("rewiring a removed driver does not rejoin the net that kept its old id", () => {
  const { p, c } = circuit(
    ["d1", "input"],
    ["d2", "input"],
    ["s", "probe"],
    ["t", "probe"],
  );
  connect(c, p, wire("first", "d1", "s"));
  connect(c, p, wire("second", "d2", "s"));
  removeRouteConnection(c, "first");
  connect(c, p, wire("third", "d1", "t"));

  expect(new Set(c.nets.map((n) => n.id)).size).toBe(c.nets.length);
  const net = (component: string) =>
    c.nets.find((n) =>
      n.ports.some((e) => e.component === component),
    )!;
  expect(net("d1").ports.map(endpointKey)).toEqual(
    [out("d1"), into("t")].map(endpointKey),
  );
  expect(net("d2").id).not.toBe(net("d1").id);
  expect(() => validateProject(p)).not.toThrow();
});

it("packaging drops a marker whose net moved into the new definition", () => {
  const { p, c } = circuit(
    ["i", "input"],
    ["n1", "not"],
    ["n2", "not"],
    ["o", "probe"],
  );
  connect(c, p, wire("a", "i", "n1", "a"));
  connect(c, p, wire("b", "n1", "n2", "a"));
  connect(c, p, wire("d", "n2", "o"));
  const inner = c.nets.find((n) =>
    n.ports.some((e) => e.component === "n2" && e.port === "a"),
  )!;
  c.markers.push({
    id: "m",
    netId: inner.id,
    endpoint: into("n2", "a"),
    x: 0,
    y: 0,
    rotation: 0,
  });

  extract(p, p.root, ["n1", "n2"], "Pair", false);

  expect(c.markers).toEqual([]);
  expect(() => validateProject(p)).not.toThrow();
});

it("packaging keeps a marker on a surviving net by moving it to the new pin", () => {
  const { p, c } = circuit(["i", "input"], ["n", "not"], ["o", "probe"]);
  connect(c, p, wire("a", "i", "n", "a"));
  connect(c, p, wire("b", "n", "o"));
  const net = c.nets.find((n) => n.ports.some((e) => e.component === "i"))!;
  c.markers.push({
    id: "m",
    netId: net.id,
    endpoint: into("n", "a"),
    x: 0,
    y: 0,
    rotation: 0,
  });

  const instance = extract(p, p.root, ["n"], "Inverter", false);

  expect(c.markers).toHaveLength(1);
  expect(c.markers[0].netId).toBe(net.id);
  expect(c.markers[0].endpoint?.component).toBe(instance);
  expect(() => validateProject(p)).not.toThrow();
});

it("removing the last route of a net removes markers that depended on it", () => {
  const { p, c } = circuit(["i", "input"], ["o", "probe"]);
  connect(c, p, wire("a", "i", "o"));
  c.markers.push({ id: "m", netId: c.nets[0].id, x: 0, y: 0, rotation: 0 });

  removeRouteConnection(c, "a");

  expect(c.markers).toEqual([]);
  expect(() => validateProject(p)).not.toThrow();
});

it("deleting a marked component leaves no marker on the empty net", () => {
  const { p, c } = circuit(["i", "input"], ["o", "probe"]);
  connect(c, p, wire("a", "i", "o"));
  c.markers.push({
    id: "m",
    netId: c.nets[0].id,
    endpoint: into("o"),
    x: 0,
    y: 0,
    rotation: 0,
  });

  removeSelection(p, p.root, ["i", "o"]);

  expect(c.markers).toEqual([]);
  expect(c.nets).toEqual([]);
  expect(() => validateProject(p)).not.toThrow();
});

it("packaging a parameter-bound component is refused and changes nothing", () => {
  const p = parameterized();

  expect(() =>
    editProject(p, (draft) => extract(draft, "child", ["gate"], "Bound", false)),
  ).toThrow("parameterBoundSelection");
  expect(Object.keys(p.circuits)).toEqual([p.root, "child"]);
  expect(() => validateProject(p)).not.toThrow();
});

it("pasting a parameter-bound component needs that parameter in the target", () => {
  const p = parameterized(),
    copied = copySelection(p, "child", ["gate"]);

  expect(() =>
    editProject(p, (draft) => pasteSelection(draft, p.root, copied)),
  ).toThrow("parameterBoundSelection");

  const same = editProject(p, (draft) =>
    pasteSelection(draft, "child", copied),
  );
  expect(same.circuits.child.components).toHaveLength(2);
  expect(() => validateProject(same)).not.toThrow();
});

it("a program may map to any line that fits the source length limit", () => {
  const p = emptyProject();
  p.source = "\n".repeat(10001) + "HLT";
  const assembled = assemble(p.source);
  expect(assembled.errors).toEqual([]);
  p.sourceMap = assembled.sourceMap;

  expect(() => validateProject(p)).not.toThrow();
  p.sourceMap = { 0: 100002 };
  expect(() => validateProject(p)).toThrow("invalidProject");
});

it("an edit that would not save is rejected before it reaches the document", () => {
  const { p, c } = circuit(["i", "input"], ["o", "probe"]);
  addConnection(p, p.root, wire("a", "i", "o"));
  const before = JSON.stringify(p);
  const edits: ((draft: Project) => void)[] = [
    (draft) => {
      draft.circuits[c.id].markers.push({
        id: "m",
        netId: "missing",
        x: 0,
        y: 0,
        rotation: 0,
      });
    },
    (draft) => {
      draft.source = "x".repeat(100001);
    },
    (draft) => {
      draft.name = "x".repeat(201);
    },
  ];

  for (const action of edits)
    expect(() => editProject(p, action)).toThrow("editInvalid");
  expect(JSON.stringify(p)).toBe(before);
});

it("an accepted edit still validates and keeps the document separate", () => {
  const { p } = circuit(["i", "input"], ["o", "probe"]);
  const next = editProject(p, (draft) => {
    draft.name = "Renamed";
  });
  expect(next.name).toBe("Renamed");
  expect(p.name).not.toBe("Renamed");
  expect(() => validateProject(next)).not.toThrow();
});

it("re-accepting a mission does not keep the replaced snapshot", async () => {
  const p = newCourse();
  for (const id of ["core-01", "core-02", "core-03", "core-04"] as const) {
    if (id !== "core-01") activateExercise(p, id);
    const r = exercise(id).reference();
    p.circuits = { ...p.circuits, ...r.circuits };
    p.root = r.root;
    p.course!.drafts[id] = r.root;
    p.course!.active = id;
    await acceptCheck(p, await checkCourse(p, id));
  }
  const replaced = p.course!.accepted["core-04"]!.acceptedRoot;
  const before = Object.keys(p.circuits).length;

  const draft = p.circuits[p.course!.drafts["core-04"]!];
  const extra = createComponent("probe", 900, 900);
  draft.components.push(extra);
  const moved = draft.components.find((n) => n.kind === "portOut")!;
  moved.x += 20;
  draft.name += " revised";
  const net = draft.nets.find((n) =>
    n.ports.some((e) => e.component === moved.id),
  )!;
  net.ports.push({ component: extra.id, port: "in" });
  await acceptCheck(p, await checkCourse(p, "core-04"));

  expect(p.course!.accepted["core-04"]!.acceptedRoot).not.toBe(replaced);
  expect(p.circuits[replaced]).toBeUndefined();
  expect(Object.keys(p.circuits).length).toBe(before);
  expect(() => validateProject(p)).not.toThrow();
});

it("re-accepting keeps a replaced snapshot that a draft still uses", async () => {
  const p = newCourse();
  for (const id of ["core-01", "core-02", "core-03", "core-04"] as const) {
    if (id !== "core-01") activateExercise(p, id);
    const r = exercise(id).reference();
    p.circuits = { ...p.circuits, ...r.circuits };
    p.root = r.root;
    p.course!.drafts[id] = r.root;
    p.course!.active = id;
    await acceptCheck(p, await checkCourse(p, id));
  }
  const replaced = p.course!.accepted["core-04"]!.acceptedRoot;
  const user = createComponent("instance", 0, 0);
  user.definitionId = replaced;
  p.circuits[p.course!.drafts["core-03"]!].components.push(user);

  const draft = p.circuits[p.course!.drafts["core-04"]!];
  const extra = createComponent("probe", 900, 900);
  draft.components.push(extra);
  const moved = draft.components.find((n) => n.kind === "portOut")!;
  const net = draft.nets.find((n) =>
    n.ports.some((e) => e.component === moved.id),
  )!;
  net.ports.push({ component: extra.id, port: "in" });
  await acceptCheck(p, await checkCourse(p, "core-04"));

  expect(p.circuits[replaced]).toBeDefined();
  expect(() => validateProject(p)).not.toThrow();
});
