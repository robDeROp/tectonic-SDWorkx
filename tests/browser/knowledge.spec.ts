import { expect, test as base } from "@playwright/test";
import type { KnowledgeGraph } from "../../lib/types";

const test = base.extend<{ checkBrowserErrors: void }>({
  checkBrowserErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      await use();
      expect(errors, "browser errors").toEqual([]);
    },
    { auto: true },
  ],
});

for (const entry of [
  {
    path: "/kennisbank",
    query: "?item=d-playbook",
    nav: "Kennisbank",
    selected: "Payroll playbook · uitdiensttreding",
    overview: "Waar zit onze kennis?",
  },
  {
    path: "/organigram",
    query: "?person=e-emma",
    nav: "Organigram",
    selected: "Emma Peeters",
    overview: "SD Worx",
  },
]) {
  test(`${entry.nav} follows navigation and browser history`, async ({
    page,
  }) => {
    await page.goto(entry.path + entry.query);
    const heading = page.locator(".kg-view > .kg-inspector h2");
    await expect(heading).toHaveText(entry.selected);
    await page.getByRole("link", { name: entry.nav, exact: true }).click();
    await expect(page).toHaveURL(entry.path);
    await expect(heading).toHaveText(entry.overview);
    await page.goBack();
    await expect(heading).toHaveText(entry.selected);
    await page.goForward();
    await expect(heading).toHaveText(entry.overview);
  });
}

test("knowledge search, graph, filters and dialog navigation", async ({
  page,
}) => {
  await page.goto("/kennisbank");
  const search = page.getByRole("searchbox", { name: "Zoek in de kennisbank" });
  await search.fill("Payroll playbook");
  await page.locator(".kg-results").getByRole("button").first().click();
  await expect(page.locator(".kg-view > .kg-inspector h2")).toContainText(
    "Payroll playbook",
  );
  await page.getByRole("button", { name: "Toon alle verbanden" }).click();
  const dialog = page.getByRole("dialog", { name: "Details en verbanden" });
  await expect(dialog.locator("g.kg-gnode").first()).toBeVisible();
  await dialog.locator(".kg-row").first().click();
  await dialog.getByRole("button", { name: "← Terug", exact: true }).click();
  for (const chip of await dialog.locator(".kg-chip").all()) {
    await chip.click();
    await expect(chip).toHaveAttribute("aria-pressed", "false");
    await chip.click();
  }
  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  for (const name of [
    "Waar ontbreekt kennis?",
    "Verouderd maar gebruikt",
    "Hangt af van één persoon",
    "Overzicht",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(
      page.getByRole("button", { name, exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
  }
  await page.getByRole("button", { name: "Inzoomen", exact: true }).click();
  await page.getByRole("button", { name: "Uitzoomen", exact: true }).click();
  await page
    .getByRole("button", { name: "Passend maken", exact: true })
    .click();
});

test("organisation search opens people and their connections", async ({
  page,
}) => {
  await page.goto("/organigram");
  const search = page.getByRole("searchbox", {
    name: "Zoek een collega of team",
  });
  await search.fill("Emma");
  await page.locator(".kg-results").getByRole("button").first().click();
  await expect(page.locator(".kg-view > .kg-inspector h2")).toHaveText(
    "Emma Peeters",
  );
  await page
    .getByRole("button", { name: "Toon verbanden", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("g.kg-gnode").first()).toBeVisible();
  await dialog.getByRole("button", { name: "Toon in het organigram" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator(".kg-view > .kg-inspector h2")).toHaveText(
    "Emma Peeters",
  );
});

test("live graph has valid links and hunch context opens details", async ({
  page,
  request,
}) => {
  const response = await request.get("/api/knowledge");
  expect(response.ok()).toBe(true);
  const graph: KnowledgeGraph = await response.json();
  const ids = new Set(graph.items.map((item) => item.id));
  expect(ids.size).toBe(graph.items.length);
  for (const item of graph.items)
    for (const ref of item.refs) expect(ids.has(ref.to)).toBe(true);
  const hunch = graph.items.find(
    (item) => item.type === "hunch" && item.experts.length > 0,
  )!;
  expect(hunch).toBeDefined();
  await page.goto(hunch.href!);
  await page
    .getByRole("button", { name: /^Details en verbanden van / })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("g.kg-gnode").first()).toBeVisible();
  await dialog.getByRole("button", { name: "Sluiten", exact: true }).click();
  await expect(dialog).not.toBeVisible();
});

test("mobile pages and graph dialogs fit the screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/", "/kennisbank", "/organigram"]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    if (path !== "/")
      await expect(page.locator(".kg-canvas > svg")).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBeLessThanOrEqual(390);
  }
  await page.goto("/kennisbank?item=d-playbook");
  await page.getByRole("button", { name: "Toon alle verbanden" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.locator("g.kg-gnode").first()).toBeVisible();
  const bounds = await dialog.boundingBox();
  expect(bounds!.width).toBeLessThanOrEqual(390);
  await dialog.getByRole("button", { name: "Sluiten", exact: true }).click();
  await expect(dialog).not.toBeVisible();
});
