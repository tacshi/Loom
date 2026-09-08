import { useEffect, useState } from "react";
import type { TimelineInfo, Position } from "../simulator/timeline";
import type { Snapshot } from "../simulator/engine";
import { format, defined, same } from "../simulator/signal";
export default function Timeline({
  history,
  running,
  instructionControls,
  samples,
  probes,
  seek,
  fetchRange,
  back,
  t,
}: {
  history?: TimelineInfo;
  running: boolean;
  instructionControls: boolean;
  samples: Snapshot[];
  probes: string[];
  seek: (run: number, p: Position) => void;
  fetchRange: (
    run: number,
    start: number,
    end: number,
    probes: string[],
  ) => void;
  back: (instruction: boolean) => void;
  t: (s: string) => string;
}) {
  const [span, setSpan] = useState(64),
    [cursorA, setCursorA] = useState(0),
    [cursorB, setCursorB] = useState(0),
    [event, setEvent] = useState(0);
  const run = history?.runs.find((r) => r.id === history.selected),
    min = run?.oldest.cycle ?? 0,
    max = run?.head.cycle ?? 0;
  // Keep the selected cycle visible without a separate scroll control.
  const safeStart = Math.max(
      min,
      Math.min(
        (history?.position.cycle ?? 0) - Math.floor(span / 2),
        max - span,
      ),
    ),
    end = Math.min(max, safeStart + span);
  const probeKey = probes.join("\0");
  useEffect(() => {
    if (!running && history && run) fetchRange(run.id, safeStart, end, probes);
  }, [running, history?.selected, min, max, safeStart, end, probeKey]);
  useEffect(() => {
    setEvent(history?.position.eventOrder ?? 0);
  }, [history?.position.cycle, history?.position.eventOrder]);
  if (!history || !run) return null;
  return (
    <div className="timeline-panel">
      <div className="timeline-controls">
        <select
          aria-label={t("executionRun")}
          value={run.id}
          onChange={(e) => {
            const r = history.runs.find(
              (r) => r.id === Number(e.target.value),
            )!;
            seek(r.id, r.head);
          }}
        >
          {history.runs.map((r) => (
            <option key={r.id} value={r.id}>
              {t("executionRun")} {r.id} · {r.oldest.cycle}–{r.head.cycle}
            </option>
          ))}
        </select>
        <strong>{t(history.historical ? "historical" : "livePosition")}</strong>
        <button
          onClick={() => back(false)}
          disabled={history.position.cycle <= min}
        >
          {t("backCycle")}
        </button>
        {instructionControls && (
          <button
            onClick={() => back(true)}
            disabled={history.position.cycle <= min}
          >
            {t("backInstruction")}
          </button>
        )}
        <button onClick={() => seek(run.id, run.head)}>
          {t("latestPosition")}
        </button>
      </div>
      <div className="timeline-controls">
        <label>
          {t("seekCycle")}
          <input
            type="number"
            min={min}
            max={max}
            value={history.position.cycle}
            onChange={(e) =>
              seek(run.id, { cycle: Number(e.target.value), eventOrder: 0 })
            }
          />
        </label>
        <label>
          {t("eventOrder")}
          <input
            type="number"
            min={0}
            value={event}
            onChange={(e) => setEvent(Number(e.target.value))}
          />
        </label>
        <button
          onClick={() =>
            seek(run.id, { cycle: history.position.cycle, eventOrder: event })
          }
        >
          {t("seek")}
        </button>
        <label>
          {t("timelineZoom")}
          <select
            value={span}
            onChange={(e) => setSpan(Number(e.target.value))}
          >
            {[16, 32, 64, 128, 256, 512].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>
        <span>
          {(history.bytes / 1048576).toFixed(2)} /{" "}
          {(history.limit / 1048576).toFixed(0)} MiB
        </span>
      </div>
      <div className="timeline-controls">
        <label>
          {t("cursorA")}
          <input
            type="number"
            min={min}
            max={max}
            value={cursorA}
            onChange={(e) => setCursorA(Number(e.target.value))}
          />
        </label>
        <label>
          {t("cursorB")}
          <input
            type="number"
            min={min}
            max={max}
            value={cursorB}
            onChange={(e) => setCursorB(Number(e.target.value))}
          />
        </label>
        <output>
          Δ {Math.abs(cursorB - cursorA)} {t("cycles")}
        </output>
      </div>
      {!running && (
        <div className="timeline-waveforms">
          <div className="timeline-ticks">
            {Array.from({ length: 9 }, (_, i) => (
              <span key={i}>
                {Math.round(safeStart + ((end - safeStart) * i) / 8)}
              </span>
            ))}
          </div>
          {probes.map((id) => (
            <div key={id} className="timeline-track">
              <span title={id}>{id}</span>
              <svg
                viewBox="0 0 800 38"
                role="img"
                aria-label={`${t("waveform")} ${id}`}
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect(),
                    cycle = Math.round(
                      safeStart +
                        ((e.clientX - r.left) / r.width) * (end - safeStart),
                    );
                  seek(run.id, { cycle, eventOrder: 0 });
                }}
              >
                {samples.map((s, i) => {
                  const v = s.values[id],
                    pitch = 800 / Math.max(samples.length, 1),
                    x = i * pitch,
                    prev = samples[i - 1]?.values[id];
                  return (
                    <g key={s.cycle}>
                      <title>
                        {s.cycle}: {format(v, 16)}
                      </title>
                      <path
                        d={
                          v?.width === 1
                            ? `M${x},${prev?.known ? (prev.value ? 7 : 30) : 18}V${v.known ? (v.value ? 7 : 30) : 18}H${x + pitch}`
                            : `M${x},7H${x + pitch}M${x},30H${x + pitch}`
                        }
                        fill="none"
                        stroke={
                          v?.highZ
                            ? "#8c78b3"
                            : v?.known
                              ? "var(--accent)"
                              : "#cb8d38"
                        }
                      />
                      {v &&
                        (v.width > 1 || !defined(v)) &&
                        (i === 0 || !prev || !same(prev, v)) && (
                          <text
                            x={x + 2}
                            y={23}
                            fontSize={11}
                            fill="var(--text)"
                          >
                            {format(v, 16)}
                          </text>
                        )}
                    </g>
                  );
                })}
                {[cursorA, cursorB].map((c, i) =>
                  c >= safeStart && c <= end ? (
                    <line
                      key={i}
                      x1={
                        ((c - safeStart) / Math.max(1, end - safeStart)) * 800
                      }
                      x2={
                        ((c - safeStart) / Math.max(1, end - safeStart)) * 800
                      }
                      y1={0}
                      y2={38}
                      stroke={i ? "#da8744" : "#608cde"}
                    />
                  ) : null,
                )}
              </svg>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
