import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { emptyProject, createComponent } from "../../src/model/types";
import { parseProject } from "../../src/persistence/validation";
import { placeComponent } from "./placeComponent";

async function saved(page: Page) {
  await expect(page.locator(".local-indicator")).toHaveAttribute(
    "data-status",
    "saved",
  );
}
async function exported(page: Page) {
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export file", exact: true }).click();
  const project = parseProject(
    await readFile((await (await download).path())!, "utf8"),
  );
  await page.getByRole("button", { name: "Close", exact: true }).click();
  return project;
}

test("a ROM word written beyond its image survives export, reopen and later saves", async ({
  page,
}) => {
  await page.goto("/");
  await saved(page);
  await placeComponent(page, "ROM");
  await page.getByLabel("Bit width", { exact: true }).fill("8");
  await page.getByLabel("Memory word 10", { exact: true }).fill("2A");
  await page.getByLabel("Memory word 10", { exact: true }).press("Enter");
  const project = await exported(page);
  expect(project.circuits[project.root].components[0].image).toEqual([
    ...Array(10).fill(0),
    42,
  ]);
  await page.reload();
  await saved(page);
  await page.getByLabel("Project", { exact: true }).fill("Edited ROM");
  await saved(page);
  await page.reload();
  await saved(page);
  await page.getByRole("tab", { name: "Circuit", exact: true }).click();
  await page.getByRole("button", { name: "ROM ROM", exact: true }).click();
  await expect(page.getByLabel("Memory word 10", { exact: true })).toHaveValue(
    "2A",
  );
  await page.getByLabel("Bit width", { exact: true }).fill("1");
  await page.getByLabel("Bit width", { exact: true }).press("Tab");
  await expect(page.getByLabel("Bit width", { exact: true })).toHaveValue("8");
  await expect(page.locator(".canvas-notice")).toContainText("stored word");
});

test("decoder widths are bounded by the current file format", async ({
  page,
}) => {
  await page.goto("/");
  await saved(page);
  await placeComponent(page, "Decoder");
  const width = page.getByLabel("Bit width", { exact: true });
  await expect(width).toHaveAttribute("max", "5");
  await width.fill("6");
  await width.press("Tab");
  await expect(width).toHaveValue("5");
  await exported(page);
  await page.reload();
  await saved(page);
  await expect(page.locator(".load-recovery")).toHaveCount(0);
});

test("invalid metadata and recursive imports leave the current draft open", async ({
  page,
}) => {
  await page.goto("/");
  await saved(page);
  await page.getByLabel("Project", { exact: true }).fill("Keep this draft");
  await saved(page);
  const bad = emptyProject("Invalid metadata");
  const recursive = emptyProject("Recursive");
  const instance = createComponent("instance", 0, 0);
  instance.definitionId = recursive.root;
  recursive.circuits[recursive.root].components.push(instance);
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  for (const project of [{ ...bad, assembledSource: 42 }, recursive]) {
    await page
      .locator('input[type="file"]')
      .setInputFiles({
        name: "invalid.loom.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(project)),
      });
    await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  }
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    "Keep this draft",
  );
  await expect(
    page.getByRole("button", { name: "Input", exact: true }),
  ).toBeEnabled();
});

test("reopening the current project flushes pending edits before reading storage", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = window.setTimeout.bind(window);
    (window as any).setTimeout = (
      handler: TimerHandler,
      delay?: number,
      ...args: any[]
    ) =>
      original(
        handler,
        (window as any).__deferAutosave && delay === 400 ? 30000 : delay,
        ...args,
      );
  });
  await page.goto("/");
  await saved(page);
  await page.evaluate(() => {
    (window as any).__deferAutosave = true;
  });
  await page.getByLabel("Project", { exact: true }).fill("Newest pending name");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /· current/ })
    .click();
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    "Newest pending name",
  );
  await page.reload();
  await saved(page);
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    "Newest pending name",
  );
});

test("maximum-length project names remain valid after duplication", async ({
  page,
}) => {
  await page.goto("/");
  await saved(page);
  await page.getByLabel("Project", { exact: true }).fill("a".repeat(200));
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .getByRole("button", { name: "Duplicate project", exact: true })
    .click();
  await saved(page);
  const project = await exported(page);
  expect(project.name.length).toBeLessThanOrEqual(200);
  expect(project.name.endsWith(" — copy")).toBe(true);
  await page.reload();
  await saved(page);
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    project.name,
  );
});

test("a failed load exposes that project's valid recovery snapshots", async ({
  page,
}) => {
  await page.goto("/");
  await saved(page);
  const good = emptyProject("Recover this project");
  const bad = { ...good, assembledSource: 42 };
  await page.evaluate(
    async ({ good, bad }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("loom-workbench", 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const tx = db.transaction(["projects", "snapshots"], "readwrite");
      tx.objectStore("projects").put(bad);
      tx.objectStore("snapshots").put({
        id: "good-recovery",
        projectId: good.id,
        savedAt: good.updatedAt,
        project: good,
      });
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
      localStorage.setItem("loom-current", bad.id);
    },
    { good, bad },
  );
  await page.reload();
  await expect(page.locator(".load-recovery")).toBeVisible();
  await page
    .locator(".load-recovery")
    .getByRole("button", { name: "Projects", exact: true })
    .click();
  await page.getByRole("button", { name: /Restore as a copy/ }).click();
  await saved(page);
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    "Recover this project — recovered",
  );
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
  }, bad.id);
  expect(original).toEqual(bad);
});

test("modal Tab navigation includes disclosures and excludes their hidden children", async ({
  page,
}) => {
  await page.goto("/");
  await saved(page);
  await page.getByLabel("Project", { exact: true }).fill("A new name");
  await saved(page);
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  const summary = page.getByRole("dialog").locator("summary");
  await expect(summary).toBeVisible();
  await summary.focus();
  await page.keyboard.press("Tab");
  const close = page
    .getByRole("dialog")
    .getByRole("button", { name: "Close", exact: true });
  await expect(close).toBeFocused();
  await close.press("Shift+Tab");
  await expect(summary).toBeFocused();
});
