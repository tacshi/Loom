import { useEffect, useRef, useState, useMemo } from "react";
import type {
  Project,
  Circuit,
  TestCase,
  TestStep,
  TestAssertion,
} from "../model/types";
import type { TestResult } from "../verification/runner";
import type { useSimulation } from "../simulator/useSimulation";
import { resolveSignalRef, signalLabel } from "../model/nets";
import { vectorCases } from "../verification/vectors";
import { compile } from "../simulator/compiler";
import { ports } from "../model/components";
export default function SequentialTests({
  project,
  circuit,
  simulation,
  edit,
  close,
  debug,
  t,
}: {
  project: Project;
  circuit: Circuit;
  simulation: ReturnType<typeof useSimulation>;
  edit: (f: (p: Project) => void) => boolean;
  close: () => void;
  debug: (refs: string[]) => void;
  t: (s: string) => string;
}) {
  const [results, setResults] = useState<TestResult[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [name, setName] = useState(""),
    [steps, setSteps] = useState<TestStep[]>([]),
    [cycles, setCycles] = useState(1),
    [action, setAction] = useState("none"),
    [target, setTarget] = useState(""),
    [input, setInput] = useState("0"),
    [assertionType, setAssertionType] =
      useState<TestAssertion["type"]>("signal"),
    [signal, setSignal] = useState(""),
    [expected, setExpected] = useState("0"),
    [address, setAddress] = useState(0),
    [x, setX] = useState(0),
    [y, setY] = useState(0),
    [known, setKnown] = useState(""),
    [highZ, setHighZ] = useState("");
  const cases = circuit.tests.length
      ? circuit.tests
      : vectorCases(project, circuit),
    worker = useRef<Worker>(null),
    request = useRef(0),
    timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const compiled = useMemo(
      () => compile(project, circuit.id),
      [project, circuit.id],
    ),
    signals = compiled.components.flatMap((c) =>
      assertionType === "terminal"
        ? c.kind === "terminal"
          ? [c.id + ":data"]
          : []
        : assertionType === "pixel"
          ? c.kind === "display"
            ? [c.id + ":out"]
            : []
          : assertionType === "memory"
            ? ["ram", "rom"].includes(c.kind)
              ? [c.id + ":out"]
              : []
            : ports(c).map((p) => c.id + ":" + p.id),
    ),
    inputs = compiled.components.filter((c) =>
      action === "keyboard"
        ? c.kind === "keyboard"
        : ["input", "portIn", "button"].includes(c.kind),
    );
  useEffect(
    () => () => {
      worker.current?.terminate();
      clearTimeout(timer.current);
    },
    [],
  );
  useEffect(() => {
    if (simulation.captured) {
      edit((p) =>
        p.circuits[circuit.id].tests.push({
          ...simulation.captured!,
          name: name || t("recordedRun"),
        }),
      );
      simulation.clearCaptured();
    }
  }, [simulation.captured]);
  function assertion(): TestAssertion {
    const key = signal || signals[0];
    if (!key) throw new Error("testInput");
    const ref = resolveSignalRef(project, circuit.id, key);
    if (assertionType === "terminal")
      return { type: "terminal", ref, text: expected };
    if (assertionType === "pixel")
      return { type: "pixel", ref, x, y, value: Number(expected) };
    return {
      type: assertionType,
      ref,
      value: Number(expected),
      ...(known !== "" ? { known: Number(known) } : {}),
      ...(assertionType === "signal" && highZ !== ""
        ? { highZ: Number(highZ) }
        : {}),
      ...(assertionType === "memory" ? { address } : {}),
    } as TestAssertion;
  }
  function addStep() {
    try {
      const step: TestStep = { cycles, assertions: [assertion()] },
        id = target || inputs[0]?.id;
      if (action === "input")
        step.inputs = [
          {
            ref: resolveSignalRef(project, circuit.id, id + ":out"),
            value: Number(input),
          },
        ];
      if (action === "keyboard")
        step.keyboard = [
          {
            component: resolveSignalRef(project, circuit.id, id + ":data"),
            text: input,
          },
        ];
      setSteps([...steps, step]);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function run() {
    worker.current?.terminate();
    const w = new Worker(
      new URL("../verification/worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.current = w;
    const id = ++request.current;
    setBusy(true);
    setError("");
    timer.current = setTimeout(() => {
      w.terminate();
      setBusy(false);
      setError("testLimit");
    }, 30000);
    w.onmessage = ({ data }) => {
      if (data.requestId !== id) return;
      clearTimeout(timer.current);
      setBusy(false);
      setResults(data.results ?? []);
      setError(data.error ?? "");
      w.terminate();
    };
    w.onerror = () => {
      clearTimeout(timer.current);
      setBusy(false);
      setError("workerFailure");
    };
    w.postMessage({ project, root: circuit.id, cases, requestId: id });
  }
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        className="dialog sequence-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("sequentialTests")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-heading">
          <h2>{t("sequentialTests")}</h2>
          <button onClick={close} aria-label={t("close")}>
            ×
          </button>
        </div>
        {error && <p role="alert">{t(error)}</p>}
        <button disabled={busy} onClick={run}>
          {t(busy ? "testing" : "runTests")}
        </button>
        <button
          onClick={() => {
            try {
              simulation.capture([assertion()]);
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          {t("captureTest")}
        </button>
        <table>
          <thead>
            <tr>
              <th>{t("name")}</th>
              <th>{t("result")}</th>
              <th>{t("cycle")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {cases.map((c) => {
              const r = results.find((r) => r.id === c.id);
              return (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>
                    <span>{r ? t(r.status) : "—"}</span>
                    {r?.failure && (
                      <details>
                        <summary>
                          {t("failedStep")} {r.failure.step + 1}
                        </summary>
                        <pre>
                          {JSON.stringify(
                            {
                              expected: r.failure.expected,
                              actual: r.failure.actual,
                            },
                            null,
                            2,
                          )}
                        </pre>
                      </details>
                    )}
                  </td>
                  <td>{r?.cycles ?? "—"}</td>
                  <td>
                    {r?.failure && (
                      <button
                        onClick={() => {
                          simulation.openTest(c, circuit.id);
                          debug(
                            c.steps.flatMap((s) =>
                              s.assertions
                                .filter((a) => a.type === "signal")
                                .map((a) => signalLabel(a.ref)),
                            ),
                          );
                          close();
                        }}
                      >
                        {t("openFailure")}
                      </button>
                    )}
                    <button
                      aria-label={t("delete") + " " + c.name}
                      onClick={() =>
                        edit((p) => {
                          p.circuits[circuit.id].tests = cases.filter(
                            (x) => x.id !== c.id,
                          );
                          p.circuits[circuit.id].vectors = [];
                        })
                      }
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <details>
          <summary>{t("addTest")}</summary>
          <label>
            {t("name")}
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <div className="sequence-fields">
            <label>
              {t("stimulus")}
              <select
                aria-label={t("stimulus")}
                value={action}
                onChange={(e) => {
                  setAction(e.target.value);
                  setTarget("");
                }}
              >
                {["none", "input", "keyboard"].map((k) => (
                  <option key={k} value={k}>
                    {t(k)}
                  </option>
                ))}
              </select>
            </label>
            {action !== "none" && (
              <>
                <label>
                  {t("component")}
                  <select
                    aria-label={t("component")}
                    value={target || inputs[0]?.id}
                    onChange={(e) => setTarget(e.target.value)}
                  >
                    {inputs.map((c) => (
                      <option key={c.id}>{c.id}</option>
                    ))}
                  </select>
                </label>
                <label>
                  {t("value")}
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                  />
                </label>
              </>
            )}
            <label>
              {t("cycles")}
              <input
                type="number"
                min={0}
                max={1000000}
                value={cycles}
                onChange={(e) => setCycles(Number(e.target.value))}
              />
            </label>
          </div>
          <div className="sequence-fields">
            <label>
              {t("assertion")}
              <select
                aria-label={t("assertion")}
                value={assertionType}
                onChange={(e) => {
                  setAssertionType(e.target.value as TestAssertion["type"]);
                  setSignal("");
                }}
              >
                {["signal", "memory", "terminal", "pixel"].map((k) => (
                  <option key={k} value={k}>
                    {t(k)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {t("signal")}
              <select
                aria-label={t("signal")}
                value={signal || signals[0]}
                onChange={(e) => setSignal(e.target.value)}
              >
                {signals.map((id) => (
                  <option key={id}>{id}</option>
                ))}
              </select>
            </label>
            <label>
              {t("expected")}
              <textarea
                aria-label={t("expected")}
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
              />
            </label>
            {assertionType === "memory" && (
              <label>
                {t("address")}
                <input
                  type="number"
                  min={0}
                  value={address}
                  onChange={(e) => setAddress(Number(e.target.value))}
                />
              </label>
            )}
            {assertionType === "pixel" && (
              <>
                <label>
                  X
                  <input
                    type="number"
                    min={0}
                    max={63}
                    value={x}
                    onChange={(e) => setX(Number(e.target.value))}
                  />
                </label>
                <label>
                  Y
                  <input
                    type="number"
                    min={0}
                    max={31}
                    value={y}
                    onChange={(e) => setY(Number(e.target.value))}
                  />
                </label>
              </>
            )}
            {assertionType === "signal" && (
              <label>
                {t("highZMask")}
                <input
                  value={highZ}
                  placeholder="0"
                  onChange={(e) => setHighZ(e.target.value)}
                />
              </label>
            )}
            {["signal", "memory"].includes(assertionType) && (
              <label>
                {t("knownMask")}
                <input
                  placeholder={t("allKnown")}
                  value={known}
                  onChange={(e) => setKnown(e.target.value)}
                />
              </label>
            )}
          </div>
          <button onClick={addStep}>{t("appendStep")}</button>
          <ol>
            {steps.map((s, i) => (
              <li key={i}>
                {s.cycles} {t("cycles")} · {s.assertions.length}{" "}
                {t("assertion")}{" "}
                <button
                  onClick={() => setSteps(steps.filter((_, j) => i !== j))}
                >
                  ×
                </button>
              </li>
            ))}
          </ol>
          <button
            disabled={!steps.length}
            onClick={() => {
              const test: TestCase = {
                id: crypto.randomUUID(),
                name: name || String(cases.length + 1),
                steps,
                maxCycles: Math.max(
                  1,
                  steps.reduce((n, s) => n + s.cycles, 0),
                ),
                seed: 12345,
              };
              if (
                edit((p) => {
                  p.circuits[circuit.id].tests = [...cases, test];
                })
              )
                setSteps([]);
            }}
          >
            {t("saveTest")}
          </button>
        </details>
      </section>
    </div>
  );
}
