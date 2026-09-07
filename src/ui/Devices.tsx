import { useState } from "react";
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
  return (
    <section className="devices-panel" aria-label={t("devices")}>
      {Object.entries(snapshot.devices ?? {}).map(([id, d]) => (
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
              />
              <div>
                <span>
                  {d.queue.length}/256 {t("queuedBytes")}
                </span>
                <button
                  type="button"
                  disabled={
                    readOnly || !draft[id] ||
                    new TextEncoder().encode(draft[id] ?? "").length +
                      d.queue.length +
                      1 >
                      256
                  }
                  onClick={() => {
                    submit(id, (draft[id] ?? "") + "\n");
                    setDraft({ ...draft, [id]: "" });
                  }}
                >
                  {t("sendLine")}
                </button>
                <button
                  type="submit"
                  disabled={
                    readOnly || !draft[id] ||
                    new TextEncoder().encode(draft[id] ?? "").length +
                      d.queue.length >
                      256
                  }
                >
                  {t("sendInput")}
                </button>
              </div>
            </form>
          ) : d.kind === "terminal" ? (
            <>
              <pre role="log" aria-label={t("terminalOutput") + " " + id}>
                {new TextDecoder().decode(new Uint8Array(d.bytes)) || " "}
              </pre>
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
