import { courseAt } from "../courseFixture";
import { placeComponent } from "./placeComponent";
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
  await page.getByRole("tab", { name: "Circuit", exact: true }).click();
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
  await page.getByRole("tab", { name: "Circuit", exact: true }).click();
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

test("adding a component preserves the chosen canvas position", async ({
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
  await page.getByRole("tab", { name: "Components", exact: true }).click();
  const position = await placeComponent(page, "NAND", 420, 320);
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  const d = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export file", exact: true }).click();
  const p = JSON.parse(await readFile((await (await d).path())!, "utf8"));
  const added = p.circuits[p.root].components.find(
    (c: any) => c.kind === "nand",
  );
  expect(added).toMatchObject(position);
});

test("undoing a failed edit shows verified status without the obsolete failure", async ({
  page,
}) => {
  const { newCourse, acceptCheck } = await import("../../src/course/session");
  const { exercise } = await import("../../src/course/referenceExercises");
  const { checkCourse } = await import("../../src/course/check");
  const p = await courseAt("core-05",true), r = { circuits: p.circuits, root: p.root };
  await page.goto("/");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "accepted.loom.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(p)),
  });
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(p.name);
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page
    .getByRole("button", { name: "Verify imported progress", exact: true })
    .click();
  await expect(
    page.getByRole("button",{name:"Next mission",exact:true}),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Circuit", exact: true }).click();
  const gate = r.circuits[r.root].components.find((c) => c.kind === "and")!;
  await page
    .getByRole("button", { name: gate.name + " AND", exact: true })
    .click();
  await page.keyboard.press("Delete");
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page
    .getByRole("button", { name: "Run tests", exact: true })
    .click();
  await expect(
    page.locator(".test-mismatch"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(
    page.getByRole("button",{name:"Next mission",exact:true}),
  ).toBeVisible();
  // The lesson header and the Learn panel both use .course-learn.
  await expect(
    page.locator(".course-learn").filter({ hasText: "Check result:" }),
  ).toHaveCount(0);
});
