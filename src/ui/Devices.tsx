import { useLayoutEffect, useRef, useState } from "react";
import type { Snapshot } from "../simulator/engine";
import { defined } from "../simulator/signal";
export default function Devices({
  snapshot,
  submit,
  t,
  readOnly = false,
}: {
  readOnly?: boolean;
  snapshot: Snapshot;
  submit: (id: string, text: string) => void;
  t: (s: string) => string;
}) {
  const [draft, setDraft] = useState<Record<string, string>>({});
  const devices = Object.entries(snapshot.devices ?? {});
  const fits = (id: string, queued: number, extra = 0) =>
    new TextEncoder().encode(draft[id] ?? "").length + queued + extra <= 256;
  const sendLine = (id: string) => {
    submit(id, (draft[id] ?? "") + "\n");
    setDraft({ ...draft, [id]: "" });
  };
  return (
    <section className="devices-panel" aria-label={t("devices")}>
      {!devices.length && <p className="devices-empty">{t("noDevices")}</p>}
      {devices.map(([id, d]) => (
        <div key={id}>
          <h3>{id}</h3>
          {d.kind === "keyboard" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if(readOnly)return;
                const text = draft[id] ?? "";
                if (
                  new TextEncoder().encode(text).length + d.queue.length >
                  256
                )
                  return;
                submit(id, text);
                setDraft({ ...draft, [id]: "" });
              }}
            >
              <textarea disabled={readOnly}
                aria-label={t("keyboardInput") + " " + id}
                value={draft[id] ?? ""}
                onChange={(e) => setDraft({ ...draft, [id]: e.target.value })}
                onKeyDown={(e) => {
                  // Enter sends the line; Shift+Enter inserts a newline.
                  if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing)
                    return;
                  e.preventDefault();
                  if (!readOnly && draft[id] && fits(id, d.queue.length, 1))
                    sendLine(id);
                }}
                title={t("keyboardEnterHint")}
              />
              <div>
                <span>
                  {d.queue.length}/256 {t("queuedBytes")}
                </span>
                <button
                  type="button"
                  disabled={readOnly || !draft[id] || !fits(id, d.queue.length, 1)}
                  onClick={() => sendLine(id)}
                >
                  {t("sendLine")}
                </button>
                <button
                  type="submit"
                  disabled={readOnly || !draft[id] || !fits(id, d.queue.length)}
                >
                  {t("sendInput")}
                </button>
              </div>
            </form>
          ) : d.kind === "terminal" ? (
            <>
              <TerminalLog
                label={t("terminalOutput") + " " + id}
                text={new TextDecoder().decode(new Uint8Array(d.bytes))}
              />
              {d.uncertain && <p>{t("unknownDeviceState")}</p>}
            </>
          ) : (
            <svg
              className="pixel-display"
              viewBox="0 0 64 32"
              role="img"
              aria-label={t("pixelDisplay") + " " + id}
            >
              <rect width={64} height={32} fill="#f1f5ee" />
              {d.pixels.map((p, i) =>
                !defined(p) || p.value ? (
                  <rect
                    key={i}
                    x={i % 64}
                    y={Math.floor(i / 64)}
                    width={1}
                    height={1}
                    fill={defined(p) ? "#163c2d" : "#c88739"}
                  />
                ) : null,
              )}
            </svg>
          )}
        </div>
      ))}
    </section>
  );
}

/** Keeps the newest output visible unless the reader has scrolled back. */
function TerminalLog({ label, text }: { label: string; text: string }) {
  const log = useRef<HTMLPreElement>(null),
    pinned = useRef(true);
  useLayoutEffect(() => {
    if (pinned.current && log.current)
      log.current.scrollTop = log.current.scrollHeight;
  }, [text]);
  return (
    <pre
      ref={log}
      role="log"
      aria-label={label}
      onScroll={(e) => {
        const el = e.currentTarget;
        pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 8;
      }}
    >
      {text || " "}
    </pre>
  );
}
