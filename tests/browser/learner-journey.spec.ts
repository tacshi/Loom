import { test, expect, type Page } from "@playwright/test";
import { exercise } from "../../src/course/registry";
import { activateExercise, acceptCheck } from "../../src/course/session";
import { checkCourse } from "../../src/course/check";
import { prepareCourseSubmission } from "../../scripts/course-submission";
import { courseAt } from "../courseFixture";
import type { Project } from "../../src/model/types";
import { assemble } from "../../src/cpu/assembler";

// Seed a saved current-format project to isolate UI transitions from import verification.
async function resume(page: Page, project: Project) {
  await page.goto("/");
  await expect(page.getByText(/^(Saved locally|已保存到本地)$/)).toBeVisible();
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
}

test("first mission explains wiring and names locked prerequisites", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page.getByRole("button", { name: "Start course", exact: true }).click();
  await expect(
    page.getByText(/Click the small pin on the right of a/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Select lesson", exact: true }).click();
  await expect(page.locator('.course-learn [aria-current="step"]')).toContainText(
    "Connect a switch to an output",
  );
  const second = page
    .locator(".course-learn nav details")
    .filter({
      hasText: /^02 · One switch, two outputs/,
    });
  await second.locator("summary").click();
  await expect(second).toContainText(
    "Complete first: Connect a switch to an output",
  );
  await expect(
    second.getByRole("button", { name: "Free practice", exact: true }),
  ).toBeEnabled();
});

test("an optional project leads back to the next unfinished core mission", async ({
  page,
}) => {
  const p = await courseAt("core-06", true);
  activateExercise(p, "project-01");
  prepareCourseSubmission(p, "project-01");
  await acceptCheck(p, await checkCourse(p, "project-01"));
  await resume(page, p);
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await expect(
    page.getByText("Mission complete: Repair a disconnected indicator", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Continue core course", exact: true })
    .click();
  await expect(page.locator(".course-heading h2")).toHaveText(
    "Both switches, using NAND",
  );
});

for (const zh of [false, true]) {
  test(`programming opens the editor and loads only the active mission ROM (${zh ? "zh" : "en"})`, async ({
    page,
  }) => {
    const p = exercise("core-50").reference();
    delete p.courseReference;
    p.course = {
      id: "build-computer",
      curriculum: 3,
      active: "core-50",
      drafts: { "core-50": p.root },
      accepted: {},
    };
    // Repeated component IDs in other drafts used to make the loader overwrite the first ROM.
    const other = structuredClone(p.circuits[p.root]);
    other.id = "other-draft";
    other.name = "Other mission";
    p.circuits = { [other.id]: other, ...p.circuits };
    const original = structuredClone(
      other.components.find((n) => n.id === p.cpu!.rom)!.image,
    );
    await page.addInitScript(
      (zh) => localStorage.setItem("loom-language", zh ? "zh" : "en"),
      zh,
    );
    await resume(page, p);
    const label = (en: string, cn: string) => (zh ? cn : en);
    await expect(page.locator(".program-panel")).toBeVisible();
    const target = page.getByLabel(label("Program ROM", "程序 ROM"), {
      exact: true,
    });
    await expect(target.locator("option")).toHaveCount(1);
    await expect(target).not.toContainText("Other mission");
    const source = "LDI 7\nOUT\nHLT";
    await page.locator(".program-panel textarea").fill(source);
    await page
      .getByRole("button", {
        name: label("Assemble & load", "汇编并加载"),
        exact: true,
      })
      .click();
    await expect(
      page.getByText(label("Saved locally", "已保存到本地"), { exact: true }),
    ).toBeVisible();
    const saved = await page.evaluate(async (id) => {
      const db = await new Promise<IDBDatabase>((resolve) => {
        const request = indexedDB.open("loom-workbench", 1);
        request.onsuccess = () => resolve(request.result);
      });
      const value = await new Promise<Project>((resolve) => {
        const request = db
          .transaction("projects")
          .objectStore("projects")
          .get(id);
        request.onsuccess = () => resolve(request.result);
      });
      db.close();
      return value;
    }, p.id);
    expect(
      saved.circuits[saved.root].components.find((n) => n.id === p.cpu!.rom)!
        .image,
    ).toEqual(assemble(source).image);
    expect(
      saved.circuits[other.id].components.find((n) => n.id === p.cpu!.rom)!
        .image,
    ).toEqual(original);
    await page
      .getByRole("tab", { name: label("Learn", "学习"), exact: true })
      .click();
    await page
      .getByText(label("CPU reference", "CPU 参考"), { exact: true })
      .click();
    await expect(page.locator(".cpu-reference")).toContainText("0x0107");
    await page
      .getByText(label("Clock and control bus", "时钟与控制总线"), {
        exact: true,
      })
      .click();
    await expect(page.locator(".cpu-reference")).toContainText("0x0D");
    expect(
      await page
        .locator(".cpu-reference")
        .evaluate((node) => node.scrollWidth <= node.clientWidth + 2),
    ).toBe(true);
    await page.getByText(label("Hints", "提示"), { exact: true }).click();
    await page.locator(".mission-hints > details > summary").last().click();
    await page
      .getByRole("button", {
        name: label("View example", "查看示例"),
        exact: true,
      })
      .click();
    await expect(page.locator(".program-panel textarea")).toHaveAttribute(
      "readonly",
      "",
    );
    await expect(
      page.getByRole("button", {
        name: label("Assemble & load", "汇编并加载"),
        exact: true,
      }),
    ).toBeDisabled();
    await page
      .getByRole("button", {
        name: label("Return to your mission", "返回自己的任务"),
        exact: true,
      })
      .click();
    await expect(page.locator(".program-panel textarea")).toHaveValue(source);
  });
}

test("cancel from the lesson releases test playback and editing", async ({
  page,
}) => {
  await page.route("**/src/course/worker.ts*", (route) =>
    route.fulfill({
      contentType: "application/javascript",
      body: "self.onmessage = () => {};",
    }),
  );
  await page.goto("/");
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page.getByRole("button", { name: "Start course", exact: true }).click();
  await page.getByRole("button", { name: "Run tests", exact: true }).click();
  await expect(page.locator(".visual-tests")).toBeVisible();
  await page
    .locator(".course-learn")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(page.locator(".visual-tests")).toHaveCount(0);
  await expect(
    page
      .locator(".course-learn")
      .getByRole("button", { name: "Cancel", exact: true }),
  ).toHaveCount(0);
});
