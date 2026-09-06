/// <reference lib="webworker" />
import { runCases } from "./runner";
import type { Project, TestCase } from "../model/types";
onmessage = ({
  data,
}: {
  data: {
    project: Project;
    root: string;
    cases: TestCase[];
    requestId: number;
  };
}) => {
  try {
    postMessage({
      requestId: data.requestId,
      results: runCases(data.project, data.root, data.cases),
    });
  } catch (e) {
    postMessage({ requestId: data.requestId, error: (e as Error).message });
  }
};
