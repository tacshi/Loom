import { useState } from "react";
import type { Circuit, Project, TestVector } from "../model/types";
import type { VectorResult } from "../simulator/engine";
export default function CircuitTests({
  project,
  circuit,
  results,
  run,
  edit,
  t,
  close,
}: {
  project: Project;
  circuit: Circuit;
  results: VectorResult[];
  run: () => void;
  edit: (f: (p: Project) => void) => void;
  t: (s: string) => string;
  close: () => void;
}) {
  const [adding, setAdding] = useState(false),
    [name, setName] = useState(""),
    [cycles, setCycles] = useState(0),
    [inputs, setInputs] = useState<Record<string, number>>({}),
    [outputs, setOutputs] = useState<Record<string, number>>({});
  const inputComponents = circuit.components.filter((c) =>
      ["input", "portIn"].includes(c.kind),
    ),
    outputComponents = circuit.components.filter((c) =>
      ["probe", "portOut"].includes(c.kind),
    );
  function add() {
    const vector: TestVector = {
      name: name.trim() || String(circuit.vectors.length + 1),
      cycles,
      inputs: Object.fromEntries(
        inputComponents.map((c) => [c.id, inputs[c.id] ?? 0]),
      ),
      outputs: Object.fromEntries(
        outputComponents.map((c) => [c.id + ":in", outputs[c.id] ?? 0]),
      ),
    };
    edit((p) => {
      p.circuits[circuit.id].vectors.push(vector);
    });
    setAdding(false);
  }
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        role="dialog"
        aria-modal="true"
        aria-label={t("runTests")}
        className="dialog tests-dialog"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-heading">
          <h2>{t("runTests")}</h2>
          <button autoFocus onClick={close} aria-label={t("close")}>
            ×
          </button>
        </div>
        <div className="project-actions">
          <button
            className="primary"
            disabled={!circuit.vectors.length}
            onClick={run}
          >
            {t("runTests")}
          </button>
          <button onClick={() => setAdding(!adding)}>{t("addTest")}</button>
        </div>
        {adding && (
          <div className="test-form">
            <label>
              {t("name")}
              <input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label>
              {t("cycles")}
              <input
                type="number"
                min={0}
                max={10000}
                value={cycles}
                onChange={(e) =>
                  setCycles(
                    Math.max(0, Math.min(10000, Number(e.target.value))),
                  )
                }
              />
            </label>
            {inputComponents.map((c) => (
              <label key={c.id}>
                {c.name}
                <input
                  aria-label={t("inputs") + " " + c.name}
                  type="number"
                  min={0}
                  max={2 ** c.width - 1}
                  value={inputs[c.id] ?? 0}
                  onChange={(e) =>
                    setInputs({
                      ...inputs,
                      [c.id]: Math.max(
                        0,
                        Math.min(2 ** c.width - 1, Number(e.target.value)),
                      ),
                    })
                  }
                />
              </label>
            ))}
            {outputComponents.map((c) => (
              <label key={c.id}>
                {t("expected")} {c.name}
                <input
                  type="number"
                  min={0}
                  max={2 ** c.width - 1}
                  value={outputs[c.id] ?? 0}
                  onChange={(e) =>
                    setOutputs({
                      ...outputs,
                      [c.id]: Math.max(
                        0,
                        Math.min(2 ** c.width - 1, Number(e.target.value)),
                      ),
                    })
                  }
                />
              </label>
            ))}
            {!outputComponents.length && <p>{t("addProbeForTest")}</p>}
            <button disabled={!outputComponents.length} onClick={add}>
              {t("saveTest")}
            </button>
          </div>
        )}
        <table>
          <thead>
            <tr>
              <th>{t("inputs")}</th>
              <th>{t("expected")}</th>
              <th>{t("actual")}</th>
              <th>{t("result")}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {circuit.vectors.map((v, i) => {
              const r = results[i];
              return (
                <tr key={i}>
                  <td title={JSON.stringify(v.inputs)}>{v.name}</td>
                  <td>{Object.values(v.outputs).join(", ")}</td>
                  <td>
                    {r
                      ? Object.values(r.actual)
                          .map((v) => v ?? "X")
                          .join(", ")
                      : "—"}
                  </td>
                  <td className={r?.passed ? "success" : "danger"}>
                    {r ? t(r.passed ? "passed" : "failed") : "—"}
                  </td>
                  <td>
                    <button
                      aria-label={t("delete") + " " + v.name}
                      onClick={() =>
                        edit((p) => {
                          p.circuits[circuit.id].vectors.splice(i, 1);
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
        {project.checkpoint &&
          results.length === circuit.vectors.length &&
          results.length > 0 &&
          results.every((r) => r.passed) && (
            <button
              onClick={() =>
                edit((p) => {
                  if (!p.progress.includes(p.checkpoint!))
                    p.progress.push(p.checkpoint!);
                })
              }
            >
              {t("markComplete")}
            </button>
          )}
      </section>
    </div>
  );
}
