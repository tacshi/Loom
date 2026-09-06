import { useEffect, useState } from "react";
import {
  appearance,
  baseGeometry,
  pinLayout,
  ports,
} from "../model/components";
import type { Component, ComponentAppearance, Project } from "../model/types";
export default function AppearanceEditor({
  component,
  project,
  apply,
  t,
}: {
  component: Component;
  project: Project;
  apply: (a: ComponentAppearance) => boolean;
  t: (s: string) => string;
}) {
  const [draft, setDraft] = useState<ComponentAppearance>({ rotation: 0 });
  useEffect(() => {
    const a = appearance(component, project),
      g = baseGeometry(component, project);
    setDraft({
      ...a,
      width: g.w,
      height: g.h,
      pins: Object.fromEntries(
        ports(component, project).map((p) => [
          p.id,
          pinLayout(component, p.id, project),
        ]),
      ),
    });
  }, [component]);
  return (
    <details className="appearance-editor">
      <summary>{t("appearance")}</summary>
      <label>
        {t("rotation")}
        <select
          aria-label={t("rotation")}
          value={draft.rotation}
          onChange={(e) =>
            setDraft({
              ...draft,
              rotation: Number(
                e.target.value,
              ) as ComponentAppearance["rotation"],
            })
          }
        >
          {[0, 90, 180, 270].map((n) => (
            <option key={n} value={n}>
              {n}°
            </option>
          ))}
        </select>
      </label>
      <div className="two-fields">
        {(["width", "height"] as const).map((k) => (
          <label key={k}>
            {t(k === "width" ? "boxWidth" : "boxHeight")}
            <input
              aria-label={t(k === "width" ? "boxWidth" : "boxHeight")}
              type="number"
              min={80}
              max={4000}
              step={20}
              value={draft[k]}
              onChange={(e) =>
                setDraft({ ...draft, [k]: Number(e.target.value) })
              }
            />
          </label>
        ))}
      </div>
      {ports(component, project).map((p) => (
        <div className="pin-layout" key={p.id}>
          <span>{p.name}</span>
          <select
            aria-label={t("pinSide") + " " + p.name}
            value={draft.pins?.[p.id]?.side ?? "left"}
            onChange={(e) =>
              setDraft({
                ...draft,
                pins: {
                  ...draft.pins,
                  [p.id]: {
                    ...draft.pins![p.id],
                    side: e.target.value as "left",
                  },
                },
              })
            }
          >
            {["left", "right", "top", "bottom"].map((s) => (
              <option key={s} value={s}>
                {t("side_" + s)}
              </option>
            ))}
          </select>
          <input
            aria-label={t("pinSlot") + " " + p.name}
            type="number"
            min={1}
            value={draft.pins?.[p.id]?.slot ?? 1}
            onChange={(e) =>
              setDraft({
                ...draft,
                pins: {
                  ...draft.pins,
                  [p.id]: {
                    ...draft.pins![p.id],
                    slot: Number(e.target.value),
                  },
                },
              })
            }
          />
        </div>
      ))}
      <button onClick={() => apply(draft)}>{t("applyLayout")}</button>
    </details>
  );
}
