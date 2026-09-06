import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { Builder } from "../../src/examples/adder";
import { createPackage, embedPackage } from "../../src/library/package";
import { parseProject } from "../../src/persistence/validation";
async function exported(page: Page) {
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export file", exact: true }).click();
  const file = await download;
  const p = parseProject(await readFile((await file.path())!, "utf8"));
  await page.getByRole("button", { name: "Close", exact: true }).click();
  return p;
}

test("library update runs package tests and local fork leaves pinned versions intact", async ({
  page,
}) => {
  const def = new Builder("Release buffer");
  def.c.name = "Release buffer";
  def.add("in", "portIn", 0, 0);
  def.add("out", "portOut", 300, 0);
  def.connect("in", "out", "out", "in");
  def.c.ports = [
    { id: "in", name: "in", direction: "in", width: 1, componentId: "in" },
    { id: "out", name: "out", direction: "out", width: 1, componentId: "out" },
  ];
  def.c.vectors = [
    { name: "High passes", inputs: { in: 1 }, outputs: { "out:in": 1 } },
  ];
  const first = await createPackage(def.p, def.c.id, "release-buffer", 1);
  const b = new Builder("Library release QA"),
    embedded = embedPackage(b.p, first);
  b.add("Buffer", "instance", 200, 0);
  b.c.components[0].definitionId = embedded;
  const second = await createPackage(def.p, def.c.id, "release-buffer", 2);
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "library-qa.loom.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(b.p)),
    });
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    b.p.name,
  );
  await page.getByRole("button", { name: "Libraries", exact: true }).click();
  await page
    .getByRole("dialog")
    .locator("input[type=file]")
    .setInputFiles({
      name: "buffer-v2.loom-component.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(second)),
    });
  await page
    .getByRole("button", { name: "Review update v1 → v2", exact: true })
    .click();
  await expect(page.getByText(/1\/1.*passed/i)).toBeVisible();
  await page.getByRole("button", { name: "Apply update", exact: true }).click();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  const updated = await exported(page);
  const instance = updated.circuits[updated.root].components[0];
  expect(updated.circuits[instance.definitionId!].library?.version).toBe(2);
  expect(updated.circuits[embedded].library?.version).toBe(1);
  await page.getByRole("button", { name: "Circuit", exact: true }).click();
  await page
    .getByRole("button", { name: "Buffer Subcircuit", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Make editable local copy", exact: true })
    .click();
  const forked = await exported(page),
    local =
      forked.circuits[forked.circuits[forked.root].components[0].definitionId!];
  expect(local.library).toBeUndefined();
  expect(local.libraryOrigin?.version).toBe(2);
  expect(forked.circuits[instance.definitionId!]).toEqual(
    updated.circuits[instance.definitionId!],
  );
});

test("ROM binary import export preserves byte order and rejects malformed input", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "ROM", exact: true }).click();
  await page.getByLabel("Bit width", { exact: true }).fill("16");
  const memory = page.locator(".memory-panel");
  await memory.getByLabel("Byte order", { exact: true }).selectOption("big");
  await memory
    .locator("input[type=file]")
    .setInputFiles({
      name: "qa.bin",
      mimeType: "application/octet-stream",
      buffer: Buffer.from([0x12, 0x34, 0xab, 0xcd]),
    });
  await expect(page.getByLabel("Memory word 0", { exact: true })).toHaveValue(
    "1234",
  );
  await expect(page.getByLabel("Memory word 1", { exact: true })).toHaveValue(
    "ABCD",
  );
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export binary", exact: true })
    .click();
  const file = await download;
  expect((await readFile((await file.path())!)).subarray(0, 4)).toEqual(
    Buffer.from([0x12, 0x34, 0xab, 0xcd]),
  );
  await memory
    .locator("input[type=file]")
    .setInputFiles({
      name: "bad.bin",
      mimeType: "application/octet-stream",
      buffer: Buffer.from([1]),
    });
  await expect(memory.getByRole("alert")).toBeVisible();
  await expect(page.getByLabel("Memory word 0", { exact: true })).toHaveValue(
    "1234",
  );
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Circuit", exact: true }).click();
  await page.getByRole("button", { name: /ROM ROM/ }).click();
  await expect(page.getByLabel("Memory word 1", { exact: true })).toHaveValue(
    "ABCD",
  );
});
