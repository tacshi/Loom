import { useEffect, useMemo, useRef, useState } from "react";
import type { Project } from "../model/types";
import { loadProject, saveProject } from "./store";
export function usePersistence(
  project: Project,
  setProject: (p: Project) => void,
) {
  const [loadError, setLoadError] = useState(false);
  const [failedProjectId, setFailedProjectId] = useState<string>();
  const [loaded, setLoaded] = useState(false),
    [owner, setOwner] = useState<string>(),
    [status, setStatus] = useState("loading");
  const initialId = useRef(project.id);
  const current = useRef(project);
  current.current = project;
  const saved = useRef("");
  const latestStatus = useRef(status);
  latestStatus.current = status;
  const queue = useRef<Promise<void>>(Promise.resolve());
  const pendingWrites = useRef(0);
  const owned = useRef<string | undefined>(undefined);
  owned.current = owner;
  useEffect(() => {
    let live = true;
    const id = localStorage.getItem("loom-current");
    (async () => {
      try {
        const found = id ? await loadProject(id) : undefined;
        if (live && found) {
          saved.current = JSON.stringify(found);
          setProject(found);
        }
      } catch {
        if (live) {
          setStatus("loadFailed");
          setLoadError(true);
          setFailedProjectId(id ?? undefined);
        }
      } finally {
        if (live) setLoaded(true);
      }
    })();
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!loaded || loadError) return;
    let release: (() => void) | undefined,
      cancelled = false;
    setOwner(undefined);
    setStatus("loading");
    if (!navigator.locks) {
      setStatus("locksUnavailable");
      return;
    }
    const leave = () => {
      cancelled = true;
      if (
        owned.current === project.id &&
        saved.current !== JSON.stringify(current.current)
      )
        void flush();
      const relinquish = () => {
        if (owned.current === project.id) owned.current = undefined;
        release?.();
      };
      setOwner(undefined);
      // A cached document must not keep ownership after navigation.
      if (pendingWrites.current)
        void queue.current.then(relinquish, relinquish);
      else relinquish();
    };
    const restore = (e: PageTransitionEvent) => {
      if (e.persisted) location.reload();
    };
    window.addEventListener("pagehide", leave);
    window.addEventListener("pageshow", restore);
    navigator.locks
      .request(
        "loom-project:" + project.id,
        { ifAvailable: true },
        async (lock) => {
          if (cancelled) return;
          if (!lock) {
            setStatus("readOnly");
            return;
          }
          setOwner(project.id);
          setStatus("saved");
          localStorage.setItem("loom-current", project.id);
          await new Promise<void>((resolve) => {
            release = resolve;
          });
        },
      )
      .catch(() => setStatus("readOnly"));
    return () => {
      cancelled = true;
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("pageshow", restore);
      release?.();
    };
  }, [project.id, loaded, loadError]);
  useEffect(() => {
    if (loadError && project.id !== initialId.current) {
      setLoadError(false);
      setFailedProjectId(undefined);
    }
  }, [project.id]);
  async function flush() {
    const p = structuredClone(current.current);
    if (owned.current !== p.id)
      return ["readOnly", "locksUnavailable", "loadFailed"].includes(
        latestStatus.current,
      );
    const data = JSON.stringify(p);
    if (saved.current === data) return true;
    setStatus("saving");
    let okay = true;
    pendingWrites.current += 1;
    queue.current = queue.current
      .catch(() => {})
      .then(() => saveProject(p))
      .then(() => {
        saved.current = data;
        if (current.current.id === p.id && owned.current === p.id)
          setStatus(
            JSON.stringify(current.current) === data ? "saved" : "saving",
          );
      })
      .catch(() => {
        okay = false;
        setStatus("saveFailed");
      })
      .finally(() => {
        pendingWrites.current -= 1;
      });
    await queue.current;
    return okay;
  }
  useEffect(() => {
    if (!loaded || owner !== project.id) return;
    setStatus(saved.current === JSON.stringify(project) ? "saved" : "saving");
    const timer = setTimeout(() => void flush(), 400);
    return () => clearTimeout(timer);
  }, [project, loaded, owner]);
  useEffect(() => {
    const before = (e: BeforeUnloadEvent) => {
      if (
        owned.current === current.current.id &&
        JSON.stringify(current.current) !== saved.current
      ) {
        e.preventDefault();
      }
    };
    const hidden = () => {
      if (document.visibilityState === "hidden") void flush();
    };
    window.addEventListener("beforeunload", before);
    document.addEventListener("visibilitychange", hidden);
    return () => {
      window.removeEventListener("beforeunload", before);
      document.removeEventListener("visibilitychange", hidden);
    };
  }, []);
  const serialized = useMemo(() => JSON.stringify(project), [project]);
  const displayStatus = loadError
    ? "loadFailed"
    : !loaded
      ? "loading"
      : owner !== project.id
        ? ["readOnly", "locksUnavailable"].includes(status)
          ? status
          : "loading"
        : saved.current !== serialized && status !== "saveFailed"
          ? "saving"
          : status;
  return {
    loaded,
    failedProjectId,
    writable: owner === project.id,
    status: displayStatus,
    flush,
  };
}
