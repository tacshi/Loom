import { test, expect } from "@playwright/test";

test("Help provides task directions and a private clipboard-failure report", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new Error("denied");
        },
      },
    }),
  );
  await page.goto("/");
  await page
    .getByLabel("Project", { exact: true })
    .fill("PRIVATE PROJECT CONTENT");
  await page.getByRole("button", { name: "Help", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Help", exact: true });
  await expect(dialog).toContainText("Learn → Start course");
  await expect(dialog).toContainText("Projects → Export file");
  await dialog
    .getByRole("button", { name: "Copy bug report", exact: true })
    .click();
  const report = dialog.getByLabel("Bug report", { exact: true });
  await expect(report).toBeVisible();
  const value = await report.inputValue();
  expect(value).toMatch(/^Loom \d+\.\d+\.\d+/);
  expect(value).toMatch(/Build: [a-f0-9]{40}/);
  expect(value).toContain("Browser:");
  expect(value).toContain("Steps to reproduce:");
  expect(value).not.toContain("PRIVATE PROJECT CONTENT");
  expect(value).not.toContain("http://");
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Language", exact: true }).click();
  await page.getByRole("button", { name: "帮助", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("工程管理 → 导出文件");
});

test("copy report succeeds without displaying a fallback", async ({ page }) => {
  await page.addInitScript(() =>
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as any).__copiedReport = value;
        },
      },
    }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: "Help", exact: true }).click();
  await page
    .getByRole("button", { name: "Copy bug report", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Report copied", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => (window as any).__copiedReport)).toContain(
    "Expected:\n\nActual:",
  );
  await expect(page.getByLabel("Bug report", { exact: true })).toHaveCount(0);
});
