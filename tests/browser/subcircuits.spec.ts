import { test, expect } from "@playwright/test";
import { courseAt } from "../courseFixture";

for (const zh of [false, true]) {
  test(`course subcircuits use compact part names (${zh ? "zh" : "en"})`, async ({
    page,
  }, info) => {
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
      .getByRole("tab", { name: zh ? "元件" : "Components", exact: true })
      .click();
    const parts = page.locator(".subcircuit-list button");
    await expect(parts.locator(".subcircuit-name")).toHaveText(
      zh ? ["与非门", "非门", "与门"] : ["NAND", "NOT", "AND"],
    );
    await expect(
      page.getByRole("heading", {
        name: zh ? "内置逻辑门" : "Built-in logic gates",
        exact: true,
      }),
    ).toBeVisible();
    for (const width of [1280, 740]) {
      await page.setViewportSize({ width, height: 900 });
      await parts.last().scrollIntoViewIfNeeded();
      const builtin = page
        .locator(".component-item")
        .filter({ has: page.locator(".symbol") })
        .filter({ hasNot: page.locator(".custom-badge") })
        .last();
      const size = await builtin.boundingBox();
      const customSize = await parts.first().boundingBox();
      expect(customSize!.width).toBeCloseTo(size!.width, 0);
      expect(customSize!.height).toBeCloseTo(size!.height, 0);
      await expect(parts.first().locator(".symbol")).toHaveText("&̅");
      await expect(parts.first().locator(".custom-badge")).toHaveText(
        zh ? "自定义" : "Custom",
      );
      expect(
        await parts.evaluateAll((nodes) =>
          nodes.every((el) => el.scrollWidth <= el.clientWidth + 1),
        ),
      ).toBe(true);
      await page
        .locator(".library")
        .screenshot({ path: info.outputPath(`subcircuits-${width}.png`) });
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await parts.nth(1).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator(".canvas-host")).toHaveAttribute(
      "data-placement",
      "preview",
    );
    await page.keyboard.press("Enter");
    await expect(page.locator(".canvas-host")).not.toHaveAttribute(
      "data-placement",
      "preview",
    );
  });
}
