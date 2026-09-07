import { expect, type Page } from "@playwright/test";
export async function placeComponent(
  page: Page,
  name: string,
  x = 220,
  y = 200,
) {
  const source = page.getByRole("button", { name, exact: true });
  await source.scrollIntoViewIfNeeded();
  const from = (await source.boundingBox())!;
  const canvas = page.locator(".canvas-host");
  const to = (await canvas.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + x, to.y + y, { steps: 8 });
  await expect(canvas).toHaveAttribute("data-placement", "preview");
  const position = {
    x: Number(await canvas.getAttribute("data-placement-x")),
    y: Number(await canvas.getAttribute("data-placement-y")),
  };
  await page.mouse.up();
  await expect(canvas).not.toHaveAttribute("data-placement", "preview");
  return position;
}
