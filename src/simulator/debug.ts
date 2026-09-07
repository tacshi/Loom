import type { Project, SignalRef } from "../model/types";
import { signalLabel, ref } from "../model/nets";
import type { Engine } from "./engine";
import { defined, format } from "./signal";
export function debugProfile(p: Project) {
  if (p.debugProfile) return p.debugProfile;
  const c = p.cpu;
  if (!c) return undefined;
  const r = (id: string, port = "q") => {
    const parts = id.split("/");
    return ref(parts.pop()!, port, parts);
  };
  return {
    pc: r(c.pc),
    instructionBoundary: { ref: r(c.phase), value: 0 },
    halt: r(c.halt),
    invalid: r(c.invalid, "out"),
    program: r(c.rom, "out"),
    registers: [{ label: "Accumulator", ref: r(c.accumulator) }],
  };
}
export function readRef(e: Engine, r: SignalRef) {
  const k = signalLabel(r),
    i = k.lastIndexOf(":");
  return e.get(k.slice(0, i), k.slice(i + 1));
}
export function atBoundary(e: Engine) {
  const b = debugProfile(e.project)?.instructionBoundary;
  if (!b) return true;
  const s = readRef(e, b.ref);
  return defined(s) && s.value === b.value;
}
export function sourceChain(e: Engine, id: string, port: string) {
  const result: {
      id: string;
      port: string;
      unknown: boolean;
      value: string;
      drivers: string[];
    }[] = [],
    visited = new Set<string>();
  function visit(id: string, port: string) {
    const k = id + ":" + port;
    if (visited.has(k) || result.length >= 128) return;
    visited.add(k);
    const v = e.get(id, port),
      source = e.compiled.sources.get(k),
      alias = e.compiled.aliases.get(k);
    result.push({
      id,
      port,
      unknown: !defined(v),
      value: format(v, 2),
      drivers:
        source?.map((s) => s.component + ":" + s.port) ??
        (alias ? [alias] : []),
    });
    if (source?.length)
      for (const driver of source) visit(driver.component, driver.port);
    else if (alias) {
      const i = alias.lastIndexOf(":");
      visit(alias.slice(0, i), alias.slice(i + 1));
    } else if (
      !(["register", "counter", "dff", "ram", "rom"] as string[]).includes(
        e.byId.get(id)?.kind ?? "",
      )
    ) {
      for (const p of e.pinMap.get(id) ?? [])
        if (p.direction === "in") visit(id, p.id);
    }
  }
  visit(id, port);
  return result;
}
