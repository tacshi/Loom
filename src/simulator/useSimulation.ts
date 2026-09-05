import { useEffect, useMemo, useRef, useState } from "react";
import type { Project, Diagnostic, TestVector } from "../model/types";
import type { Snapshot, VectorResult } from "./engine";
import type { Command, Response, Breakpoint } from "./protocol";
function signature(p: Project) {
  return JSON.stringify({
    id: p.id,
    root: p.root,
    cpu: p.cpu,
    circuits: Object.values(p.circuits).map((c) => ({
      id: c.id,
      ports: c.ports.map(({ id, width, direction, componentId }) => ({
        id,
        width,
        direction,
        componentId,
      })),
      components: c.components.map(
        ({ id, kind, width, params, definitionId, image }) => ({
          id,
          kind,
          width,
          params: { ...params, value: kind === "input" ? 0 : params.value },
          definitionId,
          image,
        }),
      ),
      wires: c.wires.map(({ from, to }) => ({ from, to })),
    })),
  });
}
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
    [results, setResults] = useState<VectorResult[]>([]);
  const [restart, setRestart] = useState(0);
  const worker = useRef<Worker>(null);
  const session = useRef("");
  const revision = useRef(0);
  const seen = useRef(0);
  const vectorRequest = useRef(0);
  const resolveVectors = useRef<
    ((results: VectorResult[]) => void) | undefined
  >(undefined);
  const sig = useMemo(() => signature(project), [project]);
  const current = useRef(project);
  current.current = project;
  const subscription = useRef({
    memoryIds: [] as string[],
    probes: [] as string[],
    breakpoints: [] as Breakpoint[],
    sourceBreakpoints: [] as number[],
  });
  function post(command: Omit<Command, "session" | "revision">) {
    worker.current?.postMessage({
      ...command,
      session: session.current,
      revision: revision.current,
    });
  }
  useEffect(() => {
    const w = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
    worker.current = w;
    session.current = crypto.randomUUID();
    revision.current++;
    setRunning(false);
    setTrace([]);
    setResults([]);
    setReason("");
    seen.current = performance.now();
    w.onmessage = ({ data: r }: MessageEvent<Response>) => {
      if (r.session !== session.current || r.revision !== revision.current)
        return;
      seen.current = performance.now();
      if (r.type === "state") {
        setSnapshot(r.snapshot);
        setDiagnostics(r.diagnostics);
        setRunning(r.running);
        if (r.reason) setReason(r.reason);
        if (r.trace.length) setTrace((old) => [...old, ...r.trace].slice(-512));
      } else if (r.type === "vectors") {
        if (r.requestId === vectorRequest.current) {
          setResults(r.results);
          resolveVectors.current?.(r.results);
          resolveVectors.current = undefined;
        }
      } else {
        setReason("workerFailure");
        setRunning(false);
      }
    };
    w.onerror = () => {
      setReason("workerFailure");
      setRunning(false);
    };
    post({ type: "compile", project: current.current } as Omit<
      Command,
      "session" | "revision"
    >);
    w.postMessage({
      type: "subscribe",
      ...subscription.current,
      session: session.current,
      revision: revision.current,
    });
    const watch = setInterval(() => {
      if (performance.now() - seen.current > 7000) {
        w.terminate();
        setRunning(false);
        setReason("workerFailure");
      } else if (performance.now() - seen.current > 5000) {
        w.postMessage({
          type: "pause",
          session: session.current,
          revision: revision.current,
        });
      }
    }, 2000);
    return () => {
      resolveVectors.current?.([]);
      resolveVectors.current = undefined;
      clearInterval(watch);
      w.terminate();
    };
  }, [sig, restart]);
  const vectorSignature = JSON.stringify(
    Object.values(project.circuits).map((c) => c.vectors),
  );
  useEffect(() => {
    vectorRequest.current++;
    setResults([]);
  }, [vectorSignature]);
  useEffect(() => {
    for (const c of Object.values(project.circuits)
      .flatMap((c) => c.components)
      .filter((c) => c.kind === "input"))
      worker.current?.postMessage({
        type: "input",
        id: c.id,
        value: c.params.value ?? 0,
        session: session.current,
        revision: revision.current,
      });
  }, [project, sig, restart]);
  const command = (
    type: "reset" | "step" | "pause" | "instruction" | "run",
    hz = 10,
  ) => {
    setReason("");
    if (type === "reset") setTrace([]);
    worker.current?.postMessage({
      type,
      hz,
      session: session.current,
      revision: revision.current,
    });
  };
  const subscribe = (s: typeof subscription.current) => {
    subscription.current = s;
    worker.current?.postMessage({
      type: "subscribe",
      ...s,
      session: session.current,
      revision: revision.current,
    });
  };
  const vectors = (root: string, v: TestVector[]): Promise<VectorResult[]> => {
    resolveVectors.current?.([]);
    const result = new Promise<VectorResult[]>((resolve) => {
      resolveVectors.current = resolve;
    });
    setResults([]);
    vectorRequest.current++;
    worker.current?.postMessage({
      type: "vectors",
      project,
      root,
      vectors: v,
      requestId: vectorRequest.current,
      session: session.current,
      revision: revision.current,
    });
    return result;
  };
  return {
    snapshot,
    diagnostics,
    running,
    reason,
    trace,
    results,
    command,
    subscribe,
    vectors,
    recover: () => setRestart((x) => x + 1),
  };
}
