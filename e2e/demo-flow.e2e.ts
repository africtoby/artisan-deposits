import { expect, test } from "@playwright/test";

// The full judge-mode story: a seller starts the demo, copies the client link, and the client
// pays the deposit with practice coins. This uses the demo wallet, not a real Lightning wallet.
test("seller shares a link and the client pays the deposit", async ({ page, context }) => {
  await page.goto("/demo");
  await page.getByRole("button", { name: "Try the demo" }).click();

  await page.waitForURL("**/jobs");
  await page.getByRole("link", { name: /Wedding aso-ebi/ }).click();

  await page.getByRole("button", { name: "Copy client link" }).click();
  await expect(page.getByText("Link copied")).toBeVisible();
  const clientLink = await page.evaluate(() => navigator.clipboard.readText());
  expect(clientLink).toMatch(/\/j\/[\w-]{43}$/);

  // A fresh page with no seller session, like a client opening the link on their own phone.
  const clientPage = await context.newPage();
  await clientPage.context().clearCookies();
  await clientPage.goto(clientLink);
  await clientPage.getByRole("button", { name: "Pay with practice coins" }).click();
  // The first payment call compiles on the dev server and then waits on the remote database.
  await expect(clientPage.getByText("Deposit received. The work can start.")).toBeVisible({
    timeout: 30_000,
  });
});
