import { test, expect } from "@playwright/test";
test("electron overlay moves only while running and respects reduced motion", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page
    .getByLabel("Open example…", { exact: true })
    .selectOption("counter");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  // The dedicated overlay is between the static wire and component layers.
  const overlay = page.locator(".canvas-host canvas").nth(2);
  const pixels = () =>
    overlay.evaluate((canvas) => {
      const c = canvas as HTMLCanvasElement;
      const data = c
        .getContext("2d")!
        .getImageData(0, 0, c.width, c.height).data;
      let count = 0,
        hash = 0;
      for (let i = 3; i < data.length; i += 4)
        if (data[i]) {
          count++;
          hash = (hash + i * data[i]) >>> 0;
        }
      return { count, hash };
    });
  expect((await pixels()).count).toBe(0);
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect.poll(async () => (await pixels()).count).toBeGreaterThan(0);
  const first = (await pixels()).hash;
  await expect.poll(async () => (await pixels()).hash).not.toBe(first);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect.poll(async () => (await pixels()).count).toBe(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  expect((await pixels()).count).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect.poll(async () => (await pixels()).count).toBeGreaterThan(0);
});

test("dense running circuit animation frame measurement", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "chromium", "Reference Chromium measurement");
  const { denseFixture } = await import("../../scripts/fixture");
  const project = denseFixture();
  project.circuits[project.root].components.find(
    (c) => c.id === "B",
  )!.params.value = 1;
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "dense-electrons.loom.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(project)),
    });
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    project.name,
  );
  await page.getByRole("button", { name: "Run", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Pause", exact: true }),
  ).toBeVisible();
  const samples = await page.evaluate(
    () =>
      new Promise<number[]>((resolve) => {
        const frames: number[] = [];
        let previous = 0;
        const tick = (time: number) => {
          if (previous) frames.push(time - previous);
          previous = time;
          if (frames.length === 60) resolve(frames);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
  samples.sort((a, b) => a - b);
  const result = {
    components: 1000,
    connections: 2000,
    frames: samples.length,
    p95Ms: samples[57],
  };
  console.log("LOOM_ELECTRON_PERFORMANCE " + JSON.stringify(result));
  await info.attach("electron-performance.json", {
    body: JSON.stringify(result),
    contentType: "application/json",
  });
  expect(result.p95Ms).toBeLessThan(50);
});
