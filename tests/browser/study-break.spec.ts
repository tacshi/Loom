import { test, expect } from "@playwright/test";
import { newCourse } from "../../src/course/session";
import { courseAt } from "../courseFixture";

for (const zh of [false, true]) {
  test(`passed missions return to Learn and study resumes after experimenting (${zh ? "zh" : "en"})`, async ({ page }) => {
    await page.addInitScript((zh) => localStorage.setItem("loom-language", zh ? "zh" : "en"), zh);
    const label = (en: string, cn: string) => zh ? cn : en;
    await page.goto("/");
    await page.getByRole("tab", {name:label("Learn","学习"),exact:true}).click();
    await page.getByRole("button", {name:label("Start course","开始课程"),exact:true}).click();
    await page.getByRole("tab", {name:label("Circuit","电路"),exact:true}).click();
    await page.getByRole("button", {name:label("a Input port","a 输入端口"),exact:true}).click();
    await page.getByRole("button", {name:label("Connect out","连接 out"),exact:true}).click();
    await page.getByRole("button", {name:label("out Output port","out 输出端口"),exact:true}).click();
    await page.getByRole("button", {name:label("Connect in","连接 in"),exact:true}).click();
    const port = page.locator(".port-row").first();
    const padding = await port.evaluate(el => ({left:parseFloat(getComputedStyle(el).paddingLeft),right:parseFloat(getComputedStyle(el).paddingRight)}));
    expect(padding.left).toBeGreaterThanOrEqual(8);
    expect(padding.right).toBeGreaterThanOrEqual(8);
    await page.getByRole("tab", {name:label("Components","元件"),exact:true}).click();
    const run = page.getByRole("button", {name:label("Run tests","运行测试"),exact:true});
    await expect(run.locator('svg[aria-hidden="true"]')).toBeVisible();
    await run.click();
    await expect(page.getByRole("tab", {name:label("Learn","学习"),exact:true})).toHaveAttribute("aria-selected","true");
    await expect(page.getByRole("button", {name:label("Next mission","下一个任务"),exact:true})).toBeVisible();
    await page.getByRole("button", {name:label("Pause course & experiment","暂停学习，自由实验"),exact:true}).click();
    await expect(page.getByRole("tab", {name:label("Components","元件"),exact:true})).toHaveAttribute("aria-selected","true");
    await page.getByLabel(label("Project","工程"),{exact:true}).fill("Study break experiment");
    const nand = page.getByRole("button",{name:label("NAND","与非门"),exact:true});
    await expect(nand).toBeEnabled();
    await nand.focus();
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    await expect(page.locator("footer")).toContainText(label("1 components","1 元件"));
    await expect(page.getByText(label("Saved locally","已保存到本地"),{exact:true})).toBeVisible();
    await page.reload();
    await page.getByRole("button",{name:label("Resume course","继续学习"),exact:true}).click();
    await expect(page.locator(".mission-position").first()).toContainText("1/60");
    await expect(page.locator("footer")).toContainText(label("1 connections","1 连接"));
    await expect(page.getByRole("tab", {name:label("Learn","学习"),exact:true})).toHaveAttribute("aria-selected","true");
    await page.getByRole("button",{name:label("Next mission","下一个任务"),exact:true}).click();
    await page.getByRole("button",{name:label("Pause course & experiment","暂停学习，自由实验"),exact:true}).click();
    await page.getByRole("tab",{name:label("Learn","学习"),exact:true}).click();
    await expect(page.getByRole("button",{name:label("Start course","开始课程"),exact:true})).toHaveCount(0);
    await page.reload();
    await page.getByRole("tab",{name:label("Learn","学习"),exact:true}).click();
    await page.getByRole("button",{name:label("Resume course","继续学习"),exact:true}).click();
    await expect(page.locator(".course-heading h2")).toHaveText(label("One switch, two outputs","用一个开关控制两个输出"));
    await expect(page.locator(".mission-position").first()).toContainText("1/60");
    // Recover the paused lesson even if another course was opened in the meantime.
    await page.getByRole("button",{name:label("Pause course & experiment","暂停学习，自由实验"),exact:true}).click();
    await page.getByRole("button",{name:label("Projects","工程管理"),exact:true}).click();
    await page.locator('input[type=file]').setInputFiles({name:"another-course.loom.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(newCourse()))});
    await expect(page.locator(".course-heading h2")).toHaveText(label("Connect a switch to an output","把开关连接到输出"));
    await page.getByRole("button",{name:label("Resume course","继续学习"),exact:true}).click();
    await expect(page.locator(".course-heading h2")).toHaveText(label("One switch, two outputs","用一个开关控制两个输出"));
    await expect(page.locator(".mission-position").first()).toContainText("1/60");
    await page.getByRole("button",{name:label("Projects","工程管理"),exact:true}).click();
    await page.getByRole("button",{name:/Study break experiment/}).click();
    await expect(page.locator("footer")).toContainText(label("1 components","1 元件"));
  });

  test(`construction instructions name Components (${zh ? "zh" : "en"})`, async ({page}) => {
    await page.addInitScript((zh) => localStorage.setItem("loom-language", zh ? "zh" : "en"), zh);
    await page.goto("/");
    await page.getByRole("button",{name:zh?"工程管理":"Projects",exact:true}).click();
    await page.locator('input[type=file]').setInputFiles({name:"course.loom.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(await courseAt("core-04")))});
    await expect(page.locator("#library-panel-learn .course-learn")).toContainText(zh?"从「元件」拖入所需元件，再连接引脚。":"Drag the parts you need from Components onto the canvas, then connect their pins.");
  });
}
