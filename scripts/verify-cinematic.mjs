// Real-browser checkpoint verification. No provider mocks; this does not call AI APIs.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.CINEMATIC_URL || 'http://localhost:3011';
const out = 'output/playwright/cinematic';
// Software WebGL plus recording can stall the browser protocol. This deadline
// tests eventual function; browser-observed animation timings remain separate.
const browserTimeout = Number(process.env.CINEMATIC_BROWSER_TIMEOUT_MS || 60000);
await mkdir(out, { recursive: true });
const results = [];
const sessions = [];
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
async function session(name, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
  const page = await context.newPage();
  page.setDefaultTimeout(browserTimeout);
  const errors = [];
  const warnings = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => { if (message.type() === 'warning' || message.type() === 'error') warnings.push(message.text()); });
  await page.goto(base);
  const result = { context, page, errors, warnings, name };
  sessions.push(result);
  return result;
}
async function ready(page) { await page.locator('main[data-stage="room"][data-phase="ready"]').waitFor(); }
async function shot(page, name) { await page.screenshot({ path: `${out}/${name}.png` }); }
async function measureNextClick(page, label) {
  await page.evaluate(label => {
    const main = document.querySelector('main');
    const button = [...document.querySelectorAll('button')].find(el => (el.getAttribute('aria-label') || el.textContent.trim()) === label);
    window.cinematicMeasurement = null;
    button.addEventListener('click', () => {
      const start = performance.now();
      const observer = new MutationObserver(() => {
        if (main.dataset.stage === 'room' && main.dataset.phase === 'ready') {
          window.cinematicMeasurement = performance.now() - start;
          observer.disconnect();
        }
      });
      observer.observe(main, { attributes: true, attributeFilter: ['data-stage', 'data-phase'] });
    }, { once: true, capture: true });
  }, label);
}
try {
  const { page, context, errors } = await session('desktop', { recordVideo: { dir: out, size: { width: 960, height: 600 } } });
  assert.equal(await page.getByRole('button', { name: 'click here', exact: true }).count(), 1);
  await shot(page, '01-white-entrance');
  await measureNextClick(page, 'click here');
  await page.getByRole('button', { name: 'click here', exact: true }).click();
  await page.waitForTimeout(650); await shot(page, '02-expansion');
  await page.waitForTimeout(800); await shot(page, '03-reveal');
  await ready(page); const introMs = await page.evaluate(() => window.cinematicMeasurement);
  assert.equal(await page.locator('main').getAttribute('data-renderer'), 'three');
  assert.equal(await page.locator('canvas').count(), 1);
  await page.getByRole('button', { name: 'Next card', exact: true }).focus();
  await shot(page, '04-room-about');
  await measureNextClick(page, 'Next card');
  await page.getByRole('button', { name: 'Next card', exact: true }).click();
  await page.waitForTimeout(250); await shot(page, '05-blackout-slide');
  await page.locator('main[data-card="Resume"][data-phase="ready"]').waitFor(); const switchMs = await page.evaluate(() => window.cinematicMeasurement);
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
  const contextLossAvailable = await page.evaluate(() => {
    const gl = document.querySelector('canvas')?.getContext('webgl2');
    const extension = gl?.getExtension('WEBGL_lose_context');
    if (!extension) return false;
    extension.loseContext(); return true;
  });
  assert.equal(contextLossAvailable, true, 'Browser must support actual context loss for this regression check');
  await page.locator('main[data-renderer="fallback"][data-phase="ready"]').waitFor();
  await page.getByRole('button', { name: 'Back to entrance', exact: true }).click();
  await page.getByRole('button', { name: 'click here', exact: true }).click(); await ready(page);
  assert.equal(await page.locator('main').getAttribute('data-renderer'), 'fallback');
  assert.equal(await page.locator('canvas').count(), 0);
  await page.getByRole('button', { name: 'Next card', exact: true }).click();
  await page.getByRole('button', { name: 'Open Resume', exact: true }).waitFor();
  await shot(page, '09-fallback-replay');
  assert.deepEqual(errors, []);
  results.push({ name: 'desktop', passed: true, introMs, switchMs, contextLossReplay: true, frames: { renderer: 'Chromium SwiftShader software WebGL', medianMs: sorted[60], p95Ms: sorted[114] }, errors });
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
} catch (error) {
  for (const s of sessions) {
    if (s.page.isClosed()) continue;
    await shot(s.page, `${s.name}-failure`).catch(() => {});
    const state = await s.page.locator('main').evaluate(el => ({ stage: el.dataset.stage, phase: el.dataset.phase, card: el.dataset.card, renderer: el.dataset.renderer, canvasCount: document.querySelectorAll('canvas').length })).catch(() => null);
    results.push({ name: s.name, passed: false, error: String(error), state, errors: s.errors, warnings: s.warnings.slice(-20) });
  }
  throw error;
} finally {
  await browser.close();
  await writeFile(`${out}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
}
