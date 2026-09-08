import { test, expect } from "@playwright/test";

test("wire cleanup is a secondary circuit action and Fit stays on the toolbar", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  const menu = page.getByRole("button", {
    name: "Circuit actions",
    exact: true,
  });
  await expect(
    page.getByRole("button", { name: "Fit circuit", exact: true }),
  ).toHaveAttribute("title", "Fit circuit");
  await expect(
    page.getByRole("button", { name: "Tidy wires", exact: true }),
  ).toHaveCount(0);
  await menu.click();
  await expect(
    page.getByRole("button", { name: "Tidy wires", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(menu).toBeFocused();
  await page
    .getByLabel("Open example…", { exact: true })
    .selectOption("counter");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await menu.click();
  const tidy = page.getByRole("button", { name: "Tidy wires", exact: true });
  await expect(tidy).toBeEnabled();
  await page.keyboard.press("Tab");
  await expect(tidy).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(tidy).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toBeEnabled();
  await expect(page.locator("footer")).toContainText("3 connections");
  await menu.click();
  await page.getByRole("button", { name: "Language", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "整理连线", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "电路操作", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "整理连线", exact: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("button", { name: "显示完整电路", exact: true }),
  ).toHaveAttribute("title", "显示完整电路");
});
