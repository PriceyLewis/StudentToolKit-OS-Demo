const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });

  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  await page.getByText("Try Interactive Demo", { exact: true }).click();
  await page.getByText("Performance Command Center", { exact: true }).waitFor({ timeout: 15000 });
  await page.waitForTimeout(750);

  await page.screenshot({
    path: "docs/screenshots/student-toolkit-dashboard.png",
    fullPage: false,
  });

  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
