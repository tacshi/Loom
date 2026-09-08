import { test, expect } from "@playwright/test";

for (const zh of [false, true]) {
  test(`sidebar tabs select panels and support keyboard navigation (${zh ? "zh" : "en"})`, async ({
    page,
  }, info) => {
    await page.addInitScript(
      (zh) => localStorage.setItem("loom-language", zh ? "zh" : "en"),
      zh,
    );
    await page.goto("/");
    const strip = page.getByRole("tablist", {
      name: zh ? "工作区面板" : "Workbench panels",
    });
    const tabs = strip.getByRole("tab");
    await expect(tabs).toHaveCount(3);
    const names = zh
      ? ["元件", "电路", "学习"]
      : ["Components", "Circuit", "Learn"];
    const assertSelected = async (n: number) => {
      await expect(tabs.nth(n)).toHaveAttribute("aria-selected", "true");
      await expect(strip.locator('[tabindex="0"]')).toHaveCount(1);
      await expect(page.getByRole("tabpanel")).toHaveCount(1);
      await expect(
        page.getByRole("tabpanel", { name: names[n], exact: true }),
      ).toBeVisible();
    };
    await assertSelected(0);
    await tabs.nth(0).focus();
    await page.keyboard.press("ArrowRight");
    await assertSelected(1);
    await expect(tabs.nth(1)).toBeFocused();
    await page.keyboard.press("End");
    await assertSelected(2);
    await page.keyboard.press("Tab");
    await expect(page.getByRole("tabpanel")).toBeFocused();
    await tabs.nth(2).focus();
    await page.keyboard.press("ArrowRight");
    await assertSelected(0);
    await page.keyboard.press("ArrowLeft");
    await assertSelected(2);
    await page.keyboard.press("Home");
    await assertSelected(0);
    const search = page.getByRole("textbox", {
      name: zh ? "搜索元件…" : "Find a component…",
      exact: true,
    });
    await search.fill("NAND");
    await tabs.nth(1).click();
    await tabs.nth(0).click();
    await expect(search).toHaveValue("NAND");
    await search.fill("");
    for (const width of [1280, 1024, 740]) {
      await page.setViewportSize({ width, height: 800 });
      await expect(strip).toHaveAttribute(
        "aria-orientation",
        width <= 750 ? "vertical" : "horizontal",
      );
      expect(
        await tabs.evaluateAll((nodes) =>
          nodes.every((el) => el.scrollWidth <= el.clientWidth + 2),
        ),
      ).toBe(true);
      await page
        .locator(".library")
        .screenshot({ path: info.outputPath(`tabs-${width}.png`) });
    }
    await tabs.nth(0).focus();
    await page.keyboard.press("ArrowDown");
    await assertSelected(1);
    await page.keyboard.press("ArrowUp");
    await assertSelected(0);
    await page.setViewportSize({ width: 1280, height: 800 });
    await page
      .getByRole("button", {
        name: zh ? "深色主题" : "Dark theme",
        exact: true,
      })
      .click();
    await page
      .locator(".library")
      .screenshot({ path: info.outputPath("tabs-dark.png") });
  });
}
