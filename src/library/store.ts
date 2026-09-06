import { openDB } from "idb";
import type { ComponentPackage } from "./package";
import { parsePackage } from "./package";
const db = () =>
  openDB("loom-libraries", 1, {
    upgrade(d) {
      d.createObjectStore("versions", { keyPath: ["id", "version"] });
    },
  });
export async function install(pkg: ComponentPackage) {
  await parsePackage(JSON.stringify(pkg));
  const d = await db(),
    tx = d.transaction("versions", "readwrite"),
    existing = await tx.store.get([pkg.id, pkg.version]);
  if (existing && existing.hash !== pkg.hash) {
    tx.abort();
    throw new Error("libraryConflict");
  }
  await tx.store.put(pkg);
  await tx.done;
}
export async function catalog(): Promise<ComponentPackage[]> {
  return (await (await db()).getAll("versions")).sort(
    (a, b) => a.id.localeCompare(b.id) || a.version - b.version,
  );
}
