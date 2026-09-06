import { useEffect, useMemo, useRef, useState } from "react";
import type {
  Project,
  Diagnostic,
  TestVector,
  TestCase,
  TestAssertion,
} from "../model/types";
import type { Snapshot, VectorResult } from "./engine";
import type { Payload, Response, Breakpoint } from "./protocol";
import type { TimelineInfo, Position } from "./timeline";
import type { sourceChain } from "./debug";
import { semanticDocument } from "./state";
export function useSimulation(project: Project) {
  const [snapshot, setSnapshot] = useState<Snapshot>({
      cycle: 0,
      values: {},
      memory: {},
    }),
    [diagnostics, setDiagnostics] = useState<Diagnostic[]>([]),
    [running, setRunning] = useState(false),
    [reason, setReason] = useState(""),
    [trace, setTrace] = useState<Snapshot[]>([]),
    [results, setResults] = useState<VectorResult[]>([]),
    [history, setHistory] = useState<TimelineInfo>(),
    [range, setRange] = useState<Snapshot[]>([]),
    [chain, setChain] = useState<ReturnType<typeof sourceChain>>([]),
    [restart, setRestart] = useState(0),
    [captured, setCaptured] = useState<TestCase>(),
    [isolated, setIsolated] = useState(false);
  const worker = useRef<Worker>(null),
    session = useRef(""),
    revision = useRef(0),
    request = useRef(0),
    seen = useRef(0),
    latestSeek = useRef(0),
    latestRange = useRef(0),
    vectorRequest = useRef(0),
    resolveVectors = useRef<((r: VectorResult[]) => void) | undefined>(
      undefined,
    );
  const sig = useMemo(
      () => JSON.stringify(semanticDocument(project)),
      [project],
    ),
    current = useRef(project);
  current.current = project;
  const subscription = useRef({
    memoryIds: [] as string[],
    probes: [] as string[],
    breakpoints: [] as Breakpoint[],
    sourceBreakpoints: [] as number[],
  });
  function post(payload: Payload) {
    const requestId = ++request.current;
    worker.current?.postMessage({
      ...payload,
      requestId,
      session: session.current,
      revision: revision.current,
    });
    return requestId;
  }
  useEffect(() => {
    const w = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    worker.current = w;
    session.current = crypto.randomUUID();
    revision.current++;
    latestSeek.current = 0;
    setRunning(false);
    setIsolated(false);
    setTrace([]);
    setRange([]);
    setResults([]);
    setHistory(undefined);
    setSnapshot({ cycle: 0, values: {}, memory: {} });
    setReason("");
    seen.current = performance.now();
    w.onmessage = ({ data: r }: MessageEvent<Response>) => {
      if (r.session !== session.current || r.revision !== revision.current)
        return;
      seen.current = performance.now();
      switch (r.type) {
        case "state":
          if (r.requestId < latestSeek.current) return;
          setSnapshot(r.snapshot);
          setDiagnostics(r.diagnostics);
          setRunning(r.running);
          setHistory(r.history);
          if (r.reason) setReason(r.reason);
          if (r.trace.length)
            setTrace((old) => [...old, ...r.trace].slice(-512));
          break;
        case "range":
          if (r.requestId === latestRange.current) setRange(r.trace);
          break;
        case "captured":
          setCaptured(r.test);
          break;
        case "source":
          setChain(r.chain);
          break;
        case "vectors":
          if (r.requestId === vectorRequest.current) {
            setResults(r.results);
            resolveVectors.current?.(r.results);
            resolveVectors.current = undefined;
          }
          break;
        case "failure":
          setReason(r.reason);
          setRunning(false);
          break;
      }
    };
    w.onerror = () => {
      setReason("workerFailure");
      setRunning(false);
    };
    post({ type: "compile", project: current.current });
    post({ type: "subscribe", ...subscription.current });
    let lastWatch = performance.now();
    const wake = () => {
      seen.current = performance.now();
      lastWatch = seen.current;
      post({ type: "ping" });
    };
    window.addEventListener("focus", wake);
    document.addEventListener("visibilitychange", wake);
    const watch = setInterval(() => {
      const now = performance.now(),
        timerWasSuspended = now - lastWatch > 5000;
      lastWatch = now;
      if (
        timerWasSuspended ||
        document.visibilityState !== "visible" ||
        !document.hasFocus()
      ) {
        seen.current = performance.now();
        return;
      }
      if (performance.now() - seen.current > 15000) {
        w.terminate();
        setRunning(false);
        setReason("workerFailure");
      } else post({ type: "ping" });
    }, 2000);
    return () => {
      resolveVectors.current?.([]);
      resolveVectors.current = undefined;
      clearInterval(watch);
      window.removeEventListener("focus", wake);
      document.removeEventListener("visibilitychange", wake);
      w.terminate();
    };
  }, [sig, restart]);
  // Only actual root input changes generate events; layout edits never branch history.
  const inputValues = JSON.stringify(
    project.circuits[project.root]?.components
      .filter((c) => c.kind === "input")
      .map((c) => [c.id, c.params.value ?? 0]),
  );
  useEffect(() => {
    for (const [id, value] of JSON.parse(inputValues) as [string, number][])
      post({ type: "input", id, value });
  }, [inputValues, sig, restart]);
  const vectorSignature = JSON.stringify(
    Object.values(project.circuits).map((c) => c.vectors),
  );
  useEffect(() => {
    setResults([]);
  }, [vectorSignature]);
  const command = (
    type:
      | "reset"
      | "step"
      | "pause"
      | "instruction"
      | "run"
      | "back"
      | "backInstruction",
    hz = 10,
  ) => {
    setReason("");
    if (["reset", "back", "backInstruction"].includes(type)) {
      setTrace([]);
      setRange([]);
    }
    post(type === "run" ? { type, hz } : { type });
  };
  const subscribe = (s: typeof subscription.current) => {
    subscription.current = s;
    post({ type: "subscribe", ...s });
  };
  const vectors = (root: string, v: TestVector[]) => {
    resolveVectors.current?.([]);
    const promise = new Promise<VectorResult[]>((r) => {
      resolveVectors.current = r;
    });
    setResults([]);
    vectorRequest.current = post({
      type: "vectors",
      project,
      root,
      vectors: v,
    });
    return promise;
  };
  const seek = (run: number, position: Position) => {
    setReason("");
    setTrace([]);
    latestSeek.current = post({ type: "seek", run, position });
  };
  const fetchRange = (
    run: number,
    start: number,
    end: number,
    probes: string[],
  ) => {
    latestRange.current = post({ type: "range", run, start, end, probes });
  };
  return {
    captured,
    clearCaptured: () => setCaptured(undefined),
    isolated,
    capture: (assertions: TestAssertion[]) =>
      post({ type: "capture", assertions }),
    openTest: (test: TestCase, root: string) => {
      setIsolated(true);
      post({ type: "openTest", test, root });
    },
    exitTest: () => {
      setIsolated(false);
      setReason("");
      post({ type: "exitTest" });
    },
    snapshot,
    diagnostics,
    running,
    reason,
    trace,
    results,
    history,
    range,
    chain,
    command,
    subscribe,
    vectors,
    seek,
    fetchRange,
    inspectSource: (id: string, port: string) =>
      post({ type: "source", id, port }),
    memoryEdit: (id: string, address: number, value: number, known?: number) =>
      post({ type: "memoryEdit", id, address, value, known }),
    keyboard: (id: string, text: string) =>
      post({ type: "keyboard", id, text }),
    recover: () => setRestart((x) => x + 1),
  };
}
