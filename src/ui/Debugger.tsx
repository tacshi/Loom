import { useState } from "react";
import type { Snapshot } from "../simulator/engine";
import { format } from "../simulator/signal";
import type { Breakpoint } from "../simulator/protocol";
export default function Debugger({
  snapshot,
  trace,
  probes,
  removeProbe,
  breakpoints,
  setBreakpoints,
  t,
  close,
  memoryId,
}: {
  snapshot: Snapshot;
  trace: Snapshot[];
  probes: string[];
  removeProbe: (id: string) => void;
  breakpoints: Breakpoint[];
  setBreakpoints: (b: Breakpoint[]) => void;
  t: (s: string) => string;
  close: () => void;
  memoryId?: string;
}) {
  const [tab, setTab] = useState<"signals" | "memory">("signals"),
    [address, setAddress] = useState(0);
  const memory = memoryId ? snapshot.memory[memoryId] : undefined;
  return (
    <section className="debugger">
      <div className="debugger-header">
        <button
          className={tab === "signals" ? "active" : ""}
          onClick={() => setTab("signals")}
        >
          {t("signals")}
        </button>
        <button
          className={tab === "memory" ? "active" : ""}
          onClick={() => setTab("memory")}
        >
          {t("memory")}
        </button>
        <span className="mono">
          {t("cycle")} {snapshot.cycle}
        </span>
        <button onClick={close} aria-label={t("close")}>
          ×
        </button>
      </div>
      {tab === "signals" ? (
        <div className="signal-table">
          {!probes.length ? (
            <p>{t("probeHint")}</p>
          ) : (
            probes.map((id) => {
              const value = snapshot.values[id],
                samples = trace.slice(-80),
                at = id.lastIndexOf(":"),
                bp = breakpoints.find(
                  (b) =>
                    b.id === id.slice(0, at) && b.port === id.slice(at + 1),
                );
              return (
                <div className="signal-track" key={id}>
                  <div>
                    <span className="mono" title={id}>
                      {id.split("/").at(-1)}
                    </span>
                    <strong>{format(value)}</strong>
                    <button
                      aria-label={t("removeProbe") + " " + id}
                      onClick={() => removeProbe(id)}
                    >
                      ×
                    </button>
                  </div>
                  <svg
                    viewBox="0 0 640 36"
                    preserveAspectRatio="none"
                    role="img"
                    aria-label={t("waveform") + " " + id}
                  >
                    {samples.map((s, i) => {
                      const v = s.values[id],
                        prev = samples[i - 1]?.values[id],
                        pitch = Math.max(8, 640 / Math.max(1, samples.length)),
                        x = i * pitch;
                      return (
                        <g key={s.cycle}>
                          <path
                            d={
                              v?.width === 1
                                ? "M " +
                                  x +
                                  " " +
                                  (prev?.value ? 5 : 28) +
                                  " V " +
                                  (v?.value ? 5 : 28) +
                                  " H " +
                                  (x + pitch)
                                : "M " +
                                  x +
                                  " 8 H " +
                                  (x + pitch) +
                                  " M " +
                                  x +
                                  " 28 H " +
                                  (x + pitch)
                            }
                            fill="none"
                            stroke={v?.known ? "var(--accent)" : "#cb8d38"}
                            strokeWidth="1.5"
                          />
                          {v &&
                            v.width > 1 &&
                            (i === 0 || prev?.value !== v.value) && (
                              <text
                                x={x + 2}
                                y={23}
                                fill="var(--text)"
                                fontSize={11}
                              >
                                {format(v)}
                              </text>
                            )}
                        </g>
                      );
                    })}
                  </svg>
                  <label>
                    <input
                      type="checkbox"
                      checked={!!bp}
                      onChange={(e) =>
                        setBreakpoints(
                          e.target.checked
                            ? [
                                ...breakpoints,
                                {
                                  id: id.slice(0, at),
                                  port: id.slice(at + 1),
                                  value: 0,
                                },
                              ]
                            : breakpoints.filter((b) => b !== bp),
                        )
                      }
                    />
                    {t("breakWhen")}
                  </label>
                  {bp && (
                    <input
                      aria-label={t("breakValue")}
                      type="number"
                      min={0}
                      max={value ? 2 ** value.width - 1 : 0xffffffff}
                      value={bp.value}
                      onChange={(e) =>
                        setBreakpoints(
                          breakpoints.map((b) =>
                            b === bp
                              ? { ...b, value: Number(e.target.value) }
                              : b,
                          ),
                        )
                      }
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="memory-panel">
          {!memory ? (
            <p>{t("selectMemory")}</p>
          ) : (
            <>
              <label>
                {t("address")}
                <input
                  aria-label={t("address")}
                  type="number"
                  min={0}
                  max={Math.max(0, memory.length - 64)}
                  step={16}
                  value={address}
                  onChange={(e) =>
                    setAddress(
                      Math.max(
                        0,
                        Math.min(memory.length - 1, Number(e.target.value)),
                      ),
                    )
                  }
                />
              </label>
              <table className="memory-grid">
                <tbody>
                  {Array.from({ length: 4 }, (_, row) => (
                    <tr key={row}>
                      <th className="mono">
                        {(address + row * 16)
                          .toString(16)
                          .padStart(2, "0")
                          .toUpperCase()}
                      </th>
                      {memory
                        .slice(address + row * 16, address + (row + 1) * 16)
                        .map((v, i) => (
                          <td
                            className="mono"
                            key={i}
                            title={String(address + row * 16 + i)}
                          >
                            {v < 0
                              ? "X"
                              : v.toString(16).toUpperCase().padStart(2, "0")}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}
    </section>
  );
}
