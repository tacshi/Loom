import { test, expect } from "@playwright/test";

for (const zh of [false, true]) {
  test(`normal outputs need no extra action (${zh ? "Chinese" : "English"})`, async ({
    page,
  }) => {
    await page.addInitScript(
      (zh) => localStorage.setItem("loom-language", zh ? "zh" : "en"),
      zh,
    );
    const label = (en: string, cn: string) => (zh ? cn : en);
    await page.goto("/");
    const { exercise }=await import("../../src/course/registry");
    const spec=exercise("core-01");
    const load=async (starter=false)=>{
      const p=starter?spec.starter():spec.reference();p.circuits[p.root].tests=spec.checks();
      await page.getByRole("button",{name:label("Projects","工程管理"),exact:true}).click();
      await page.locator("input[type=file]").setInputFiles({name:"signals.loom.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(p))});
      await expect(page.getByRole("dialog")).toHaveCount(0);
      if(!await page.locator(".debugger").isVisible())await page.getByRole("button",{name:label("Debug","调试"),exact:true}).click();
    };
    await load();
    const connections = page.getByRole("button", {
      name: label("Show connections", "查看连接"),
      exact: true,
    });
    await expect(
      page.locator(".behavior-signal").filter({ hasText: "out" }),
    ).toContainText(label("0 · off", "0 · 关"));
    await expect(connections).toHaveCount(0);
    await page
      .getByRole("button", {
        name: label("Run tests", "运行测试"),
        exact: true,
      })
      .click();
    await page
      .getByRole("button", {
        name: label("Show result", "查看结果"),
        exact: true,
      })
      .click();
    await expect(page.locator(".test-focus")).toContainText(
      label("1 · on", "1 · 开"),
    );
    await expect(page.locator(".test-focus button")).toHaveCount(0);
    await page
      .getByRole("button", {
        name: label("Return to editing", "返回编辑"),
        exact: true,
      })
      .click();
    await load(true);
    await expect(connections).toHaveCount(1);
    await page
      .getByRole("button", {
        name: label("Run tests", "运行测试"),
        exact: true,
      })
      .click();
    await expect(page.locator(".test-mismatch")).toBeVisible();
    await expect(connections).toHaveCount(1);
    await connections.click();
    await expect(page.locator(".source-chain")).toContainText("out");
    await expect(page.locator(".source-chain")).toContainText(label("Z · no signal", "Z · 无信号"));
    await expect(page.locator(".source-chain")).not.toContainText(label("X · unknown", "X · 未知"));
    await expect(page.locator(".source-chain h3")).toHaveText(
      label("Connections", "连接"),
    );
    await expect(page.locator(".behavior-signal button")).toHaveCount(0);
  });
}
