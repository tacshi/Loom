import { test, expect, type Page } from "@playwright/test";
import { Builder } from "../../src/examples/adder";
import { placeComponent } from "./placeComponent";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
});

async function selectInput(page: Page) {
  await page.getByRole("tab", { name: "Circuit", exact: true }).click();
  await page.getByRole("button", { name: "Input Input", exact: true }).click();
}

test("clearing and typing a numeric field forms one undo step per focus session", async ({
  page,
}) => {
  await placeComponent(page, "Input");
  const width = page.getByLabel("Bit width", { exact: true });
  const committed = page.locator(".selection-title .mono");
  await width.fill("");
  await expect(width).toHaveValue("");
  await expect(committed).toHaveText("1b");
  await width.pressSequentially("16");
  await expect(committed).toHaveText("16b");
  await width.press("Tab");

  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await selectInput(page);
  await expect(width).toHaveValue("1");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await selectInput(page);
  await expect(width).toHaveValue("16");

  await width.fill("8");
  await width.press("Tab");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await selectInput(page);
  await expect(width).toHaveValue("16");
});

test("numeric drafts clamp on Enter or blur and discard empty or cancelled edits", async ({
  page,
}) => {
  await placeComponent(page, "Input");
  const width = page.getByLabel("Bit width", { exact: true });
  const committed = page.locator(".selection-title .mono");
  await width.fill("8");
  await width.press("Tab");

  await width.fill("99");
  await expect(width).toHaveValue("99");
  await expect(committed).toHaveText("8b");
  await width.press("Enter");
  await expect(width).toHaveValue("32");
  await expect(committed).toHaveText("32b");

  await width.fill("0");
  await expect(committed).toHaveText("32b");
  await width.press("Tab");
  await expect(width).toHaveValue("1");
  await expect(committed).toHaveText("1b");

  await width.fill("3.9");
  await width.press("Enter");
  await expect(width).toHaveValue("3");
  await expect(committed).toHaveText("3b");
  await width.fill("");
  await width.press("Enter");
  await expect(width).toHaveValue("3");
  await width.fill("");
  await width.press("Tab");
  await expect(width).toHaveValue("3");
  await width.fill("99");
  await width.press("Escape");
  await expect(width).toBeFocused();
  await expect(width).toHaveValue("3");
  await expect(committed).toHaveText("3b");
});

test("switching to smaller memory clamps the address and Enter saves its word", async ({
  page,
}) => {
  const b = new Builder("Memory address bounds");
  b.add("Large", "rom", 0, 0, 8);
  b.add("Small", "rom", 300, 0, 8);
  b.c.components[0].params.addressBits = 4;
  b.c.components[1].params.addressBits = 1;
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .getByRole("dialog")
    .locator("input[type=file]")
    .setInputFiles({
      name: "memory.loom.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(b.p)),
    });
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    b.p.name,
  );
  await page.getByRole("tab", { name: "Circuit", exact: true }).click();
  await page.getByRole("button", { name: "Large ROM", exact: true }).click();
  const address = page.getByLabel("Start address", { exact: true });
  await address.fill("15");
  await address.press("Tab");
  await expect(
    page.getByLabel("Memory word 15", { exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Small ROM", exact: true }).click();
  await expect(address).toHaveValue("1");
  await expect(page.getByLabel("Memory word 15", { exact: true })).toHaveCount(
    0,
  );
  await address.fill("99");
  await address.press("Enter");
  await expect(address).toHaveValue("1");
  const word = page.getByLabel("Memory word 1", { exact: true });
  await word.fill("ff");
  await word.press("Enter");
  await expect(word).not.toBeFocused();
  await expect(word).toHaveValue("FF");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Circuit", exact: true }).click();
  await page.getByRole("button", { name: "Small ROM", exact: true }).click();
  await expect(word).toHaveValue("FF");
});
