import { useEffect, useRef, useState } from "react";
import { signal } from "../simulator/signal";
import { signalLabel } from "../model/nets";
import type { Project, SignalRef } from "../model/types";
import type { VisualTests as Controller } from "./useVisualTests";
import SignalValue from "./SignalValue";
export function readableSignal(project: Project, root: string, ref: SignalRef) {
  let c = project.circuits[root];
  const labels: string[] = [];
  for (const id of ref.instancePath) {
    const n = c?.components.find((n) => n.id === id);
    if (!n) return id;
    labels.push(n.name);
    c = project.circuits[n.definitionId!];
  }
  const n = c?.components.find((n) => n.id === ref.componentId);
  return [
    ...labels,
    n?.name ?? ref.componentId,
    ...(n && ["input", "portIn", "portOut", "probe", "button"].includes(n.kind)
      ? []
      : [ref.portId]),
  ].join(" · ");
}
function signalWidth(project: Project, root: string, ref: SignalRef) {
  let circuit = project.circuits[root];
  for (const id of ref.instancePath) {
    const node = circuit?.components.find((n) => n.id === id);
    if (!node?.definitionId) return 1;
    circuit = project.circuits[node.definitionId];
  }
  return circuit?.components.find((n) => n.id === ref.componentId)?.width ?? 1;
}
export default function VisualTests({
  controller: v,
  project,
  root,
  t,
  focus,
  cancel,
}: {
  controller: Controller;
  project: Project;
  root: string;
  t: (s: string) => string;
  focus: (ref: SignalRef) => void;
  cancel?: () => void;
}) {
  const row = v.rows[v.index];
  const [page, setPage] = useState(0);
  const tableHost = useRef<HTMLDivElement>(null);
  useEffect(() => setPage(Math.max(0, Math.floor(v.index / 32))), [v.index]);
  useEffect(() => {
    const host = tableHost.current,
      active = host?.querySelector('[aria-current="step"]');
    if (!host || !active) return;
    const bounds = host.getBoundingClientRect(),
      r = active.getBoundingClientRect();
    if (r.bottom > bounds.bottom) host.scrollTop += r.bottom - bounds.bottom;
    else if (r.top < bounds.top + 36) host.scrollTop -= bounds.top + 36 - r.top;
  }, [v.index, page]);
  return (
    <section className="visual-tests" aria-label={t("visualTests")}>
      <div className="visual-test-header">
        <h2>{t("visualTests")}</h2>
        {v.busy ? (
          <>
            <span role="status">
              {t("checking")}{" "}
              {v.cases.length > 0 && (
                <>
                  {v.progress}/{v.cases.length}
                </>
              )}
            </span>
            <button onClick={cancel ?? v.close}>{t("cancel")}</button>
          </>
        ) : (
          <>
            <button
              onClick={v.playing ? v.pause : v.play}
              disabled={!v.rows.length}
            >
              {t(v.playing ? "pauseTests" : "playTests")}
            </button>
            <button onClick={v.next} disabled={v.index >= v.rows.length - 1}>
              {t("nextCase")}
            </button>
            <button onClick={v.finish} disabled={!v.rows.length}>
              {t("showResult")}
            </button>
            <button onClick={cancel ?? v.close}>{t("returnToEditing")}</button>
          </>
        )}
      </div>
      {v.loadingCase && <p role="status">{t("loadingCase")}</p>}
      {v.error && <p role="alert">{t(v.error)}</p>}
      {!v.busy && !v.rows.length && (
        <p role="status">
          {t(v.results.find((r) => r.error)?.error ?? "noTestCases")}
        </p>
      )}
      {v.rows.length > 32 && (
        <div className="case-pages">
          <button disabled={page === 0} onClick={() => setPage(page - 1)}>
            {t("previousCases")}
          </button>
          <span>
            {page * 32 + 1}–{Math.min((page + 1) * 32, v.rows.length)} /{" "}
            {v.rows.length}
          </span>
          <button
            disabled={(page + 1) * 32 >= v.rows.length}
            onClick={() => setPage(page + 1)}
          >
            {t("nextCases")}
          </button>
        </div>
      )}
      <div className="test-case-table" ref={tableHost}>
        <table>
          <thead>
            <tr>
              <th>{t("testCase")}</th>
              <th>{t("testInputs")}</th>
              <th>{t("expected")}</th>
              <th>{t("actual")}</th>
              <th>{t("result")}</th>
            </tr>
          </thead>
          <tbody>
            {v.rows.slice(page * 32, (page + 1) * 32).map((r, offset) => {
              const i = page * 32 + offset;
              return (
                <tr
                  key={r.caseIndex + ":" + r.step}
                  className={i === v.index ? "active" : ""}
                  aria-current={i === v.index ? "step" : undefined}
                >
                  <td>
                    <button
                      onClick={() => v.select(i)}
                      aria-label={`${t("showCase")} ${i + 1}`}
                    >
                      {i + 1}
                    </button>
                  </td>
                  <td>
                    {r.inputs.map((input) => (
                      <div key={JSON.stringify(input.ref)}>
                        {readableSignal(project, root, input.ref)}:{" "}
                        <SignalValue
                          value={signal(
                            input.value,
                            v.snapshot?.values[signalLabel(input.ref)]?.width ??
                              project.circuits[root].components.find(
                                (c) => c.id === input.ref.componentId,
                              )?.width ??
                              1,
                          )}
                          t={t}
                        />
                      </div>
                    ))}
                    {v.cases[r.caseIndex].steps[r.step].memory?.map(
                      (input, j) => (
                        <div key={`memory-${j}`}>
                          {readableSignal(project, root, input.ref)} [
                          {input.address}]:{" "}
                          <SignalValue
                            value={signal(
                              input.value,
                              signalWidth(project, root, input.ref),
                              input.known,
                            )}
                            t={t}
                          />
                        </div>
                      ),
                    )}
                    {v.cases[r.caseIndex].steps[r.step].keyboard?.map(
                      (k, i) => (
                        <pre key={i}>{k.text}</pre>
                      ),
                    )}
                  </td>
                  <td>
                    {r.assertions.map((a, j) => (
                      <div key={j}>
                        <span>
                          {readableSignal(project, root, a.assertion.ref)}
                        </span>
                        <SignalValue value={a.expected} t={t} />
                      </div>
                    ))}
                  </td>
                  <td>
                    {i <= v.index
                      ? r.assertions.map((a, j) => (
                          <div key={j}>
                            <SignalValue value={a.actual} t={t} />
                          </div>
                        ))
                      : "—"}
                  </td>
                  <td>
                    {i <= v.index
                      ? t(
                          !r.assertions.length
                            ? "caseObserved"
                            : r.assertions.every((a) => a.passed)
                              ? "casePassed"
                              : "caseFailed",
                        )
                      : t("caseWaiting")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {row && (
        <div className="test-focus" role="status">
          <strong>
            {t("testCase")} {v.index + 1}
          </strong>
          {row.assertions.map((a, i) => (
            <div key={i} className={a.passed ? "" : "test-mismatch"}>
              <span>{readableSignal(project, root, a.assertion.ref)}</span>
              <span>
                {t("expected")} <SignalValue value={a.expected} t={t} />
              </span>
              <span>
                {t("actual")} <SignalValue value={a.actual} t={t} />
              </span>
              {!a.passed && (
                <button
                  disabled={v.loadingCase}
                  onClick={() => {
                    if (a.assertion.type === "signal") v.trace(a.assertion.ref);
                    focus(a.assertion.ref);
                  }}
                >
                  {t(
                    a.assertion.type === "signal"
                      ? "traceOutput"
                      : "showComponent",
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
