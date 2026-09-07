import { it, expect } from "vitest";
import { ioProject, pixelSource } from "../src/cpu/ioCircuit";
import { Engine } from "../src/simulator/engine";
import { Timeline } from "../src/simulator/timeline";
import { stateHash } from "../src/simulator/state";
it("echoes bytes only on qualified edges and rewinds consumption exactly", () => {
  const e = new Engine(ioProject()),
    t = new Timeline(e);
  expect(e.compiled.diagnostics.filter((d) => d.severity === "error")).toEqual(
    [],
  );
  t.input({ kind: "keyboard", id: "RAM/Keyboard", text: "你好!" });
  const before = e.capture();
  for (let i = 0; i < 20; i++) e.settle();
  expect(e.capture()).toEqual(before);
  for (let i = 0; i < 100; i++) t.step();
  const terminal = e.devices.get("RAM/Terminal");
  expect(
    terminal?.kind === "terminal" &&
      new TextDecoder().decode(new Uint8Array(terminal.bytes)),
  ).toBe("你好!");
  const final = stateHash(e.capture()),
    run = t.info().selected;
  t.seek(run, { cycle: 0, eventOrder: 1 });
  for (let i = 0; i < 100; i++) t.step();
  expect(stateHash(e.capture())).toBe(final);
});
it("draws a pixel through ordinary address decoding gates", () => {
  const e = new Engine(ioProject(pixelSource));
  for (let i = 0; i < 14; i++) e.step();
  const d = e.devices.get("RAM/Display");
  expect(d?.kind === "display" && d.pixels[9 * 64 + 12].value).toBe(1);
});
it("rejects FIFO overflow atomically and restores partially known RAM", () => {
  const e = new Engine(ioProject());
  e.enqueue("RAM/Keyboard", "x".repeat(256));
  expect(() => e.enqueue("RAM/Keyboard", "a")).toThrow("keyboardOverflow");
  e.editMemory("RAM/Data RAM", 3, 7, 3);
  const s = e.capture();
  e.reset();
  e.restore(s);
  expect(e.memory.get("RAM/Data RAM")![3]).toEqual({
    value: 7,
    known: 3,
    highZ: 0,
    width: 8,
  });
  expect(e.devices.get("RAM/Keyboard")).toMatchObject({
    queue: Array(256).fill(120),
  });
});
it("masks pixel coordinates and ignores reserved writes", () => {
  const e = new Engine(
    ioProject("LDI 255\nSTA 0xF4\nSTA 0xF5\nSTA 0xF8\nLDA 0xF8\nHLT"),
  );
  for (let i = 0; i < 12; i++) e.step();
  expect(e.get("RAM/X", "q").value).toBe(63);
  expect(e.get("RAM/Y", "q").value).toBe(31);
  expect(e.get("ACC", "q").value).toBe(0);
  expect(e.memory.get("RAM/Data RAM")![248].value).toBe(0);
});

it("retains exact device history across sustained input batches and retention eviction", () => {
  const e = new Engine(ioProject()),
    t = new Timeline(e, 2048, 8 * 1024 * 1024, 64);
  let expected = "";
  for (let batch = 0; batch < 12; batch++) {
    const text = String.fromCharCode(65 + batch).repeat(64);
    expected += text;
    t.input({ kind: "keyboard", id: "RAM/Keyboard", text });
    for (let i = 0; i < 700; i++) t.step();
    expect(e.devices.get("RAM/Keyboard")).toMatchObject({ queue: [] });
  }
  const terminal = e.devices.get("RAM/Terminal");
  expect(
    terminal?.kind === "terminal" &&
      new TextDecoder().decode(new Uint8Array(terminal.bytes)),
  ).toBe(expected);
  const hash = stateHash(e.capture()),
    info = t.info(),
    run = info.runs.find((r) => r.id === info.selected)!;
  expect(run.oldest.cycle).toBeGreaterThan(0);
  expect(info.bytes).toBeLessThanOrEqual(info.limit);
  t.seek(info.selected, run.oldest);
  t.seek(info.selected, run.head);
  expect(stateHash(e.capture())).toBe(hash);
}, 15000);
