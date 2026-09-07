import { placeComponent } from "./placeComponent";
import { test, expect, type Page } from "@playwright/test";
async function ready(page: Page) {
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
}
async function example(page: Page, name: string) {
  await page.getByLabel("Open example…", { exact: true }).selectOption(name);
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
}
test("NAND full-adder truth table and persisted hierarchy", async ({
  page,
}) => {
  await ready(page);
  await example(page, "adder");
  await page
    .getByRole("button", { name: "Run circuit tests", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button",{name:"Run circuit tests",exact:true}).click();
  await expect(page.locator(".visual-tests tbody tr")).toHaveCount(8);
  await page.getByRole("button",{name:"Show result",exact:true}).click();
  await expect(page.locator(".visual-tests tbody").getByText("Passed",{exact:true})).toHaveCount(8);
  await page.getByRole("button",{name:"Return to editing",exact:true}).click();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Project", exact: true }),
  ).toHaveValue("NAND full adder");
  await page.getByRole("button", { name: "Circuit", exact: true }).click();
  await page.getByRole("button", { name: "A Input", exact: true }).click();
  await page.getByLabel("Bit width", { exact: true }).fill("8");
  await expect(
    page.getByRole("button", { name: "Run clock", exact: true }),
  ).toBeDisabled();
});
test("CPU executes sum, rejects bad assembly, and supports source breakpoints", async ({
  page,
}) => {
  await ready(page);
  await example(page, "cpu");
  await page.getByLabel("Assembly source", { exact: true }).fill("LDI 256");
  await page
    .getByRole("button", { name: "Assemble & load", exact: true })
    .click();
  await expect(page.getByText(/Operand must be 0–255/)).toBeVisible();
  await page.getByLabel("Example program", { exact: true }).selectOption("sum");
  await page
    .getByRole("button", { name: "Assemble & load", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Toggle source breakpoint at line 10",
      exact: true,
    })
    .click();
  await page.getByLabel("Clock speed", { exact: true }).selectOption("1000");
  await page.getByRole("button", { name: "Run clock", exact: true }).click();
  await expect(
    page.getByText("Breakpoint reached", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "PC 07", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", {
      name: "Toggle source breakpoint at line 10",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Run clock", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Output 55", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("CPU halted", { exact: true })).toBeVisible();
});
test("secondary tab cannot overwrite the project and can create a copy", async ({
  page,
  context,
}) => {
  await ready(page);
  await page
    .getByRole("textbox", { name: "Project", exact: true })
    .fill("Lock test");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  const second = await context.newPage();
  await second.goto("/");
  await expect(
    second.getByText(
      "This project is open in another tab. Duplicate it to edit here.",
      { exact: true },
    ),
  ).toBeVisible();
  await second.getByRole("button", { name: "Projects", exact: true }).click();
  await second
    .getByRole("button", { name: "Duplicate project", exact: true })
    .click();
  await expect(
    second.getByRole("textbox", { name: "Project", exact: true }),
  ).toHaveValue("Lock test — copy");
  await expect(
    second.getByText("Saved locally", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Project", exact: true }),
  ).toHaveValue("Lock test");
});
test("malformed imports preserve the open project", async ({ page }) => {
  await ready(page);
  await page
    .getByRole("textbox", { name: "Project", exact: true })
    .fill("Keep me");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "bad.loom.json",
    mimeType: "application/json",
    buffer: Buffer.from("{no"),
  });
  await expect(page.getByRole("alert")).toContainText(
    "not a valid Loom project",
  );
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Project", exact: true }),
  ).toHaveValue("Keep me");
});
test("recovery snapshots open as copies and leave the current project intact", async ({
  page,
}) => {
  await ready(page);
  await example(page, "counter");
  await page
    .getByRole("textbox", { name: "Project", exact: true })
    .fill("Counter revision two");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.getByText("Recovery snapshots", { exact: true }).click();
  await page
    .getByRole("button", { name: /Restore as a copy/ })
    .first()
    .click();
  await expect(
    page.getByRole("textbox", { name: "Project", exact: true }),
  ).toHaveValue(/recovered$/);
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
});
test("save failures never report a successful save", async ({ page }) => {
  await page.addInitScript(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args) {
      if (this.name === "projects")
        throw new DOMException("Test quota", "QuotaExceededError");
      return original.apply(this, args);
    };
  });
  await page.goto("/");
  await expect(
    page.getByText(/Could not save\. Export your project/).first(),
  ).toBeVisible();
  await expect(page.getByText("Saved locally", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Export file", exact: true }),
  ).toBeVisible();
});
test("counter traces are bounded and name edits preserve runtime state", async ({
  page,
}) => {
  await ready(page);
  await example(page, "counter");
  await page.getByRole("button", { name: "Circuit", exact: true }).click();
  await page
    .getByRole("button", { name: "Count Counter", exact: true })
    .click();
  await page.getByLabel("Watch signal…", { exact: true }).selectOption("q");
  await page.getByRole("button",{name:"Waveforms",exact:true}).click();
  await page.getByLabel("Clock speed", { exact: true }).selectOption("1000");
  await page.getByRole("button", { name: "Run clock", exact: true }).click();
  await expect
    .poll(async () =>
      Number(
        (await page.locator("footer").innerText()).match(/Cycle (\d+)/)?.[1] ??
          0,
      ),
    )
    .toBeGreaterThan(300);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const cycle = Number(
    (await page.locator("footer").innerText()).match(/Cycle (\d+)/)![1],
  );
  await expect(page.locator('.signal-track:has([title="Count:q"]) svg > g')).toHaveCount(80);
  await page
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Renamed counter");
  await expect(page.locator("footer")).toContainText("Cycle " + cycle);
  await expect(
    page.getByRole("button", { name: "Connect q", exact: true }),
  ).toContainText(String(cycle % 256));
  await page.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(page.locator('.signal-track:has([title="Count:q"]) svg > g')).toHaveCount(0);
});
test("replacement rejects a gate with different behavior", async ({ page }) => {
  await ready(page);
  await example(page, "adder");
  await page.getByRole("button", { name: "Circuit", exact: true }).click();
  await page.getByRole("button", { name: "n1 NAND", exact: true }).click();
  await page
    .getByRole("button", { name: "Replace component…", exact: true })
    .click();
  await page.getByLabel("Replacement", { exact: true }).selectOption("and");
  await page
    .getByRole("button", { name: "Verify behavior", exact: true })
    .click();
  await expect(page.getByText(/The outputs differ/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Replace", exact: true }),
  ).toBeDisabled();
});
test("keyboard copy, paste and undo preserve a coherent selection", async ({
  page,
}) => {
  await ready(page);
  await placeComponent(page, "Input");
  await placeComponent(page, "Input", 420, 200);
  await page.getByRole("button", { name: "Select", exact: true }).click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("ControlOrMeta+C");
  await page.keyboard.press("ControlOrMeta+V");
  await expect(page.locator("footer")).toContainText("4 components");
  await page.keyboard.press("ControlOrMeta+Z");
  await expect(page.locator("footer")).toContainText("2 components");
});
test("exported project files retain routes and can be validated", async ({
  page,
}) => {
  await ready(page);
  await example(page, "counter");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export file", exact: true }).click();
  const file = await download;
  const path = await file.path();
  const { readFile } = await import("node:fs/promises");
  const { parseProject } = await import("../../src/persistence/validation");
  const p = parseProject(await readFile(path!, "utf8"));
  expect(p.name).toBe("Clocked counter");
  expect(p.circuits[p.root].wires).toHaveLength(3);
  expect(p.circuits[p.root].wires.every((w) => w.points.length >= 2)).toBe(
    true,
  );
});
