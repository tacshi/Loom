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
  const scale =
    Number((await page.locator(".zoom-label").innerText()).replace("%", "")) /
    100;
  expect(scale).toBeGreaterThan(0.65);
  await expect
    .poll(() =>
      page
        .locator(".canvas-host canvas")
        .last()
        .evaluate((node, scale) => {
          const canvas = node as HTMLCanvasElement,
            r = canvas.getBoundingClientRect(),
            x = Math.floor(((50 + 120 * scale) * canvas.width) / r.width),
            y = Math.floor(((50 + 20 * scale) * canvas.height) / r.height);
          return [...canvas.getContext("2d")!.getImageData(x, y, 1, 1).data];
        }, scale),
    )
    .toEqual([255, 255, 255, 255]);
});
