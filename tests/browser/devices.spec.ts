import { test, expect, type Page, type Locator } from "@playwright/test";
import { Builder } from "../../src/examples/adder";

test.beforeEach(async ({ page }) => {
  // Transfer one queued byte per clock cycle, without a CPU program.
  const b = new Builder("Keyboard echo");
  b.add("Zero", "constant", 0, 0);
  b.add("Keyboard", "keyboard", 240, 0, 8);
  b.add("Terminal", "terminal", 600, 0, 8);
  b.connect("Zero", "out", "Keyboard", "clear");
  b.connect("Zero", "out", "Terminal", "clear");
  b.connect("Keyboard", "ready", "Keyboard", "read");
  b.connect("Keyboard", "ready", "Terminal", "write");
  b.connect("Keyboard", "data", "Terminal", "data");
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .getByRole("dialog")
    .locator("input[type=file]")
    .setInputFiles({
      name: "echo.loom.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(b.p)),
    });
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    b.p.name,
  );
  await page.getByRole("button", { name: "Devices", exact: true }).click();
  await expect(
    page.getByLabel("Keyboard input Keyboard", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Clock speed", { exact: true }).selectOption("1000");
});

function keyboard(page: Page) {
  return page.getByLabel("Keyboard input Keyboard", { exact: true });
}

function terminal(page: Page) {
  return page.getByRole("log", {
    name: "Terminal output Terminal",
    exact: true,
  });
}

function queue(page: Page) {
  return page.locator(".devices-panel form span");
}

async function drain(page: Page, output: string) {
  await page.getByRole("button", { name: "Run clock", exact: true }).click();
  await expect.poll(() => terminal(page).textContent()).toBe(output);
  await expect(queue(page)).toHaveText("0/256 queued bytes");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
}

test("Enter sends one UTF-8 line, Shift+Enter inserts a newline, and composition does not submit", async ({
  page,
}) => {
  const input = keyboard(page);
  await input.fill("A");
  await input.dispatchEvent("keydown", {
    key: "Enter",
    code: "Enter",
    isComposing: true,
  });
  await expect(input).toHaveValue("A");
  await expect(queue(page)).toHaveText("0/256 queued bytes");
  await input.press("End");
  await input.press("Shift+Enter");
  await expect(input).toHaveValue("A\n");
  await expect(queue(page)).toHaveText("0/256 queued bytes");
  await input.pressSequentially("世界");
  await input.press("Enter");
  await expect(input).toHaveValue("");
  await expect(queue(page)).toHaveText("9/256 queued bytes");
  await drain(page, "A\n世界\n");
});

test("keyboard capacity counts UTF-8 bytes, queued input, and the added newline", async ({
  page,
}) => {
  const input = keyboard(page);
  const sendLine = page.getByRole("button", { name: "Send line", exact: true });
  const sendInput = page.getByRole("button", {
    name: "Send input",
    exact: true,
  });
  await input.fill("A");
  await sendInput.click();
  await expect(queue(page)).toHaveText("1/256 queued bytes");
  await input.fill("é".repeat(127));
  await input.press("Enter");
  await expect(input).toHaveValue("");
  await expect(queue(page)).toHaveText("256/256 queued bytes");
  await input.fill("z");
  await input.press("Enter");
  await expect(input).toHaveValue("z");
  await expect(sendLine).toBeDisabled();
  await expect(sendInput).toBeDisabled();
  const first = "A" + "é".repeat(127) + "\n";
  await drain(page, first);

  await input.fill("é".repeat(128));
  await expect(sendLine).toBeDisabled();
  await expect(sendInput).toBeEnabled();
  await input.press("Enter");
  await expect(input).toHaveValue("é".repeat(128));
  await expect(queue(page)).toHaveText("0/256 queued bytes");
  await sendInput.click();
  await expect(queue(page)).toHaveText("256/256 queued bytes");
  await drain(page, first + "é".repeat(128));
});

async function scrollLog(log: Locator, bottom: boolean) {
  await log.evaluate(async (el, bottom) => {
    el.scrollTop = bottom ? el.scrollHeight : 0;
    // Let the browser deliver its native scroll event before appending output.
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  }, bottom);
}

async function expectAtBottom(log: Locator) {
  await expect
    .poll(() =>
      log.evaluate((el) => el.scrollHeight - el.clientHeight - el.scrollTop),
    )
    .toBeLessThanOrEqual(1);
}

test("terminal follows output, preserves scrollback, and resumes following at the bottom", async ({
  page,
}) => {
  const log = terminal(page);
  let output = Array.from(
    { length: 30 },
    (_, i) => `line ${String(i).padStart(2, "0")}\n`,
  ).join("");
  await keyboard(page).fill(output);
  await page.getByRole("button", { name: "Send input", exact: true }).click();
  await drain(page, output);
  await expect
    .poll(() => log.evaluate((el) => el.scrollHeight - el.clientHeight))
    .toBeGreaterThan(0);
  await expectAtBottom(log);

  await scrollLog(log, false);
  await expect.poll(() => log.evaluate((el) => el.scrollTop)).toBe(0);
  await keyboard(page).fill("while reading");
  await keyboard(page).press("Enter");
  output += "while reading\n";
  await drain(page, output);
  await expect.poll(() => log.evaluate((el) => el.scrollTop)).toBe(0);

  await scrollLog(log, true);
  await expectAtBottom(log);
  await keyboard(page).fill("following again");
  await keyboard(page).press("Enter");
  output += "following again\n";
  await drain(page, output);
  await expectAtBottom(log);
});
