import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { Builder } from "../../src/examples/adder";
import { geometry, pinPosition } from "../../src/model/components";

for (const reverse of [false, true]) {
  test(`wire preview matches committed points (${reverse ? "input" : "output"} first)`, async ({
    page,
  }) => {
    const b = new Builder("Preview route");
    b.add("a", "input", 0, 0);
    b.add("b", "input", 0, 220);
    b.add("NAND", "nand", 280, 0);
    b.add("out", "probe", 560, 0);
    b.connect("a", "out", "NAND", "a");
    b.connect("NAND", "out", "out", "in");
    await page.goto("/");
    await page.getByRole("button", { name: "Projects", exact: true }).click();
    await page.locator("input[type=file]").setInputFiles({
      name: "preview.loom.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(b.p)),
    });
    await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
      b.p.name,
    );
    await expect(
      page.getByText("Saved locally", { exact: true }),
    ).toBeVisible();
    const canvas = page.locator(".canvas-host"),
      bounds = (await canvas.boundingBox())!;
    const width = Math.max(
      ...b.c.components.map((c) => c.x + geometry(c, b.p).w),
    );
    const height = Math.max(
      ...b.c.components.map((c) => c.y + geometry(c, b.p).h),
    );
    const scale = Math.min(
      1.2,
      (bounds.width - 100) / width,
      (bounds.height - 100) / height,
    );
    const at = (p: { x: number; y: number }) => ({
      x: bounds.x + 50 + p.x * scale,
      y: bounds.y + 50 + p.y * scale,
    });
    const output = at(pinPosition(b.c.components[1], "out", b.p));
    const input = at(pinPosition(b.c.components[2], "b", b.p));
    const start = reverse ? input : output,
      end = reverse ? output : input;
    await page.mouse.click(start.x, start.y);
    await expect(page.locator(".wire-hint")).toBeVisible();
    await page.mouse.move(end.x, end.y);
    const preview = async () =>
      JSON.parse((await canvas.getAttribute("data-wire-preview")) ?? "[]");
    await expect.poll(async () => (await preview()).length).toBeGreaterThan(2);
    // Repeated movement within the pin hit area keeps the same complete route.
    const initial = await preview();
    await page.mouse.move(end.x + 2, end.y + 1);
    expect(await preview()).toEqual(initial);
    await page.keyboard.press("r");
    if (reverse) {
      const waypoint = at({ x: 200, y: 160 });
      await page.mouse.click(waypoint.x, waypoint.y);
      await page.mouse.move(end.x, end.y);
    }
    await expect.poll(async () => (await preview()).length).toBeGreaterThan(2);
    const expected = await preview();
    await page.mouse.click(end.x, end.y);
    await expect(page.locator(".wire-hint")).toHaveCount(0);
    await page.getByRole("button", { name: "Projects", exact: true }).click();
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export file", exact: true })
      .click();
    const saved = JSON.parse(
      await readFile((await (await download).path())!, "utf8"),
    );
    expect(saved.circuits[saved.root].wires.at(-1).points).toEqual(expected);
  });
}

test("branch preview matches the saved route through the junction", async ({
  page,
}) => {
  const b = new Builder("Branch preview");
  b.add("source", "input", 0, 0);
  b.add("existing", "probe", 400, 0);
  b.add("destination", "probe", 400, 200);
  b.connect("source", "out", "existing", "in");
  await page.goto("/");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "branch.loom.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(b.p)),
  });
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    b.p.name,
  );
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  const canvas = page.locator(".canvas-host"),
    bounds = (await canvas.boundingBox())!;
  const at = (x: number, y: number) => ({
    x: bounds.x + 50 + x * 1.2,
    y: bounds.y + 50 + y * 1.2,
  });
  const input = at(400, 220),
    junction = at(240, 20);
  await page.mouse.click(input.x, input.y);
  await expect(page.locator(".wire-hint")).toBeVisible();
  await page.mouse.move(junction.x, junction.y);
  await page.keyboard.press("r");
  const preview = () =>
    canvas.getAttribute("data-wire-preview").then((s) => JSON.parse(s ?? "[]"));
  await expect
    .poll(async () => (await preview())[0])
    .toEqual({ x: 120, y: 20 });
  const expected = await preview();
  await page.mouse.click(junction.x, junction.y);
  await expect(page.locator(".wire-hint")).toHaveCount(0);
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export file", exact: true }).click();
  const saved = JSON.parse(
    await readFile((await (await download).path())!, "utf8"),
  );
  expect(saved.circuits[saved.root].wires.at(-1)).toMatchObject({
    points: expected,
    junction: { x: 240, y: 20 },
  });
});

test("starting from a pin never reuses the previous preview endpoint", async ({
  page,
}) => {
  const b = new Builder("Fresh wire preview");
  b.add("A", "input", 0, 0);
  b.add("AND", "and", 300, 0);
  b.add("B", "input", 0, 220);
  b.connect("A", "out", "AND", "a");
  await page.goto("/");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "fresh-preview.loom.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(b.p)),
    });
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    b.p.name,
  );
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  const canvas = page.locator(".canvas-host"),
    bounds = (await canvas.boundingBox())!;
  const at = (p: { x: number; y: number }) => ({
    x: bounds.x + 50 + p.x * 1.2,
    y: bounds.y + 50 + p.y * 1.2,
  });
  const destination = at({ x: 200, y: 160 });
  for (const [id, port] of [
    ["A", "out"],
    ["AND", "a"],
    ["AND", "out"],
    ["A", "out"],
  ]) {
    const pin = at(
      pinPosition(
        b.c.components.find((c) => c.id === id)!,
        port,
        b.p,
      ),
    );
    await page.mouse.click(pin.x, pin.y);
    await expect(page.locator(".wire-hint")).toBeVisible();
    await expect(canvas).toHaveAttribute("data-wire-preview", "[]");
    await page.mouse.move(destination.x, destination.y);
    await expect
      .poll(
        async () =>
          JSON.parse((await canvas.getAttribute("data-wire-preview")) ?? "[]")
            .length,
      )
      .toBeGreaterThan(1);
    await page.mouse.move(10, 10);
    await expect(canvas).toHaveAttribute("data-wire-preview", "[]");
    await page.keyboard.press("Escape");
  }
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toBeDisabled();
  await expect(page.locator("footer")).toContainText("1 connections");
});
