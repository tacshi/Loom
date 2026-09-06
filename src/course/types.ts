import type { Circuit, Kind, Project, TestCase } from "../model/types";
import type { TestResult } from "../verification/runner";
export type Copy = [string, string];
export type ExerciseId =
  | "nand"
  | "not"
  | "and-or"
  | "xor"
  | "mux"
  | "mux8"
  | "half-adder"
  | "full-adder"
  | "adder8"
  | "subtract"
  | "register"
  | "accumulator"
  | "pc"
  | "pc-fields"
  | "alu"
  | "control"
  | "cpu"
  | "io"
  | "calculator";
export type CourseRecord = {
  verifiedWidths?: number[];
  hash: string;
  exerciseRevision: number;
  dependencies: Record<string, string>;
  acceptedRoot: string;
};
export type CourseState = {
  sources?: Partial<
    Record<
      ExerciseId,
      {
        source: string;
        assembledSource?: string;
        sourceMap?: Record<number, number>;
      }
    >
  >;
  id: "build-computer";
  active: ExerciseId;
  drafts: Partial<Record<ExerciseId, string>>;
  accepted: Partial<Record<ExerciseId, CourseRecord>>;
  needsVerification?: boolean;
};
export type Exercise = {
  id: ExerciseId;
  revision: number;
  title: Copy;
  objective: Copy;
  hints: [Copy, Copy, Copy];
  prerequisites: ExerciseId[];
  allowed: Kind[];
  reference: () => Project;
  checks: () => TestCase[];
};
export type CourseCheck = {
  verifiedWidths?: number[];
  exercise: ExerciseId;
  status: "blocked" | "invalid" | "failed" | "passed" | "limit";
  message?: string;
  hash?: string;
  dependencies?: Record<string, string>;
  results: TestResult[];
  cases: TestCase[];
};
export type CourseRequest = {
  requestId: number;
  project: Project;
  exercise: ExerciseId;
  reverify?: boolean;
};
export type CourseResponse = {
  progress?: { exercise: ExerciseId; caseName?: string };
  requestId: number;
  result?: CourseCheck;
  error?: string;
};
export type CourseInterface = Pick<Circuit, "ports">;
