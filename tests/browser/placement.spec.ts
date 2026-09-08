import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { Project } from "../../src/model/types";
async function ready(page: Page) {
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
}
async function start(page: Page, name = "Input") {
  const source = page.getByRole("button", { name, exact: true });
  await source.scrollIntoViewIfNeeded();
  const b = (await source.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
}
async function target(page: Page, dx = 220, dy = 200) {
  const b = (await page.locator(".canvas-host").boundingBox())!;
  await page.mouse.move(b.x + dx, b.y + dy, { steps: 8 });
  await expect(page.locator(".canvas-host")).toHaveAttribute(
    "data-placement",
    "preview",
  );
  return {
    x: Number(
      await page.locator(".canvas-host").getAttribute("data-placement-x"),
    ),
    y: Number(
      await page.locator(".canvas-host").getAttribute("data-placement-y"),
    ),
  };
}
async function exported(page: Page): Promise<Project> {
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export file", exact: true }).click();
  const p = JSON.parse(
    await readFile((await (await download).path())!, "utf8"),
  );
  await page.getByRole("button", { name: "Close", exact: true }).click();
  return p;
}
test("click does nothing; preview commits exactly at drop and is one undoable edit", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Input", exact: true }).click();
  await expect(page.locator("footer")).toContainText("0 components");
  await start(page);
  const at = await target(page);
  await expect(page.locator("footer")).toContainText("0 components");
  await page.mouse.up();
  await expect(page.locator("footer")).toContainText("1 components");
  const p = await exported(page);
  expect(p.circuits[p.root].components[0]).toMatchObject(at);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator("footer")).toContainText("0 components");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await expect(page.locator("footer")).toContainText("1 components");
});
test("outside release, Escape, blur and lost capture discard the preview", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Input", exact: true }).evaluate(el => {
    el.addEventListener("pointerdown", event => {
      el.setAttribute("data-test-pointer-id", String((event as PointerEvent).pointerId));
    });
  });
  for (const cancel of ["outside", "escape", "blur", "capture"]) {
    await start(page);
    await target(page);
    if (cancel === "outside") await page.mouse.move(10, 10);
    if (cancel === "escape") await page.keyboard.press("Escape");
    if (cancel === "blur")
      await page.evaluate(() => window.dispatchEvent(new Event("blur")));
    if (cancel === "capture")
      await page
        .getByRole("button", { name: "Input", exact: true })
        .evaluate((el) => {
          const raw = el.getAttribute("data-test-pointer-id");
          if (raw === null) throw new Error("No pointerdown recorded");
          const id = Number(raw);
          if (!el.hasPointerCapture(id)) throw new Error("Pointer capture was not acquired");
          el.releasePointerCapture(id);
          if (el.hasPointerCapture(id)) throw new Error("Pointer capture was not released");
        });
    await page.mouse.up();
    await expect(page.locator(".canvas-host")).not.toHaveAttribute(
      "data-placement",
      "preview",
    );
    await expect(page.locator("footer")).toContainText("0 components");
  }
});
test("keyboard placement moves by a grid step and commits only on Enter", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("button", { name: "Input", exact: true }).press("Enter");
  const canvas = page.locator(".canvas-host");
  await expect(canvas).toHaveAttribute("data-placement", "preview");
  const x = Number(await canvas.getAttribute("data-placement-x"));
  await page.keyboard.press("ArrowRight");
  await expect(canvas).toHaveAttribute("data-placement-x", String(x + 20));
  await expect(page.locator("footer")).toContainText("0 components");
  await page.keyboard.press("Enter");
  await expect(page.locator("footer")).toContainText("1 components");
});
test("alignment includes the selected component and deduplicates haptic pulses", async ({
  page,
}) => {
  await ready(page);
  await page.evaluate(() => {
    Object.assign(window, { pulses: [] });
    Object.defineProperty(navigator, "vibrate", {
      configurable: true,
      value: (n: number) => {
        (window as any).pulses.push(n);
        return true;
      },
    });
  });
  await start(page);
  await target(page, 220, 200);
  await page.mouse.up();
  await start(page);
  await target(page, 420, 200);
  await expect(page.locator(".canvas-host")).toHaveAttribute(
    "data-placement-guides",
    /y:/,
  );
  const before = await page.evaluate(() => (window as any).pulses.length);
  await target(page, 421, 200);
  expect(await page.evaluate(() => (window as any).pulses.length)).toBe(before);
  await page.mouse.up();
  expect(await page.evaluate(() => (window as any).pulses.at(-1))).toBe(12);
});
test("drop stays under the pointer after zoom and pan", async ({ page }) => {
  await ready(page);
  const canvas = (await page.locator(".canvas-host").boundingBox())!;
  await page.mouse.move(canvas.x + 300, canvas.y + 220);
  await page.mouse.wheel(0, -180);
  await expect(page.locator(".zoom-label")).not.toHaveText("100%");
  await page.getByRole("button", { name: "Pan canvas", exact: true }).click();
  await page.mouse.move(canvas.x + 300, canvas.y + 220);
  await page.mouse.down();
  await page.mouse.move(canvas.x + 360, canvas.y + 260, { steps: 6 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Select", exact: true }).click();
  await start(page);
  const at = await target(page, 400, 300);
  expect(at).toEqual({ x: 220, y: 160 });
  await page.mouse.up();
  const p = await exported(page);
  expect(p.circuits[p.root].components[0]).toMatchObject(at);
});
test("built-in definitions are committed atomically, and subcircuits can be dragged", async ({
  page,
}) => {
  await ready(page);
  const before = await exported(page);
  await start(page, "8-input priority encoder");
  await target(page);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  expect(Object.keys((await exported(page)).circuits)).toEqual(
    Object.keys(before.circuits),
  );
  await start(page, "8-input priority encoder");
  await target(page);
  await page.mouse.up();
  const placed = await exported(page);
  expect(placed.circuits[placed.root].components).toHaveLength(1);
  expect(Object.keys(placed.circuits).length).toBeGreaterThan(
    Object.keys(before.circuits).length,
  );
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  const undone = await exported(page);
  expect(Object.keys(undone.circuits)).toEqual(Object.keys(before.circuits));
  expect(undone.circuits[undone.root].components).toHaveLength(0);
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  const definition =
    placed.circuits[placed.circuits[placed.root].components[0].definitionId!];
  const source = page
    .locator(".library")
    .getByRole("button", { name: definition.name, exact: true });
  // The built-in's localized label and its definition name may match.
  const item = source.last();
  await item.scrollIntoViewIfNeeded();
  const b = (await item.boundingBox())!;
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  const at = await target(page, 440, 260);
  await page.mouse.up();
  const result = await exported(page);
  expect(result.circuits[result.root].components).toHaveLength(2);
  expect(result.circuits[result.root].components[1]).toMatchObject({
    ...at,
    definitionId: definition.id,
  });
  expect(Object.keys(result.circuits)).toEqual(Object.keys(placed.circuits));
});
test("touch pointer drag places a component; pointer cancellation creates nothing", async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "Native touch injection uses Chromium CDP.",
  );
  await ready(page);
  const cdp = await page.context().newCDPSession(page);
  const source = (await page
    .getByRole("button", { name: "Input", exact: true })
    .boundingBox())!;
  const canvas = (await page.locator(".canvas-host").boundingBox())!;
  for (const end of ["touchCancel", "touchEnd"] as const) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: source.x + source.width / 2, y: source.y + source.height / 2 },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: canvas.x + 220, y: canvas.y + 200 }],
    });
    await expect(page.locator(".canvas-host")).toHaveAttribute(
      "data-placement",
      "preview",
    );
    await expect(page.locator("footer")).toContainText("0 components");
    await cdp.send("Input.dispatchTouchEvent", { type: end, touchPoints: [] });
    await expect(page.locator(".canvas-host")).not.toHaveAttribute(
      "data-placement",
      "preview",
    );
  }
  await expect(page.locator("footer")).toContainText("1 components");
});
test("changing projects during a drag cancels it", async ({ page }) => {
  await ready(page);
  await start(page);
  await target(page);
  await page
    .getByLabel("Open example…", { exact: true })
    .selectOption("counter");
  await page.mouse.up();
  await expect(page.locator(".canvas-host")).not.toHaveAttribute(
    "data-placement",
    "preview",
  );
  const p = await exported(page);
  expect(p.name).toBe("Clocked counter");
  expect(
    p.circuits[p.root].components.filter((c) => c.name === "Input"),
  ).toHaveLength(0);
});
test("course palette restrictions and reference read-only state apply to placement", async ({
  page,
}) => {
  await ready(page);
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page.getByRole("button", { name: "Start course", exact: true }).click();
  await page.getByRole("tab", { name: "Components", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "ROM", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "8-input priority encoder", exact: true }),
  ).toHaveCount(0);
  await start(page, "Input");
  await target(page);
  await page.mouse.up();
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page.getByText("Hints",{exact:true}).click();
  await page.locator(".mission-hints > details > summary").last().click();
  await page.getByRole("button",{name:"View example",exact:true}).click();
  await page.getByRole("tab", { name: "Components", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Input", exact: true }),
  ).toBeDisabled();
  await expect(page.locator(".canvas-host")).not.toHaveAttribute(
    "data-placement",
    "preview",
  );
});

test("small pointer movement and leaving keyboard placement create nothing", async ({
  page,
}) => {
  await ready(page);
  const source = page.getByRole("button", { name: "Input", exact: true });
  const b = (await source.boundingBox())!;
  await start(page);
  await page.mouse.move(b.x + b.width / 2 + 4, b.y + b.height / 2);
  await page.mouse.up();
  await expect(page.locator(".canvas-host")).not.toHaveAttribute(
    "data-placement",
    "preview",
  );
  for (const key of ["Escape", "Tab"]) {
    await source.press("Space");
    await expect(page.locator(".canvas-host")).toHaveAttribute(
      "data-placement",
      "preview",
    );
    await page.keyboard.press(key);
    await expect(page.locator(".canvas-host")).not.toHaveAttribute(
      "data-placement",
      "preview",
    );
  }
  await expect(page.locator("footer")).toContainText("0 components");
});
