import { expect, test } from "@playwright/test";

test("security headers cover pages, APIs, assets and errors", async ({
  request,
}) => {
  const home = await request.get("/");
  expect(home.ok()).toBe(true);
  const html = await home.text();
  const asset = html.match(/src="([^"]*\/_next\/static\/[^"]+\.js)"/)?.[1];
  expect(asset).toBeDefined();
  for (const response of [
    home,
    await request.get("/api/health"),
    await request.get(asset!),
    await request.get("/security-header-test-not-found"),
  ]) {
    const headers = response.headers();
    expect(headers["strict-transport-security"]).toBe(
      "max-age=31536000; includeSubDomains",
    );
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-powered-by"]).toBeUndefined();
    expect(headers["content-security-policy"]).toContain(
      "frame-ancestors 'none'",
    );
    expect(headers["content-security-policy"]).toContain("object-src 'none'");
    expect(headers["content-security-policy"]).not.toContain("'unsafe-eval'");
    const scriptPolicy = headers["content-security-policy"]
      .split(";")
      .find((directive) => directive.trim().startsWith("script-src "));
    expect(scriptPolicy).not.toContain("'unsafe-inline'");
  }
});

test("each response nonces framework scripts and ignores supplied policies", async ({
  request,
}) => {
  const nonces = new Set<string>();
  for (let i = 0; i < 2; i++) {
    const response = await request.get("/", {
      headers: {
        "Content-Security-Policy": "script-src 'nonce-attacker'",
        "x-nonce": "attacker",
      },
    });
    const policy = response.headers()["content-security-policy"];
    const nonce = policy.match(/'nonce-([^']+)'/)?.[1];
    expect(nonce).toBeDefined();
    expect(nonce).not.toBe("attacker");
    expect(Buffer.from(nonce!, "base64").length).toBeGreaterThanOrEqual(16);
    nonces.add(nonce!);
    const scripts = (await response.text()).match(/<script\b[^>]*>/g) ?? [];
    expect(scripts.length).toBeGreaterThan(0);
    for (const script of scripts) {
      expect(script).toContain(`nonce="${nonce}"`);
    }
    expect(response.headers()["cache-control"]).toContain("no-store");
  }
  expect(nonces.size).toBe(2);
});

test("pages hydrate and navigate without CSP violations", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await page.getByRole("link", { name: "Knowledge base", exact: true }).click();
  await expect(
    page.getByRole("searchbox", { name: "Search the knowledge base" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("the browser blocks scripts without the page nonce", async ({ page }) => {
  await page.addInitScript(() => {
    document.addEventListener("securitypolicyviolation", (event) => {
      document.documentElement.dataset.blockedDirective =
        event.effectiveDirective;
    });
  });
  // Simulate untrusted HTML in the response. Creating a script from browser
  // automation exercises trusted dynamic loading instead of HTML injection.
  await page.route("/", async (route) => {
    const response = await route.fetch();
    const body = (await response.text()).replace(
      "<head>",
      "<head><script>document.documentElement.dataset.injectedScript = 'executed'</script>",
    );
    await route.fulfill({ response, body });
  });
  await page.goto("/");
  await expect(page.locator("h1")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute(
    "data-blocked-directive",
    "script-src-elem",
  );
  await expect(page.locator("html")).not.toHaveAttribute(
    "data-injected-script",
    "executed",
  );
});
