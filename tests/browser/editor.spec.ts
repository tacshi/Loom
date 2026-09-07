import { placeComponent } from "./placeComponent";
import { test, expect } from "@playwright/test";
test("component edits and history", async ({ page }) => {
  await page.goto("/");
  await placeComponent(page, "Input");
  await expect(
    page.getByRole("textbox", { name: "Name", exact: true }),
  ).toBeVisible();
  await page.getByRole("textbox", { name: "Name", exact: true }).fill("Enable");
  await expect(
    page.getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveValue("Enable");
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await expect(page.getByText("Start with a signal.")).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByText("Start with a signal.")).not.toBeVisible();
});
