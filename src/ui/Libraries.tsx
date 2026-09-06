import type { TestResult } from "../verification/runner";
import { emptyProject } from "../model/types";
import { useEffect, useRef, useState } from "react";
import type { Project } from "../model/types";
import { catalog, install } from "../library/store";
import {
  createPackage,
  parsePackage,
  embedPackage,
  reviewUpdate,
  applyUpdate,
  type ComponentPackage,
} from "../library/package";
import { canonical } from "../model/nets";
function download(pkg: ComponentPackage) {
  const url = URL.createObjectURL(
      new Blob([canonical(pkg)], { type: "application/json" }),
    ),
    a = document.createElement("a");
  a.href = url;
  a.download = `${pkg.circuits[pkg.root].name}-v${pkg.version}.loom-component.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export default function Libraries({
  project,
  circuitId,
  edit,
  close,
  t,
}: {
  project: Project;
  circuitId: string;
  edit: (f: (p: Project) => void) => boolean;
  close: () => void;
  t: (s: string) => string;
}) {
  const [items, setItems] = useState<ComponentPackage[]>([]),
    [definition, setDefinition] = useState(circuitId),
    [version, setVersion] = useState(1),
    [error, setError] = useState(""),
    [review, setReview] = useState<{
      id: string;
      pkg: ComponentPackage;
      diff: ReturnType<typeof reviewUpdate>;
    }>(),
    [mapping, setMapping] = useState<Record<string, string>>({});
  const [reviewResults, setReviewResults] = useState<TestResult[]>(),
    [reviewBusy, setReviewBusy] = useState(false);
  useEffect(() => {
    if (!review) return;
    setReviewResults(undefined);
    const cases = review.diff.cases;
    if (!cases.length) {
      setReviewResults([]);
      return;
    }
    const w = new Worker(
      new URL("../verification/worker.ts", import.meta.url),
      { type: "module" },
    );
    setReviewBusy(true);
    const timer = setTimeout(() => {
      w.terminate();
      setReviewBusy(false);
      setError("testLimit");
    }, 30000);
    w.onmessage = ({ data }) => {
      clearTimeout(timer);
      setReviewBusy(false);
      if (data.error) setError(data.error);
      else setReviewResults(data.results);
      w.terminate();
    };
    w.onerror = () => {
      clearTimeout(timer);
      setReviewBusy(false);
      setError("workerFailure");
    };
    w.postMessage({
      project: {
        ...emptyProject(),
        root: review.pkg.root,
        circuits: review.pkg.circuits,
      },
      root: review.pkg.root,
      cases,
      requestId: 1,
    });
    return () => {
      clearTimeout(timer);
      w.terminate();
    };
  }, [review]);
  const file = useRef<HTMLInputElement>(null);
  const refresh = () =>
    catalog()
      .then(setItems)
      .catch(() => setError("loadFailed"));
  useEffect(() => {
    void refresh();
  }, []);
  async function publish() {
    try {
      const c = project.circuits[definition],
        pkg = await createPackage(project, definition, c.library?.id, version);
      await install(pkg);
      download(pkg);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        className="dialog libraries-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("componentLibraries")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-heading">
          <h2>{t("componentLibraries")}</h2>
          <button aria-label={t("close")} onClick={close}>
            ×
          </button>
        </div>
        {error && <p role="alert">{t(error)}</p>}
        <div className="library-actions">
          <label>
            {t("definition")}
            <select
              aria-label={t("definition")}
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
            >
              {Object.values(project.circuits).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            {t("version")}
            <input
              type="number"
              min={1}
              value={version}
              onChange={(e) => setVersion(Number(e.target.value))}
            />
          </label>
          <button onClick={() => void publish()}>{t("exportComponent")}</button>
          <button onClick={() => file.current?.click()}>
            {t("importComponent")}
          </button>
        </div>
        <input
          hidden
          type="file"
          ref={file}
          accept=".json"
          onChange={async (e) => {
            try {
              const f = e.target.files?.[0];
              if (!f) return;
              const pkg = await parsePackage(await f.text());
              await install(pkg);
              await refresh();
              setError("");
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
        <ul className="library-catalog">
          {items.map((pkg) => (
            <li key={pkg.id + ":" + pkg.version}>
              <strong>{pkg.circuits[pkg.root].name}</strong>
              <span title={pkg.hash}>v{pkg.version}</span>
              <button
                onClick={() => {
                  if (
                    edit((p) => {
                      embedPackage(p, pkg);
                    })
                  )
                    setError("");
                }}
              >
                {t("addToProject")}
              </button>
              <button onClick={() => download(pkg)}>{t("export")}</button>
              {Object.values(project.circuits)
                .filter(
                  (c) =>
                    c.library?.id === pkg.id && c.library.version < pkg.version,
                )
                .map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      try {
                        setReview({
                          id: c.id,
                          pkg,
                          diff: reviewUpdate(project, c.id, pkg),
                        });
                        setMapping({});
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  >
                    {t("reviewUpdate")} v{c.library!.version} → v{pkg.version}
                  </button>
                ))}
            </li>
          ))}
        </ul>
        {review && (
          <section>
            <h3>{t("reviewUpdate")}</h3>
            <ul>
              {(
                ["interface", "parameters", "appearance", "tests"] as const
              ).map((k) => (
                <li key={k}>
                  {t(k)}: {t(review.diff[k] ? "changed" : "unchanged")}
                </li>
              ))}
            </ul>
            <p>
              {reviewBusy
                ? t("testing")
                : !review.diff.cases.length
                  ? t("noPackageTests")
                  : `${reviewResults?.filter((r) => r.status === "passed").length ?? 0}/${review.diff.cases.length} ${t("testsPassed")}`}
            </p>
            {project.circuits[review.id].ports.map((p) => (
              <label className="interface-map" key={p.id}>
                {p.name}
                <select
                  value={mapping[p.id] ?? p.id}
                  onChange={(e) =>
                    setMapping({ ...mapping, [p.id]: e.target.value })
                  }
                >
                  {review.pkg.circuits[review.pkg.root].ports
                    .filter(
                      (q) => q.direction === p.direction && q.width === p.width,
                    )
                    .map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.name} · {q.width}
                      </option>
                    ))}
                </select>
              </label>
            ))}
            <p>{t("intentionalUpdate")}</p>
            <button
              disabled={reviewBusy || reviewResults === undefined}
              onClick={() => {
                if (
                  edit((p) => {
                    applyUpdate(p, review.id, review.pkg, mapping);
                  })
                )
                  setReview(undefined);
              }}
            >
              {t("applyUpdate")}
            </button>
            <button onClick={() => setReview(undefined)}>{t("cancel")}</button>
          </section>
        )}
      </section>
    </div>
  );
}
