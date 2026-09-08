import { test, expect } from "@playwright/test";

test("signal history follows cycle navigation without a slider", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Open example…", { exact: true })
    .selectOption("counter");
  await page.getByRole("button", { name: "Debug", exact: true }).click();
  await page
    .getByRole("button", { name: "Signal history", exact: true })
    .click();
  const panel = page.locator(".timeline-panel");
  await expect(panel.getByRole("slider")).toHaveCount(0);
  await page.getByLabel("Clock speed", { exact: true }).selectOption("1000");
  await page.getByRole("button", { name: "Run clock", exact: true }).click();
  const cycle = page.getByLabel("Seek cycle", { exact: true });
  await expect
    .poll(async () => Number(await cycle.inputValue()))
    .toBeGreaterThan(100);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Run clock", exact: true }),
  ).toBeVisible();
  const head = await cycle.inputValue();
  const ticks = panel.locator(".timeline-ticks span");
  await expect(ticks.last()).toHaveText(head);
  await cycle.fill("10");
  await expect(cycle).toHaveValue("10");
  await expect(ticks.first()).toHaveText("0");
  await expect(ticks.last()).toHaveText("64");
  await page
    .getByRole("button", { name: "Back one cycle", exact: true })
    .click();
  await expect(cycle).toHaveValue("9");
  await page.getByRole("button", { name: "Go to latest", exact: true }).click();
  await expect(cycle).toHaveValue(head);
  await expect(ticks.last()).toHaveText(head);
});
