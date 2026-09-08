import { test, expect } from "@playwright/test";
import { courseAt } from "../courseFixture";

for (const zh of [false, true]) {
  test(`hints collapse when switching lessons (${zh ? "zh" : "en"})`, async ({
    page,
  }) => {
    const project = await courseAt("core-08");
    await page.addInitScript(
      (zh) => localStorage.setItem("loom-language", zh ? "zh" : "en"),
      zh,
    );
    await page.goto("/");
    await expect(
      page.getByText(/^(Saved locally|已保存到本地)$/),
    ).toBeVisible();
    await page.evaluate(async (project) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open("loom-workbench", 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const tx = db.transaction("projects", "readwrite");
      tx.objectStore("projects").put(project);
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
      localStorage.setItem("loom-current", project.id);
    }, project);
    await page.reload();
    await page
      .getByRole("tab", { name: zh ? "学习" : "Learn", exact: true })
      .click();
    const hints = page
      .locator("details")
      .filter({
        has: page.locator("summary", { hasText: zh ? /^提示$/ : /^Hints$/ }),
      })
      .first();
    await hints.locator(":scope > summary").click();
    await hints.locator("details > summary").first().click();
    await expect(hints.locator("details").first().locator("p")).toHaveText(
      zh
        ? "或门只有一种情况会关闭，是哪种输入组合？"
        : "OR is off in exactly one case. Which input pair is it?",
    );
    await expect(hints).toHaveAttribute("open", "");
    await page
      .getByRole("tab", { name: zh ? "元件" : "Components", exact: true })
      .click();
    await page
      .getByRole("tab", { name: zh ? "学习" : "Learn", exact: true })
      .click();
    await expect(hints).toHaveAttribute("open", "");
    await page
      .getByRole("button", {
        name: zh ? "选择任务" : "Select lesson",
        exact: true,
      })
      .click();
    await page
      .locator("#mission-options")
      .getByRole("button", { name: /^07 ·/ })
      .click();
    await expect(page.locator(".mission-selector")).toHaveAttribute(
      "data-number",
      "07",
    );
    await expect(hints).not.toHaveAttribute("open", "");
    await hints.locator(":scope > summary").click();
    await expect(hints.locator("details[open]")).toHaveCount(0);
  });
}
