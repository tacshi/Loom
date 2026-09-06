import type { Project } from "../model/types";
import { canonical } from "../model/nets";
export function exportProject(project: Project) {
  return canonical(project) + "\n";
}
