import { test, expect } from "@playwright/test";
import { fullAdder } from "../../src/examples/adder";
test("unsupported format import leaves the open project unchanged", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page
    .getByLabel("Project", { exact: true })
    .fill("Keep current project");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "unsupported.loom.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify({ ...fullAdder(), schemaVersion: 1 })),
  });
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    "Keep current project",
  );
  await page.reload();
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    "Keep current project",
  );
});
test("lock handover reloads the latest writer before further editing", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  const second = await context.newPage();
  await second.goto("/");
  await expect(
    second.getByText(/This project is open in another tab/),
  ).toBeVisible();
  await page.getByLabel("Project", { exact: true }).fill("Writer final edit");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.close();
  await second.reload();
  await expect(second.getByLabel("Project", { exact: true })).toHaveValue(
    "Writer final edit",
  );
  await expect(
    second.getByText("Saved locally", { exact: true }),
  ).toBeVisible();
  await second.getByLabel("Project", { exact: true }).fill("New writer edit");
  await expect(
    second.getByText("Saved locally", { exact: true }),
  ).toBeVisible();
  await second.reload();
  await expect(second.getByLabel("Project", { exact: true })).toHaveValue(
    "New writer edit",
  );
});

test("a rejected save keeps edits available and a later save recovers", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (...args: any[]) {
      if ((window as any).__rejectSaves && args[1] === "readwrite")
        throw new DOMException("Test quota", "QuotaExceededError");
      return (original as any).apply(this, args);
    };
  });
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.evaluate(() => {
    (window as any).__rejectSaves = true;
  });
  await page
    .getByLabel("Project", { exact: true })
    .fill("Unsaved recovery draft");
  await expect(page.locator(".local-indicator")).toContainText(
    "Could not save",
  );
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    "Unsaved recovery draft",
  );
  await page.evaluate(() => {
    (window as any).__rejectSaves = false;
  });
  await page.getByLabel("Project", { exact: true }).fill("Recovered draft");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    "Recovered draft",
  );
});

test("a retained page releases ownership and restores the latest writer on return", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await expect(page.locator(".local-indicator")).toHaveAttribute(
    "data-status",
    "saved",
  );
  const second = await context.newPage();
  await second.goto("/");
  await expect(second.locator(".local-indicator")).toHaveAttribute(
    "data-status",
    "readOnly",
  );

  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent("pagehide", { persisted: true }),
    ),
  );
  await second.reload();
  await expect(second.locator(".local-indicator")).toHaveAttribute(
    "data-status",
    "saved",
  );
  await second
    .getByLabel("Project", { exact: true })
    .fill("Latest writer after page retention");
  await expect(second.locator(".local-indicator")).toHaveAttribute(
    "data-status",
    "saved",
  );

  await Promise.all([
    page.waitForEvent("load"),
    page.evaluate(() =>
      window.dispatchEvent(
        new PageTransitionEvent("pageshow", { persisted: true }),
      ),
    ),
  ]);
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    "Latest writer after page retention",
  );
  await expect(page.locator(".local-indicator")).toHaveAttribute(
    "data-status",
    "readOnly",
  );
});

test("ownership remains held until a departing page's pending save finishes", async ({
  page,
  context,
}) => {
  await page.addInitScript(() => {
    const original = IDBTransaction.prototype.addEventListener;
    const deferred: (() => void)[] = [];
    Object.assign(window, {
      deferredCompletions: deferred,
      holdCompletions: false,
    });
    IDBTransaction.prototype.addEventListener = function (
      type: string,
      listener: any,
      options?: any,
    ) {
      const tx = this;
      if (type === "complete" && tx.mode === "readwrite") {
        return original.call(
          tx,
          type,
          (event: Event) => {
            const deliver = () =>
              typeof listener === "function"
                ? listener.call(tx, event)
                : listener.handleEvent(event);
            if ((window as any).holdCompletions) deferred.push(deliver);
            else deliver();
          },
          options,
        );
      }
      return original.call(tx, type, listener, options);
    };
  });
  await page.goto("/");
  await expect(page.locator(".local-indicator")).toHaveAttribute(
    "data-status",
    "saved",
  );
  await page.evaluate(() => {
    (window as any).holdCompletions = true;
  });
  await page
    .getByLabel("Project", { exact: true })
    .fill("Pending save survives departure");
  await page.waitForFunction(
    () => (window as any).deferredCompletions.length > 0,
  );
  await page.evaluate(() =>
    window.dispatchEvent(
      new PageTransitionEvent("pagehide", { persisted: true }),
    ),
  );
  const second = await context.newPage();
  await second.goto("/");
  await expect(second.locator(".local-indicator")).toHaveAttribute(
    "data-status",
    "readOnly",
  );
  await page.evaluate(() => {
    (window as any).holdCompletions = false;
    for (const deliver of (window as any).deferredCompletions.splice(0))
      deliver();
  });
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const locks = await navigator.locks.query();
        return locks.held?.filter((lock) =>
          lock.name?.startsWith("loom-project:"),
        ).length;
      }),
    )
    .toBe(0);
  await second.reload();
  await expect(second.locator(".local-indicator")).toHaveAttribute(
    "data-status",
    "saved",
  );
  await expect(second.getByLabel("Project", { exact: true })).toHaveValue(
    "Pending save survives departure",
  );
});
