import type { Signal } from "./signal";
import type { Project } from "../model/types";
import { canonical, stableId } from "../model/nets";
export type PeripheralState =
  | { kind: "keyboard"; queue: number[]; uncertain: boolean }
  | { kind: "terminal"; bytes: number[]; uncertain: boolean }
  | { kind: "display"; pixels: Signal[] };
export type Transaction = {
  cycle: number;
  component: string;
  kind: "read" | "write" | "clear";
  address?: number;
  value: number;
  known: number;
};
export type ExecutionState = {
  transactions: Transaction[];
  fingerprint: string;
  cycle: number;
  eventOrder: number;
  registers: Record<string, Signal>;
  memory: Record<string, readonly (readonly Signal[])[]>;
  inputs: Record<string, number>;
  devices: Record<string, PeripheralState>;
};
export function semanticDocument(p: Project) {
  return {
    root: p.root,
    debug: p.debugProfile,
    cpu: p.cpu,
    circuits: Object.values(p.circuits).map((c) => ({
      id: c.id,
      parameters: c.parameters,
      ports: c.ports.map(
        ({ id, width, widthParameter, direction, componentId }) => ({
          id,
          width,
          widthParameter,
          direction,
          componentId,
        }),
      ),
      components: c.components.map(
        ({
          id,
          kind,
          width,
          params,
          definitionId,
          image,
          arguments: args,
          widthParameter,
          addressParameter,
        }) => ({
          id,
          kind,
          width,
          params: { ...params, value: kind === "input" ? 0 : params.value },
          definitionId,
          image,
          arguments: args,
          widthParameter,
          addressParameter,
        }),
      ),
      nets: c.nets.map(({ width, ports }) => ({ width, ports })),
    })),
  };
}
export function fingerprint(p: Project) {
  return stableId(canonical(semanticDocument(p)));
}
export function stateHash(s: ExecutionState) {
  return stableId(canonical(s));
}
export const PAGE_WORDS = 256;
