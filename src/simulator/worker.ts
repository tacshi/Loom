/// <reference lib="webworker" />
import { Engine, runVectors, type Snapshot } from "./engine";
import type { Command, Response, Breakpoint } from "./protocol";
import { defined } from "./signal";
let engine: Engine | undefined,
  session = "",
  revision = 0,
  running = false,
  hz = 10,
  last = 0,
  credit = 0;
let memoryIds: string[] = [],
  probes: string[] = [],
  breakpoints: Breakpoint[] = [],
  sourceBreakpoints: number[] = [],
  trace: Snapshot[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
let stoppedAtSource: number | undefined;
const send = (r: Response) => postMessage(r);
const stop = () => {
  running = false;
  clearTimeout(timer);
};
function report(reason?: string) {
  if (!engine) return;
  send({
    type: "state",
    session,
    revision,
    snapshot: engine.snapshot(memoryIds),
    diagnostics: engine.compiled.diagnostics,
    running,
    trace,
    reason,
  });
  trace = [];
}
function hitSource() {
  const cpu = engine?.project.cpu;
  if (!cpu) return false;
  const phase = engine!.get(cpu.phase, "q"),
    pc = engine!.get(cpu.pc, "q");
  return (
    defined(phase) &&
    phase.value === 0 &&
    defined(pc) &&
    sourceBreakpoints.includes(pc.value)
  );
}
function tick() {
  engine!.step();
  if (probes.length) {
    const full = engine!.snapshot();
    trace.push({
      cycle: full.cycle,
      values: Object.fromEntries(
        probes.map((id) => [id, full.values[id]]).filter(([, v]) => v),
      ),
      memory: {},
    });
    if (trace.length > 256) trace.shift();
  }
  const cpu = engine!.project.cpu;
  if (cpu && engine!.get(cpu.halt, "q").value) {
    stop();
    return engine!.get(cpu.invalid, "out").value ? "invalidOpcode" : "halted";
  }
  if (
    breakpoints.some((b) => {
      const v = engine!.get(b.id, b.port);
      return defined(v) && v.value === b.value;
    })
  ) {
    stop();
    return "breakpoint";
  }
  if (hitSource()) {
    stop();
    stoppedAtSource = engine!.get(engine!.project.cpu!.pc, "q").value;
    return "breakpoint";
  }
  return undefined;
}
function loop() {
  if (!running || !engine) return;
  const now = performance.now();
  credit += (Math.max(0, now - last) * hz) / 1000;
  last = now;
  const started = now;
  let reason: string | undefined,
    count = 0;
  while (
    credit >= 1 &&
    running &&
    count++ < 2048 &&
    performance.now() - started < 8
  ) {
    reason = tick();
    credit--;
  }
  report(reason);
  if (running) timer = setTimeout(loop, 16);
}
onmessage = (event: MessageEvent<Command>) => {
  const c = event.data;
  try {
    if (c.type === "compile") {
      stop();
      session = c.session;
      revision = c.revision;
      engine = new Engine(c.project);
      stoppedAtSource = undefined;
      trace = [];
      report();
      return;
    }
    if (c.session !== session || c.revision !== revision) return;
    switch (c.type) {
      case "pause":
        stop();
        report();
        break;
      case "reset":
        stop();
        engine!.reset();
        stoppedAtSource = undefined;
        trace = [];
        report();
        break;
      case "step":
        stop();
        report(tick());
        break;
      case "instruction": {
        stop();
        let reason = tick();
        if (
          !reason &&
          engine?.project.cpu &&
          engine.get(engine.project.cpu.phase, "q").value === 1
        )
          reason = tick();
        report(reason);
        break;
      }
      case "run":
        if (!engine?.valid) return;
        if (hitSource()) {
          const pc = engine.get(engine.project.cpu!.pc, "q").value;
          if (stoppedAtSource !== pc) {
            stoppedAtSource = pc;
            report("breakpoint");
            return;
          }
        }
        stoppedAtSource = undefined;
        if (running) clearTimeout(timer);
        hz = Math.max(1, Math.min(c.hz, 100000));
        running = true;
        last = performance.now();
        credit = 0;
        loop();
        break;
      case "input":
        engine!.setInput(c.id, c.value);
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
          session,
          revision,
          requestId: c.requestId,
          results: runVectors(c.project, c.root, c.vectors),
        });
        break;
    }
  } catch (error) {
    stop();
    send({
      type: "failure",
      session,
      revision,
      reason: error instanceof Error ? error.message : "workerFailure",
    });
  }
};
