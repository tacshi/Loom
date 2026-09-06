import { execFileSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test, expect } from "@playwright/test";
test("calculator, rewind, isolated failure, and test capture", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page
    .getByLabel("Open example…", { exact: true })
    .selectOption("calculator");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page
    .getByLabel("Keyboard input RAM/Keyboard")
    .fill("12+34\n255+255\n0-255");
  await page.getByRole("button", { name: "Send line", exact: true }).click();
  await page.getByLabel("Clock speed", { exact: true }).selectOption("100000");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  const terminal = page.getByRole("log", {
    name: "Terminal output RAM/Terminal",
  });
  await expect(terminal).toHaveText("46\n510\n-255\n", { timeout: 20000 });
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.getByRole("button", { name: "Debug", exact: true }).click();
  await page.getByLabel("Seek cycle", { exact: true }).fill("100");
  await expect(
    page.getByText("Inspecting history", { exact: true }),
  ).toBeVisible();
  await expect(terminal).toHaveText("");
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(terminal).toHaveText("46\n510\n-255\n", { timeout: 20000 });
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.getByLabel("Run", { exact: true })).toHaveValue("2");
  await page.getByLabel("Run", { exact: true }).selectOption("1");
  await expect(terminal).toHaveText("46\n510\n-255\n");
  await page
    .getByRole("button", { name: "Sequential tests", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByText("Add test case", { exact: true }).click();
  await dialog
    .getByLabel("Name", { exact: true })
    .fill("Wrong terminal regression");
  await dialog
    .getByLabel("Assertion", { exact: true })
    .selectOption("terminal");
  await dialog
    .getByLabel("Signal", { exact: true })
    .selectOption("RAM/Terminal:data");
  await dialog.getByLabel("Expected", { exact: true }).fill("wrong");
  await dialog.getByLabel("Clock cycles", { exact: true }).fill("0");
  await dialog
    .getByRole("button", { name: "Append step", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Save test case", exact: true })
    .click();
  await dialog
    .getByRole("button", { name: "Run circuit tests", exact: true })
    .click();
  await expect(dialog.getByText("Failed", { exact: true })).toBeVisible({
    timeout: 20000,
  });
  await dialog
    .getByRole("button", { name: "Open failure in debugger", exact: true })
    .click();
  await expect(
    page.getByText("Isolated test run", { exact: true }).first(),
  ).toBeVisible();
  await expect(terminal).toHaveText("");
  await page
    .getByRole("button", { name: "Return to live run", exact: true })
    .click();
  await expect(terminal).toHaveText("46\n510\n-255\n");
  await page
    .getByRole("button", { name: "Sequential tests", exact: true })
    .click();
  await dialog
    .getByRole("button", {
      name: "Delete Wrong terminal regression",
      exact: true,
    })
    .click();
  await dialog.getByText("Add test case", { exact: true }).click();
  await dialog.getByLabel("Name", { exact: true }).fill("Captured inputs");
  await dialog
    .getByRole("combobox", { name: "Assertion", exact: true })
    .selectOption("terminal");
  await dialog
    .getByRole("combobox", { name: "Signal", exact: true })
    .selectOption("RAM/Terminal:data");
  await dialog
    .getByRole("textbox", { name: "Expected", exact: true })
    .fill("46\n510\n-255\n");
  await dialog
    .getByRole("button", { name: "Create test from this run", exact: true })
    .click();
  await expect(
    dialog.getByRole("cell", { name: "Captured inputs", exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Run circuit tests", exact: true })
    .click();
  await expect(dialog.getByText("Passed", { exact: true })).toHaveCount(2, {
    timeout: 20000,
  });
  await dialog.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  const pendingDownload = page.waitForEvent("download");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Export file", exact: true })
    .click();
  const download = await pendingDownload,
    dir = await mkdtemp(join(tmpdir(), "loom-export-"));
  try {
    const file = join(dir, "project.loom.json");
    await download.saveAs(file);
    const report = JSON.parse(
      execFileSync(
        process.execPath,
        ["dist-cli/loom.mjs", "test", file, "--json"],
        { encoding: "utf8" },
      ),
    );
    expect(report.results).toHaveLength(2);
    expect(
      report.results.every((r: { status: string }) => r.status === "passed"),
    ).toBe(true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
test("library form controls share a baseline and remain reachable in a narrow viewport", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Libraries", exact: true }).click();
  const dialog = page.getByRole("dialog");
  const controls = [
    dialog.getByLabel("Definition", { exact: true }),
    dialog.getByLabel("Version", { exact: true }),
    dialog.getByRole("button", { name: "Export component", exact: true }),
    dialog.getByRole("button", { name: "Import component", exact: true }),
  ];
  const boxes = await Promise.all(controls.map((c) => c.boundingBox()));
  const bottoms = boxes.map((b) => b!.y + b!.height);
  expect(Math.max(...bottoms) - Math.min(...bottoms)).toBeLessThan(2);
  await page.setViewportSize({ width: 640, height: 400 });
  for (const c of controls) await expect(c).toBeVisible();
  for (const button of controls.slice(2)) {
    const size = await button.evaluate((el) => ({
      content: el.scrollWidth,
      available: el.clientWidth,
    }));
    expect(size.content).toBeLessThanOrEqual(size.available + 1);
  }
  const close = await dialog
    .getByRole("button", { name: "Close", exact: true })
    .boundingBox();
  expect(close!.x + close!.width).toBeLessThanOrEqual(640);
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
