import { test, expect } from "@playwright/test";

for (const zh of [false, true]) {
  test(`debug view selection stays visible (${zh ? "Chinese" : "English"})`, async ({
    page,
  }) => {
    await page.addInitScript(
      (zh) => localStorage.setItem("loom-language", zh ? "zh" : "en"),
      zh,
    );
    const label = (en: string, cn: string) => (zh ? cn : en);
    await page.goto("/");
    await page
      .getByRole("tab", { name: label("Learn", "学习"), exact: true })
      .click();
    await page
      .getByRole("button", {
        name: label("Start course", "开始课程"),
        exact: true,
      })
      .click();
    await page.getByRole("button", { name: label("Debug", "调试"), exact: true }).click();
    const header = page.locator(".debugger > .debugger-header");
    const overview = header.getByRole("button", {
      name: label("Inputs & outputs", "输入与输出"),
      exact: true,
    });
    const history = header.getByRole("button", {
      name: label("Signal history", "信号历史"),
      exact: true,
    });
    const breakpoints = header.getByRole("button", {
      name: label("Breakpoints", "断点"),
      exact: true,
    });
    for (const selected of [overview, history, breakpoints, history]) {
      await selected.focus();
      await page.keyboard.press("Enter");
      await page.mouse.move(400, 100);
      await expect(selected).toHaveAttribute("aria-pressed", "true");
      await expect(header.locator('[aria-pressed="true"]')).toHaveCount(1);
      const inactive = selected === overview ? history : overview;
      const colors = await inactive.evaluate((el) => {
        const style = getComputedStyle(el);
        return {
          background: style.backgroundColor,
          border: style.borderTopColor,
        };
      });
      await expect(selected).not.toHaveCSS(
        "background-color",
        colors.background,
      );
      await expect(selected).not.toHaveCSS("border-top-color", colors.border);
    }
    await expect(
      page.getByRole("button", {
        name: label("Back one instruction", "后退一条指令"),
        exact: true,
      }),
    ).toHaveCount(0);
    await expect(page.locator(".signal-history-description")).toContainText(
      "0",
    );
    await expect(page.locator(".signal-history-description")).toContainText(
      "1",
    );
    await page
      .getByRole("button", {
        name: label("Run tests", "运行测试"),
        exact: true,
      })
      .click();
    await expect(page.locator(".visual-tests")).toBeVisible();
    await page
      .getByRole("button", {
        name: label("Show connections", "查看连接"),
        exact: true,
      })
      .click();
    await expect(overview).toHaveAttribute("aria-pressed", "true");
    await expect(history).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".signal-history-description")).toHaveCount(0);
  });
}
