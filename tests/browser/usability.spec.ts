import { test, expect } from "@playwright/test";
import { Builder } from "../../src/examples/adder";
import { readFile } from "node:fs/promises";

test("connection errors do not move the canvas", async ({ page }) => {
  const b = new Builder("Notice geometry");
  b.add("A", "input", 0, 0);
  b.add("B", "input", 240, 0);
  await page.goto("/");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "notice.loom.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(b.p)),
  });
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    b.p.name,
  );
  await page.getByRole("button", { name: "Circuit", exact: true }).click();
  const before = await page.locator(".canvas-host").boundingBox();
  await page.getByRole("button", { name: "A Input", exact: true }).click();
  await page.getByRole("button", { name: "Connect out", exact: true }).click();
  await page.getByRole("button", { name: "B Input", exact: true }).click();
  await page.getByRole("button", { name: "Connect out", exact: true }).click();
  await expect(page.locator(".canvas-notice")).toContainText(
    "Connect an output to an input",
  );
  expect(await page.locator(".canvas-host").boundingBox()).toEqual(before);
  await page
    .locator(".canvas-notice")
    .getByRole("button", { name: "Dismiss notice", exact: true })
    .click();
  expect(await page.locator(".canvas-host").boundingBox()).toEqual(before);
});

test("selecting a visible input preserves the counter display location", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Open example…", { exact: true })
    .selectOption("segmentCounter");
  await page.getByRole("button", { name: "Circuit", exact: true }).click();
  const bounds = () =>
    page.locator(".canvas-host canvas").evaluateAll((nodes) => {
      const xs: number[] = [],
        ys: number[] = [];
      for (const node of nodes) {
        const c = node as HTMLCanvasElement,
          d = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data;
        for (let i = 0; i < d.length; i += 4)
          if (d[i] === 22 && d[i + 1] === 115 && d[i + 2] === 75) {
            xs.push((i / 4) % c.width);
            ys.push(Math.floor(i / 4 / c.width));
          }
      }
      return xs.length
        ? [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
        : [];
    });
  await expect.poll(async () => (await bounds()).length).toBe(4);
  const before = await bounds();
  await page.getByRole("button", { name: "Enable Input", exact: true }).click();
  expect(await bounds()).toEqual(before);
});

test("adding a component chooses space clear of existing bodies", async ({
  page,
}) => {
  const b = new Builder("Placement");
  b.add("Existing", "input", 260, 60);
  await page.goto("/");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "placement.loom.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(b.p)),
  });
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    b.p.name,
  );
  await page.getByRole("button", { name: "Components", exact: true }).click();
  await page.getByRole("button", { name: "NAND", exact: true }).click();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  const d = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export file", exact: true }).click();
  const p = JSON.parse(await readFile((await (await d).path())!, "utf8"));
  const added = p.circuits[p.root].components.find(
    (c: any) => c.kind === "nand",
  );
  expect(
    added.x >= 420 ||
      added.x + 160 <= 260 ||
      added.y >= 180 ||
      added.y + 120 <= 60,
  ).toBe(true);
});

test("undoing a failed edit shows verified status without the obsolete failure", async ({
  page,
}) => {
  const { newCourse, acceptCheck } = await import("../../src/course/session");
  const { exercise } = await import("../../src/course/registry");
  const { checkCourse } = await import("../../src/course/check");
  const p = newCourse(),
    r = exercise("nand").reference();
  Object.assign(p.circuits, r.circuits);
  p.root = r.root;
  p.course!.drafts.nand = r.root;
  await acceptCheck(p, await checkCourse(p, "nand"));
  await page.goto("/");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "accepted.loom.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(p)),
  });
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(p.name);
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await page
    .getByRole("button", { name: "Reverify course", exact: true })
    .click();
  await expect(
    page.getByText("Verified component saved.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Circuit", exact: true }).click();
  const gate = r.circuits[r.root].components.find((c) => c.kind === "nand")!;
  await page
    .getByRole("button", { name: gate.name + " NAND", exact: true })
    .click();
  await page.keyboard.press("Delete");
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await page
    .getByRole("button", { name: "Check circuit", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Inspect failure", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByText("Verified component saved.", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".course-learn")).not.toContainText(
    "Check result:",
  );
});
