import { calculatorSource } from "../cpu/calculator";
import { echoSource, pixelSource, sevenSegmentSource } from "../cpu/ioCircuit";
import { useRef, useState } from "react";
import type { Project } from "../model/types";
import type { Snapshot } from "../simulator/engine";
import { assemble, programs, type AssemblyError } from "../cpu/assembler";
const programSources = {
  ...programs,
  calculator: calculatorSource,
  echo: echoSource,
  pixels: pixelSource,
  segments: sevenSegmentSource,
};
export default function Program({
  project,
  edit,
  snapshot,
  t,
  close,
  breakpoints,
  setBreakpoints,
  step,
  reset,
}: {
  project: Project;
  edit: (f: (p: Project) => void) => void;
  snapshot: Snapshot;
  t: (s: string) => string;
  close: () => void;
  breakpoints: number[];
  setBreakpoints: (v: number[]) => void;
  step: () => void;
  reset: () => void;
}) {
  const [errors, setErrors] = useState<AssemblyError[]>([]),
    [loaded, setLoaded] = useState(0);
  const editor = useRef<HTMLTextAreaElement>(null);
  const roms = Object.values(project.circuits).flatMap((c) =>
    c.components
      .filter((n) => n.kind === "rom")
      .map((n) => ({ circuit: c.id, id: n.id, name: c.name + " / " + n.name })),
  );
  const [target, setTarget] = useState(
    () => roms.find((r) => r.id === project.cpu?.rom)?.id ?? roms[0]?.id ?? "",
  );
  const cpu = project.cpu,
    pc = cpu ? (snapshot.values[cpu.pc + ":q"]?.value ?? 0) : 0,
    phase = cpu ? (snapshot.values[cpu.phase + ":q"]?.value ?? 0) : 0;
  const line = project.sourceMap?.[phase ? (pc + 255) % 256 : pc];
  function load() {
    const result = assemble(project.source);
    setErrors(result.errors);
    if (result.errors.length) return;
    const targetRom = roms.find((r) => r.id === target);
    if (!targetRom) {
      setErrors([{ line: 1, code: "selectRom", detail: "" }]);
      return;
    }
    edit((p) => {
      const rom = p.circuits[targetRom.circuit].components.find(
        (c) => c.id === target,
      )!;
      if (rom.width !== 16 || rom.params.addressBits !== 8) {
        setErrors([{ line: 1, code: "romFormat", detail: "" }]);
        return;
      }
      rom.image = result.image;
      p.sourceMap = result.sourceMap;
      p.assembledSource = p.source;
      setLoaded(result.image.length);
      reset();
    });
  }
  function reveal(n: number) {
    const text = project.source.split("\n");
    const start = text.slice(0, n - 1).join("\n").length + (n > 1 ? 1 : 0);
    editor.current?.focus();
    editor.current?.setSelectionRange(
      start,
      start + (text[n - 1]?.length ?? 0),
    );
  }
  return (
    <section className="program-panel">
      <div className="debugger-header">
        <strong>{t("program")}</strong>
        <select
          aria-label={t("exampleProgram")}
          value=""
          onChange={(e) => {
            if (e.target.value) {
              edit((p) => {
                p.source =
                  programSources[e.target.value as keyof typeof programSources];
              });
              setErrors([]);
            }
          }}
        >
          <option value="">{t("exampleProgram")}</option>
          {Object.keys(programSources).map((k) => (
            <option value={k} key={k}>
              {t("program_" + k)}
            </option>
          ))}
        </select>
        <select
          aria-label={t("targetRom")}
          value={target}
          onChange={(e) => setTarget(e.target.value)}
        >
          {roms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
        <button className="primary" onClick={load}>
          {t("assembleLoad")}
        </button>
        {cpu && <button onClick={step}>{t("stepInstruction")}</button>}
        <button onClick={close} aria-label={t("close")}>
          ×
        </button>
      </div>
      <div className="program-content">
        <div className="source-editor">
          <div className="line-numbers">
            {project.source.split("\n").map((_, i) => {
              const address = Object.entries(project.sourceMap ?? {}).find(
                ([, n]) => n === i + 1,
              )?.[0];
              return (
                <button
                  key={i}
                  disabled={
                    address === undefined ||
                    project.source !== project.assembledSource
                  }
                  className={
                    (line === i + 1 ? "current-line " : "") +
                    (address !== undefined &&
                    breakpoints.includes(Number(address))
                      ? "has-breakpoint"
                      : "")
                  }
                  aria-label={t("toggleBreakpoint") + " " + (i + 1)}
                  onClick={() => {
                    if (address !== undefined) {
                      const a = Number(address);
                      setBreakpoints(
                        breakpoints.includes(a)
                          ? breakpoints.filter((n) => n !== a)
                          : [...breakpoints, a],
                      );
                    }
                  }}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
          <textarea
            ref={editor}
            aria-label={t("assemblySource")}
            value={project.source}
            spellCheck={false}
            onChange={(e) => {
              edit((p) => {
                p.source = e.target.value;
              });
              setLoaded(0);
            }}
            onScroll={(e) => {
              const gutter = e.currentTarget.previousElementSibling;
              if (gutter) gutter.scrollTop = e.currentTarget.scrollTop;
            }}
          />
        </div>
        <div className="assembly-results">
          {errors.length ? (
            errors.map((error, i) => (
              <button
                className="danger"
                key={i}
                onClick={() => reveal(error.line)}
              >
                {t("line")} {error.line}: {t(error.code)} {error.detail}
              </button>
            ))
          ) : (
            <>
              <p>
                {project.source !== project.assembledSource
                  ? t("sourceChanged")
                  : t("programLoaded") + (loaded ? " · " + loaded : "")}
              </p>
              <p className="muted">{t("assemblyHint")}</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
