import { Engine, type Snapshot } from "./engine";
import type { ExecutionState } from "./state";
export type Position = { cycle: number; eventOrder: number };
export type InputEvent = Position &
  (
    | { kind: "input"; id: string; value: number }
    | {
        kind: "memory";
        id: string;
        address: number;
        value: number;
        known?: number;
      }
    | { kind: "keyboard"; id: string; text: string }
  );
type Segment = { state: ExecutionState; events: InputEvent[] };
type Run = { id: number; segments: Segment[]; head: Position };
export type TimelineInfo = {
  runs: { id: number; oldest: Position; head: Position }[];
  selected: number;
  position: Position;
  historical: boolean;
  bytes: number;
  limit: number;
};
const compare = (a: Position, b: Position) =>
  a.cycle - b.cycle || a.eventOrder - b.eventOrder;
export class Timeline {
  private runs: Run[] = [];
  private selected = 0;
  private next = 1;
  private bytes = 0;
  constructor(
    public engine: Engine,
    public maxCycles = 10000,
    public maxBytes = 64 * 1024 * 1024,
    private interval = 64,
  ) {
    this.reset();
  }
  reset() {
    this.runs = [
      {
        id: this.next++,
        segments: [{ state: this.engine.capture(), events: [] }],
        head: this.position(),
      },
    ];
    this.selected = this.runs[0].id;
    this.account();
  }
  position(): Position {
    return { cycle: this.engine.cycle, eventOrder: this.engine.eventOrder };
  }
  private current() {
    return this.runs.find((r) => r.id === this.selected)!;
  }
  info(): TimelineInfo {
    return {
      runs: this.runs.map((r) => ({
        id: r.id,
        oldest: {
          cycle: r.segments[0].state.cycle,
          eventOrder: r.segments[0].state.eventOrder,
        },
        head: r.head,
      })),
      selected: this.selected,
      position: this.position(),
      historical:
        compare(this.position(), this.current().head) !== 0 ||
        this.selected !== this.runs.at(-1)!.id,
      bytes: this.bytes,
      limit: this.maxBytes,
    };
  }
  resume() {
    if (this.info().historical) {
      const run = {
        id: this.next++,
        segments: [{ state: this.engine.capture(), events: [] }],
        head: this.position(),
      };
      this.runs.push(run);
      this.selected = run.id;
      while (this.runs.length > 4) this.runs.shift();
      this.trim();
    }
  }
  step() {
    this.resume();
    this.engine.step();
    this.engine.eventOrder = 0;
    const r = this.current();
    r.head = this.position();
    if (this.engine.cycle - r.segments.at(-1)!.state.cycle >= this.interval) {
      r.segments.push({
        state: this.engine.capture(r.segments.at(-1)!.state),
        events: [],
      });
      this.trim();
    } else if (r.head.cycle - r.segments[0].state.cycle > this.maxCycles)
      this.trim();
  }
  input(
    event:
      | Omit<Extract<InputEvent, { kind: "input" }>, "cycle" | "eventOrder">
      | Omit<Extract<InputEvent, { kind: "memory" }>, "cycle" | "eventOrder">
      | Omit<Extract<InputEvent, { kind: "keyboard" }>, "cycle" | "eventOrder">,
  ) {
    this.resume();
    this.apply({
      ...event,
      ...this.position(),
      eventOrder: this.engine.eventOrder + 1,
    });
    const e = { ...event, ...this.position() } as InputEvent;
    this.current().segments.at(-1)!.events.push(e);
    this.current().head = this.position();
    if (this.current().segments.at(-1)!.events.length >= 128)
      this.current().segments.push({
        state: this.engine.capture(this.current().segments.at(-1)!.state),
        events: [],
      });
    this.trim();
  }
  private apply(e: InputEvent) {
    if (e.kind === "input") this.engine.setInput(e.id, e.value);
    else if (e.kind === "memory")
      this.engine.editMemory(e.id, e.address, e.value, e.known);
    else this.engine.enqueue(e.id, e.text);
    this.engine.eventOrder = e.eventOrder;
  }
  seek(runId: number, position: Position) {
    const r = this.runs.find((r) => r.id === runId);
    if (
      !r ||
      compare(position, r.segments[0].state) < 0 ||
      compare(position, r.head) > 0
    )
      throw new Error("historyEvicted");
    const segment = [...r.segments]
      .reverse()
      .find((s) => compare(s.state, position) <= 0)!;
    if (
      position.eventOrder !== segment.state.eventOrder ||
      position.cycle !== segment.state.cycle
    ) {
      if (
        position.eventOrder !== 0 &&
        !segment.events.some((e) => compare(e, position) === 0)
      )
        throw new Error("historyPosition");
    }
    this.selected = runId;
    this.engine.restore(segment.state);
    const events = segment.events.filter((e) => compare(e, position) <= 0);
    let i = 0;
    while (compare(this.position(), position) < 0) {
      while (i < events.length && events[i].cycle === this.engine.cycle)
        this.apply(events[i++]);
      if (this.engine.cycle === position.cycle) break;
      this.engine.step();
      this.engine.eventOrder = 0;
    }
    if (compare(this.position(), position) !== 0)
      throw new Error("historyPosition");
  }
  back(instruction?: () => boolean, max = 10000) {
    const r = this.current(),
      oldest = r.segments[0].state.cycle;
    let cycle = this.engine.cycle;
    do {
      if (cycle <= oldest) return;
      this.seek(r.id, { cycle: --cycle, eventOrder: 0 });
    } while (instruction && !instruction() && --max > 0);
    if (!max) throw new Error("instructionTimeout");
  }
  range(run: number, start: number, end: number, probes: string[]): Snapshot[] {
    if (end - start > 1024 || end < start) throw new Error("traceRangeLimit");
    const saved = this.engine.capture(),
      selected = this.selected,
      result: Snapshot[] = [];
    try {
      const r = this.runs.find((r) => r.id === run);
      const anchor = r?.segments[0].state;
      this.seek(run, {
        cycle: start,
        eventOrder: anchor?.cycle === start ? anchor.eventOrder : 0,
      });
      const events = this.current()
        .segments.flatMap((s) => s.events)
        .filter((e) => compare(e, this.position()) > 0 && e.cycle < end);
      let at = 0;
      for (let cycle = start; cycle <= end; cycle++) {
        const values: Snapshot["values"] = {};
        for (const id of probes) {
          const i = id.lastIndexOf(":");
          values[id] = this.engine.get(id.slice(0, i), id.slice(i + 1));
        }
        result.push({ cycle, values, memory: {} });
        if (cycle < end) {
          while (at < events.length && events[at].cycle === cycle)
            this.apply(events[at++]);
          this.engine.step();
          this.engine.eventOrder = 0;
        }
      }
    } finally {
      this.engine.restore(saved);
      this.selected = selected;
    }
    return result;
  }

  events() {
    const r = this.current();
    return r.segments
      .flatMap((s) => s.events)
      .filter((e) => compare(e, this.position()) <= 0);
  }
  private account() {
    const pages = new Set<readonly unknown[]>();
    let bytes = 0;
    for (const r of this.runs)
      for (const s of r.segments) {
        bytes +=
          128 +
          Object.keys(s.state.registers).length * 72 +
          Object.keys(s.state.inputs).length * 48 +
          JSON.stringify(s.state.devices).length * 2 +
          JSON.stringify(s.state.transactions).length * 2 +
          s.events.reduce(
            (n, e) => n + 96 + ("text" in e ? e.text.length * 2 : 0),
            0,
          );
        for (const pp of Object.values(s.state.memory)) {
          bytes += pp.length * 8;
          for (const p of pp)
            if (!pages.has(p)) {
              pages.add(p);
              bytes += 32 + p.length * 40;
            }
        }
      }
    this.bytes = bytes;
  }
  private trim() {
    for (const r of this.runs)
      while (
        r.segments.length > 1 &&
        r.head.cycle - r.segments[0].state.cycle > this.maxCycles
      )
        r.segments.shift();
    this.account();
    const totalCycles = () =>
      this.runs.reduce(
        (n, r) => n + r.head.cycle - r.segments[0].state.cycle,
        0,
      );
    while (this.bytes > this.maxBytes || totalCycles() > this.maxCycles) {
      const older = this.runs.find((r) => r.id !== this.selected);
      if (older) {
        this.runs.splice(this.runs.indexOf(older), 1);
      } else if (this.current().segments.length > 1)
        this.current().segments.shift();
      else break;
      this.account();
    }
  }
}
