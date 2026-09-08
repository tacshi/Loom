import { test, expect } from "@playwright/test";
for (const zh of [false, true]) {
  test(`creation and test actions are grouped separately (${zh ? "zh" : "en"})`, async ({
    page,
  }, info) => {
    await page.addInitScript(
      (zh) => localStorage.setItem("loom-language", zh ? "zh" : "en"),
      zh,
    );
    const label = (en: string, cn: string) => (zh ? cn : en);
    await page.goto("/");
    const footer = page.locator(".library-bottom");
    await expect(footer.getByRole("button")).toHaveCount(1);
    await expect(footer.getByRole("combobox")).toHaveCount(1);
    const button = footer.getByRole("button");
    await expect(button).toHaveText(label("New circuit", "新建电路"));
    const select = footer.getByRole("combobox");
    await select.selectOption("adder");
    await expect(
      page.getByRole("textbox", {
        name: label("Project", "工程"),
        exact: true,
      }),
    ).toHaveValue(/adder|加器/);
    const options = page.getByRole("button", {
      name: label("Test options", "测试选项"),
      exact: true,
    });
    for (const choice of [
      label("Saved tests", "已保存的测试"),
      label("Circuit tests…", "电路测试…"),
    ]) {
      await options.click();
      await page.getByRole("button", { name: choice, exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: label("Close", "关闭"), exact: true })
        .click();
    }
    await options.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
    await expect(options).toBeFocused();
    await expect(options).toHaveAttribute("aria-expanded", "false");
    await page
      .getByRole("button", {
        name: label("Run tests", "运行测试"),
        exact: true,
      })
      .click();
    await expect(page.locator(".visual-tests tbody tr")).toHaveCount(8);
    await page
      .getByRole("button", {
        name: label("Return to editing", "返回编辑"),
        exact: true,
      })
      .click();
    for (const width of [1280, 740]) {
      await page.setViewportSize({ width, height: 800 });
      const bounds = await Promise.all([
        button.boundingBox(),
        select.boundingBox(),
      ]);
      expect(Math.abs(bounds[0]!.width - bounds[1]!.width)).toBeLessThan(2);
      await footer.screenshot({ path: info.outputPath(`footer-${width}.png`) });
      await options.click();
      await page
        .locator(".test-controls")
        .screenshot({ path: info.outputPath(`tests-${width}.png`) });
      await page.keyboard.press("Escape");
    }
    await button.click();
    await expect(page.locator("footer")).toContainText(
      label("0 components", "0 元件"),
    );
  });
}
