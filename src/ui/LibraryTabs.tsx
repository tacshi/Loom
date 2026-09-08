import { useEffect, useRef, useState } from "react";
const panels = ["components", "circuit", "learn"] as const;
export type LibraryPanel = (typeof panels)[number];

export default function LibraryTabs({
  value,
  select,
  t,
}: {
  value: LibraryPanel;
  select: (panel: LibraryPanel) => void;
  t: (key: string) => string;
}) {
  const buttons = useRef(new Map<LibraryPanel, HTMLButtonElement>());
  const [vertical, setVertical] = useState(
    () => matchMedia("(max-width: 750px)").matches,
  );
  useEffect(() => {
    const query = matchMedia("(max-width: 750px)");
    const update = () => setVertical(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return (
    <div
      className="library-tabs"
      role="tablist"
      aria-label={t("workbenchPanels")}
      aria-orientation={vertical ? "vertical" : "horizontal"}
    >
      {panels.map((panel, index) => (
        <button
          key={panel}
          ref={(el) => {
            if (el) buttons.current.set(panel, el);
            else buttons.current.delete(panel);
          }}
          type="button"
          role="tab"
          id={`library-tab-${panel}`}
          aria-controls={`library-panel-${panel}`}
          aria-selected={value === panel}
          tabIndex={value === panel ? 0 : -1}
          onClick={() => select(panel)}
          onKeyDown={(event) => {
            let next: number;
            if (event.key === "Home") next = 0;
            else if (event.key === "End") next = panels.length - 1;
            else if (event.key === (vertical ? "ArrowDown" : "ArrowRight"))
              next = (index + 1) % panels.length;
            else if (event.key === (vertical ? "ArrowUp" : "ArrowLeft"))
              next = (index + panels.length - 1) % panels.length;
            else return;
            event.preventDefault();
            event.stopPropagation();
            select(panels[next]);
            buttons.current.get(panels[next])?.focus();
          }}
        >
          {t(panel === "components" ? "library" : panel)}
        </button>
      ))}
    </div>
  );
}
