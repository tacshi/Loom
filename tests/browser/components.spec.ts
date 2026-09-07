import { test, expect } from "@playwright/test";

test("shift-register example exposes editable internals and parallel loading", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Open example…", { exact: true }).selectOption("shift");
  await page.getByRole("button", { name: "Circuit", exact: true }).click();
  for (const [name, value] of [
    ["Parallel Input", "165"],
    ["Load Input", "1"],
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    await page.getByLabel("Value", { exact: true }).fill(value);
  }
  await page.getByRole("button", { name: "Step", exact: true }).click();
  await page
    .getByRole("button", { name: "Parallel output Probe", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Connect in", exact: true }),
  ).toContainText("165");
  await page
    .getByRole("button", { name: "Shift Subcircuit", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open subcircuit", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Storage Register", exact: true }),
  ).toBeVisible();
});

test("priority encoder selects the highest request", async ({ page }) => {
  await page.goto("/");
  await page
    .getByLabel("Open example…", { exact: true })
    .selectOption("encoder");
  await page.getByRole("button", { name: "Circuit", exact: true }).click();
  for (const id of [2, 7]) {
    await page
      .getByRole("button", { name: `Request ${id} Input`, exact: true })
      .click();
    await page.getByLabel("Value", { exact: true }).fill("1");
  }
  await page
    .getByRole("button", { name: "Selected Probe", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Connect in", exact: true }),
  ).toContainText("7");
});

test("momentary button releases outside its control, on blur and on reset", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Open example…", { exact: true })
    .selectOption("button");
  await page.getByRole("button", { name: "Circuit", exact: true }).click();
  await page
    .getByRole("button", { name: "Reset Momentary button", exact: true })
    .click();
  const hold = page.getByRole("button", { name: "Hold", exact: true });
  const canvas = (await page.locator(".canvas-host").boundingBox())!;
  const scale = Number((await page.locator(".zoom-label").innerText()).replace("%", "")) / 100;
  await page.mouse.move(canvas.x + 50 + 60 * scale, canvas.y + 50 + 200 * scale);
  await page.mouse.down();
  await expect(hold).toHaveAttribute("aria-pressed", "true");
  await page.mouse.move(canvas.x + 10, canvas.y + 10); await page.mouse.up();
  await expect(hold).toHaveAttribute("aria-pressed", "false");
  await hold.focus();
  await page.keyboard.down("Space");
  await expect(hold).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("footer")).toContainText("Cycle 0");
  await page.keyboard.up("Space");
  await expect(hold).toHaveAttribute("aria-pressed", "false");
  const r = (await hold.boundingBox())!;
  await page.mouse.move(r.x + r.width / 2, r.y + r.height / 2);
  await page.mouse.down();
  await expect(hold).toHaveAttribute("aria-pressed", "true");
  await page.mouse.move(20, 20);
  await page.mouse.up();
  await expect(hold).toHaveAttribute("aria-pressed", "false");
  await hold.focus();
  await page.keyboard.down("Enter");
  await expect(hold).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => window.dispatchEvent(new Event("blur")));
  await expect(hold).toHaveAttribute("aria-pressed", "false");
  await page.keyboard.up("Enter");
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(hold).toHaveAttribute("aria-pressed", "false");
});
