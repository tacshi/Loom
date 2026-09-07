import { test, expect } from "@playwright/test";
test("first lesson explores signals, plays cases, and keeps challenge independent", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await page.getByRole("button", { name: "Start course", exact: true }).click();
  await expect(page.locator(".course-heading h2")).toHaveText(
    "Signals and wires",
  );
  await expect(
    page.locator('.learning-stages button[aria-current="step"]'),
  ).toHaveText("Explore");
  await expect(page.locator(".sim-controls")).not.toContainText("Run clock");
  await expect(page.locator(".timeline-panel")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Toggle input a", exact: true })
    .click();
  await expect(
    page.locator(".behavior-signal").filter({ hasText: "out" }),
  ).toContainText("1 · on");
  await page.getByRole("button", { name: "Run tests", exact: true }).click();
  await expect(page.locator(".visual-tests tbody tr")).toHaveCount(2);
  await page.getByRole("button", { name: "Show result", exact: true }).click();
  await expect(page.locator(".test-focus")).toContainText("1 · on");
  await page
    .getByRole("button", { name: "Return to editing", exact: true })
    .click();
  await expect(
    page.locator(".behavior-signal").filter({ hasText: "out" }),
  ).toContainText("1 · on");
  await page.getByRole("button", { name: "Challenge", exact: true }).click();
  await expect(page.locator("footer")).toContainText("0 connections");
  await page.getByRole("button", { name: "Run tests", exact: true }).click();
  await expect(page.locator(".test-focus")).toContainText("Z · no driver");
  await expect(
    page.getByText("Verified component saved.", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Return to editing", exact: true })
    .click();
  await page.getByRole("button", { name: "Circuit", exact: true }).click();
  await page.getByRole("button", { name: "a Input port", exact: true }).click();
  await page.getByRole("button", { name: "Connect out", exact: true }).click();
  await page
    .getByRole("button", { name: "out Output port", exact: true })
    .click();
  await page.getByRole("button", { name: "Connect in", exact: true }).click();
  await page.getByRole("button", { name: "Run tests", exact: true }).click();
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await expect(
    page.getByText("Verified component saved.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Return to editing", exact: true })
    .click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator(".course-heading h2")).toHaveText(
    "Both inputs must be on (AND)",
  );
});

test("practice is saved separately and survives returning from the challenge", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await page.getByRole("button", { name: "Start course", exact: true }).click();
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  await page.getByRole("button", { name: "Circuit", exact: true }).click();
  await page.getByRole("button", { name: "a Input port", exact: true }).click();
  await page.getByRole("button", { name: "Connect out", exact: true }).click();
  await page
    .getByRole("button", { name: "out Output port", exact: true })
    .click();
  await page.getByRole("button", { name: "Connect in", exact: true }).click();
  await expect(page.locator("footer")).toContainText("1 connections");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator("footer")).toContainText("0 connections");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.locator("footer")).toContainText("1 connections");
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await page.getByRole("button", { name: "Challenge", exact: true }).click();
  await expect(page.locator("footer")).toContainText("0 connections");
  await page.getByRole("button", { name: "Practice", exact: true }).click();
  await expect(page.locator("footer")).toContainText("1 connections");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await expect(
    page.locator('.learning-stages button[aria-current="step"]'),
  ).toHaveText("Practice");
  await expect(page.locator("footer")).toContainText("1 connections");
});

test("debug starts with behavior and introduces clock state before waveforms", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("Open example…", { exact: true })
    .selectOption("counter");
  await page.getByRole("button", { name: "Debug", exact: true }).click();
  await expect(page.locator(".behavior-signals")).toBeVisible();
  await expect(page.getByLabel("Seek cycle", { exact: true })).toHaveCount(0);
  await expect(page.locator(".example-guide")).toContainText(
    "register remembers",
  );
  await page
    .getByRole("button", { name: "Advance clock", exact: true })
    .click();
  await expect(page.locator(".before-value")).toBeVisible();
  await page.getByRole("button", { name: "Waveforms", exact: true }).click();
  await expect(page.getByLabel("Seek cycle", { exact: true })).toBeVisible();
  await expect(page.getByText("Break when", { exact: true })).toHaveCount(0);
});

test("cancelled replay cannot replace the live input state with a late snapshot", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Native = window.Worker;
    window.Worker = function (this: any, ...args: any[]) {
      const worker = new Native(args[0], args[1]);
      if (String(args[0]).includes("visual.worker"))
        Object.defineProperty(worker, "onmessage", {
          set(fn) {
            worker.addEventListener("message", (event) => {
              if (event.data.snapshot)
                (window as any).lateSnapshot = () => fn(event);
              else fn(event);
            });
          },
        });
      return worker;
    } as any;
    window.Worker.prototype = Native.prototype;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await page.getByRole("button", { name: "Start course", exact: true }).click();
  await page
    .getByRole("button", { name: "Toggle input a", exact: true })
    .click();
  await page.getByRole("button", { name: "Run tests", exact: true }).click();
  await page.waitForFunction(() => !!(window as any).lateSnapshot);
  await page
    .getByRole("button", { name: "Return to editing", exact: true })
    .click();
  await page.evaluate(() => (window as any).lateSnapshot());
  await expect(page.locator(".visual-tests")).toHaveCount(0);
  await expect(
    page.locator(".behavior-signal").filter({ hasText: "out" }),
  ).toContainText("1 · on");
});

test("long saved tests are paged and any checkpoint can be replayed", async ({
  page,
}) => {
  const { exercise } = await import("../../src/course/registry");
  const p = exercise("signals").reference();
  const testCase = exercise("signals").checks()[0];
  const steps = testCase.steps;
  testCase.steps = Array.from({ length: 40 }, (_, i) =>
    structuredClone(steps[i % 2]),
  );
  p.circuits[p.root].tests = [testCase];
  await page.goto("/");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "checkpoints.loom.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(p)),
    });
  await page.getByRole("button", { name: "Run tests", exact: true }).click();
  await expect(page.locator(".visual-tests tbody tr")).toHaveCount(32);
  await page.getByRole("button", { name: "Pause cases", exact: true }).click();
  await page.getByRole("button", { name: "Next cases", exact: true }).click();
  await expect(page.locator(".visual-tests tbody tr")).toHaveCount(8);
  await page.getByRole("button", { name: "Show case 40", exact: true }).click();
  await expect(page.locator(".test-focus")).toContainText("1 · on");
  await page.getByRole("button", { name: "Play cases", exact: true }).click();
  await expect(page.locator(".test-focus")).toContainText("Show case 1");
});

test("cancelling an authoritative course check prevents late completion", async ({
  page,
}) => {
  const { courseAt } = await import("../courseFixture");
  const { prepareCourseSubmission } =
    await import("../../scripts/course-submission");
  const p = await courseAt("signals");
  prepareCourseSubmission(p, "signals");
  await page.addInitScript(() => {
    const Native = window.Worker;
    window.Worker = function (this: any, ...args: any[]) {
      const worker = new Native(args[0], args[1]);
      Object.defineProperty(worker, "onmessage", {
        set(fn) {
          worker.addEventListener("message", (event) => {
            if (event.data?.result?.exercise)
              (window as any).lateCourse = () => fn(event);
            else fn(event);
          });
        },
      });
      return worker;
    } as any;
    window.Worker.prototype = Native.prototype;
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "challenge.loom.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(p)),
    });
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await page
    .getByRole("button", { name: "Verify progress", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Run tests", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Run tests", exact: true }).click();
  await page.waitForFunction(() => !!(window as any).lateCourse);
  await page
    .locator(".visual-tests")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page.evaluate(() => (window as any).lateCourse());
  await expect(page.locator(".visual-tests")).toHaveCount(0);
  await expect(
    page.getByText("Verified component saved.", { exact: true }),
  ).toHaveCount(0);
});

for (const width of [1280, 740])
  for (const zh of [false, true]) {
    test(`learning test layout ${width} ${zh ? "Chinese" : "English"}`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (zh) => localStorage.setItem("loom-language", zh ? "zh" : "en"),
        zh,
      );
      await page.emulateMedia({ reducedMotion: "reduce" });
      const label = (en: string, cn: string) => (zh ? cn : en);
      await page.goto("/");
      await page
        .getByRole("button", { name: label("Learn", "学习"), exact: true })
        .click();
      await page
        .getByRole("button", {
          name: label("Start course", "开始课程"),
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("button", {
          name: label("Advance clock", "推进时钟"),
          exact: true,
        }),
      ).toHaveCount(0);
      await page
        .getByRole("button", {
          name: label("Run tests", "运行测试"),
          exact: true,
        })
        .click();
      await expect(page.locator(".visual-tests tbody tr")).toHaveCount(2);
      await page
        .getByRole("button", {
          name: label("Show result", "查看结果"),
          exact: true,
        })
        .click();
      await expect(page.locator(".test-focus")).toContainText(
        label("1 · on", "1 · 开"),
      );
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({ path: info.outputPath("visual-learning.png") });
    });
  }
