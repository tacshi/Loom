import type {
  Project,
  Diagnostic,
  TestVector,
  TestCase,
  TestAssertion,
} from "../model/types";
import type { Snapshot, VectorResult } from "./engine";
import type { TimelineInfo, Position } from "./timeline";
import type { sourceChain } from "./debug";
export type Breakpoint = {
  id: string;
  port: string;
  value: number;
  mode?:
    "equal" | "change" | "rising" | "falling" | "memoryRead" | "memoryWrite";
  address?: number;
};
export type Payload =
  | { type: "capture"; assertions: TestAssertion[] }
  | { type: "openTest"; test: TestCase; root: string }
  | { type: "exitTest" }
  | { type: "compile"; project: Project }
  | {
      type:
        | "reset"
        | "step"
        | "pause"
        | "instruction"
        | "back"
        | "backInstruction"
        | "ping";
    }
  | { type: "run"; hz: number }
  | { type: "input"; id: string; value: number }
  | {
      type: "memoryEdit";
      id: string;
      address: number;
      value: number;
      known?: number;
    }
  | { type: "keyboard"; id: string; text: string }
  | { type: "seek"; run: number; position: Position }
  | { type: "range"; run: number; start: number; end: number; probes: string[] }
  | { type: "source"; id: string; port: string }
  | {
      type: "subscribe";
      memoryIds: string[];
      probes: string[];
      breakpoints: Breakpoint[];
      sourceBreakpoints: number[];
    }
  | { type: "vectors"; project: Project; root: string; vectors: TestVector[] };
export type Command = Payload & {
  session: string;
  revision: number;
  requestId: number;
};
type Envelope = { session: string; revision: number; requestId: number };
export type Response = Envelope &
  (
    | {
        type: "state";
        snapshot: Snapshot;
        diagnostics: Diagnostic[];
        running: boolean;
        trace: Snapshot[];
        history: TimelineInfo;
        reason?: string;
      }
    | { type: "vectors"; results: VectorResult[] }
    | { type: "range"; trace: Snapshot[] }
    | { type: "source"; chain: ReturnType<typeof sourceChain> }
    | { type: "captured"; test: TestCase }
    | { type: "pong" }
    | { type: "failure"; reason: string }
  );
