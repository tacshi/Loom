import { test, expect } from "@playwright/test";
import { cpus, totalmem } from "node:os";
import { denseFixture } from "../../scripts/fixture";
test("dense circuit interaction measurements", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "chromium",
    "Reference desktop Chromium measurement",
  );
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "dense.loom.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(denseFixture())),
  });
  await expect(
    page.getByRole("textbox", { name: "Project", exact: true }),
  ).toHaveValue("1000 components · 2000 connections");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    const m: any = { frames: [], last: performance.now(), active: true };
    (window as any).__loomMetrics = m;
    const frame = (now: number) => {
      if (m.active) {
        m.frames.push(now - m.last);
        m.last = now;
        requestAnimationFrame(frame);
      }
    };
    requestAnimationFrame(frame);
    document.addEventListener(
      "click",
      (e) => {
        if (
          (e.target as HTMLElement).closest(".sim-controls button")
            ?.textContent === "Pause"
        )
          m.pauseStart = performance.now();
      },
      true,
    );
    document.addEventListener(
      "input",
      (e) => {
        if ((e.target as HTMLElement).matches(".project-name")) {
          m.saveStart = performance.now();
          m.savedAt = undefined;
        }
      },
      true,
    );
    document.addEventListener(
      "pointerdown",
      () => {
        if (m.measureInput) {
          m.inputStart = performance.now();
          m.inputAt = undefined;
          m.measureInput = false;
        }
      },
      true,
    );
    new MutationObserver(() => {
      if (
        m.pauseStart &&
        !m.pausedAt &&
        document.querySelector(".sim-controls button")?.textContent === "Run"
      )
        requestAnimationFrame(() => {
          m.pausedAt ??= performance.now();
        });
      if (
        m.saveStart &&
        !m.savedAt &&
        document.querySelector(".local-indicator")?.textContent ===
          "Saved locally"
      )
        requestAnimationFrame(() => {
          m.savedAt ??= performance.now();
        });
      if (
        m.inputStart &&
        !m.inputAt &&
        document.querySelector<HTMLInputElement>(
          '.inspector input[aria-label="Name"]',
        )?.value === (m.expectedInput ?? "A")
      )
        requestAnimationFrame(() => {
          m.inputAt ??= performance.now();
        });
    }).observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
    });
  });
  const canvas = await page.locator(".canvas-host").boundingBox();
  if (!canvas) throw new Error("No canvas");
  await page.mouse.move(
    canvas.x + canvas.width / 2,
    canvas.y + canvas.height / 2,
  );
  await page.keyboard.down("Space");
  await page.mouse.down();
  for (let i = 0; i < 40; i++)
    await page.mouse.move(
      canvas.x + canvas.width / 2 + Math.sin(i / 5) * 80,
      canvas.y + canvas.height / 2 + Math.cos(i / 5) * 50,
    );
  await page.mouse.up();
  await page.keyboard.up("Space");
  const frames = await page.evaluate(() => {
    const m = (window as any).__loomMetrics;
    m.active = false;
    return m.frames as number[];
  });
  frames.sort((a, b) => a - b);
  await page.getByRole("button", { name: "Fit circuit", exact: true }).click();
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await page.evaluate(() => {
    (window as any).__loomMetrics.measureInput = true;
  });
  await page.mouse.click(canvas.x + 62, canvas.y + 58);
  await expect(
    page.getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveValue("A");
  const inputSamples: number[] = [];
  for (let i = 0; i < 40; i++) {
    const name = i % 2 ? "A" : "B";
    await page.evaluate((expected) => {
      const m = (window as any).__loomMetrics;
      m.expectedInput = expected;
      m.measureInput = true;
    }, name);
    await page.mouse.click(canvas.x + (name === "A" ? 62 : 96), canvas.y + 58);
    await expect(
      page.getByRole("textbox", { name: "Name", exact: true }),
    ).toHaveValue(name);
    await page.waitForFunction(() => {
      const m = (window as any).__loomMetrics;
      return m.inputAt >= m.inputStart;
    });
    inputSamples.push(
      await page.evaluate(() => {
        const m = (window as any).__loomMetrics;
        return m.inputAt - m.inputStart;
      }),
    );
  }
  inputSamples.sort((a, b) => a - b);
  await page.evaluate(() => {
    const m = (window as any).__loomMetrics;
    m.frames = [];
    m.active = true;
    m.last = performance.now();
    const frame = (now: number) => {
      if (m.active) {
        m.frames.push(now - m.last);
        m.last = now;
        requestAnimationFrame(frame);
      }
    };
    requestAnimationFrame(frame);
  });
  await page.mouse.move(canvas.x + 62, canvas.y + 58);
  await page.mouse.down();
  for (let i = 0; i < 40; i++)
    await page.mouse.move(
      canvas.x + 62 + Math.sin(i / 5) * 2,
      canvas.y + 58 - (i + 1) * 0.5,
    );
  await page.mouse.up();
  const dragFrames = await page.evaluate(() => {
    const m = (window as any).__loomMetrics;
    m.active = false;
    return m.frames as number[];
  });
  dragFrames.sort((a, b) => a - b);

  await page.getByRole("button", { name: "Run", exact: true }).click();
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Run", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Project", exact: true })
    .fill("Dense measurement");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  const observed = await page.evaluate(() => {
    const m = (window as any).__loomMetrics;
    return {
      pauseMs: m.pausedAt - m.pauseStart,
      saveMs: m.savedAt - m.saveStart,
      inputMs: m.inputAt - m.inputStart,
      userAgent: navigator.userAgent,
    };
  });
  const result = {
    viewport: "1920x1080",
    components: 1000,
    connections: 2000,
    panP95Ms: frames[Math.floor(frames.length * 0.95)] ?? 0,
    ...observed,
    inputP95Ms: inputSamples[Math.floor(inputSamples.length * 0.95)],
    inputMaxMs: Math.max(...inputSamples),
    inputSamples: inputSamples.length,
    dragP95Ms: dragFrames[Math.floor(dragFrames.length * 0.95)],
    dragFrames: dragFrames.length,
    frames: frames.length,
    cpu: cpus()[0]?.model,
    memoryGiB: Math.round(totalmem() / 2 ** 30),
  };
  await testInfo.attach("performance.json", {
    body: JSON.stringify(result, null, 2),
    contentType: "application/json",
  });
  console.log("LOOM_PERFORMANCE " + JSON.stringify(result));
  expect(frames.length).toBeGreaterThan(0);
});
