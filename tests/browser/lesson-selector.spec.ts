import { test, expect } from "@playwright/test";
for (const zh of [false, true]) {
  test(`locked lessons open separate practice without unlocking course (${zh ? "zh" : "en"})`, async ({page}) => {
    await page.addInitScript(zh => localStorage.setItem("loom-language",zh?"zh":"en"),zh);
    const label=(en:string,cn:string)=>zh?cn:en;
    await page.goto("/");
    await page.getByRole("tab",{name:label("Learn","学习"),exact:true}).click();
    await page.getByRole("button",{name:label("Start course","开始课程"),exact:true}).click();
    await expect(page.locator(".mission-position").first()).toHaveText(label("Completed 0/60","已完成 0/60"));
    const picker=page.getByRole("button",{name:label("Select lesson","选择任务"),exact:true});
    const context = page.locator(".current-lesson");
    for (const width of [1280, 740]) {
      await page.setViewportSize({ width, height: 800 });
      for (const name of [label("Components", "元件"), label("Circuit", "电路"), label("Learn", "学习")]) {
        await page.getByRole("tab", { name, exact: true }).click();
        await expect(picker).toBeVisible();
        await expect(context.locator(".lesson-objective")).toBeVisible();
        const header = await context.boundingBox();
        const tabs = await page.getByRole("tablist").boundingBox();
        expect(header!.y + header!.height).toBeLessThanOrEqual(tabs!.y + 1);
        expect(await context.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      }
    }
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.getByRole("tab", { name: label("Components", "元件"), exact: true }).click();
    await picker.click();
    const menu=page.getByRole("navigation",{name:label("Course missions","课程任务"),exact:true});
    await expect(menu.locator("section")).toHaveCount(10);
    const locked=menu.locator("details").filter({hasText:new RegExp("^02 · " + label("One switch, two outputs","用一个开关控制两个输出"))});
    await locked.locator("summary").click();
    await expect(locked).toContainText(label("Complete first:","请先完成："));
    await locked.getByRole("button",{name:label("Free practice","自由练习"),exact:true}).click();
    await expect(page.getByLabel(label("Project","工程"),{exact:true})).toHaveValue(label("Free practice: One switch, two outputs","自由练习：用一个开关控制两个输出"));
    await expect(page.locator("footer")).toContainText(label("3 components","3 元件"));
    await page.getByRole("button",{name:label("Run tests","运行测试"),exact:true}).click();
    await expect(page.locator(".visual-tests")).toBeVisible();
    await page.getByRole("button",{name:label("Resume course","继续学习"),exact:true}).click();
    await expect(page.locator(".course-heading h2")).toHaveText(label("Connect a switch to an output","把开关连接到输出"));
    await expect(page.locator(".mission-position").first()).toHaveText(label("Completed 0/60","已完成 0/60"));
    await picker.click();
    await expect(menu.locator("details").filter({hasText:new RegExp("^02 · " + label("One switch, two outputs","用一个开关控制两个输出"))})).toContainText(label("Locked","未解锁"));
    await menu.locator("summary").first().focus();
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
    await expect(picker).toBeFocused();
  });
}
