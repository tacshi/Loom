import { test, expect } from "@playwright/test";
import { hierarchicalFixture } from "../../scripts/hierarchical-fixture";
test("10000 expanded components remain inspectable with 1000 visible symbols", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "chromium");
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "nested.loom.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(hierarchicalFixture())),
    });
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    "10000 expanded · 1000 visible",
  );
  await expect(
    page.getByRole("button", { name: "Run", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Circuit", exact: true }).click();
  await page
    .getByRole("button", { name: "Module0 Subcircuit", exact: true })
    .click();
  await expect(page.getByLabel("Name", { exact: true })).toHaveValue("Module0");
});
