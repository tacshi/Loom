import { createHash } from "node:crypto";
import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFile, mkdtemp, rm } from "node:fs/promises";
import { resolve, extname, join } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

test("two production builds retain course and ROM data, and failed saves prevent activation", async ({
  page,
}, info) => {
  test.skip(
    info.project.name !== "chromium",
    "Production update integration runs in Chromium; native Safari activation is a separate check",
  );
  test.setTimeout(120000);
  const temporary = await mkdtemp(join(tmpdir(), "loom-update-"));
  const roots = [join(temporary, "a"), join(temporary, "b")];
  let revision = 0;
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url!, "http://localhost").pathname;
      const root = roots[revision],
        file = resolve(root, "." + (path === "/" ? "/index.html" : path));
      if (!file.startsWith(root + "/")) throw new Error("path");
      const data = await readFile(file);
      const types: Record<string, string> = {
        ".js": "application/javascript",
        ".html": "text/html",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".woff2": "font/woff2",
        ".webmanifest": "application/manifest+json",
      };
      res.setHeader(
        "Content-Type",
        types[extname(file)] ?? "application/octet-stream",
      );
      res.setHeader("Cache-Control", "no-store");
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  try {
    for (let i = 0; i < 2; i++)
      execFileSync(
        process.execPath,
        ["node_modules/vite/bin/vite.js", "build", "--outDir", roots[i]],
        {
          env: { ...process.env, GITHUB_SHA: String(i + 1).repeat(40) },
          stdio: "pipe",
          timeout: 45000,
        },
      );
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    await page.addInitScript(() => {
      const original = IDBDatabase.prototype.transaction;
      IDBDatabase.prototype.transaction = function (...args: any[]) {
        if ((window as any).__rejectSaves && args[1] === "readwrite")
          throw new DOMException("Test quota", "QuotaExceededError");
        return (original as any).apply(this, args);
      };
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async () => {
            throw new Error("denied");
          },
        },
      });
    });
    await page.goto(
      `http://127.0.0.1:${(server.address() as { port: number }).port}/`,
    );
    await expect(
      page.getByText("Saved locally", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Projects", exact: true }).click();
    const fixture = await readFile(
      "tests/fixtures/v3/course-completed.loom.json",
      "utf8",
    );
    await page.locator("input[type=file]").setInputFiles({
      name: "course.loom.json",
      mimeType: "application/json",
      buffer: Buffer.from(fixture),
    });
    await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
      JSON.parse(fixture).name,
    );
    await expect(
      page.getByText("Saved locally", { exact: true }),
    ).toBeVisible();
    await page.evaluate(() =>
      navigator.serviceWorker.ready.then(() => undefined),
    );
    await page.reload();
    await page.evaluate(() => {
      (window as any).__beforeUpdate = true;
    });
    revision = 1;
    await page.evaluate(async () => {
      await (await navigator.serviceWorker.getRegistration())?.update();
    });
    const update = page.getByRole("button", {
      name: "Save & update",
      exact: true,
    });
    await expect(update).toBeVisible();
    await page.evaluate(() => {
      (window as any).__rejectSaves = true;
    });
    await page
      .getByLabel("Project", { exact: true })
      .fill("Unsaved during update");
    await update.click();
    await expect(page.locator(".update-notice")).toContainText(
      "Could not save",
    );
    expect(await page.evaluate(() => (window as any).__beforeUpdate)).toBe(
      true,
    );
    await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
      "Unsaved during update",
    );
    await page.evaluate(() => {
      (window as any).__rejectSaves = false;
    });
    await Promise.all([page.waitForEvent("load"), update.click()]);
    await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
      "Unsaved during update",
    );
    await expect(
      page.getByText("Saved locally", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Help", exact: true }).click();
    await page
      .getByRole("button", { name: "Copy bug report", exact: true })
      .click();
    await expect(page.getByLabel("Bug report", { exact: true })).toHaveValue(
      new RegExp("Build: " + "2".repeat(40)),
    );
    await page
      .getByRole("dialog", { name: "Help" })
      .getByRole("button", { name: "Close", exact: true })
      .click();
    await page.getByRole("button", { name: "Projects", exact: true }).click();
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export file", exact: true })
      .click();
    const actual = JSON.parse(
      await readFile((await (await download).path())!, "utf8"),
    );
    const expected = JSON.parse(fixture);
    const hash = (value: unknown) =>
      createHash("sha256").update(JSON.stringify(value)).digest("hex");
    expect(hash(actual.circuits)).toBe(hash(expected.circuits));
    expect(actual.course).toEqual({
      ...expected.course,
      needsVerification: true,
    });
  } finally {
    server.closeAllConnections();
    if (server.listening)
      await new Promise<void>((r) => server.close(() => r()));
    await rm(temporary, { recursive: true, force: true });
  }
});
