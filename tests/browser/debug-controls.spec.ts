import { test, expect } from "@playwright/test";

for (const zh of [false, true]) {
  test(`debug only offers applicable controls (${zh ? "Chinese" : "English"})`, async ({
    page,
  }) => {
    await page.addInitScript(
      (zh) => localStorage.setItem("loom-language", zh ? "zh" : "en"),
      zh,
    );
    const label = (en: string, cn: string) => (zh ? cn : en);
    await page.goto("/");
    await page
      .getByLabel(label("Open example…", "打开示例…"), { exact: true })
      .selectOption("counter");
    await page
      .getByRole("button", { name: label("Debug", "调试"), exact: true })
      .click();
    await page
      .getByRole("button", {
        name: label("Signal history", "信号历史"),
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("button", {
        name: label("Back one instruction", "后退一条指令"),
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(page.locator(".signal-track svg")).toHaveCount(0);
    await page
      .getByRole("button", { name: label("Breakpoints", "断点"), exact: true })
      .click();
    const track = page.locator(".signal-track").first();
    await track.getByRole("checkbox").check();
    const condition = track.getByRole("combobox");
    await expect(track.getByRole("spinbutton")).toBeVisible();
    await condition.selectOption("change");
    await expect(track.getByRole("spinbutton")).toHaveCount(0);
    await condition.selectOption("equal");
    await expect(track.getByRole("spinbutton")).toHaveValue("0");
    await track.getByRole("checkbox").uncheck();
    await page
      .getByLabel(label("Open example…", "打开示例…"), { exact: true })
      .selectOption("cpu");
    await page
      .getByRole("button", { name: label("Debug", "调试"), exact: true })
      .click();
    await page
      .getByRole("button", {
        name: label("Signal history", "信号历史"),
        exact: true,
      })
      .click();
    await expect(
      page.getByRole("button", {
        name: label("Back one instruction", "后退一条指令"),
        exact: true,
      }),
    ).toBeVisible();
  });
}
