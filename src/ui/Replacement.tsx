import { useEffect, useMemo, useRef, useState } from "react";
import {
  automaticMapping,
  compatible,
  replacementKinds,
  type Comparison,
} from "../model/replacement";
import { ports } from "../model/components";
import {
  createComponent,
  type Component,
  type Project,
  type Kind,
} from "../model/types";
export default function Replacement({
  project,
  component,
  apply,
  close,
  t,
}: {
  project: Project;
  component: Component;
  apply: (next: Component, mapping: Record<string, string>) => void;
  close: () => void;
  t: (s: string) => string;
}) {
  const [target, setTarget] = useState("adder"),
    [mapping, setMapping] = useState<Record<string, string>>({}),
    [result, setResult] = useState<Comparison>(),
    [busy, setBusy] = useState(false);
  const worker = useRef<Worker | null>(null);
  const next = useMemo(() => {
    const instance = target.startsWith("def:");
    const c = createComponent(
      instance ? "instance" : (target as Kind),
      component.x,
      component.y,
      component.width,
    );
    c.id = component.id;
    c.name = component.name;
    c.params = { ...component.params };
    if (instance) c.definitionId = target.slice(4);
    return c;
  }, [target, component]);
  useEffect(() => {
    setMapping(automaticMapping(project, component, next));
    setResult(undefined);
    worker.current?.terminate();
    setBusy(false);
  }, [next]);
  useEffect(() => () => worker.current?.terminate(), []);
  function verify() {
    setBusy(true);
    setResult(undefined);
    worker.current?.terminate();
    const w = new Worker(
      new URL("../simulator/comparison.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.current = w;
    const timeout = setTimeout(() => {
      w.terminate();
      setBusy(false);
      setResult({ passed: false, cases: 0, reason: "comparisonTimeout" });
    }, 10000);
    w.onmessage = ({ data }) => {
      clearTimeout(timeout);
      setResult(data);
      setBusy(false);
      w.terminate();
    };
    w.onerror = () => {
      clearTimeout(timeout);
      setResult({ passed: false, cases: 0, reason: "replacementInvalid" });
      setBusy(false);
      w.terminate();
    };
    w.postMessage({ project, old: component, next, mapping });
  }
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("replaceComponent")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-heading">
          <h2>{t("replaceComponent")}</h2>
          <button autoFocus onClick={close} aria-label={t("close")}>
            ×
          </button>
        </div>
        <label>
          {t("replacement")}
          <select
            aria-label={t("replacement")}
            disabled={busy}
            value={target}
            onChange={(e) => setTarget(e.target.value)}
          >
            {replacementKinds.map((k) => (
              <option key={k} value={k}>
                {t(k)}
              </option>
            ))}
            {Object.values(project.circuits)
              .filter((c) => c.id !== project.root)
              .map((c) => (
                <option key={c.id} value={"def:" + c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </label>
        <table>
          <thead>
            <tr>
              <th>{t("ports")}</th>
              <th>{t("mapsTo")}</th>
            </tr>
          </thead>
          <tbody>
            {ports(component, project).map((p) => (
              <tr key={p.id}>
                <td>
                  {p.name} · {p.width}b
                </td>
                <td>
                  <select
                    disabled={busy}
                    aria-label={t("mapsTo") + " " + p.name}
                    value={mapping[p.id] ?? ""}
                    onChange={(e) => {
                      setMapping({ ...mapping, [p.id]: e.target.value });
                      setResult(undefined);
                    }}
                  >
                    <option value="">—</option>
                    {ports(next, project)
                      .filter(
                        (q) =>
                          q.direction === p.direction && q.width === p.width,
                      )
                      .map((q) => (
                        <option key={q.id} value={q.id}>
                          {q.name}
                        </option>
                      ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!compatible(project, component, next, mapping) && (
          <p className="danger">{t("interfaceMismatch")}</p>
        )}
        {result && (
          <p role="status" className={result.passed ? "success" : "danger"}>
            {result.passed
              ? result.cases + " " + t("sequencesMatched")
              : t(result.reason ?? "behaviorMismatch")}
          </p>
        )}
        <p className="muted">{t("comparisonScope")}</p>
        <div className="project-actions">
          <button
            disabled={busy || !compatible(project, component, next, mapping)}
            onClick={verify}
          >
            {t(busy ? "checking" : "verifyBehavior")}
          </button>
          <button
            className="primary"
            disabled={!result?.passed || busy}
            onClick={() => apply(next, mapping)}
          >
            {t("replace")}
          </button>
        </div>
      </section>
    </div>
  );
}
