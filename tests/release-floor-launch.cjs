const assert = require('node:assert/strict');
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {}),
    args: ['--enable-unsafe-swiftshader'],
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const errors = [], failedResponses = [];
    const url = process.env.RISE_TEST_URL || 'http://127.0.0.1:4173/';
    const origin = new URL(url).origin;
    page.setDefaultTimeout(30000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.url().startsWith(origin + '/') && response.status() >= 400)
        failedResponses.push({ url: response.url(), status: response.status() });
    });
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const survey = page.locator('.rise-survey-continue');
    if (await survey.isVisible()) await survey.click();
    await page.locator('.role-menu').waitFor({ state: 'visible' });
    assert(await page.locator('#start').isEnabled(), 'Barista launch button is enabled');
    assert(await page.locator('#inventory-start').isEnabled(), 'Inventory launch button is enabled');
    await page.locator('#floor-manager-start').click();
    await page.waitForURL('**/floor-manager/');
    await page.locator('#loading').waitFor({ state: 'detached', timeout: 60000 });
    await page.locator('#game canvas').waitFor({ state: 'visible' });
    assert.match(await page.title(), /Floor Manager/);
    const canvas = await page.locator('#game canvas').boundingBox();
    assert(canvas.width > 0 && canvas.height > 0, 'Floor Manager 3D canvas has a visible size');
    await page.locator('#beginPlanning').click();
    await page.locator('#walkthrough').waitFor({ state: 'visible' });
    assert.match(await page.locator('#walkthrough').textContent(), /Walk into your café/);
    await page.locator('#skipWalk').click();
    await page.locator('#prepClock').waitFor({ state: 'visible' });
    const zoom = await page.locator('#zoomValue').textContent();
    await page.locator('#zoomIn').click();
    assert.notEqual(await page.locator('#zoomValue').textContent(), zoom, 'Camera zoom control responds');
    await page.locator('#storeToggle').click();
    await page.locator('#tabs [data-tab="furniture"]').click();
    assert.equal(await page.locator('#tabs [data-tab="furniture"]').getAttribute('aria-pressed'), 'true');
    assert(await page.locator('#catalog').isVisible(), 'Build catalog opens');
    await page.waitForTimeout(250);
    assert.deepEqual(errors, [], 'No JavaScript errors during Floor Manager launch and controls');
    assert.deepEqual(failedResponses, [], 'No missing same-origin assets');
    console.log('PASS Floor Manager launches from role menu; 3D canvas, welcome, practice, preparation timer, zoom, and Build tab work; no JavaScript or asset errors.');
    await context.close();
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
