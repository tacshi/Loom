import { test, expect } from "@playwright/test";
import { Builder } from "../../src/examples/adder";

for (const zh of [false, true]) {
  test(`wiring warning clears the hint and zoom (${zh ? "zh" : "en"})`, async ({ page }) => {
    await page.addInitScript((zh) => localStorage.setItem("loom-language", zh ? "zh" : "en"), zh);
    const b = new Builder("Overlay regression");
    b.add("left", "probe", 0, 0);
    b.add("right", "probe", 0, 160);
    await page.goto("/");
    await page.getByRole("button", { name: zh ? "工程管理" : "Projects", exact: true }).click();
    await page.locator("input[type=file]").setInputFiles({name:"overlay.loom.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(b.p))});
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.getByRole("button", {name:zh ? "显示完整电路" : "Fit circuit",exact:true}).click();
    const canvas = (await page.locator(".canvas-host").boundingBox())!;
    await page.mouse.click(canvas.x + 50, canvas.y + 74);
    await page.mouse.click(canvas.x + 50, canvas.y + 266);
    await expect(page.locator(".canvas-notice")).toBeVisible();
    await expect(page.locator(".wire-hint")).toBeVisible();
    for (const width of [1280, 960]) {
      await page.setViewportSize({width,height:800});
      const notice = (await page.locator(".canvas-notice").boundingBox())!;
      for (const selector of [".wire-hint", ".zoom-label"]) {
        const other = (await page.locator(selector).boundingBox())!;
        expect(notice.y + notice.height, selector).toBeLessThanOrEqual(other.y);
      }
    }
  });
}

test("returning to a saved course opens its lesson", async ({page}) => {
  await page.goto("/");
  await page.getByRole("tab", {name:"Learn",exact:true}).click();
  await page.getByRole("button", {name:"Start course",exact:true}).click();
  await expect(page.getByText("Saved locally",{exact:true})).toBeVisible();
  await page.reload();
  await expect(page.getByRole("tab", {name:"Learn",exact:true})).toHaveAttribute("aria-selected","true");
  await expect(page.locator(".course-heading h2")).toHaveText("Connect a switch to an output");
});

test("closing failed results removes obsolete repair guidance", async ({page}) => {
  await page.goto("/");
  await page.getByRole("tab", {name:"Learn",exact:true}).click();
  await page.getByRole("button", {name:"Start course",exact:true}).click();
  await page.getByRole("button", {name:"Run tests",exact:true}).click();
  const guidance = page.getByText("Inspect the failing test below and revise your solution.",{exact:true});
  await expect(guidance).toBeVisible();
  await page.getByRole("button", {name:"Return to editing",exact:true}).click();
  await expect(page.locator(".visual-tests")).toHaveCount(0);
  await expect(guidance).toHaveCount(0);
});
