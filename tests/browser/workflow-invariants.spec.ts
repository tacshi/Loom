import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { counterExample } from "../../src/examples/sequential";
import { newCourse, acceptCheck } from "../../src/course/session";
import { courseReference } from "../../src/course/registry";
import { checkCourse } from "../../src/course/check";
import { Builder } from "../../src/examples/adder";
import { createPackage, embedPackage } from "../../src/library/package";
import { placeComponent } from "./placeComponent";

async function ready(page: Page) {
  await expect(page.locator(".local-indicator")).toHaveAttribute(
    "data-status",
    "saved",
  );
}
async function importDocument(page: Page, project: unknown) {
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .locator('input[type="file"]')
    .setInputFiles({
      name: "project.loom.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(project)),
    });
  await ready(page);
}

test("required port names keep empty drafts out of saved course data", async ({
  page,
}) => {
  await page.goto("/");
  await ready(page);
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page.getByRole("button", { name: "Start course", exact: true }).click();
  await ready(page);
  await page.getByRole("tab", { name: "Circuit", exact: true }).click();
  await page.getByRole("button", { name: "a Input port", exact: true }).click();
  const name = page.getByLabel("Port name", { exact: true });
  await name.fill("");
  await name.press("Tab");
  await expect(name).toHaveValue("a");
  await page.reload();
  await ready(page);
  await expect(page.locator(".load-recovery")).toHaveCount(0);
});

test("invalid test drafts are rejected and sequential tests do not duplicate vectors", async ({
  page,
}) => {
  await page.goto("/");
  await ready(page);
  await page
    .getByLabel("Open example…", { exact: true })
    .selectOption("counter");
  await ready(page);
  await page.getByRole("button", { name: "Test options", exact: true }).click();
  await page
    .getByRole("button", { name: "Circuit tests…", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Add test case", exact: true })
    .click();
  await page.getByLabel("Inputs Enable", { exact: true }).fill("0.5");
  await page
    .getByRole("button", { name: "Save test case", exact: true })
    .click();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  await expect(page.getByRole("dialog").locator("tbody tr")).toHaveCount(4);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Test options", exact: true }).click();
  await page.getByRole("button", { name: "Saved tests", exact: true }).click();
  await page
    .getByRole("dialog")
    .locator("summary")
    .filter({ hasText: "Add test case" })
    .click();
  await page.getByLabel("Expected", { exact: true }).fill("X");
  await page.getByRole("button", { name: "Add step", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
  await page.getByLabel("Expected", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Add step", exact: true }).click();
  await page
    .getByRole("button", { name: "Save test case", exact: true })
    .click();
  await expect(page.getByRole("dialog").locator("tbody tr")).toHaveCount(5);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export file", exact: true }).click();
  const p = JSON.parse(
    await readFile((await (await download).path())!, "utf8"),
  );
  expect(p.circuits[p.root].tests).toHaveLength(1);
  expect(p.circuits[p.root].vectors).toHaveLength(4);
});

test("Undo cannot replace a live runtime while inspecting an isolated failure", async ({
  page,
}) => {
  const p = counterExample();
  p.circuits[p.root].tests = [
    {
      id: "failure",
      name: "Failing counter",
      seed: 0,
      maxCycles: 1,
      steps: [
        {
          cycles: 1,
          assertions: [
            {
              type: "signal",
              ref: { instancePath: [], componentId: "Value", portId: "in" },
              value: 99,
            },
          ],
        },
      ],
    },
  ];
  await page.goto("/");
  await ready(page);
  await importDocument(page, p);
  await placeComponent(page, "AND", 500, 250);
  for (let i = 0; i < 5; i++)
    await page
      .getByRole("button", { name: "Advance clock", exact: true })
      .click();
  await expect(page.locator("footer")).toContainText("Cycle 5");
  await page.getByRole("button", { name: "Test options", exact: true }).click();
  await page.getByRole("button", { name: "Saved tests", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Run circuit tests", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Inspect failed test", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Undo", exact: true }),
  ).toBeDisabled();
  await page.keyboard.press("Control+z");
  await page
    .getByRole("button", { name: "Return to live circuit", exact: true })
    .click();
  await expect(page.locator("footer")).toContainText("Cycle 5");
});

test("a missing paused course leaves a fresh-course action available", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("loom-paused-course", "missing-course"),
  );
  await page.goto("/");
  await ready(page);
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page
    .getByRole("button", { name: "Resume course", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Start course", exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("loom-paused-course")),
  ).toBeNull();
});

test("read-only explanations remain visible at smaller desktop sizes", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await ready(page);
  const second = await context.newPage();
  await second.setViewportSize({ width: 1024, height: 800 });
  await second.goto("/");
  await expect(second.locator(".local-indicator")).toHaveAttribute(
    "data-status",
    "readOnly",
  );
  await expect(second.locator(".local-indicator")).toBeVisible();
  await expect(second.locator(".local-indicator")).toContainText("another tab");
  expect(
    await second.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("cancelling a library check does not block a later update without tests", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Original = Worker;
    window.Worker = class extends Original {
      private pending?: number;
      postMessage(data: any) {
        if (data.cases && !data.type)
          this.pending = window.setTimeout(
            () => super.postMessage(data),
            10000,
          );
        else super.postMessage(data);
      }
      terminate() {
        window.clearTimeout(this.pending);
        super.terminate();
      }
    };
  });
  const def = new Builder("Buffer");
  def.add("in", "portIn", 0, 0);
  def.add("out", "portOut", 300, 0);
  def.connect("in", "out", "out", "in");
  def.c.ports = [
    { id: "in", name: "in", width: 1, direction: "in", componentId: "in" },
    { id: "out", name: "out", width: 1, direction: "out", componentId: "out" },
  ];
  def.c.vectors = [
    { name: "Pass", inputs: { in: 1 }, outputs: { "out:in": 1 } },
  ];
  const first = await createPackage(def.p, def.c.id, "buffer", 1);
  const second = await createPackage(def.p, def.c.id, "buffer", 2);
  def.c.vectors = [];
  const third = await createPackage(def.p, def.c.id, "buffer", 3);
  const b = new Builder("Update owner");
  b.add("part", "instance", 200, 0);
  b.c.components[0].definitionId = embedPackage(b.p, first);
  await page.goto("/");
  await ready(page);
  await importDocument(page, b.p);
  await page.getByRole("button", { name: "Libraries", exact: true }).click();
  for (const pkg of [second, third])
    await page
      .getByRole("dialog")
      .locator('input[type="file"]')
      .setInputFiles({
        name: `v${pkg.version}.json`,
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(pkg)),
      });
  await page
    .getByRole("button", { name: "Review update v1 → v2", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Apply update", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Review update v1 → v3", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Apply update", exact: true }),
  ).toBeEnabled();
});

test("imported completion rejection reports which mission needs checking", async ({
  page,
}) => {
  const p = newCourse(),
    reference = courseReference("core-01");
  p.circuits[p.root] = { ...reference.circuits[reference.root], id: p.root };
  await acceptCheck(p, await checkCourse(p, "core-01"));
  p.course!.accepted["core-01"]!.hash = "0".repeat(64);
  await page.goto("/");
  await ready(page);
  await importDocument(page, p);
  await page
    .getByRole("button", { name: "Verify imported progress", exact: true })
    .click();
  await expect(page.locator(".course-verification")).toContainText(
    "0 kept, 1 need checking",
  );
  await page.locator(".course-verification summary").click();
  await expect(page.locator(".course-verification")).toContainText(
    "The saved completion does not match this mission",
  );
});
