/// <reference lib="webworker" />
import { runCase, componentKey } from "./runner";
import { replayCheckpoint } from "./replay";
import { sourceChain } from "../simulator/debug";
import type { Project, TestCase, SignalRef } from "../model/types";
import type { Engine } from "../simulator/engine";
let engine: Engine | undefined;
onmessage = ({
  data,
}: MessageEvent<{
  type: "run" | "replay" | "trace";
  requestId: number;
  project: Project;
  root: string;
  cases: TestCase[];
  caseIndex?: number;
  step?: number;
  ref?: SignalRef;
}>) => {
  try {
    if (data.type === "run") {
      const results = [];
      for (const test of data.cases) {
        const result = runCase(data.project, data.root, test);
        results.push(result);
        postMessage({ requestId: data.requestId, progress: results.length });
        if (result.status !== "passed") break;
      }
      postMessage({ requestId: data.requestId, results });
    } else if (data.type === "replay") {
      engine = replayCheckpoint(
        data.project,
        data.root,
        data.cases[data.caseIndex!],
        data.step!,
      );
      postMessage({ requestId: data.requestId, snapshot: engine.snapshot() });
    } else if (engine && data.ref) {
      postMessage({
        requestId: data.requestId,
        chain: sourceChain(
          engine,
          [...data.ref.instancePath, data.ref.componentId].join("/"),
          data.ref.portId,
        ),
      });
    }
  } catch (e) {
    postMessage({ requestId: data.requestId, error: (e as Error).message });
  }
};
