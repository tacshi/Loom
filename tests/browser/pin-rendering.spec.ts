import { test, expect } from "@playwright/test";
test("selected component pin centers stay hollow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page
    .getByLabel("Open example…", { exact: true })
    .selectOption("counter");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Circuit", exact: true }).click();
  await page.getByRole("button", { name: "Enable Input", exact: true }).click();
  await expect(page.locator(".zoom-label")).toHaveText("120%");
  await expect
    .poll(() =>
      page
        .locator(".canvas-host canvas")
        .last()
        .evaluate((node) => {
          const canvas = node as HTMLCanvasElement,
            r = canvas.getBoundingClientRect(),
            x = Math.floor((194 * canvas.width) / r.width),
            y = Math.floor((74 * canvas.height) / r.height);
          return [...canvas.getContext("2d")!.getImageData(x, y, 1, 1).data];
        }),
    )
    .toEqual([255, 255, 255, 255]);
});
