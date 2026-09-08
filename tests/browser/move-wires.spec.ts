import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { Builder } from "../../src/examples/adder";
import { routeClear } from "../../src/editor/routing";

for (const branched of [false, true]) {
  test(`moving NAND ${branched ? "down one step with branches" : "separates input bends"}`, async ({
    page,
  }, info) => {
    const b = new Builder("Move NAND");
    b.add("a", "input", 0, 0);
    b.add("b", "input", 0, 160);
    b.add("NAND", "nand", 200, 100);
    b.connect("a", "out", "NAND", "a");
    b.connect("b", "out", "NAND", "b");
    b.c.wires[0].points = [
      { x: 120, y: 20 },
      { x: 140, y: 20 },
      { x: 140, y: 120 },
      { x: 200, y: 120 },
    ];
    b.c.wires[1].points = [
      { x: 120, y: 180 },
      { x: 180, y: 180 },
      { x: 180, y: 140 },
      { x: 200, y: 140 },
    ];
    if (branched) {
      b.c.components.find((n) => n.id === "NAND")!.y = 60;
      b.add("upper", "nand", 380, 0);
      b.add("lower", "nand", 380, 160);
      b.connect("a", "out", "upper", "a");
      b.connect("b", "out", "lower", "b");
      b.connect("NAND", "out", "upper", "b");
      b.connect("NAND", "out", "lower", "a");
      const paths = [
        [
          [120, 20],
          [180, 20],
          [180, 80],
          [200, 80],
        ],
        [
          [120, 180],
          [180, 180],
          [180, 100],
          [200, 100],
        ],
        [
          [120, 20],
          [380, 20],
        ],
        [
          [120, 180],
          [140, 180],
          [140, 200],
          [380, 200],
        ],
        [
          [320, 80],
          [340, 80],
          [340, 40],
          [380, 40],
        ],
        [
          [320, 80],
          [340, 80],
          [340, 180],
          [380, 180],
        ],
      ];
      b.c.wires.forEach(
        (w, i) => (w.points = paths[i].map(([x, y]) => ({ x, y }))),
      );
    }
    await page.goto("/");
    await page.getByRole("button", { name: "Projects", exact: true }).click();
    await page.locator("input[type=file]").setInputFiles({
      name: "move.loom.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(b.p)),
    });
    await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
      "Move NAND",
    );
    const canvas = page.locator(".canvas-host"),
      bounds = (await canvas.boundingBox())!;
    const at = (x: number, y: number) => ({
      x: bounds.x + 50 + x * 1.2,
      y: bounds.y + 50 + y * 1.2,
    });
    const start = at(260, branched ? 100 : 140),
      end = at(260, 120);
    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 8 });
    await page.mouse.up();
    await canvas.screenshot({ path: info.outputPath("moved-nand.png") });
    await page.getByRole("button", { name: "Projects", exact: true }).click();
    const download = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export file", exact: true })
      .click();
    const saved = JSON.parse(
      await readFile((await (await download).path())!, "utf8"),
    );
    const circuit = saved.circuits[saved.root];
    expect(
      circuit.components.find((n: { id: string }) => n.id === "NAND").y,
    ).toBe(80);
    expect(
      circuit.wires.every((w: (typeof b.c.wires)[number]) =>
        routeClear(circuit, saved, w),
      ),
    ).toBe(true);
    expect(circuit.nets).toEqual(b.c.nets);
  });
}
