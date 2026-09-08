import { test, expect } from "@playwright/test";
import { exercise } from "../../src/course/registry";
import type { ExerciseId } from "../../src/course/types";

// Later lessons are loaded as isolated drafts to test instruction and feedback UI,
// not to claim that predictions pass a construction mission.
for (const zh of [false, true]) {
  test(`concepts explain each major transition without granting mission credit (${zh ? "zh" : "en"})`, async ({
    page,
  }, info) => {
    await page.addInitScript(
      (zh) => localStorage.setItem("loom-language", zh ? "zh" : "en"),
      zh,
    );
    const label = (en: string, cn: string) => (zh ? cn : en);
    await page.goto("/");
    const checkpoints: {
      id: ExerciseId;
      keyword: string;
      wrong: number;
      right: number;
    }[] = [
      {
        id: "core-03",
        keyword: label("A logic gate", "逻辑门"),
        wrong: 0,
        right: 1,
      },
      {
        id: "core-13",
        keyword: label("Binary writes", "二进制"),
        wrong: 0,
        right: 1,
      },
      {
        id: "core-31",
        keyword: label("A flip-flop stores", "触发器存储"),
        wrong: 1,
        right: 0,
      },
      { id: "core-43", keyword: "opcode", wrong: 1, right: 0 },
      {
        id: "core-50",
        keyword: label("accumulator A", "累加器 A"),
        wrong: 1,
        right: 0,
      },
      { id: "core-57", keyword: "48", wrong: 0, right: 1 },
    ];
    for (const checkpoint of checkpoints) {
      const p = exercise(checkpoint.id).starter();
      delete p.courseReference;
      p.course = {
        id: "build-computer",
        curriculum: 3,
        active: checkpoint.id,
        drafts: { [checkpoint.id]: p.root },
        accepted: {},
      };
      await page
        .getByRole("button", {
          name: label("Projects", "工程管理"),
          exact: true,
        })
        .click();
      await page.locator('input[type="file"]').setInputFiles({
        name: "lesson.loom.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(p)),
      });
      await page
        .getByRole("tab", { name: label("Learn", "学习"), exact: true })
        .click();
      const concept = page.locator(".mission-concept");
      await expect(concept.locator(":scope > p")).toContainText(
        checkpoint.keyword,
      );
      if (checkpoint.id === "core-03") {
        await expect(
          page.getByText(/Open Components and drag AND|打开「元件」，将与门拖/),
        ).toBeVisible();
      }
      await concept.locator("summary").click();
      const prediction = concept.locator("fieldset");
      await prediction.getByRole("button").nth(checkpoint.wrong).click();
      await expect(prediction.getByRole("status")).toContainText(
        label("Reconsider:", "再想一想"),
      );
      await prediction.getByRole("button").nth(checkpoint.right).click();
      await expect(prediction.getByRole("status")).toContainText(
        label("That’s right.", "推想正确"),
      );
      await expect(
        page.getByRole("button", {
          name: label("Next mission", "下一个任务"),
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(page.locator(".mission-position")).toContainText("0/60");
      expect(
        await concept.evaluate((el) => el.scrollWidth <= el.clientWidth + 2),
      ).toBe(true);
      if (checkpoint.id === "core-03")
        await page.screenshot({
          path: info.outputPath("first-gate-teaching.png"),
        });
    }
  });
}

test("machine code starts at the circuit rather than the assembly editor", async ({
  page,
}) => {
  const p = exercise("core-49").starter();
  p.course = {
    id: "build-computer",
    curriculum: 3,
    active: "core-49",
    drafts: { "core-49": p.root },
    accepted: {},
  };
  await page.goto("/");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "machine.loom.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(p)),
  });
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await expect(page.locator(".mission-concept")).toContainText(
    "edit ROM words directly",
  );
  await expect(page.locator(".program-panel")).toHaveCount(0);
});
