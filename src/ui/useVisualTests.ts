import { closure } from "../library/package";
import { useEffect, useRef, useState, useMemo } from "react";
import type { Project, TestCase, SignalRef } from "../model/types";
import type { Snapshot } from "../simulator/engine";
import type { TestResult } from "../verification/runner";
import type { sourceChain } from "../simulator/debug";
export function useVisualTests(project: Project, root: string) {
  const documentKey = useMemo(
    () => JSON.stringify(closure(project, root)),
    [project.circuits, root],
  );
  const [results, setResults] = useState<TestResult[]>([]),
    [cases, setCases] = useState<TestCase[]>([]);
  const [snapshot, setSnapshot] = useState<Snapshot>(),
    [chain, setChain] = useState<ReturnType<typeof sourceChain>>([]);
  const [loadingCase, setLoadingCase] = useState(false);
  const [active, setActive] = useState(false),
    [busy, setBusy] = useState(false),
    [playing, setPlaying] = useState(false);
  const [index, setIndex] = useState(-1),
    [error, setError] = useState(""),
    [progress, setProgress] = useState(0);
  const worker = useRef<Worker | undefined>(undefined),
    request = useRef(0),
    replaying = useRef(false);
  const current = useRef({ project, root, cases });
  current.current = { project, root, cases };
  const rows = useMemo(
    () =>
      results.flatMap((r, caseIndex) =>
        (r.checkpoints ?? []).map((checkpoint) => ({
          ...checkpoint,
          caseIndex,
          caseName: r.name,
        })),
      ),
    [results],
  );
  const close = () => {
    request.current++;
    worker.current?.terminate();
    worker.current = undefined;
    replaying.current = false;
    setLoadingCase(false);
    setActive(false);
    setBusy(false);
    setPlaying(false);
    setSnapshot(undefined);
    setChain([]);
    setIndex(-1);
  };
  useEffect(() => {
    close();
    setResults([]);
    setCases([]);
    setError("");
  }, [documentKey, root, project.id]);
  useEffect(() => () => worker.current?.terminate(), []);
  function ensureWorker() {
    if (!worker.current)
      worker.current = new Worker(
        new URL("../verification/visual.worker.ts", import.meta.url),
        { type: "module" },
      );
    return worker.current;
  }
  function select(rowIndex: number) {
    const row = rows[rowIndex];
    if (!row) return;
    if (replaying.current) {
      worker.current?.terminate();
      worker.current = undefined;
    }
    const w = ensureWorker(),
      id = ++request.current;
    setLoadingCase(true);
    setIndex(rowIndex);
    setChain([]);
    replaying.current = true;
    w.onmessage = ({ data }) => {
      if (data.requestId !== request.current) return;
      replaying.current = false;
      setLoadingCase(false);
      if (data.error) {
        setError(data.error);
        setPlaying(false);
      } else if (data.snapshot) setSnapshot(data.snapshot);
      if (row.assertions.some((a) => !a.passed)) setPlaying(false);
    };
    w.onerror = () => {
      if (id !== request.current) return;
      replaying.current = false;
      setLoadingCase(false);
      setError("testLimit");
      setPlaying(false);
    };
    w.postMessage({
      type: "replay",
      requestId: id,
      ...current.current,
      caseIndex: row.caseIndex,
      step: row.step,
    });
  }
  function present(
    testCases: TestCase[],
    testResults: TestResult[],
    autoplay = true,
    message?: string,
  ) {
    close();
    setCases(testCases);
    setResults(testResults);
    setActive(true);
    setError(message ?? "");
    setIndex(-1);
    setPlaying(autoplay);
    setBusy(false);
  }
  function run(testCases: TestCase[]) {
    close();
    setCases(testCases);
    setResults([]);
    setActive(true);
    setBusy(true);
    setError("");
    setProgress(0);
    const w = ensureWorker(),
      id = ++request.current;
    w.onmessage = ({ data }) => {
      if (data.requestId !== request.current) return;
      if (data.progress) setProgress(data.progress);
      if (data.error) {
        setError(data.error);
        setBusy(false);
      }
      if (data.results) {
        setResults(data.results);
        setBusy(false);
        setPlaying(true);
      }
    };
    w.onerror = () => {
      if (id !== request.current) return;
      setError("testLimit");
      setBusy(false);
    };
    w.postMessage({
      type: "run",
      requestId: id,
      project,
      root,
      cases: testCases,
    });
  }
  useEffect(() => {
    if (!active || busy || !rows.length || index !== -1) return;
    select(0);
  }, [active, busy, results]);
  useEffect(() => {
    if (!playing || busy || index < 0) return;
    const timer = setTimeout(() => {
      if (replaying.current) return;
      if (index + 1 < rows.length) select(index + 1);
      else setPlaying(false);
    }, 500);
    return () => clearTimeout(timer);
  }, [playing, busy, index, snapshot]);
  function trace(ref: SignalRef) {
    if (!snapshot || replaying.current) return;
    setPlaying(false);
    const w = ensureWorker(),
      id = ++request.current;
    w.onmessage = ({ data }) => {
      if (data.requestId === request.current && data.chain)
        setChain(data.chain);
    };
    w.postMessage({ type: "trace", requestId: id, ref });
  }
  return {
    active,
    loadingCase,
    busy,
    playing,
    index,
    results,
    cases,
    rows,
    snapshot,
    chain,
    error,
    progress,
    run,
    begin: () => {
      close();
      setResults([]);
      setCases([]);
      setActive(true);
      setBusy(true);
      setError("");
      setProgress(0);
    },
    present,
    close,
    trace,
    select: (i: number) => {
      setPlaying(false);
      select(i);
    },
    pause: () => setPlaying(false),
    play: () => {
      if (
        index >= rows.length - 1 ||
        rows[index]?.assertions.some((a) => !a.passed)
      )
        select(0);
      setPlaying(true);
    },
    next: () => {
      setPlaying(false);
      select(Math.min(index + 1, rows.length - 1));
    },
    finish: () => {
      setPlaying(false);
      const failed = rows.findIndex((r) => r.assertions.some((a) => !a.passed));
      select(failed < 0 ? rows.length - 1 : failed);
    },
  };
}
export type VisualTests = ReturnType<typeof useVisualTests>;
