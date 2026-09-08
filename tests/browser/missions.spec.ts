import { test, expect } from "@playwright/test";

test("a mission requires real wiring, preserves work across examples, and unlocks the next mission", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page.getByRole("button", { name: "Start course", exact: true }).click();
  await expect(page.locator(".course-heading h2")).toHaveText(
    "Connect a switch to an output",
  );
  await expect(
    page.getByRole("button", { name: "Next step", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Next mission", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Run tests", exact: true }).click();
  await expect(page.locator(".test-mismatch")).toBeVisible();
  await page
    .getByRole("button", { name: "Return to editing", exact: true })
    .click();
  await page.getByRole("tab", { name: "Circuit", exact: true }).click();
  await page.getByRole("button", { name: "a Input port", exact: true }).click();
  await page.getByRole("button", { name: "Connect out", exact: true }).click();
  await page
    .getByRole("button", { name: "out Output port", exact: true })
    .click();
  await page.getByRole("button", { name: "Connect in", exact: true }).click();
  await expect(page.locator("footer")).toContainText("1 connections");
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page.getByText("Hints", { exact: true }).click();
  await page.getByText("Hint 3", { exact: true }).click();
  await page.getByRole("button", { name: "View example", exact: true }).click();
  await expect(
    page.getByText("Example · read-only", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Next mission", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Return to your mission", exact: true })
    .click();
  await expect(page.locator("footer")).toContainText("1 connections");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator("footer")).toContainText("0 connections");
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  await page.getByRole("button", { name: "Run tests", exact: true }).click();
  await expect(
    page.getByText("Mission complete: Connect a switch to an output", {
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Next mission", exact: true }).click();
  await expect(page.locator(".course-heading h2")).toHaveText(
    "One switch, two outputs",
  );
  await expect(page.locator("footer")).toContainText("0 connections");
});

test("the first six missions are solved by placement and wiring, not navigation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("tab", { name: "Learn", exact: true }).click();
  await page.getByRole("button", { name: "Start course", exact: true }).click();
  async function place(kind: string, name: string, offset: number) {
    await page.getByRole("tab", { name: "Components", exact: true }).click();
    await page.getByRole("button", { name: kind, exact: true }).focus();
    await page.keyboard.press("Enter");
    for (let i = 0; i < offset; i++) await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    await page.getByLabel("Name", { exact: true }).fill(name);
  }
  async function connect(
    from: string,
    port: string,
    to: string,
    input: string,
  ) {
    await page.getByRole("tab", { name: "Circuit", exact: true }).click();
    await page.getByRole("button", { name: from, exact: true }).click();
    await page
      .getByRole("button", { name: `Connect ${port}`, exact: true })
      .click();
    await page.getByRole("button", { name: to, exact: true }).click();
    await page
      .getByRole("button", { name: `Connect ${input}`, exact: true })
      .click();
  }
  const tasks = [
    { gates: [], wires: [["a Input port", "out", "out Output port", "in"]] },
    {
      gates: [],
      wires: [
        ["a Input port", "out", "left Output port", "in"],
        ["a Input port", "out", "right Output port", "in"],
      ],
    },
    {
      gates: [["AND", "both", 0]],
      wires: [
        ["a Input port", "out", "both AND", "a"],
        ["b Input port", "out", "both AND", "b"],
        ["both AND", "out", "out Output port", "in"],
      ],
    },
    {
      gates: [["NOT", "invert", 0]],
      wires: [
        ["a Input port", "out", "invert NOT", "a"],
        ["invert NOT", "out", "out Output port", "in"],
      ],
    },
    {
      gates: [
        ["AND", "both", 0],
        ["NOT", "invert", 12],
      ],
      wires: [
        ["a Input port", "out", "both AND", "a"],
        ["b Input port", "out", "both AND", "b"],
        ["both AND", "out", "invert NOT", "a"],
        ["invert NOT", "out", "out Output port", "in"],
      ],
    },
    {
      gates: [["NAND", "invert", 0]],
      wires: [
        ["a Input port", "out", "invert NAND", "a"],
        ["a Input port", "out", "invert NAND", "b"],
        ["invert NAND", "out", "out Output port", "in"],
      ],
    },
  ];
  for (const [i, task] of tasks.entries()) {
    await expect(
      page.getByRole("button", { name: "Next mission", exact: true }),
    ).toHaveCount(0);
    for (const [kind, name, offset] of task.gates)
      await place(String(kind), String(name), Number(offset));
    for (const [a, b, c, d] of task.wires) await connect(a, b, c, d);
    await page.getByRole("tab", { name: "Learn", exact: true }).click();
    await page.getByRole("button", { name: "Run tests", exact: true }).click();
    await expect(
      page
        .locator('.course-learn [role="status"]')
        .filter({ hasText: "Mission complete:" }),
    ).toBeVisible();
    if (i < tasks.length - 1)
      await page
        .getByRole("button", { name: "Next mission", exact: true })
        .click();
  }
  await page.getByRole("button", { name: "Missions", exact: true }).click();
  const optional = page
    .locator(".course-learn nav details")
    .filter({
      has: page.getByText("Project: Repair a disconnected indicator", {
        exact: true,
      }),
    });
  await optional.locator("summary").click();
  await optional
    .getByRole("button", { name: "Open mission", exact: true })
    .click();
  await expect(page.locator(".course-heading h2")).toHaveText(
    "Repair a disconnected indicator",
  );
  await expect(
    page.getByRole("button", { name: "Next mission", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Missions", exact: true }).click();
  const nextCore = page
    .locator(".course-learn nav details")
    .filter({
      has: page.getByText("Both switches, using NAND", { exact: true }),
    });
  await nextCore.locator("summary").click();
  await nextCore
    .getByRole("button", { name: "Open mission", exact: true })
    .click();
  await expect(page.locator(".course-heading h2")).toHaveText(
    "Both switches, using NAND",
  );
});

test("memory setup is visible and observation-only checkpoints are not marked passed", async ({
  page,
}) => {
  const { exercise } = await import("../../src/course/registry");
  const p = exercise("core-37").reference();
  const address = { instancePath: [], componentId: "memory", portId: "out" };
  p.circuits[p.root].tests = [
    {
      id: "memory",
      name: "Remember 42",
      seed: 1,
      maxCycles: 0,
      steps: [
        {
          cycles: 0,
          memory: [{ ref: address, address: 0, value: 42 }],
          assertions: [],
        },
        {
          cycles: 0,
          assertions: [
            {
              type: "signal",
              ref: { instancePath: [], componentId: "out", portId: "in" },
              value: 42,
            },
          ],
        },
      ],
    },
  ];
  await page.goto("/");
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  await page
    .locator("input[type=file]")
    .setInputFiles({
      name: "memory.loom.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(p)),
    });
  await page.getByRole("button", { name: "Run tests", exact: true }).click();
  const first = page.locator(".visual-tests tbody tr").first();
  await expect(first).toContainText("memory · out [0]");
  await expect(first).toContainText("42");
  await expect(first).toContainText("Observed");
  await expect(first).not.toContainText("Passed");
});
