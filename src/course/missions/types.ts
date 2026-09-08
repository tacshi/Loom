import type { Kind, Project, TestCase } from "../../model/types";
import type { Copy } from "../types";

export type MissionId = `core-${string}` | `project-${string}`;
export type Mission = {
  id: MissionId;
  chapter: number;
  track: "core" | "project";
  work: "construction" | "repair" | "program";
  title: Copy;
  goal: Copy;
  concept: Copy;
  supplied: Copy;
  hints: [Copy, Copy, Copy];
  prerequisites: MissionId[];
  mode: "logic" | "clock" | "cpu";
  allowed: Kind[];
  starter: () => Project;
  reference: () => Project;
  checks: () => TestCase[];
};
