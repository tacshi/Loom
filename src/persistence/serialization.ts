import type { Circuit, Project } from "../model/types";
import { canonical } from "../model/nets";
export function exportProject(project: Project) {
  return canonical(project) + "\n";
}
const encoder = new TextEncoder();
const utf8Bytes = (text: string) => encoder.encode(text).length;
const circuitBytes = new WeakMap<Circuit, number>();
function sizeOf(circuit: Circuit) {
  let bytes = circuitBytes.get(circuit);
  if (bytes === undefined) {
    bytes = utf8Bytes(JSON.stringify(circuit));
    circuitBytes.set(circuit, bytes);
  }
  return bytes;
}
/**
 * Exact byte length of `exportProject`. Committed circuits are immutable and
 * shared between edits, so only the circuits an edit changed are measured again.
 */
export function projectBytes(project: Project) {
  const { circuits, ...metadata } = project,
    entries = Object.entries(circuits);
  let bytes = utf8Bytes(JSON.stringify(metadata)) + ',"circuits":{}'.length + 1;
  for (const [id, circuit] of entries)
    bytes += utf8Bytes(JSON.stringify(id)) + 1 + sizeOf(circuit);
  return bytes + Math.max(0, entries.length - 1);
}
