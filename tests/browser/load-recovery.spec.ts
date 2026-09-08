import { test, expect } from "@playwright/test";
import { newCourse } from "../../src/course/session";

test("a failed saved-project load offers recovery without rewriting that project", async ({
  page,
}) => {
  const incompatible = JSON.parse(JSON.stringify(newCourse()));
  delete incompatible.course.curriculum;
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.evaluate(async (project) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("loom-workbench", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction("projects", "readwrite");
    tx.objectStore("projects").put(project);
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
    localStorage.setItem("loom-current", project.id);
  }, incompatible);
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Input", exact: true }),
  ).toBeDisabled();
  const recovery = page.getByRole("alert");
  await expect(recovery).toContainText("Could not open the saved project");
  await recovery
    .getByRole("button", { name: "New circuit", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Input", exact: true }),
  ).toBeEnabled();
  await expect(recovery).toHaveCount(0);
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  const original = await page.evaluate(async (id) => {
    const db = await new Promise<IDBDatabase>((resolve) => {
      const r = indexedDB.open("loom-workbench", 1);
      r.onsuccess = () => resolve(r.result);
    });
    const value = await new Promise((resolve) => {
      const r = db.transaction("projects").objectStore("projects").get(id);
      r.onsuccess = () => resolve(r.result);
    });
    db.close();
    return value;
  }, incompatible.id);
  expect(original).toEqual(incompatible);
});
