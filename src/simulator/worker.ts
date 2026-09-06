import { captureRun } from "../verification/capture";
import { runCase, componentKey } from "../verification/runner";
/// <reference lib="webworker" />
import { Engine, runVectors, type Snapshot } from "./engine";
import { Timeline } from "./timeline";
import { debugProfile, readRef, atBoundary, sourceChain } from "./debug";
import type { Command, Response, Breakpoint } from "./protocol";
import { defined, same } from "./signal";
let engine: Engine,
  timeline: Timeline,
  session = "",
  revision = 0,
  requestId = 0,
  running = false,
  hz = 10,
  last = 0,
  credit = 0;
let live: { engine: Engine; timeline: Timeline } | undefined;
let memoryIds: string[] = [],
  probes: string[] = [],
  breakpoints: Breakpoint[] = [],
  sourceBreakpoints: number[] = [],
  trace: Snapshot[] = [];
let timer: ReturnType<typeof setTimeout> | undefined,
  stoppedAtSource: number | undefined;
const send = (r: Omit<Response, "session" | "revision" | "requestId">) =>
  postMessage({ ...r, session, revision, requestId });
const stop = () => {
  running = false;
  clearTimeout(timer);
};
function report(reason?: string) {
  if (!engine) return;
  send({
    type: "state",
    snapshot: engine.snapshot(memoryIds),
    diagnostics: engine.compiled.diagnostics,
    running,
    trace,
    history: timeline.info(),
    reason,
  } as Response);
  trace = [];
}
function pc() {
  const p = debugProfile(engine.project);
  return p ? readRef(engine, p.pc).value : undefined;
}
function hitSource() {
  const p = debugProfile(engine.project);
  return (
    p &&
    atBoundary(engine) &&
    defined(readRef(engine, p.pc)) &&
    sourceBreakpoints.includes(pc()!)
  );
}
function tick() {
  const previous = breakpoints.map((b) => engine.get(b.id, b.port));
  const accesses = breakpoints.map((b) => {
    if (!b.mode?.startsWith("memory")) return false;
    const c = engine.byId.get(b.id);
    if (!c) return false;
    const addr = engine.get(b.id, "addr");
    if (!defined(addr) || (b.address !== undefined && addr.value !== b.address))
      return false;
    const we = engine.get(b.id, "we");
    return b.mode === "memoryWrite"
      ? c.kind === "ram" && defined(we) && we.value === 1
      : c.kind === "ram" || c.kind === "rom";
  });
  timeline.step();
  if (probes.length) {
    const values: Snapshot["values"] = {};
    for (const k of probes) {
      const i = k.lastIndexOf(":");
      values[k] = engine.get(k.slice(0, i), k.slice(i + 1));
    }
    trace.push({ cycle: engine.cycle, values, memory: {} });
    if (trace.length > 256) trace.shift();
  }
  const profile = debugProfile(engine.project);
  if (profile) {
    const h = readRef(engine, profile.halt);
    if (defined(h) && h.value) {
      stop();
      return profile.invalid && readRef(engine, profile.invalid).value
        ? "invalidOpcode"
        : "halted";
    }
  }
  if (
    breakpoints.some((b, i) => {
      const v = engine.get(b.id, b.port),
        old = previous[i];
      switch (b.mode) {
        case "change":
          return !same(v, old);
        case "rising":
          return defined(old) && defined(v) && old.value === 0 && v.value === 1;
        case "falling":
          return defined(old) && defined(v) && old.value === 1 && v.value === 0;
        case "memoryRead":
        case "memoryWrite":
          return accesses[i];
        default:
          return defined(v) && v.value === b.value;
      }
    })
  ) {
    stop();
    return "breakpoint";
  }
  if (hitSource()) {
    stop();
    stoppedAtSource = pc();
    return "breakpoint";
  }
}
function loop() {
  if (!running) return;
  const now = performance.now();
  credit += (Math.max(0, now - last) * hz) / 1000;
  last = now;
  let count = 0,
    reason: string | undefined;
  while (
    credit >= 1 &&
    running &&
    count++ < 2048 &&
    performance.now() - now < 8
  ) {
    reason = tick();
    credit--;
  }
  report(reason);
  if (running) timer = setTimeout(loop, 16);
}
onmessage = ({ data: c }: MessageEvent<Command>) => {
  try {
    if (c.type === "compile") {
      stop();
      session = c.session;
      revision = c.revision;
      requestId = c.requestId;
      live = undefined;
      engine = new Engine(c.project);
      timeline = new Timeline(engine);
      trace = [];
      stoppedAtSource = undefined;
      report();
      return;
    }
    if (c.session !== session || c.revision !== revision) return;
    requestId = c.requestId;
    switch (c.type) {
      case "capture":
        send({
          type: "captured",
          test: captureRun(engine, timeline, c.assertions),
        } as Response);
        break;
      case "openTest": {
        stop();
        const result = runCase(engine.project, c.root, c.test);
        if (result.status === "invalid" || result.status === "limit")
          throw new Error(result.error);
        live ??= { engine, timeline };
        engine = new Engine(live.engine.project, c.root);
        timeline = new Timeline(engine);
        for (let i = 0; i < c.test.steps.length; i++) {
          const s = c.test.steps[i];
          for (const input of s.inputs ?? [])
            timeline.input({
              kind: "input",
              id: componentKey(input.ref),
              value: input.value,
            });
          for (const input of s.keyboard ?? [])
            timeline.input({
              kind: "keyboard",
              id: componentKey(input.component),
              text: input.text,
            });
          for (const m of s.memory ?? [])
            timeline.input({
              kind: "memory",
              id: componentKey(m.ref),
              address: m.address,
              value: m.value,
              known: m.known,
            });
          for (let n = 0; n < s.cycles; n++) timeline.step();
          if (result.failure?.step === i) break;
        }
        trace = [];
        report("isolatedTest");
        break;
      }
      case "exitTest":
        stop();
        if (live) {
          engine = live.engine;
          timeline = live.timeline;
          live = undefined;
          trace = [];
        }
        report();
        break;
      case "ping":
        send({ type: "pong" });
        break;
      case "pause":
        stop();
        report();
        break;
      case "reset":
        stop();
        engine.reset();
        timeline.reset();
        trace = [];
        stoppedAtSource = undefined;
        report();
        break;
      case "step":
        stop();
        report(tick());
        break;
      case "instruction": {
        stop();
        let reason: string | undefined,
          n = 0;
        do {
          reason = tick();
        } while (!reason && !atBoundary(engine) && ++n < 10000);
        report(n >= 10000 ? "instructionTimeout" : reason);
        break;
      }
      case "back":
      case "backInstruction":
        stop();
        timeline.back(
          c.type === "backInstruction" ? () => atBoundary(engine) : undefined,
        );
        trace = [];
        report();
        break;
      case "seek":
        stop();
        timeline.seek(c.run, c.position);
        trace = [];
        report();
        break;
      case "range":
        send({
          type: "range",
          trace: timeline.range(c.run, c.start, c.end, c.probes),
        } as Response);
        break;
      case "source":
        send({
          type: "source",
          chain: sourceChain(engine, c.id, c.port),
        } as Response);
        break;
      case "run":
        if (!engine.valid) return;
        if (hitSource() && stoppedAtSource !== pc()) {
          stoppedAtSource = pc();
          report("breakpoint");
          break;
        }
        stoppedAtSource = undefined;
        timeline.resume();
        clearTimeout(timer);
        hz = Math.max(1, Math.min(c.hz, 100000));
        running = true;
        last = performance.now();
        credit = 0;
        loop();
        break;
      case "input":
        if (engine.inputs.get(c.id) !== c.value) {
          timeline.input({ kind: "input", id: c.id, value: c.value });
        }
        report();
        break;
      case "memoryEdit":
        if (running) throw new Error("pauseBeforeEdit");
        timeline.input({
          kind: "memory",
          id: c.id,
          address: c.address,
          value: c.value,
          known: c.known,
        });
        report();
        break;
      case "keyboard":
        timeline.input({ kind: "keyboard", id: c.id, text: c.text });
        report();
        break;
      case "subscribe":
        memoryIds = c.memoryIds;
        probes = c.probes;
        breakpoints = c.breakpoints;
        sourceBreakpoints = c.sourceBreakpoints;
        report();
        break;
      case "vectors":
        send({
          type: "vectors",
          results: runVectors(c.project, c.root, c.vectors),
        } as Response);
        break;
    }
  } catch (error) {
    stop();
    send({
      type: "failure",
      reason: error instanceof Error ? error.message : "workerFailure",
    } as Response);
  }
};
