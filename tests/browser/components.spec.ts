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
