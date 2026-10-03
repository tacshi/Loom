import { exportProject } from "../persistence/serialization";
import { useEffect, useRef, useState } from "react";
import type { Project } from "../model/types";
import { uid } from "../model/types";
import { listProjects, recoveries, loadProject } from "../persistence/store";
import { MAX_FILE_BYTES, parseProject } from "../persistence/validation";
import { suffixedName } from "../model/names";
export default function Projects({
  project,
  open,
  close,
  flush,
  t,
  recoveryProjectId,
}: {
  project: Project;
  open: (p: Project) => Promise<void>;
  close: () => void;
  flush: () => Promise<boolean>;
  t: (s: string) => string;
  recoveryProjectId?: string;
}) {
  const [list, setList] = useState<Awaited<ReturnType<typeof listProjects>>>(
      [],
    ),
    [versions, setVersions] = useState<Awaited<ReturnType<typeof recoveries>>>(
      [],
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [recoveryId, setRecoveryId] = useState(recoveryProjectId ?? project.id);
  const operation = useRef(false);
  const file = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let live = true;
    void flush()
      .then(() => listProjects())
      .then((items) => {
        if (live) setList(items);
      })
      .catch(() => setError("loadFailed"));
    setVersions([]);
    void recoveries(recoveryId)
      .then((items) => {
        if (live) setVersions(items);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [project.id, recoveryId]);
  useEffect(
    () => setRecoveryId(recoveryProjectId ?? project.id),
    [project.id, recoveryProjectId],
  );
  async function perform(action: () => Promise<void>) {
    if (operation.current) return;
    operation.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err instanceof Error ? err.message : "loadFailed");
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }
  const copy = async () => {
    const p = structuredClone(project);
    p.id = uid();
    p.name = suffixedName(p.name, " — " + t("copy"));
    p.updatedAt = Date.now();
    await open(p);
  };
  async function download() {
    await flush();
    const blob = new Blob([exportProject(project)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = project.name.replace(/[^\p{L}\p{N}_-]/gu, "_") + ".loom.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="modal-backdrop" onClick={close}>
      <section
        className="dialog projects-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={t("projects")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dialog-heading">
          <h2>{t("projects")}</h2>
          <button autoFocus onClick={close} aria-label={t("close")}>
            ×
          </button>
        </div>
        <div className="project-actions">
          <button disabled={busy} onClick={() => void perform(download)}>
            {t("export")}
          </button>
          <button disabled={busy} onClick={() => file.current?.click()}>
            {t("import")}
          </button>
          <button disabled={busy} onClick={() => void perform(copy)}>
            {t("duplicateProject")}
          </button>
          <button
            onClick={() => {
              void navigator.storage
                ?.persist()
                .then((allowed) =>
                  setError(
                    allowed ? "storagePersistent" : "storageNotPersistent",
                  ),
                );
            }}
          >
            {t("keepStorage")}
          </button>
        </div>
        <input
          ref={file}
          hidden
          type="file"
          accept=".json,.loom.json,application/json"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            await perform(async () => {
              if (f.size > MAX_FILE_BYTES) throw new Error("fileTooLarge");
              const text = await f.text();
              const p = parseProject(text);
              p.id = uid();
              p.updatedAt = Date.now();
              await open(p);
            });
            e.target.value = "";
          }}
        />
        {error && (
          <p className="notice" role="alert">
            {t(error)}
          </p>
        )}
        <div className="project-list">
          {list.map((p) => (
            <button
              key={p.id}
              disabled={busy}
              onClick={() =>
                void perform(async () => {
                  if (!(await flush())) throw new Error("saveFailed");
                  try {
                    const loaded = await loadProject(p.id);
                    if (!loaded) throw new Error("loadFailed");
                    await open(loaded);
                  } catch {
                    setRecoveryId(p.id);
                    throw new Error("loadFailed");
                  }
                })
              }
            >
              <span>
                {p.name}
                {p.id === project.id ? " · " + t("current") : ""}
              </span>
              <time>{new Date(p.updatedAt).toLocaleString()}</time>
            </button>
          ))}
        </div>
        {versions.length > 0 && (
          <details open={recoveryId !== project.id ? true : undefined}>
            <summary>
              {t("recoverySnapshots")}
              {recoveryId !== project.id &&
                ` · ${list.find((p) => p.id === recoveryId)?.name ?? ""}`}
            </summary>
            {versions.map((v) => (
              <button
                key={v.id}
                className="recovery-row"
                disabled={busy}
                onClick={() =>
                  void perform(async () => {
                    const p = parseProject(JSON.stringify(v.project));
                    p.id = uid();
                    p.name = suffixedName(p.name, " — " + t("recovered"));
                    p.updatedAt = Date.now();
                    await open(p);
                  })
                }
              >
                {new Date(v.savedAt).toLocaleString()}
                <span>{t("restoreCopy")}</span>
              </button>
            ))}
          </details>
        )}
        <p className="storage-note">{t("storageNote")}</p>
      </section>
    </div>
  );
}
