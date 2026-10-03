import type { Project } from "../model/types";
import { editingScope } from "../model/definitions";

export type EditSnapshot =
  | { document: Project }
  | {
      mission: Pick<
        Project,
        | "root"
        | "name"
        | "circuits"
        | "source"
        | "assembledSource"
        | "sourceMap"
      >;
    };

export function editSnapshot(project: Project): EditSnapshot {
  if (!project.course) return { document: project };
  const { root, name, source, assembledSource, sourceMap } = project;
  return {
    mission: {
      root,
      name,
      source,
      assembledSource,
      sourceMap,
      circuits: Object.fromEntries(
        [...editingScope(project, root)].map((id) => [
          id,
          project.circuits[id],
        ]),
      ),
    },
  };
}

export function restoreSnapshot(
  current: Project,
  snapshot: EditSnapshot,
): Project {
  if ("document" in snapshot)
    return { ...snapshot.document, updatedAt: Date.now() };
  if (!current.course || current.root !== snapshot.mission.root) return current;
  return {
    ...current,
    ...snapshot.mission,
    circuits: { ...current.circuits, ...snapshot.mission.circuits },
    updatedAt: Date.now(),
  };
}
