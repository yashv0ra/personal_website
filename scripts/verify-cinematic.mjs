// Real-browser checkpoint verification. No provider mocks; this does not call AI APIs.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.CINEMATIC_URL || 'http://localhost:3011';
const out = 'output/playwright/cinematic';
await mkdir(out, { recursive: true });
const results = [];
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
async function session(name, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(base);
  return { context, page, errors, name };
}
async function ready(page) { await page.locator('main[data-stage="room"][data-phase="ready"]').waitFor({ timeout: 15000 }); }
async function shot(page, name) { await page.screenshot({ path: `${out}/${name}.png` }); }
try {
  const { page, context, errors } = await session('desktop', { recordVideo: { dir: out, size: { width: 1440, height: 900 } } });
  assert.equal(await page.getByRole('button', { name: 'click here', exact: true }).count(), 1);
  await shot(page, '01-white-entrance');
  const start = Date.now();
  await page.getByRole('button', { name: 'click here', exact: true }).click();
  await page.waitForTimeout(650); await shot(page, '02-expansion');
  await page.waitForTimeout(800); await shot(page, '03-reveal');
  await ready(page); const introMs = Date.now() - start;
  assert.equal(await page.locator('main').getAttribute('data-renderer'), 'three');
  assert.equal(await page.locator('canvas').count(), 1);
  await page.getByRole('button', { name: 'Next card', exact: true }).focus();
  await shot(page, '04-room-about');
  const switchStart = Date.now();
  await page.getByRole('button', { name: 'Next card', exact: true }).click();
  await page.waitForTimeout(250); await shot(page, '05-blackout-slide');
  await page.locator('main[data-card="Resume"][data-phase="ready"]').waitFor({ timeout: 15000 }); const switchMs = Date.now() - switchStart;
  assert.equal(await page.locator('main').getAttribute('data-card'), 'Resume');
  await shot(page, '06-resume-card');
  await page.getByRole('button', { name: 'Open Resume', exact: true }).click();
  await page.waitForURL('**/resume');
  await page.getByRole('link', { name: 'Home', exact: true }).click(); await ready(page);
  assert.equal(await page.locator('main').getAttribute('data-card'), 'Resume');
  assert.equal(await page.getByRole('button', { name: 'click here', exact: true }).count(), 0);
  await page.getByRole('button', { name: 'Next card', exact: true }).click(); await ready(page);
  await page.getByRole('button', { name: 'Open Lab', exact: true }).click(); await page.waitForURL('**/lab');
  assert.equal(await page.locator('a[href="https://purduebarlines.web.app"]').count(), 1);
  assert.equal(await page.getByRole('button').filter({ hasText: 'Paint + Charades' }).count(), 1);
  await page.getByRole('link', { name: 'Back to home' }).click(); await ready(page);
  await page.getByRole('button', { name: 'Next card', exact: true }).click(); await ready(page);
  await page.getByRole('button', { name: 'Open About', exact: true }).click();
  await page.getByRole('dialog').waitFor(); await shot(page, '07-about-dialog');
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  assert.equal(await page.getByRole('dialog').count(), 0);
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Open About');
  const focus = await page.evaluate(() => document.activeElement?.getAttribute('aria-label'));
  assert.equal(focus, 'Open About');
  await page.getByRole('button', { name: 'Back to entrance', exact: true }).click();
  await page.getByRole('button', { name: 'click here', exact: true }).waitFor();
  await shot(page, '08-back-to-white');
  await page.getByRole('button', { name: 'click here', exact: true }).click(); await ready(page);
  assert.equal(await page.locator('canvas').count(), 1);
  const frameTimes = await page.evaluate(() => new Promise(resolve => {
    const times = []; let last = 0;
    function tick(t) { if (last) times.push(t - last); last = t; if (times.length < 120) requestAnimationFrame(tick); else resolve(times); }
    requestAnimationFrame(tick);
  }));
  const sorted = [...frameTimes].sort((a,b)=>a-b);
  assert.deepEqual(errors, []);
  results.push({ name: 'desktop', passed: true, introMs, switchMs, frames: { medianMs: sorted[60], p95Ms: sorted[114] }, errors });
  const video = page.video(); await context.close(); if (video) await video.saveAs(`${out}/desktop-sequence.webm`);
  for (const config of [{ name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }, { name: 'reduced-motion', reducedMotion: 'reduce' }]) {
    const { name, ...options } = config;
    const s = await session(name, options);
    await s.page.getByRole('button', { name: 'click here', exact: true }).click(); await ready(s.page);
    for (const label of ['Previous card', 'Next card']) {
      const box = await s.page.getByRole('button', { name: label, exact: true }).boundingBox();
      assert.ok(box && box.width >= 44 && box.x >= 0 && box.x + box.width <= (options.viewport?.width ?? 1440));
    }
    await shot(s.page, name);
    await s.page.getByRole('button', { name: 'Next card', exact: true }).click(); await ready(s.page);
    assert.equal(await s.page.locator('main').getAttribute('data-card'), 'Resume');
    assert.deepEqual(s.errors, []); results.push({ name, passed: true, errors: s.errors }); await s.context.close();
  }
} finally {
  await browser.close();
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
}
