import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { parseProject } from "../../src/persistence/validation";
import { routeClear } from "../../src/editor/routing";

test("parameter definitions reject invalid bounds before they can be saved", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Circuit", exact: true }).click();
  await page.locator(".parameter-editor summary").click();
  const add = page.getByRole("button", { name: "Add parameter", exact: true });
  for (const [label, value] of [
    ["Minimum", "0"],
    ["Maximum", "33"],
    ["Default", "1.5"],
  ] as const) {
    await page.getByLabel(label, { exact: true }).fill(value);
    await expect(add).toBeDisabled();
    await page
      .getByLabel(label, { exact: true })
      .fill(label === "Minimum" ? "1" : label === "Maximum" ? "32" : "8");
  }
  await add.click();
  await expect(page.locator(".parameter-editor")).toContainText(
    "width = 8 [1–32]",
  );
  await expect(add).toBeDisabled();
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Circuit", exact: true }).click();
  await page.locator(".parameter-editor summary").click();
  await expect(page.locator(".parameter-editor")).toContainText(
    "width = 8 [1–32]",
  );
});

test("rotated custom pins reroute attached wires and reject overlapping pin slots atomically", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page
    .getByLabel("Open example…", { exact: true })
    .selectOption("counter");
  await page.getByRole("tab", { name: "Circuit", exact: true }).click();
  await page
    .getByRole("button", { name: "Count Counter", exact: true })
    .click();
  await page.getByText("Appearance & pins", { exact: true }).click();
  await page.getByLabel("Rotation", { exact: true }).selectOption("90");
  await page.getByLabel("Pin side q", { exact: true }).selectOption("bottom");
  await page.getByLabel("Pin slot q", { exact: true }).fill("2");
  await page.getByRole("button", { name: "Apply layout", exact: true }).click();
  await page.getByRole("button", { name: "Advance clock", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Connect q", exact: true }),
  ).toContainText("1");
  const exportCurrent = async () => {
    await page.getByRole("button", { name: "Projects", exact: true }).click();
    const d = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export file", exact: true })
      .click();
    const p = parseProject(await readFile((await (await d).path())!, "utf8"));
    await page.getByRole("button", { name: "Close", exact: true }).click();
    return p;
  };
  const before = await exportCurrent(),
    c = before.circuits[before.root];
  expect(
    c.components.find((n) => n.kind === "counter")!.appearance?.rotation,
  ).toBe(90);
  expect(c.wires.every((w) => routeClear(c, before, w))).toBe(true);
  await page.getByLabel("Pin side q", { exact: true }).selectOption("left");
  await page.getByLabel("Pin slot q", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Apply layout", exact: true }).click();
  const after = await exportCurrent();
  expect(after.circuits).toEqual(before.circuits);
});
