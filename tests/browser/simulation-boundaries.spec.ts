import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { Builder } from "../../src/examples/adder";
import { counterExample } from "../../src/examples/sequential";

async function ready(page: Page) {
  await expect(page.locator(".local-indicator")).toHaveAttribute(
    "data-status",
    "saved",
  );
}
async function example(page: Page, id: string, name: string) {
  await page.goto("/");
  await ready(page);
  await page.getByLabel("Open example…", { exact: true }).selectOption(id);
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(name);
  await ready(page);
}
async function exportDocument(page: Page) {
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export file", exact: true }).click();
  const p = JSON.parse(
    await readFile((await (await download).path())!, "utf8"),
  );
  await page.getByRole("button", { name: "Close", exact: true }).click();
  return p;
}

test("a nested circuit's visual tests run and display relative to that definition", async ({
  page,
}) => {
  await example(page, "segments", "Hexadecimal decoder");
  await page.getByRole("tab", { name: "Circuit", exact: true }).click();
  await page
    .getByRole("button", { name: "Decoder Subcircuit", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open subcircuit", exact: true })
    .click();
  await page.getByRole("button", { name: "Test options", exact: true }).click();
  await page
    .getByRole("button", { name: "Circuit tests…", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add test case", exact: true })
    .click();
  await page.getByLabel("Expected segments", { exact: true }).fill("63");
  await page
    .getByRole("button", { name: "Save test case", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Run circuit tests", exact: true })
    .click();
  const results = page.getByRole("region", {
    name: "Test results",
    exact: true,
  });
  await expect(results).toContainText("Passed");
  await expect(results).not.toContainText("Choose a valid input");
  await expect(results).toContainText("segments");
  await page
    .getByRole("button", { name: "Return to editing", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "← Hexadecimal decoder", exact: true }),
  ).toBeVisible();
});

test("a reopened copy starts a fresh simulator session", async ({ page }) => {
  await example(page, "counter", "Clocked counter");
  for (let i = 0; i < 2; i++)
    await page
      .getByRole("button", { name: "Advance clock", exact: true })
      .click();
  await expect(page.locator("footer")).toContainText("Cycle 2");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .getByRole("button", { name: "Duplicate project", exact: true })
    .click();
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    "Clocked counter — copy",
  );
  await expect(page.locator("footer")).toContainText("Cycle 0");
});

test("debug and inspector input controls agree and persist the selected value", async ({
  page,
}) => {
  await example(page, "counter", "Clocked counter");
  await page.getByRole("button", { name: "Debug", exact: true }).click();
  await page
    .getByRole("button", { name: "Toggle input Enable", exact: true })
    .click();
  await page.getByRole("tab", { name: "Circuit", exact: true }).click();
  await page.getByRole("button", { name: "Enable Input", exact: true }).click();
  await expect(page.getByLabel("Value", { exact: true })).toHaveValue("0");
  await expect(
    page.getByRole("button", { name: "Connect out", exact: true }),
  ).toContainText("0");
  await ready(page);
  await page.reload();
  await ready(page);
  await page.getByRole("button", { name: "Debug", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Toggle input Enable", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
});

test("boundary inputs are observable and push buttons release in Debug", async ({
  page,
}) => {
  await example(page, "segments", "Hexadecimal decoder");
  await page.getByRole("tab", { name: "Circuit", exact: true }).click();
  await page
    .getByRole("button", { name: "Decoder Subcircuit", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open subcircuit", exact: true })
    .click();
  await page.getByRole("button", { name: "Debug", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Debug", exact: true })
      .getByRole("spinbutton"),
  ).toHaveCount(0);
  await page
    .getByLabel("Open example…", { exact: true })
    .selectOption("button");
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    "Momentary counter reset",
  );
  await ready(page);
  await page.getByRole("button", { name: "Debug", exact: true }).click();
  const hold = page.getByRole("button", { name: "Hold Reset", exact: true });
  await hold.focus();
  await page.keyboard.down("Space");
  await expect(hold).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.up("Space");
  await expect(hold).toHaveAttribute("aria-pressed", "false");
  await page
    .getByRole("button", { name: "Advance clock", exact: true })
    .click();
  await expect(page.locator(".behavior-signals")).toContainText("1");
});

test("the execute-phase label names the fetched instruction and old traces clear", async ({
  page,
}) => {
  await example(page, "cpu", "Loom 8 · CPU");
  await page
    .getByRole("button", { name: "Advance clock", exact: true })
    .click();
  await expect(page.locator(".current-instruction")).toHaveText(
    "Instruction: LDI 0",
  );
  await page.getByRole("button", { name: "New circuit", exact: true }).click();
  await ready(page);
  await page.getByRole("button", { name: "Probe", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Enter");
  await page.getByRole("button", { name: "Debug", exact: true }).click();
  await page
    .getByRole("button", { name: "Show connections", exact: true })
    .click();
  await expect(page.locator(".source-chain")).toBeVisible();
  await page.getByRole("button", { name: "New circuit", exact: true }).click();
  await ready(page);
  await expect(page.locator(".source-chain")).toHaveCount(0);
});

test("selected groups stay selected when clicked and moved", async ({
  page,
}) => {
  await example(page, "counter", "Clocked counter");
  await page.getByRole("button", { name: "Select", exact: true }).focus();
  await page.keyboard.press("Control+a");
  await expect(page.locator(".inspector .panel-heading > span")).toHaveText(
    "4",
  );
  const canvas = (await page.locator(".canvas-host").boundingBox())!;
  const scale =
    Number((await page.locator(".zoom-label").innerText()).replace("%", "")) /
    100;
  const x = canvas.x + 50 + 300 * scale,
    y = canvas.y + 50 + 50 * scale;
  await page.mouse.click(x, y);
  await expect(page.locator(".inspector .panel-heading > span")).toHaveText(
    "4",
  );
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 40 * scale, y + 40 * scale, { steps: 5 });
  await page.mouse.up();
  const p = await exportDocument(page);
  const original = counterExample().circuits;
  const initial = Object.values(original)[0];
  for (const c of p.circuits[p.root].components) {
    const before = initial.components.find((n) => n.id === c.id)!;
    expect({ x: c.x, y: c.y }).toEqual({ x: before.x + 40, y: before.y + 40 });
  }
});

test("wire deletion preserves the other branches and rerouting is reachable", async ({
  page,
}) => {
  const b = new Builder("Branched signal");
  b.add("A", "input", 0, 0, 1, 1);
  b.add("First", "probe", 240, 0);
  b.add("Other", "probe", 240, 160);
  b.connect("A", "out", "First", "in");
  b.connect("A", "out", "Other", "in");
  b.c.wires[0].pinned = true;
  await page.goto("/");
  await ready(page);
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "branches.loom.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(b.p)),
    });
  await ready(page);
  await page.getByRole("tab", { name: "Circuit", exact: true }).click();
  await page
    .locator(".circuit-list summary")
    .filter({ hasText: /^Connections$/ })
    .click();
  await page
    .getByRole("button", { name: "A.out → First.in", exact: true })
    .click();
  await page.getByRole("button", { name: "Reroute wire", exact: true }).click();
  await page.getByRole("button", { name: "Delete wire", exact: true }).click();
  const p = await exportDocument(page);
  expect(p.circuits[p.root].wires).toHaveLength(1);
  await page.getByRole("button", { name: "Other Probe", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Connect in", exact: true }),
  ).toContainText("1");
});
