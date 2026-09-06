import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
test("PWA update saves the current edit before reloading", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "chromium");
  test.setTimeout(30000);
  let revision = 0;
  const root = resolve("dist");
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url!, "http://localhost").pathname;
      const file = resolve(root, "." + (path === "/" ? "/index.html" : path));
      if (!file.startsWith(root + "/")) {
        res.writeHead(404);
        res.end();
        return;
      }
      let data = await readFile(file);
      if (path === "/sw.js")
        data = Buffer.concat([
          data,
          Buffer.from("\n// update fixture " + revision),
        ]);
      const type: Record<string, string> = {
        ".js": "application/javascript",
        ".html": "text/html",
        ".css": "text/css",
        ".svg": "image/svg+xml",
        ".woff2": "font/woff2",
        ".webmanifest": "application/manifest+json",
      };
      res.setHeader(
        "Content-Type",
        type[extname(file)] ?? "application/octet-stream",
      );
      res.setHeader("Cache-Control", "no-store");
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const port = (server.address() as { port: number }).port;
  try {
    await page.goto(`http://127.0.0.1:${port}/`);
    await expect(
      page.getByText("Saved locally", { exact: true }),
    ).toBeVisible();
    await page.evaluate(() =>
      navigator.serviceWorker.ready.then(() => undefined),
    );
    await page.reload();
    revision = 1;
    await page.evaluate(async () => {
      const r = await navigator.serviceWorker.getRegistration();
      await r?.update();
    });
    await expect(
      page.getByRole("button", { name: "Save & update", exact: true }),
    ).toBeVisible();
    await page
      .getByLabel("Project", { exact: true })
      .fill("Saved during application update");
    await Promise.all([
      page.waitForEvent("load"),
      page.getByRole("button", { name: "Save & update", exact: true }).click(),
    ]);
    await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
      "Saved during application update",
    );
    await expect(
      page.getByText("Saved locally", { exact: true }),
    ).toBeVisible();
  } finally {
    server.closeAllConnections();
    await new Promise<void>((r) => server.close(() => r()));
  }
});
