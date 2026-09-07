import { test, expect } from "@playwright/test";
import { Builder } from "../../src/examples/adder";
import { readFile } from "node:fs/promises";

test("right-click cancels wiring over canvas, pins, bodies and existing wires", async ({
  page,
}) => {
  const b = new Builder("Wire cancellation");
  b.add("A", "input", 0, 0);
  b.add("B", "probe", 300, 0);
  b.add("C", "probe", 300, 160);
  b.connect("A", "out", "B", "in");
  await page.goto("/");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "cancel.loom.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(b.p)),
    });
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    b.p.name,
  );
  const canvas = (await page.locator(".canvas-host").boundingBox())!;
  const at = (x: number, y: number) => ({
    x: canvas.x + 50 + x * 1.2,
    y: canvas.y + 50 + y * 1.2,
  });
  const source = at(120, 20),
    target = at(300, 180),
    waypoint = at(100, 280);
  for (const point of [at(180, 300), target, at(360, 40), at(210, 20)]) {
    await page.mouse.click(source.x, source.y);
    await expect(page.locator(".wire-hint")).toBeVisible();
    await page.mouse.click(waypoint.x, waypoint.y);
    await page.mouse.click(point.x, point.y, { button: "right" });
    await expect(page.locator(".wire-hint")).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Undo", exact: true }),
    ).toBeDisabled();
  }
  // A secondary click on a pin when idle must not begin another wire.
  await page.mouse.click(source.x, source.y, { button: "right" });
  await expect(page.locator(".wire-hint")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.mouse.click(source.x, source.y);
  await page.mouse.click(target.x, target.y);
  await expect(page.locator(".wire-hint")).toHaveCount(0);
  await expect(page.locator("footer")).toContainText("2 connections");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export file", exact: true }).click();
  const saved = JSON.parse(
    await readFile((await (await download).path())!, "utf8"),
  );
  const wires = saved.circuits[saved.root].wires;
  expect(wires[0]).toEqual(b.c.wires[0]);
  expect(wires[1].points.every((p: { y: number }) => p.y < 280)).toBe(true);
});
