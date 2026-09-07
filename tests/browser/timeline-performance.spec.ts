import { test, expect } from "@playwright/test";
import { cpus, totalmem } from "node:os";
test("reference CPU timeline seek measurements", async ({ page }, info) => {
  test.skip(info.project.name !== "chromium");
  test.setTimeout(60000);
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.getByLabel("Open example…", { exact: true }).selectOption("cpu");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page
    .getByLabel("Example program", { exact: true })
    .selectOption("loop");
  await expect(page.getByLabel("Assembly source", { exact: true })).toHaveValue(
    /loop:/,
  );
  await page
    .getByRole("button", { name: "Assemble & load", exact: true })
    .click();
  await page.getByLabel("Clock speed", { exact: true }).selectOption("100000");
  await page.getByRole("button", { name: "Debug", exact: true }).click();
  await page.getByRole("button", { name: "Waveforms", exact: true }).click();
  await page.getByRole("button", { name: "Run clock", exact: true }).click();
  await page.waitForFunction(
    () =>
      Number(
        document
          .querySelector(".debugger .debugger-header>span")
          ?.textContent?.match(/Cycle\s+(\d+)/)?.[1],
      ) >= 10000,
  );
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Run clock", exact: true }),
  ).toBeVisible();
  const head = Number(
    await page.getByLabel("Seek cycle", { exact: true }).inputValue(),
  );
  const oldest = Number(
    await page.getByLabel("Seek cycle", { exact: true }).getAttribute("min"),
  );
  const values: number[] = [];
  for (let i = 0; i < 40; i++) {
    const target = oldest + ((i * 233) % Math.max(1, head - oldest));
    await page.evaluate((target) => {
      const m = { start: 0, end: 0, target };
      (window as any).__seek = m;
      document.addEventListener(
        "input",
        (e) => {
          if (
            (e.target as HTMLElement).getAttribute("aria-label") ===
              "Seek cycle" ||
            (e.target as HTMLElement)
              .closest("label")
              ?.textContent?.startsWith("Seek cycle")
          )
            m.start = performance.now();
        },
        { once: true, capture: true },
      );
      const observer = new MutationObserver(() => {
        if (
          Number(
            document
              .querySelector(".debugger .debugger-header>span")
              ?.textContent?.match(/Cycle\s+(\d+)/)?.[1],
          ) === target
        ) {
          requestAnimationFrame(() => {
            m.end = performance.now();
          });
          observer.disconnect();
        }
      });
      observer.observe(
        document.querySelector(".debugger .debugger-header>span")!,
        { subtree: true, childList: true, characterData: true },
      );
    }, target);
    await page.getByLabel("Seek cycle", { exact: true }).fill(String(target));
    await page.waitForFunction(
      () => {
        const m = (window as any).__seek;
        return m.end > m.start && m.start > 0;
      },
      undefined,
      { timeout: 5000 },
    );
    values.push(
      await page.evaluate(() => {
        const m = (window as any).__seek;
        return m.end - m.start;
      }),
    );
  }
  values.sort((a, b) => a - b);
  const metrics = {
    fixture: "Loom 8 CPU looping program",
    head,
    oldest,
    samples: values.length,
    p95SeekMs: values[Math.floor(values.length * 0.95)],
    cpu: cpus()[0].model,
    memoryGiB: totalmem() / 2 ** 30,
    userAgent: await page.evaluate(() => navigator.userAgent),
  };
  console.log("LOOM_TIMELINE " + JSON.stringify(metrics));
  await info.attach("timeline.json", {
    body: JSON.stringify(metrics, null, 2),
    contentType: "application/json",
  });
  expect(metrics.p95SeekMs).toBeLessThan(500);
});
