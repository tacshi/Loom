// Shape and resource limits only. Electrical faults remain compiler diagnostics.
import type {
  Project,
  SignalRef,
  ComponentAppearance,
  TestCase,
} from "../model/types";
const fail = () => {
  throw new Error("invalidProject");
};
const integer = (n: unknown, min: number, max: number) =>
  typeof n === "number" && Number.isInteger(n) && n >= min && n <= max;
const text = (s: unknown) =>
  typeof s === "string" && s.length > 0 && s.length <= 200;
function ref(r: SignalRef) {
  if (
    !r ||
    !Array.isArray(r.instancePath) ||
    r.instancePath.length > 16 ||
    !r.instancePath.every(text) ||
    !text(r.componentId) ||
    !text(r.portId)
  )
    fail();
}
function appearance(a: ComponentAppearance | undefined) {
  if (a === undefined) return;
  if (!a || ![0, 90, 180, 270].includes(a.rotation)) fail();
  for (const n of [a.width, a.height])
    if (n !== undefined && (!integer(n, 80, 4000) || n % 20 !== 0)) fail();
  if (a.pins) {
    if (typeof a.pins !== "object" || Object.keys(a.pins).length > 256) fail();
    for (const [k, p] of Object.entries(a.pins)) {
      if (
        !text(k) ||
        !p ||
        !["left", "right", "top", "bottom"].includes(p.side) ||
        !integer(p.slot, 1, 199)
      )
        fail();
    }
  }
}
export function validateTest(t: TestCase) {
  if (
    !t ||
    !text(t.id) ||
    !text(t.name) ||
    !integer(t.maxCycles, 0, 1000000) ||
    !integer(t.seed, 0, 0xffffffff) ||
    !Array.isArray(t.steps) ||
    t.steps.length > 10000
  )
    fail();
  for (const s of t.steps) {
    if (
      !s ||
      !integer(s.cycles, 0, 1000000) ||
      !Array.isArray(s.assertions) ||
      s.assertions.length > 10000
    )
      fail();
    for (const a of s.inputs ?? []) {
      ref(a.ref);
      if (!integer(a.value, 0, 0xffffffff)) fail();
    }
    for (const a of s.keyboard ?? []) {
      ref(a.component);
      if (
        typeof a.text !== "string" ||
        new TextEncoder().encode(a.text).length > 256
      )
        fail();
    }
    for (const a of s.memory ?? []) {
      ref(a.ref);
      if (
        !integer(a.address, 0, 65535) ||
        !integer(a.value, 0, 0xffffffff) ||
        (a.known !== undefined && !integer(a.known, 0, 0xffffffff))
      )
        fail();
    }
    for (const a of s.assertions) {
      ref(a.ref);
      if (a.type === "signal" || a.type === "memory") {
        if (
          !integer(a.value, 0, 0xffffffff) ||
          (a.known !== undefined && !integer(a.known, 0, 0xffffffff))
        )
          fail();
        if (a.type === "memory" && !integer(a.address, 0, 65535)) fail();
      } else if (a.type === "terminal") {
        if (typeof a.text !== "string" || a.text.length > 65536) fail();
      } else if (a.type === "pixel") {
        if (
          !integer(a.x, 0, 63) ||
          !integer(a.y, 0, 31) ||
          !integer(a.value, 0, 1)
        )
          fail();
      } else fail();
    }
  }
}
export function validateV2(p: Project) {
  let members = 0,
    steps = 0;
  for (const c of Object.values(p.circuits)) {
    appearance(c.appearance);
    if (
      c.nets.length > 50000 ||
      c.markers.length > 50000 ||
      c.tests.length > 4096
    )
      fail();
    const ids = new Set<string>();
    for (const t of c.tests) {
      validateTest(t);
      if (ids.has(t.id)) fail();
      ids.add(t.id);
      steps += t.steps.length;
      if (steps > 50000) fail();
    }
    for (const n of c.nets) {
      members += n.ports.length;
      if (members > 200000) fail();
    }
    for (const w of c.wires)
      if (w.netId !== undefined && !c.nets.some((n) => n.id === w.netId))
        fail();
    const names = new Set<string>();
    for (const param of c.parameters ?? []) {
      if (
        !text(param.name) ||
        names.has(param.name) ||
        !integer(param.min, 1, 32) ||
        !integer(param.max, param.min, 32) ||
        !integer(param.default, param.min, param.max)
      )
        fail();
      names.add(param.name);
    }
    if (
      c.library &&
      (!text(c.library.id) ||
        !integer(c.library.version, 1, 0x7fffffff) ||
        !/^[0-9a-f]{64}$/.test(c.library.hash))
    )
      fail();
    for (const n of c.components) {
      appearance(n.appearance);
      for (const name of [n.widthParameter, n.addressParameter])
        if (name !== undefined && !names.has(name)) fail();
      if (n.arguments) {
        if (
          typeof n.arguments !== "object" ||
          Object.keys(n.arguments).length > 32
        )
          fail();
        for (const [k, v] of Object.entries(n.arguments))
          if (!text(k) || !integer(v, 1, 32)) fail();
      }
    }
    for (const port of c.ports)
      if (port.widthParameter !== undefined && !names.has(port.widthParameter))
        fail();
  }
  if (p.debugProfile) {
    const d = p.debugProfile;
    ref(d.pc);
    ref(d.halt);
    ref(d.program);
    ref(d.instructionBoundary?.ref);
    if (!integer(d.instructionBoundary.value, 0, 0xffffffff)) fail();
    if (d.invalid) ref(d.invalid);
    if (!Array.isArray(d.registers) || d.registers.length > 128) fail();
    for (const r of d.registers) {
      if (!text(r.label)) fail();
      ref(r.ref);
    }
  }
}
