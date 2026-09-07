import { test, expect } from "@playwright/test";
import { Builder } from "../../src/examples/adder";

test("renders segment states on the canvas and updates when an input changes", async ({
  page,
}) => {
  const b = new Builder("Seven segment test");
  b.add("Drive", "input", 0, 0);
  b.add("Digit", "sevenSegment", 240, 0);
  for (const pin of ["a", "b", "c", "d", "e", "f", "g", "dp"])
    b.connect("Drive", "out", "Digit", pin);
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page.locator("input[type=file]").setInputFiles({
    name: "digit.loom.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(b.p)),
  });
  await expect(
    page.getByRole("textbox", { name: "Project", exact: true }),
  ).toHaveValue(b.p.name);
  await page.getByRole("button", { name: "Circuit", exact: true }).click();
  const litPixels = () =>
    page.locator(".canvas-host canvas").evaluateAll((nodes) => {
      let count = 0;
      for (const node of nodes) {
        const canvas = node as HTMLCanvasElement;
        const data = canvas
          .getContext("2d")!
          .getImageData(0, 0, canvas.width, canvas.height).data;
        for (let i = 0; i < data.length; i += 4)
          if (
            data[i] === 22 &&
            data[i + 1] === 115 &&
            data[i + 2] === 75 &&
            data[i + 3] === 255
          )
            count++;
      }
      return count;
    });
  await expect.poll(litPixels).toBe(0);
  await page.getByRole("button", { name: "Drive Input", exact: true }).click();
  await page.getByLabel("Value", { exact: true }).fill("1");
  await expect.poll(litPixels).toBeGreaterThan(500);
  await page.screenshot({ path: "/tmp/loom-seven-segment.png" });
  await page.getByLabel("Value", { exact: true }).fill("0");
  await expect.poll(litPixels).toBe(0);
});
