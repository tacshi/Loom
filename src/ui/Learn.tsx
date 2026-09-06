import { v2Checkpoints } from "../learning/v2Checkpoints";
import { useState } from "react";
import { checkpoints as v1Checkpoints } from "../learning/checkpoints";
import type { Project } from "../model/types";
import type { Language } from "./i18n";
export default function Learn({
  lang,
  t,
  open,
  project,
}: {
  lang: Language;
  t: (s: string) => string;
  open: (p: Project) => Promise<void>;
  project: Project;
}) {
  const checkpoints = [...v1Checkpoints, ...v2Checkpoints];
  const [selected, setSelected] = useState(project.checkpoint ?? "gates");
  const lesson = checkpoints.find((c) => c.id === selected) ?? checkpoints[0],
    index = lang === "zh" ? 1 : 0;
  const launch = (reference: boolean) => {
    const p = reference ? lesson.reference() : lesson.starter();
    p.checkpoint = lesson.id;
    p.progress = [...project.progress];
    p.name = lesson.title[index] + (reference ? " · " + t("reference") : "");
    void open(p);
  };
  return (
    <div className="learn">
      <nav>
        {checkpoints.map((c, i) => (
          <button
            className={c.id === selected ? "active" : ""}
            key={c.id}
            onClick={() => setSelected(c.id)}
          >
            <span className="mono">{String(i + 1).padStart(2, "0")}</span>
            {c.title[index]}
            {project.progress.includes(c.id) && (
              <span aria-label={t("passed")}>✓</span>
            )}
          </button>
        ))}
      </nav>
      <section>
        <h2>{lesson.title[index]}</h2>
        <p>{lesson.objective[index]}</p>
        <ol>
          {lesson.steps.map((s, i) => (
            <li key={i}>{s[index]}</li>
          ))}
        </ol>
        <button className="primary" onClick={() => launch(false)}>
          {t("openStarter")}
        </button>
        <button onClick={() => launch(true)}>{t("openReference")}</button>
      </section>
    </div>
  );
}
