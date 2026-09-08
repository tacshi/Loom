import { test, expect, type Page } from "@playwright/test";

async function clippedControls(page: Page) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  return page
    .locator("button, summary, h2, h3, .selection-title, .symbol")
    .evaluateAll((nodes) =>
      nodes.flatMap((node) => {
        const el = node as HTMLElement,
          style = getComputedStyle(el);
        if (!el.getClientRects().length || style.textOverflow === "ellipsis")
          return [];
        const box = el.getBoundingClientRect();
        const issues: string[] = [];
        if (el.scrollWidth > el.clientWidth + 2)
          issues.push(
            `${el.tagName}.${el.className}: ${el.textContent?.trim().slice(0, 65)} (${el.scrollWidth}/${el.clientWidth})`,
          );
        const panel = el.closest(
          ".library, .inspector, .dialog, .program-panel, .debugger, .devices-panel",
        );
        if (panel) {
          const boundary = panel.getBoundingClientRect();
          if (box.right > boundary.right + 2 || box.left < boundary.left - 2)
            issues.push(
              `Outside panel: ${el.textContent?.trim().slice(0, 65)}`,
            );
        }
        return issues;
      }),
    );
}
for (const width of [1280, 1024, 740])
  for (const language of ["en", "zh"]) {
    test(`text fits controls at ${width}px in ${language}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (lang) => localStorage.setItem("loom-language", lang),
        language,
      );
      await page.goto("/");
      const label = (en: string, zh: string) => (language === "en" ? en : zh);
      await expect(
        page.getByText(label("Saved locally", "已保存到本地"), { exact: true }),
      ).toHaveCount(1);
      expect.soft(await clippedControls(page), "component palette").toEqual([]);
      if (language === "en" && width !== 1024) {
        await page.screenshot({ path: testInfo.outputPath("palette.png") });
      }
      await page
        .getByLabel(label("Open example…", "打开示例…"), { exact: true })
        .selectOption("counter");
      await page
        .getByRole("tab", { name: label("Circuit", "电路"), exact: true })
        .click();
      await page
        .getByRole("button", {
          name: label("Count Counter", "Count 计数器"),
          exact: true,
        })
        .click();
      expect
        .soft(await clippedControls(page), "circuit list and inspector")
        .toEqual([]);
      await page
        .getByLabel(label("Name", "名称"), { exact: true })
        .fill("ProcessorStatusRegisterWithAnUnbrokenComponentName");
      expect
        .soft(await clippedControls(page), "long component name")
        .toEqual([]);
      for (const name of [
        label("Projects", "工程管理"),
        label("Libraries", "元件库"),
        label("Help", "帮助"),
      ]) {
        await page.getByRole("button", { name, exact: true }).click();
        expect.soft(await clippedControls(page), name).toEqual([]);
        await page
          .getByRole("dialog")
          .getByRole("button", { name: label("Close", "关闭"), exact: true })
          .click();
      }
      await page
        .getByRole("tab", { name: label("Components", "元件"), exact: true })
        .click();
      await page.getByRole("button", { name: label("Test options", "测试选项"), exact: true }).click();
      await page
        .getByRole("button", {
          name: label("Saved tests", "已保存的测试"),
          exact: true,
        })
        .click();
      expect.soft(await clippedControls(page), "sequential tests").toEqual([]);
      await page
        .getByRole("dialog")
        .getByRole("button", { name: label("Close", "关闭"), exact: true })
        .click();
      await page
        .getByRole("tab", { name: label("Learn", "学习"), exact: true })
        .click();
      expect.soft(await clippedControls(page), "course overview").toEqual([]);
      await page
        .getByRole("button", {
          name: label("Start course", "开始课程"),
          exact: true,
        })
        .click();
      expect.soft(await clippedControls(page), "course lesson").toEqual([]);
    });
  }

for (const width of [1280, 1024, 740])
  for (const language of ["en", "zh"]) {
    test(`dock controls fit at ${width}px in ${language}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (lang) => localStorage.setItem("loom-language", lang),
        language,
      );
      await page.goto("/");
      const label = (en: string, zh: string) => (language === "en" ? en : zh);
      await page
        .getByLabel(label("Open example…", "打开示例…"), { exact: true })
        .selectOption("echo");
      await page
        .getByRole("button", { name: label("Program", "程序"), exact: true })
        .click();
      expect.soft(await clippedControls(page), "program panel").toEqual([]);
      await page
        .locator(".program-panel")
        .getByRole("button", { name: label("Close", "关闭"), exact: true })
        .click();
      await page
        .getByRole("button", { name: label("Debug", "调试"), exact: true })
        .click();
      expect
        .soft(await clippedControls(page), "debugger and timeline")
        .toEqual([]);
      await page
        .locator(".debugger")
        .getByRole("button", { name: label("Close", "关闭"), exact: true })
        .click();
      await page
        .getByRole("button", { name: label("Devices", "外设"), exact: true })
        .click();
      expect.soft(await clippedControls(page), "devices panel").toEqual([]);
    });
  }

for (const language of ["en", "zh"] as const) {
  test(`all component types fit the narrow circuit list in ${language}`, async ({
    page,
  }) => {
    const { emptyProject, createComponent } =
      await import("../../src/model/types");
    const { categories } = await import("../../src/model/components");
    const project = emptyProject("Component label layout");
    project.circuits[project.root].components = categories
      .flatMap((category) => category.kinds)
      .map((kind, index) => {
        const component = createComponent(
          kind,
          (index % 5) * 240,
          Math.floor(index / 5) * 400,
        );
        component.name = kind;
        return component;
      });
    await page.setViewportSize({ width: 740, height: 900 });
    await page.addInitScript(
      (lang) => localStorage.setItem("loom-language", lang),
      language,
    );
    await page.goto("/");
    const label = (en: string, zh: string) => (language === "en" ? en : zh);
    await page
      .getByRole("button", { name: label("Projects", "工程管理"), exact: true })
      .click();
    await page
      .locator("input[type=file]")
      .setInputFiles({
        name: "layout.loom.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(project)),
      });
    await expect(
      page.getByLabel(label("Project", "工程"), { exact: true }),
    ).toHaveValue(project.name);
    await page
      .getByRole("tab", { name: label("Circuit", "电路"), exact: true })
      .click();
    expect
      .soft(await clippedControls(page), "all component type labels")
      .toEqual([]);
    for (const kind of ["button", "sevenSegment", "keyboard"]) {
      await page
        .locator(".circuit-list > button")
        .filter({
          has: page.locator("span", { hasText: new RegExp(`^${kind}$`) }),
        })
        .click();
      expect.soft(await clippedControls(page), `${kind} inspector`).toEqual([]);
    }
  });
}
