import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { unlockCinematic } from './cinematic-password.mjs';

const base = process.env.CINEMATIC_URL || 'http://127.0.0.1:3015';
const server = process.env.CINEMATIC_URL ? null : spawn(process.execPath,
  ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3015'],
  { stdio: ['ignore', 'pipe', 'pipe'] });
const results = [];
let browser;
try {
  if (server) await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Production server did not start')), 20000);
    server.stdout.on('data', data => { if (String(data).includes('Ready')) { clearTimeout(timeout); resolve(); } });
    server.stderr.on('data', data => process.stderr.write(data));
    server.on('exit', code => { clearTimeout(timeout); reject(new Error(`Server exited ${code}`)); });
  });
  browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--enable-unsafe-swiftshader'] });
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    const roomRequests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/room/')) roomRequests.push(request.url()); });
    page.setDefaultTimeout(20000);
    await page.goto(base);
    await page.getByRole('link', { name: 'Enter cinematic experience', exact: true }).click();
    const password = page.getByLabel('Password', { exact: true });
    await password.waitFor();
    assert.equal(await page.getByRole('button', { name: 'click here', exact: true }).count(), 0);
    assert.equal(await page.locator('canvas').count(), 0);
    assert.deepEqual(roomRequests, []);
    await page.getByRole('button', { name: 'Unlock', exact: true }).click();
    assert.equal(await password.evaluate(input => input.validity.valueMissing), true);
    for (const wrong of ['0000', '11111']) {
      await password.fill(wrong);
      await page.getByRole('button', { name: 'Unlock', exact: true }).click();
      await page.getByRole('alert').getByText('Incorrect password. Try again.', { exact: true }).waitFor();
      assert.equal(await page.locator('main[data-stage]').count(), 0);
    }
    assert.deepEqual(roomRequests, []);
    const box = await password.boundingBox();
    assert.ok(box.width >= 200 && box.height >= 44 && box.x >= 0 && box.x + box.width <= viewport.width);
    await mkdir('output/playwright/password', { recursive: true });
    await page.screenshot({ path: `output/playwright/password/locked-${viewport.width}.png` });
    await unlockCinematic(page);
    await page.getByRole('button', { name: 'click here', exact: true }).waitFor();
    assert.equal(await page.getByRole('heading', { name: 'Enter password', exact: true }).count(), 0);
    await page.getByRole('button', { name: 'click here', exact: true }).click();
    await page.locator('main[data-stage="room"][data-phase="ready"]').waitFor();
    await page.getByRole('button', { name: 'Back to entrance', exact: true }).click();
    await page.getByRole('button', { name: 'click here', exact: true }).waitFor();
    await page.reload();
    await password.waitFor();
    assert.equal(await page.locator('main[data-stage]').count(), 0);
    // Query strings and old room navigation state do not grant entry.
    await page.evaluate(() => { sessionStorage.setItem('yash-room-v1', '1'); localStorage.setItem('cinematic-unlocked', 'true'); });
    await page.goto(`${base}/cinematic?unlocked=true`);
    await password.waitFor();
    assert.equal(await page.locator('main[data-stage]').count(), 0);
    await page.getByRole('link', { name: 'Back to home', exact: true }).click();
    await page.getByRole('link', { name: 'Enter cinematic experience', exact: true }).click();
    await password.waitFor();
    assert.equal(await page.locator('main[data-stage]').count(), 0);
    // A network failure stays locked and offers a usable retry.
    await page.route('**/cinematic', route => route.request().method() === 'POST' ? route.abort() : route.continue());
    await password.fill(process.env.CINEMATIC_PASSWORD || '1111');
    await page.getByRole('button', { name: 'Unlock', exact: true }).click();
    await page.getByRole('alert').getByText('Unable to unlock. Please try again.', { exact: true }).waitFor();
    await page.unroute('**/cinematic');
    await unlockCinematic(page);
    assert.deepEqual(errors, []);
    results.push({ viewport, passed: true, checks: ['X opens gate', 'empty/wrong passwords rejected', 'no room before unlock', 'correct password opens room', 'Back to entrance', 'reload relocks', 'direct URL/storage cannot unlock', 'repeat X relocks', 'network failure and retry'], pageErrors: errors });
    await context.close();
  }
} finally {
  await browser?.close();
  server?.kill('SIGTERM');
}
console.log(JSON.stringify(results, null, 2));
await writeFile('docs/CINEMATIC_PASSWORD_VALIDATION.json', JSON.stringify(results, null, 2) + '\n');
