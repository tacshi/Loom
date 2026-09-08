import type { Circuit, Kind, Project, TestCase } from "../model/types";
import type { TestResult } from "../verification/runner";
export type Copy = [string, string];
export type ConceptId =
  | "signals"
  | "and-basics"
  | "invert-basics"
  | "nand"
  | "not"
  | "and-or"
  | "xor"
  | "mux"
  | "mux8"
  | "seven-segment"
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
export type ExerciseId = import("./missions/types").MissionId;
export type CourseRecord = {
  source?: {
    source: string;
    assembledSource?: string;
    sourceMap?: Record<number, number>;
  };
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
  curriculum: 3;
  active: ExerciseId;
  drafts: Partial<Record<ExerciseId, string>>;
  accepted: Partial<Record<ExerciseId, CourseRecord>>;
  needsVerification?: boolean;
};
export type Exercise = {
  mission?: import("./missions/types").Mission;
  id: ExerciseId;
  revision: number;
  title: Copy;
  objective: Copy;
  hints: Copy[];
  prerequisites: ExerciseId[];
  allowed: Kind[];
  lesson: import("./lessons").Lesson;
  demonstration: () => Project;
  starter: () => Project;
  observed: () => import("../model/types").SignalRef[];
  reference: () => Project;
  checks: () => TestCase[];
};
export type ReferenceExercise = Omit<Exercise, "id" | "prerequisites"> & {
  id: ConceptId;
  prerequisites: ConceptId[];
};
export type CourseCheck = {
  verifiedWidths?: number[];
  sourceHash?: string;
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
  prepare?: boolean;
  practice?: boolean;
  example?: boolean;
};
export type CourseResponse = {
  progress?: { exercise: ExerciseId; caseName?: string };
  requestId: number;
  result?: CourseCheck;
  error?: string;
};
export type CourseInterface = Pick<Circuit, "ports">;
