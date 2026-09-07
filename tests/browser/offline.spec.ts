import { test, expect } from "@playwright/test";
test("production app can reload, edit, simulate, and save without networking", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName === "webkit",
    "Playwright WebKit crashes on setOffline() + reload; native Safari origin-offline check is recorded in docs/PHASES.md.",
  );
  test.skip(!process.env.LOOM_BASE_URL, "Requires the production preview");
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page
    .getByLabel("Open example…", { exact: true })
    .selectOption("counter");
  await expect(
    page.getByRole("textbox", { name: "Project", exact: true }),
  ).toHaveValue("Clocked counter");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Project", exact: true }),
  ).toHaveValue("Clocked counter");
  await page.getByRole("button", { name: "Circuit", exact: true }).click();
  await page
    .getByRole("button", { name: "Count Counter", exact: true })
    .click();
  await page.getByRole("button", { name: "Step", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Connect q", exact: true }),
  ).toContainText("1");
  await page
    .getByRole("textbox", { name: "Project", exact: true })
    .fill("Offline counter");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Project", exact: true }),
  ).toHaveValue("Offline counter");
});
