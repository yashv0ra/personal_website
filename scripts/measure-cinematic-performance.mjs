// Measures real browser timing and verifies that WebGL draw calls stop while
// the white entrance is covering the room. This does not call AI routes.
import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--enable-unsafe-swiftshader"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await context.addInitScript(({ instrumentDraws }) => {
  sessionStorage.removeItem("yash-room-v1");
  window.__cinematicDraws = 0;
  if (!instrumentDraws) return;
  for (const kind of ["WebGLRenderingContext", "WebGL2RenderingContext"]) {
    const prototype = window[kind]?.prototype;
    if (!prototype) continue;
    for (const method of ["drawArrays", "drawElements"]) {
      const original = prototype[method];
      if (!original) continue;
      prototype[method] = function (...args) {
        window.__cinematicDraws++;
        return original.apply(this, args);
      };
    }
  }
}, { instrumentDraws: process.env.CINEMATIC_COUNT_DRAWS === "1" });
const page = await context.newPage();
page.setDefaultTimeout(60000);
await page.goto(process.env.CINEMATIC_URL || "http://127.0.0.1:3011");
await page.waitForTimeout(750);
const entranceDrawsA = await page.evaluate(() => window.__cinematicDraws);
await page.waitForTimeout(750);
const entranceDrawsB = await page.evaluate(() => window.__cinematicDraws);

await page.evaluate(() => {
  const main = document.querySelector("main");
  window.__cinematicStart = performance.now();
  window.__cinematicReady = null;
  const observer = new MutationObserver(() => {
    if (main.dataset.stage === "room" && main.dataset.phase === "ready") {
      window.__cinematicReady = performance.now();
      observer.disconnect();
    }
  });
  observer.observe(main, { attributes: true });
});
await page.getByRole("button", { name: "click here", exact: true }).click();
await page.locator('main[data-stage="room"][data-phase="ready"]').waitFor();
const introMs = await page.evaluate(() => window.__cinematicReady - window.__cinematicStart);
const frameTimes = await page.evaluate(() => new Promise(resolve => {
  const values = [];
  let previous = 0;
  const tick = now => {
    if (previous) values.push(now - previous);
    previous = now;
    if (values.length < 60) requestAnimationFrame(tick); else resolve(values);
  };
  requestAnimationFrame(tick);
}));
await page.getByRole("button", { name: "Back to entrance", exact: true }).click();
await page.waitForTimeout(250);
const backDrawsA = await page.evaluate(() => window.__cinematicDraws);
await page.waitForTimeout(750);
const backDrawsB = await page.evaluate(() => window.__cinematicDraws);

const sorted = [...frameTimes].sort((a, b) => a - b);
console.log(JSON.stringify({
  renderer: "Chromium SwiftShader software WebGL",
  introMs,
  frames: { medianMs: sorted[Math.floor(sorted.length * 0.5)], p95Ms: sorted[Math.floor(sorted.length * 0.95)] },
  entranceDrawDelta: entranceDrawsB - entranceDrawsA,
  afterBackDrawDelta: backDrawsB - backDrawsA,
}, null, 2));
await context.close();
await browser.close();
