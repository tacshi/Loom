import { openDB, type DBSchema } from "idb";
import type { Project } from "../model/types";
import { validateProject } from "./validation";
interface LoomDB extends DBSchema {
  projects: { key: string; value: Project };
  snapshots: {
    key: string;
    value: {
      id: string;
      projectId: string;
      savedAt: number;
      project: Project;
    };
    indexes: { projectId: string };
  };
}
const database = () =>
  openDB<LoomDB>("loom-workbench", 1, {
    upgrade(db) {
      db.createObjectStore("projects", { keyPath: "id" });
      db.createObjectStore("snapshots", { keyPath: "id" }).createIndex(
        "projectId",
        "projectId",
      );
    },
  });
export async function saveProject(project: Project) {
  const db = await database();
  try {
    const tx = db.transaction(["projects", "snapshots"], "readwrite");
    const old = await tx.objectStore("projects").get(project.id);
    if (old && old.schemaVersion === 2 && old.updatedAt !== project.updatedAt)
      await tx.objectStore("snapshots").put({
        id: project.id + ":" + old.updatedAt,
        projectId: project.id,
        savedAt: old.updatedAt,
        project: old,
      });
    const snapshots = await tx
      .objectStore("snapshots")
      .index("projectId")
      .getAll(project.id);
    for (const s of snapshots.sort((a, b) => b.savedAt - a.savedAt).slice(8))
      await tx.objectStore("snapshots").delete(s.id);
    await tx.objectStore("projects").put(project);
    await tx.done;
  } finally {
    db.close();
  }
}
export async function listProjects() {
  const db = await database();
  try {
    return (await db.getAll("projects"))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((p) => ({
        id: p.id,
        name: p.name,
        updatedAt: p.updatedAt,
        schemaVersion: p.schemaVersion,
      }));
  } finally {
    db.close();
  }
}
export async function loadProject(id: string) {
  const db = await database();
  try {
    const raw = await db.get("projects", id);
    if (!raw) return;
    const project = validateProject(raw);
    return project;
  } finally {
    db.close();
  }
}
export async function recoveries(id: string) {
  const db = await database();
  try {
    return (await db.getAllFromIndex("snapshots", "projectId", id))
      .filter((s) => s.project.schemaVersion === 2)
      .sort((a, b) => b.savedAt - a.savedAt);
  } finally {
    db.close();
  }
}
