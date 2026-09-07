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
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await page.getByRole("button", { name: "Start course", exact: true }).click();
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    "Build your own computer",
  );
  await page
    .getByRole("button", { name: "Check circuit", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Inspect failure", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Inspect failure", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Return to circuit", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Return to circuit", exact: true })
    .click();
  const connect = async (
    from: string,
    fromPort: string,
    to: string,
    toPort: string,
  ) => {
    await page.getByRole("button", { name: "Circuit", exact: true }).click();
    await page.getByRole("button", { name: from, exact: true }).click();
    await page
      .getByRole("button", { name: "Connect " + fromPort, exact: true })
      .click();
    await page.getByRole("button", { name: to, exact: true }).click();
    await page
      .getByRole("button", { name: "Connect " + toPort, exact: true })
      .click();
  };
  await connect("a Input port", "out", "NAND NAND", "a");
  await connect("b Input port", "out", "NAND NAND", "b");
  await connect("NAND NAND", "out", "out Output port", "in");
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await page
    .getByRole("button", { name: "Check circuit", exact: true })
    .click();
  await expect(
    page.getByText("Verified component saved.", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await expect(page.locator(".course-learn h3")).toHaveText("NOT");
  await page
    .getByRole("button", { name: "Inspect reference", exact: true })
    .click();
  await expect(
    page.getByText("Read-only reference", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Return to course", exact: true })
    .click();
  await expect(page.locator(".course-learn h3")).toHaveText("NOT");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await expect(page.locator(".course-learn h3")).toHaveText("NOT");
  await expect(
    page.getByText("Verified component saved.", { exact: true }),
  ).toHaveCount(0);
});

test("completed course import rechecks snapshots, preserves draft progress and agrees with CLI", async ({
  page,
}, info) => {
  test.setTimeout(120000);
  const p = newCourse();
  for (const e of exercises) {
    if (e.id !== "nand") activateExercise(p, e.id);
    const r = e.reference();
    p.circuits = { ...p.circuits, ...r.circuits };
    p.root = r.root;
    p.course!.drafts[e.id] = r.root;
    p.course!.active = e.id;
    await acceptCheck(p, await checkCourse(p, e.id));
  }
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "course.loom.json",
    mimeType: "application/json",
    buffer: Buffer.from(exportProject(p)),
  });
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Check circuit", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("button", { name: "Reverify course", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Check circuit", exact: true }),
  ).toBeEnabled({ timeout: 60000 });
  await expect(
    page.getByText("Your computer passed the calculator checks.", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export file", exact: true }).click();
  const file = await download;
  const path = (await file.path())!;
  const report = JSON.parse(
    execFileSync(
      process.execPath,
      ["dist-cli/loom.mjs", "course-check", path, "--json"],
      { encoding: "utf8", timeout: 60000 },
    ),
  );
  expect(report.results.every((r: any) => r.status === "passed")).toBe(true);
  expect(
    JSON.parse(await readFile(path, "utf8")).course.accepted.calculator,
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
  const p = newCourse(),
    r = exercise("nand").reference();
  p.circuits = { ...p.circuits, ...r.circuits };
  p.root = r.root;
  p.course!.drafts.nand = r.root;
  await acceptCheck(p, await checkCourse(p, "nand"));
  activateExercise(p, "not");
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
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await page
    .getByRole("button", { name: "Reverify course", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Check circuit", exact: true }),
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
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await expect(page.locator(".course-learn h3")).toHaveText("NOT");
  await expect(
    page.getByRole("button", {
      name: "1. Binary switches & NAND ✓",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Check circuit", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Inspect failure", exact: true }),
  ).toBeVisible();
});

test("the full course advances through visible UI using reusable NAND-based submissions", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "chromium",
    "Full journey reference browser; other engines run entry/import/resume checks",
  );
  test.setTimeout(240000);
  const { prepareCourseSubmission } =
    await import("../../scripts/course-submission");
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await page.getByRole("button", { name: "Start course", exact: true }).click();
  const exported = async () => {
    await expect(
      page.getByText("Saved locally", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Projects", exact: true }).click();
    const d = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export file", exact: true })
      .click();
    const file = await d;
    const p = JSON.parse(await readFile((await file.path())!, "utf8"));
    await page.getByRole("button", { name: "Close", exact: true }).click();
    return p;
  };
  let p = await exported();
  for (let i = 0; i < exercises.length; i++) {
    const e = exercises[i];
    prepareCourseSubmission(p, e.id);
    await page.getByRole("button", { name: "Projects", exact: true }).click();
    await page.locator("input[type=file]").setInputFiles({
      name: e.id + ".loom.json",
      mimeType: "application/json",
      buffer: Buffer.from(exportProject(p)),
    });
    await page.getByRole("button", { name: "Learn", exact: true }).click();
    await expect(page.locator(".course-learn h3")).toHaveText(e.title[0]);
    await page
      .getByRole("button", { name: "Reverify course", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Check circuit", exact: true }),
    ).toBeEnabled({ timeout: 60000 });
    await page
      .getByRole("button", { name: "Check circuit", exact: true })
      .click();
    await expect(
      page.getByText("Verified component saved.", { exact: true }),
    ).toBeVisible({ timeout: 60000 });
    if (i < exercises.length - 1) {
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await expect(page.locator(".course-learn h3")).toHaveText(
        exercises[i + 1].title[0],
      );
    }
    p = await exported();
  }
  expect(Object.keys(p.course.accepted)).toHaveLength(exercises.length);
  await expect(
    page.getByText("Your computer passed the calculator checks.", {
      exact: true,
    }),
  ).toBeVisible();
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
  const p = newCourse(),
    r = exercise("nand").reference();
  Object.assign(p.circuits, r.circuits);
  p.root = r.root;
  p.course!.drafts.nand = r.root;
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "submission.loom.json",
      mimeType: "application/json",
      buffer: Buffer.from(exportProject(p)),
    });
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await page
    .getByRole("button", { name: "Reverify course", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Check circuit", exact: true }),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Check circuit", exact: true })
    .click();
  await page.waitForFunction(() => !!(window as any).releaseCourseResult);
  await page
    .getByLabel("Project", { exact: true })
    .fill("Renamed while checking");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.evaluate(() => (window as any).releaseCourseResult());
  await expect(
    page.getByText("Verified component saved.", { exact: true }),
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
