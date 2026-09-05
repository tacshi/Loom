import type { Project, Diagnostic, TestVector } from "../model/types";
import type { Snapshot, VectorResult } from "./engine";
export type Breakpoint = { id: string; port: string; value: number };
export type Command = { session: string; revision: number } & (
  | { type: "compile"; project: Project }
  | { type: "reset" | "step" | "pause" | "instruction" }
  | { type: "run"; hz: number }
  | { type: "input"; id: string; value: number }
  | {
      type: "subscribe";
      memoryIds: string[];
      probes: string[];
      breakpoints: Breakpoint[];
      sourceBreakpoints: number[];
    }
  | {
      type: "vectors";
      project: Project;
      root: string;
      vectors: TestVector[];
      requestId: number;
    }
);
export type Response =
  | {
      session: string;
      revision: number;
      type: "state";
      snapshot: Snapshot;
      diagnostics: Diagnostic[];
      running: boolean;
      trace: Snapshot[];
      reason?: string;
    }
  | {
      session: string;
      revision: number;
      type: "vectors";
      requestId: number;
      results: VectorResult[];
    }
  | { session: string; revision: number; type: "failure"; reason: string };
