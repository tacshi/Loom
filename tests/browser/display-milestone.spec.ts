import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { Builder } from "../../src/examples/adder";
import { exportProject } from "../../src/persistence/serialization";
import { parseProject } from "../../src/persistence/validation";
import { Engine } from "../../src/simulator/engine";
import {
  newCourse,
  activateExercise,
  acceptCheck,
} from "../../src/course/session";
import { exercises } from "../../src/course/registry";
import { prepareCourseSubmission } from "../../scripts/course-submission";
import { checkCourse } from "../../src/course/check";

async function ready(page: Page) {
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
}
async function pixels(page: Page, rgb: number[]) {
  return page.locator(".canvas-host canvas").evaluateAll((nodes, rgb) => {
    let count = 0;
    for (const node of nodes) {
      const c = node as HTMLCanvasElement,
        data = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
      for (let i = 0; i < data.length; i += 4)
        if (
          data[i] === rgb[0] &&
          data[i + 1] === rgb[1] &&
          data[i + 2] === rgb[2] &&
          data[i + 3] === 255
        )
          count++;
    }
    return count;
  }, rgb);
}
const green = [22, 115, 75],
  amber = [200, 135, 57];
async function importProject(page: Page, buffer: Buffer) {
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.locator(".projects-dialog input[type=file]").setInputFiles({
    name: "display.loom.json",
    mimeType: "application/json",
    buffer,
  });
  await expect(page.locator(".projects-dialog")).toHaveCount(0);
}

test("ROM import, export, mutation and project reload reproduce visible output", async ({
  page,
}, info) => {
  await ready(page);
  await page
    .getByLabel("Open example…", { exact: true })
    .selectOption("segmentRom");
  await page.getByRole("button", { name: "Circuit", exact: true }).click();
  await page.getByRole("button", { name: "Lookup ROM", exact: true }).click();
  const cell = page.getByLabel("Memory word 0", { exact: true });
  await expect(cell).toHaveValue("3F");
  await expect.poll(() => pixels(page, green)).toBeGreaterThan(200);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export hex", exact: true }).click();
  const exported = await readFile((await (await download).path())!);
  expect(exported.toString().trim().split(/\s+/)).toHaveLength(16);
  const asset = await page.request.get("/rom/seven-segment.hex");
  expect(asset.ok()).toBe(true);
  expect((await asset.text()).trim().toLowerCase()).toBe(
    exported.toString().trim().toLowerCase(),
  );
  await cell.fill("00");
  await cell.blur();
  await expect.poll(() => pixels(page, green)).toBe(0);
  const file = page.locator(".memory-panel input[type=file]");
  await file.setInputFiles({
    name: "bad.hex",
    mimeType: "text/plain",
    buffer: Buffer.from("100"),
  });
  await expect(page.locator(".memory-panel [role=alert]")).toBeVisible();
  await expect(cell).toHaveValue("0");
  await file.setInputFiles({
    name: "table.hex",
    mimeType: "text/plain",
    buffer: exported,
  });
  await expect(cell).toHaveValue("3F");
  await expect.poll(() => pixels(page, green)).toBeGreaterThan(200);
  // Selected-address imports preserve the other words.
  await page.getByLabel("Start address", { exact: true }).fill("1");
  await file.setInputFiles({
    name: "one.hex",
    mimeType: "text/plain",
    buffer: Buffer.from("80"),
  });
  await expect(page.getByLabel("Memory word 1", { exact: true })).toHaveValue(
    "80",
  );
  await page.getByLabel("Start address", { exact: true }).fill("0");
  await expect(cell).toHaveValue("3F");
  const binaryDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export binary", exact: true })
    .click();
  const binary = await readFile((await (await binaryDownload).path())!);
  expect([...binary].slice(0, 2)).toEqual([63, 128]);
  await file.setInputFiles({
    name: "table.bin",
    mimeType: "application/octet-stream",
    buffer: binary,
  });
  await expect(cell).toHaveValue("3F");
  await page.getByRole("button", { name: "Value Input", exact: true }).click();
  await page.getByLabel("Value", { exact: true }).fill("1");
  await expect.poll(() => pixels(page, green)).toBeGreaterThan(0);
  await expect.poll(() => pixels(page, green)).toBeLessThan(100);
  await page.screenshot({ path: info.outputPath("rom-decimal-point.png") });
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  const projectDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export file", exact: true }).click();
  const projectFile = await readFile((await (await projectDownload).path())!);
  const project = parseProject(projectFile.toString());
  const engine = new Engine(project);
  expect(engine.get("Digit", "dp").value).toBe(1);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await importProject(page, projectFile);
  await expect.poll(() => pixels(page, green)).toBeGreaterThan(0);
  await expect.poll(() => pixels(page, green)).toBeLessThan(100);
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.reload();
  await expect.poll(() => pixels(page, green)).toBeGreaterThan(0);
  await expect.poll(() => pixels(page, green)).toBeLessThan(100);
});

test("manual glyphs change and unknown inputs remain amber", async ({
  page,
}, info) => {
  await ready(page);
  await page
    .getByLabel("Open example…", { exact: true })
    .selectOption("segments");
  await page.getByRole("button", { name: "Circuit", exact: true }).click();
  await page.getByRole("button", { name: "Value Input", exact: true }).click();
  await page.getByLabel("Value", { exact: true }).fill("8");
  await expect.poll(() => pixels(page, green)).toBeGreaterThan(500);
  const eight = await pixels(page, green);
  await page.getByLabel("Value", { exact: true }).fill("1");
  await expect.poll(() => pixels(page, green)).toBeLessThan(eight / 2);
  const b = new Builder("Unknown digit");
  b.add("Digit", "sevenSegment", 0, 0);
  await importProject(page, Buffer.from(exportProject(b.p)));
  await expect.poll(() => pixels(page, amber)).toBeGreaterThan(500);
  await expect.poll(() => pixels(page, green)).toBe(0);
  await page.screenshot({ path: info.outputPath("unknown-segments.png") });
});

test("verified learner decoder opens in a counter and course remains available", async ({
  page,
}, info) => {
  test.setTimeout(60000);
  const p = newCourse();
  for (const spec of exercises) {
    if (spec.id !== "signals") activateExercise(p, spec.id);
    prepareCourseSubmission(p, spec.id);
    await acceptCheck(p, await checkCourse(p, spec.id));
    if (spec.id === "seven-segment") break;
  }
  await ready(page);
  await importProject(page, Buffer.from(exportProject(p)));
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await page
    .getByRole("button", { name: "Verify progress", exact: true })
    .click();
  const tryCounter = page.getByRole("button", {
    name: "Try in counter",
    exact: true,
  });
  await expect(tryCounter).toBeVisible({ timeout: 30000 });
  await page.screenshot({ path: info.outputPath("verified-decoder.png") });
  await page.getByRole("button", { name: "Language", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "用于计数器", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: info.outputPath("verified-decoder-zh.png") });
  await page.getByRole("button", { name: "语言", exact: true }).click();
  await tryCounter.click();
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    "Hexadecimal counter",
  );
  await page.getByRole("button", { name: "Advance clock", exact: true }).click();
  await expect.poll(() => pixels(page, green)).toBeGreaterThan(100);
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.screenshot({ path: info.outputPath("learner-counter.png") });
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await expect(
    page.locator(".projects-dialog").getByText(p.name, { exact: true }),
  ).toBeVisible();
});

test("CPU example opens on its digit, steps writes and resets", async ({
  page,
}, info) => {
  await ready(page);
  await page
    .getByLabel("Open example…", { exact: true })
    .selectOption("segmentCpu");
  await expect(page.getByLabel("Clock speed", { exact: true })).toHaveValue(
    "2",
  );
  await expect.poll(() => pixels(page, green)).toBe(0);
  for (let i = 0; i < 4; i++) {
    await page.getByRole("button", { name: "Advance clock", exact: true }).click();
    await expect(page.locator("footer")).toContainText("Cycle " + (i + 1));
  }
  await expect.poll(() => pixels(page, green)).toBeGreaterThan(500);
  await page.screenshot({ path: info.outputPath("cpu-digit.png") });
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect.poll(() => pixels(page, green)).toBe(0);
});
