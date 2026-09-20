import { readFile } from "node:fs/promises";
import { test, expect } from "@playwright/test";
import { Builder } from "../../src/examples/adder";

test("switching language redraws gate labels without editing the project", async ({
  page,
}) => {
  const b = new Builder("Gate labels");
  b.add("gate", "nand", 0, 0);
  b.c.components[0].name = "与非门";
  await page.addInitScript(() => localStorage.setItem("loom-language", "zh"));
  await page.goto("/");
  await page.getByRole("button", { name: "工程管理", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "labels.loom.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(b.p)),
  });
  await expect(page.getByLabel("工程", { exact: true })).toHaveValue(b.p.name);
  const canvas = page.locator(".canvas-host");
  const glyph = async () => {
    const bounds = (await canvas.boundingBox())!;
    return page.screenshot({
      clip: { x: bounds.x + 64, y: bounds.y + 116, width: 116, height: 22 },
    });
  };
  await page.evaluate(() => document.fonts.ready);
  const before = await glyph();
  await page.getByRole("button", { name: "语言", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Language", exact: true }),
  ).toBeVisible();
  await expect.poll(async () => (await glyph()).equals(before)).toBe(false);
  await page.getByRole("button", { name: "Language", exact: true }).click();
  await expect.poll(async () => (await glyph()).equals(before)).toBe(true);
  await page.getByRole("button", { name: "工程管理", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出文件", exact: true }).click();
  const saved = JSON.parse(
    await readFile((await (await download).path())!, "utf8"),
  );
  expect(saved.circuits[saved.root].components[0].name).toBe("与非门");
});

test("named gates show their type and live value directly on the canvas", async ({
  page,
}, testInfo) => {
  const b = new Builder("Visible component types");
  b.add("g2", "nand", 0, 0);
  await page.addInitScript(() => {
    localStorage.setItem("loom-language", "en");
    const texts: string[] = [];
    (window as unknown as { drawnTexts: string[] }).drawnTexts = texts;
    const original = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (
      text,
      x,
      y,
      maxWidth,
    ) {
      texts.push(text);
      return original.call(this, text, x, y, maxWidth);
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "types.loom.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(b.p)),
  });
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    b.p.name,
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { drawnTexts: string[] }).drawnTexts,
      ),
    )
    .toEqual(expect.arrayContaining(["NAND", "g2", "X"]));
  await page.screenshot({
    path: testInfo.outputPath("visible-component-types.png"),
  });
  await page.getByRole("button", { name: "Language", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { drawnTexts: string[] }).drawnTexts,
      ),
    )
    .toContain("与非门");
});
