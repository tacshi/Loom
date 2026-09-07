import { test, expect } from "@playwright/test";
import { readFile, writeFile } from "node:fs/promises";
import { parseProject } from "../../src/persistence/validation";
import { Engine } from "../../src/simulator/engine";

test("production simulation soak with save, rewind and exported-circuit checks", async ({
  page,
}, info) => {
  const minutes = Number(process.env.LOOM_SOAK_MINUTES ?? 0);
  test.skip(
    info.project.name !== "chromium" || !(minutes > 0),
    "Explicit release gate: LOOM_SOAK_MINUTES=60 against a production preview",
  );
  test.setTimeout(minutes * 60000 + 180000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("crash", () => errors.push("Browser page crashed"));
  await page.goto("/");
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  await page.getByLabel("Open example…", { exact: true }).selectOption("echo");
  await page.getByLabel("Clock speed", { exact: true }).selectOption("1000");
  await page.getByRole("button", { name: "Debug", exact: true }).click();
  await page.getByRole("button", { name: "Waveforms", exact: true }).click();
  const terminal = page.getByRole("log", {
    name: "Terminal output RAM/Terminal",
  });
  const started = Date.now(),
    checkpoints: unknown[] = [];
  let expected = "",
    index = 0;
  async function checkpoint() {
    if (
      await page.getByRole("button", { name: "Pause", exact: true }).isVisible()
    )
      await page.getByRole("button", { name: "Pause", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Run clock", exact: true }),
    ).toBeVisible();
    const head = await page
      .getByLabel("Seek cycle", { exact: true })
      .inputValue();
    if (Number(head) > 1) {
      await page
        .getByRole("button", { name: "Back one cycle", exact: true })
        .click();
      await expect(page.getByLabel("Seek cycle", { exact: true })).toHaveValue(
        String(Number(head) - 1),
      );
      await page
        .getByRole("button", { name: "Go to latest", exact: true })
        .click();
      await expect(page.getByLabel("Seek cycle", { exact: true })).toHaveValue(
        head,
      );
      await expect(terminal).toHaveText(expected);
    }
    const text = index + "\n";
    expected += text;
    await page
      .getByLabel("Keyboard input RAM/Keyboard", { exact: true })
      .fill(text);
    await page.getByRole("button", { name: "Send input", exact: true }).click();
    await page.getByRole("button", { name: "Run clock", exact: true }).click();
    await expect(terminal).toHaveText(expected, { timeout: 10000 });
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await page
      .getByLabel("Project", { exact: true })
      .fill("RC soak checkpoint " + index);
    await expect(
      page.getByText("Saved locally", { exact: true }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Projects", exact: true }).click();
    const pending = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export file", exact: true })
      .click();
    const project = parseProject(
      await readFile((await (await pending).path())!, "utf8"),
    );
    expect(project.name).toBe("RC soak checkpoint " + index);
    const oracle = new Engine(project);
    oracle.enqueue("RAM/Keyboard", expected);
    for (let i = 0; i < expected.length * 20 + 20; i++) oracle.step();
    const state = oracle.devices.get("RAM/Terminal");
    expect(
      state?.kind === "terminal" &&
        new TextDecoder().decode(new Uint8Array(state.bytes)),
    ).toBe(expected);
    await page
      .getByRole("dialog", { name: "Projects", exact: true })
      .getByRole("button", { name: "Close", exact: true })
      .click();
    expect(errors).toEqual([]);
    checkpoints.push({
      index,
      elapsedMs: Date.now() - started,
      cycle: Number(
        await page.getByLabel("Seek cycle", { exact: true }).inputValue(),
      ),
      bytes: expected.length,
    });
    await writeFile(
      info.outputPath("soak.json"),
      JSON.stringify(
        {
          started: new Date(started).toISOString(),
          minutes,
          checkpoints,
          errors,
        },
        null,
        2,
      ),
    );
    console.log(
      "Soak checkpoint",
      index,
      "elapsed seconds",
      Math.round((Date.now() - started) / 1000),
    );
    index++;
    await page.getByRole("button", { name: "Run clock", exact: true }).click();
  }
  await checkpoint();
  while (Date.now() - started < minutes * 60000) {
    const next = Math.min(started + index * 60000, started + minutes * 60000);
    while (Date.now() < next)
      await page.waitForTimeout(Math.min(1000, next - Date.now()));
    await checkpoint();
  }
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await page.reload();
  await expect(page.getByLabel("Project", { exact: true })).toHaveValue(
    "RC soak checkpoint " + (index - 1),
  );
  await expect(page.getByText("Saved locally", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  await writeFile(
    info.outputPath("soak.json"),
    JSON.stringify(
      {
        started: new Date(started).toISOString(),
        elapsedMs: Date.now() - started,
        minutes,
        checkpoints,
        errors,
        completed: true,
      },
      null,
      2,
    ),
  );
});
