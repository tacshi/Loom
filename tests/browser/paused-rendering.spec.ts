import { test, expect } from "@playwright/test";

test("paused circuits render when animation frames are suspended", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.requestAnimationFrame = () => 1;
    window.cancelAnimationFrame = () => {};
  });
  await page.goto("/");
  await page
    .getByLabel("Open example…", { exact: true })
    .selectOption("segmentRom");
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    "ROM hexadecimal display",
  );
  const lit = () =>
    page.locator(".canvas-host canvas").evaluateAll((nodes) => {
      let pixels = 0;
      for (const node of nodes) {
        const c = node as HTMLCanvasElement,
          d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
        for (let i = 0; i < d.length; i += 4)
          if (d[i] === 22 && d[i + 1] === 115 && d[i + 2] === 75) pixels++;
      }
      return pixels;
    });
  await expect.poll(lit).toBeGreaterThan(100);
  await page.getByRole("tab", { name: "Circuit", exact: true }).click();
  await page.getByRole("button", { name: "Lookup ROM", exact: true }).click();
  await page.getByLabel("Memory word 0", { exact: true }).fill("00");
  await page.getByLabel("Memory word 0", { exact: true }).blur();
  await expect.poll(lit).toBe(0);
  await page.getByLabel("Memory word 0", { exact: true }).fill("7F");
  await page.getByLabel("Memory word 0", { exact: true }).blur();
  await expect.poll(lit).toBeGreaterThan(100);
});
