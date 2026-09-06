import { test, expect } from "@playwright/test";
test("clicking outside the project name blurs it and preserves the committed name", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  const name = page.getByRole("textbox", { name: "Project", exact: true });
  await name.fill("Committed by outside click");
  await expect(name).toBeFocused();
  const canvas = await page.locator(".canvas-host").boundingBox();
  await page.mouse.click(canvas!.x + canvas!.width / 2, canvas!.y + 50);
  await expect(name).not.toBeFocused();
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.reload();
  await expect(name).toHaveValue("Committed by outside click");
});
