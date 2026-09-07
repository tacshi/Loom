import { test, expect } from "@playwright/test";

for (const size of [
  { width: 1280, height: 800 },
  { width: 1920, height: 1080 },
])
  for (const zh of [false, true]) {
    test(`desktop ${size.width} ${zh ? "Chinese" : "English"} wiring, keyboard and course progression`, async ({
      page,
    }) => {
      await page.setViewportSize(size);
      await page.addInitScript(
        (zh) => localStorage.setItem("loom-language", zh ? "zh" : "en"),
        zh,
      );
      await page.goto("/");
      const label = (en: string, cn: string) => (zh ? cn : en);
      await page
        .getByRole("button", { name: label("Learn", "学习"), exact: true })
        .click();
      await page
        .getByRole("button", {
          name: label("Start course", "开始课程"),
          exact: true,
        })
        .click();
      const connect = async (
        from: string,
        port: string,
        to: string,
        input: string,
      ) => {
        await page
          .getByRole("button", { name: label("Circuit", "电路"), exact: true })
          .click();
        await page.getByRole("button", { name: from, exact: true }).click();
        await page
          .getByRole("button", {
            name: label("Connect ", "连接 ") + port,
            exact: true,
          })
          .click();
        await page.getByRole("button", { name: to, exact: true }).click();
        await page
          .getByRole("button", {
            name: label("Connect ", "连接 ") + input,
            exact: true,
          })
          .click();
      };
      await page.getByRole("button", { name: label("Challenge", "挑战"), exact: true }).click();
      await connect(label("a Input port","a 输入端口"),"out",label("out Output port","out 输出端口"),"in");
      await page
        .getByRole("button", { name: label("Learn", "学习"), exact: true })
        .click();
      await page
        .getByRole("button", {
          name: label("Run tests", "运行测试"),
          exact: true,
        })
        .click();
      await expect(
        page.getByText(
          label("Verified component saved.", "已保存验证后的元件。"),
          { exact: true },
        ),
      ).toBeVisible();
      await page
        .getByRole("button", { name: label("Continue", "继续"), exact: true })
        .click();
      await expect(page.locator(".course-heading h2")).toHaveText(
        label("Both inputs must be on (AND)", "两个输入都为开（与）"),
      );
      const name = page.getByLabel(label("Project", "工程"), { exact: true });
      await name.fill(label("Keyboard draft", "键盘草稿"));
      await name.press("Tab");
      await expect(name).not.toBeFocused();
      await expect(
        page.getByText(label("Saved locally", "已保存到本地"), { exact: true }),
      ).toBeVisible();
      await page.reload();
      await expect(name).toHaveValue(label("Keyboard draft", "键盘草稿"));
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    });
  }
