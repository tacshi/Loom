import { ports } from "../model/components";
import { defined } from "../simulator/signal";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import TechnicalDebugger from "./TechnicalDebugger";
import { observedSignals } from "./debugSignals";
import type { Circuit, Project, SignalRef } from "../model/types";
import type { VisualTests } from "./useVisualTests";
import { signalLabel } from "../model/nets";
import { readableSignal } from "./VisualTests";
import SignalValue from "./SignalValue";
import Devices from "./Devices";
type Props = Omit<ComponentProps<typeof TechnicalDebugger>, "view"> & {
  project: Project;
  circuit: Circuit;
  path: string[];
  mode: "logic" | "clock" | "cpu";
  visual: VisualTests;
  focusSignal: (ref: SignalRef) => void;
  runTests: () => void;
  setInput: (id: string, value: number) => void;
  watchSignals: (signals: string[]) => void;
  devicesVisible?: boolean;
  selected?: string[];
};
export default function Debugger(props: Props) {
  const {
    project,
    circuit,
    path,
    mode,
    visual,
    snapshot,
    t,
    focusSignal,
    setInput,
    simulation,
  } = props;
  const [view, setView] = useState<
    "overview" | "waveforms" | "memory" | "breakpoints"
  >("overview");
  const activeView = visual.active ? "overview" : view;
  useEffect(() => setView("overview"), [project.id, circuit.id]);
  const signals = observedSignals(circuit, project, path);
  for (const c of circuit.components.filter((c) =>
    props.selected?.includes(c.id),
  )) {
    for (const port of ports(c, project).filter((p) => p.direction === "out")) {
      if (
        signals.some(
          (s) => s.ref.componentId === c.id && s.ref.portId === port.id,
        )
      )
        continue;
      signals.push({
        label: c.name + " · " + port.name,
        direction: "output",
        width: port.width,
        interactive: false,
        ref: { instancePath: path, componentId: c.id, portId: port.id },
      });
    }
  }
  const history = useRef(snapshot),
    [previous, setPrevious] = useState(snapshot);
  useEffect(() => {
    if (history.current.cycle !== snapshot.cycle) setPrevious(history.current);
    history.current = snapshot;
  }, [snapshot]);
  const chain = visual.active ? visual.chain : simulation.chain;
  const trace = (ref: SignalRef) => {
    if (visual.active) visual.trace(ref);
    focusSignal(ref);
  };
  const memoryComponents = circuit.components.filter((c) =>
    ["ram", "rom"].includes(c.kind),
  );
  const observe = () =>
    props.watchSignals([
      ...new Set([...props.probes, ...signals.map((s) => signalLabel(s.ref))]),
    ]);
  return (
    <section className="debugger" aria-label={t("debug")}>
      <div className="debugger-header">
        <h2>{t("circuitBehavior")}</h2>
        <button
          aria-pressed={activeView === "overview"}
          onClick={() => setView("overview")}
        >
          {t("inputsOutputs")}
        </button>
        <button
          disabled={visual.active}
          aria-pressed={activeView === "waveforms"}
          onClick={() => {
            observe();
            setView("waveforms");
          }}
        >
          {t("waveformsView")}
        </button>
        {memoryComponents.length > 0 && (
          <button
            disabled={visual.active}
            aria-pressed={activeView === "memory"}
            onClick={() => {
              setView("memory");
              focusSignal({
                instancePath: path,
                componentId: memoryComponents[0].id,
                portId: "out",
              });
            }}
          >
            {t("memory")}
          </button>
        )}
        <button
          disabled={visual.active}
          aria-pressed={activeView === "breakpoints"}
          onClick={() => {
            observe();
            setView("breakpoints");
          }}
        >
          {t("breakpointsView")}
        </button>
        {mode !== "logic" && (
          <span className="mono">
            {t("cycle")} {snapshot.cycle}
          </span>
        )}
        <button onClick={props.close} aria-label={t("close")}>
          ×
        </button>
      </div>
      {activeView === "overview" ? (
        <>
          {!signals.length && <p>{t("chooseOutput")}</p>}
          {signals.some((s) => s.interactive) && !visual.active && (
            <p>{t("tryInputs")}</p>
          )}
          <div className="behavior-signals">
            {signals.map((s) => {
              const key = signalLabel(s.ref),
                value = snapshot.values[key],
                width = value?.width ?? s.width;
              return (
                <div key={key} className="behavior-signal">
                  <span>
                    {s.label}{" "}
                    <small>
                      {t(
                        s.direction === "input"
                          ? "testInputs"
                          : s.direction === "state"
                            ? "storedValue"
                            : "testOutputs",
                      )}
                    </small>
                  </span>
                  {s.interactive && !visual.active ? (
                    width === 1 ? (
                      <button
                        aria-label={`${t("toggleInput")} ${s.label}`}
                        aria-pressed={!!value?.value}
                        onClick={() =>
                          setInput(
                            [...s.ref.instancePath, s.ref.componentId].join(
                              "/",
                            ),
                            value?.value ? 0 : 1,
                          )
                        }
                      >
                        <SignalValue value={value} t={t} />
                      </button>
                    ) : (
                      <input
                        aria-label={s.label}
                        type="number"
                        min={0}
                        max={2 ** width - 1}
                        value={value?.value ?? 0}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (Number.isInteger(v) && v >= 0 && v < 2 ** width)
                            setInput(
                              [...s.ref.instancePath, s.ref.componentId].join(
                                "/",
                              ),
                              v,
                            );
                        }}
                      />
                    )
                  ) : (
                    <SignalValue value={value} t={t} />
                  )}
                  {s.direction === "state" &&
                    mode !== "logic" &&
                    previous.values[key] && (
                      <span className="before-value">
                        {t("previousValue")}:{" "}
                        <SignalValue value={previous.values[key]} t={t} />
                      </span>
                    )}
                  {!visual.active &&
                    !s.interactive &&
                    value &&
                    !defined(value) &&
                    !chain.some(
                      (item) =>
                        item.id ===
                          [...s.ref.instancePath, s.ref.componentId].join(
                            "/",
                          ) && item.port === s.ref.portId,
                    ) && (
                      <button onClick={() => trace(s.ref)}>
                        {t("traceOutput")}
                      </button>
                    )}
                </div>
              );
            })}
          </div>
          {!props.devicesVisible &&
            Object.keys(snapshot.devices ?? {}).length > 0 && (
              <Devices
                snapshot={snapshot}
                submit={simulation.keyboard}
                readOnly={visual.active}
                t={t}
              />
            )}
        </>
      ) : (
        <TechnicalDebugger {...props} view={activeView} />
      )}
      {chain.length > 0 && (
        <div className="source-chain">
          <h3>{t("connectionsTitle")}</h3>
          {chain.map((item) => {
            const parts = item.id.split("/"),
              componentId = parts.pop()!;
            const ref = { instancePath: parts, componentId, portId: item.port };
            return (
              <button
                key={item.id + ":" + item.port}
                onClick={() => focusSignal(ref)}
              >
                {readableSignal(project, project.root, ref)}{" "}
                <SignalValue value={snapshot.values[item.id + ":" + item.port]} t={t} />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
