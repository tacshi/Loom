import { test, expect } from "@playwright/test";

for (const theme of ["light", "dark"]) {
  test(`actions look clickable before hover in ${theme} theme`, async ({
    page,
  }, info) => {
    await page.addInitScript(
      (theme) => localStorage.setItem("loom-theme", theme),
      theme,
    );
    await page.goto("/");
    const debug = page.getByRole("button", { name: "Debug", exact: true });
    const surface = await page
      .locator("header")
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    await expect(debug).not.toHaveCSS("border-top-color", surface);
    await expect(debug).not.toHaveCSS("border-top-color", "rgba(0, 0, 0, 0)");
    await expect(debug).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await debug.focus();
    await expect(debug).toHaveCSS("outline-style", "solid");
    await page.getByRole("tab", { name: "Learn", exact: true }).click();
    const start = page.getByRole("button", {
      name: "Start course",
      exact: true,
    });
    await start.hover();
    const colors = await start.evaluate((el) => {
      const style = getComputedStyle(el);
      return [style.color, style.backgroundColor];
    });
    expect(colors[0]).not.toBe(colors[1]);
    await start.click();
    await page.getByRole("button", { name: "Run tests", exact: true }).click();
    await page
      .getByRole("button", { name: "Show result", exact: true })
      .click();
    await expect(page.getByRole("button",{name:"Undo",exact:true})).toBeDisabled();
    await page.mouse.move(500, 100);
    await page.screenshot({ path: info.outputPath(`buttons-${theme}.png`) });
  });
}
