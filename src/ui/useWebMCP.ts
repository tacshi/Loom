import { useEffect, useRef } from "react";
import type { VectorResult } from "../simulator/engine";
export function useWebMCP(run: () => Promise<VectorResult[]>) {
  const latest = useRef(run);
  latest.current = run;
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: "run_circuit_tests",
            title: "Run current circuit tests",
            description:
              "Open the visible test panel, run the current circuit’s saved input/output cases, and return expected and actual results. Does not modify circuit wiring or saved test cases.",
            inputSchema: {
              type: "object",
              properties: {},
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: true },
            async execute(input: unknown) {
              if (
                typeof input !== "object" ||
                input === null ||
                Array.isArray(input) ||
                Object.keys(input).length
              )
                throw new Error("Expected an empty object.");
              const results = await latest.current();
              return {
                cases: results.length,
                passed: results.length > 0 && results.every((r) => r.passed),
                results,
              };
            },
          },
          { signal: lifecycle.signal },
        ),
      ).catch(() => {});
    } catch {
      /* Optional browser integration; the visible test workflow stays available. */
    }
    return () => lifecycle.abort();
  }, []);
}
