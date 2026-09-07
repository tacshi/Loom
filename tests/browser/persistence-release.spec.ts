import { test, expect } from "@playwright/test";
import { fullAdder } from "../../src/examples/adder";
test("unsupported format import leaves the open project unchanged", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page
    .getByLabel("Project", { exact: true })
    .fill("Keep current project");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "unsupported.loom.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ ...fullAdder(), schemaVersion: 1 })),
  });
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    "Keep current project",
  );
  await page.reload();
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    "Keep current project",
  );
});
test("lock handover reloads the latest writer before further editing", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  const second = await context.newPage();
  await second.goto("/");
  await expect(
    second.getByText(/This project is open in another tab/),
  ).toBeVisible();
  await page.getByLabel("Project", { exact: true }).fill("Writer final edit");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.close();
  await second.reload();
  await expect(second.getByLabel("Project", { exact: true })).toHaveValue(
    "Writer final edit",
  );
  await expect(
    second.getByText("Saved locally", { exact: true }),
  ).toBeVisible();
  await second.getByLabel("Project", { exact: true }).fill("New writer edit");
  await expect(
    second.getByText("Saved locally", { exact: true }),
  ).toBeVisible();
  await second.reload();
  await expect(second.getByLabel("Project", { exact: true })).toHaveValue(
    "New writer edit",
  );
});

test("a rejected save keeps edits available and a later save recovers", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (...args: any[]) {
      if ((window as any).__rejectSaves && args[1] === "readwrite")
        throw new DOMException("Test quota", "QuotaExceededError");
      return (original as any).apply(this, args);
    };
  });
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    (window as any).__rejectSaves = true;
  });
  await page
    .getByLabel("Project", { exact: true })
    .fill("Unsaved recovery draft");
  await expect(page.locator(".local-indicator")).toContainText(
    "Could not save",
  );
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    "Unsaved recovery draft",
  );
  await page.evaluate(() => {
    (window as any).__rejectSaves = false;
  });
  await page.getByLabel("Project", { exact: true }).fill("Recovered draft");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    "Recovered draft",
  );
});
