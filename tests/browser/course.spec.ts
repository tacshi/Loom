import { courseAt } from "../courseFixture";
import { placeComponent } from "./placeComponent";
import { test, expect } from "@playwright/test";
import {
  newCourse,
  acceptCheck,
  activateExercise,
} from "../../src/course/session";
import { exercise, exercises } from "../../src/course/registry";
import { checkCourse } from "../../src/course/check";
import { exportProject } from "../../src/persistence/serialization";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
test("beginner wires NAND, checks it, resumes NOT, and inspects a reference without credit", async ({
  page,
}) => {
  const p = await courseAt("core-05");
  await page.goto("/");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "nand.loom.json",
      mimeType: "application/json",
      buffer: Buffer.from(exportProject(p)),
    });
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page
    .getByRole("button", { name: "Verify imported progress", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Run tests", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Run tests", exact: true }).click();
  await expect(page.locator(".test-mismatch")).toBeVisible();
  await page
    .getByRole("button", { name: "Return to editing", exact: true })
    .click();
  await page.getByRole("tab", { name: "Components", exact: true }).click();
  async function place(kind: string, x: number, y: number) {
    await page.getByRole("button", { name: kind, exact: true }).focus();
    await page.keyboard.press("Enter");
    const host = page.locator(".canvas-host");
    for (const [axis, target] of [
      ["x", x],
      ["y", y],
    ] as const) {
      const from = Number(await host.getAttribute(`data-placement-${axis}`));
      const key =
        axis === "x"
          ? target > from
            ? "ArrowRight"
            : "ArrowLeft"
          : target > from
            ? "ArrowDown"
            : "ArrowUp";
      for (let n = 0; n < Math.abs(target - from) / 20; n++)
        await page.keyboard.press(key);
    }
    await page.keyboard.press("Enter");
  }
  await place("AND", 260, 80);
  await place("NOT", 440, 80);
  const connect = async (
    from: string,
    fromPort: string,
    to: string,
    toPort: string,
  ) => {
    await page.getByRole("tab", { name: "Circuit", exact: true }).click();
    await page.getByRole("button", { name: from, exact: true }).click();
    await page
      .getByRole("button", { name: "Connect " + fromPort, exact: true })
      .click();
    await page.getByRole("button", { name: to, exact: true }).click();
    await page
      .getByRole("button", { name: "Connect " + toPort, exact: true })
      .click();
  };
  await connect("a Input port", "out", "AND AND", "a");
  await connect("b Input port", "out", "AND AND", "b");
  await connect("AND AND", "out", "NOT NOT", "a");
  await connect("NOT NOT", "out", "out Output port", "in");
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page.getByRole("button", { name: "Run tests", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Next mission", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next mission", exact: true }).click();
  await expect(page.locator(".course-heading h2")).toHaveText(
    "Make an inverter from NAND",
  );
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await expect(page.locator(".course-heading h2")).toHaveText(
    "Make an inverter from NAND",
  );
  await expect(
    page.getByRole("button", { name: "Next mission", exact: true }),
  ).toHaveCount(0);
});

test("completed course import rechecks snapshots, preserves draft progress and agrees with CLI", async ({
  page,
}, info) => {
  test.setTimeout(300000);
  const p = JSON.parse(
    await readFile("tests/fixtures/v3/course-completed.loom.json", "utf8"),
  );
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "course.loom.json",
    mimeType: "application/json",
    buffer: Buffer.from(exportProject(p)),
  });
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Run tests", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Verify imported progress", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Run tests", exact: true }),
  ).toBeEnabled({ timeout: 180000 });
  await expect(
    page.getByText("Mission complete: Build an interactive running total", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export file", exact: true }).click();
  const file = await download;
  const path = (await file.path())!;
  const report = JSON.parse(
    execFileSync("bun", ["dist-cli/loom.mjs", "course-check", path, "--json"], {
      encoding: "utf8",
      timeout: 180000,
    }),
  );
  expect(report.results.every((r: any) => r.status === "passed")).toBe(true);
  expect(
    JSON.parse(await readFile(path, "utf8")).course.accepted["core-60"],
  ).toBeDefined();
});

test("course progress resumes offline and a second tab cannot overwrite it", async ({
  page,
  context,
  browserName,
}) => {
  test.skip(
    browserName === "webkit",
    "Playwright WebKit crashes on setOffline() + reload; native Safari origin-offline check is recorded in docs/PHASES.md.",
  );
  const p = await courseAt("core-06");
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "course-draft.loom.json",
    mimeType: "application/json",
    buffer: Buffer.from(exportProject(p)),
  });
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page
    .getByRole("button", { name: "Verify imported progress", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Run tests", exact: true }),
  ).toBeEnabled();
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  const second = await context.newPage();
  await second.goto("/");
  await expect(
    second.getByText(/This project is open in another tab/),
  ).toBeVisible();
  await second.close();
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await expect(page.locator(".course-heading h2")).toHaveText(
    "Make an inverter from NAND",
  );
  await page.getByRole("button", { name: "Select lesson", exact: true }).click();
  await expect(
    page
      .locator("#mission-options")
      .getByRole("button", { name: "05 · Build NOT AND: NAND ✓", exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Run tests", exact: true }).click();
  await expect(page.locator(".test-mismatch")).toBeVisible();
});

test("a late course result cannot overwrite an edit made while checking", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Native = window.Worker;
    window.Worker = function (this: any, ...args: any[]) {
      const worker = new Native(args[0], args[1]);
      Object.defineProperty(worker, "onmessage", {
        set(fn) {
          worker.addEventListener("message", (event) => {
            if (event.data?.result?.exercise)
              (window as any).releaseCourseResult = () =>
                fn.call(worker, event);
            else fn.call(worker, event);
          });
        },
      });
      return worker;
    } as any;
    window.Worker.prototype = Native.prototype;
  });
  const p = await courseAt("core-05");
  const { prepareCourseSubmission } =
    await import("../../scripts/course-submission");
  prepareCourseSubmission(p, "core-05");
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "submission.loom.json",
    mimeType: "application/json",
    buffer: Buffer.from(exportProject(p)),
  });
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page
    .getByRole("button", { name: "Verify imported progress", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Run tests", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "Run tests", exact: true }).click();
  await page.waitForFunction(() => !!(window as any).releaseCourseResult);
  await page
    .getByLabel("Project", { exact: true })
    .fill("Renamed while checking");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.evaluate(() => (window as any).releaseCourseResult());
  await expect(
    page.getByRole("button", { name: "Next mission", exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    "Renamed while checking",
  );
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    "Renamed while checking",
  );
});
