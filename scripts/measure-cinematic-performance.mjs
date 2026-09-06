// Measures real browser timing and verifies that WebGL draw calls stop while
// the white entrance is covering the room. This does not call AI routes.
import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--enable-unsafe-swiftshader"],
});
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const instrumentDraws = process.env.CINEMATIC_COUNT_DRAWS === "1";
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
}, { instrumentDraws });
const page = await context.newPage();
page.setDefaultTimeout(60000);
await page.goto(`${process.env.CINEMATIC_URL || "http://127.0.0.1:3011"}/cinematic`);
await page.locator('main[data-scene-ready="true"]').waitFor();
await page.waitForTimeout(250);
const entranceDrawsA = await page.evaluate(() => window.__cinematicDraws);
await page.waitForTimeout(750);
const entranceDrawsB = await page.evaluate(() => window.__cinematicDraws);

await page.evaluate(() => {
  const main = document.querySelector("main");
  window.__cinematicStart = null;
  [...document.querySelectorAll("button")].find(button => button.textContent === "click here")?.addEventListener("click", () => { window.__cinematicStart = performance.now(); }, {once: true, capture: true});
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
const activeSwitch = await page.evaluate(() => new Promise(resolve => {
  const main = document.querySelector('main');
  const values = []; let last = 0, frame = 0;
  const start = performance.now();
  const tick = now => { if(last)values.push(now-last); last=now; frame=requestAnimationFrame(tick); };
  const observer = new MutationObserver(() => {
    if(main.dataset.phase === 'ready') {
      cancelAnimationFrame(frame); observer.disconnect();
      const sorted = values.sort((a,b)=>a-b);
      resolve({durationMs:performance.now()-start,samples:values.length,medianMs:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.floor(sorted.length*.95)]});
    }
  });
  observer.observe(main,{attributes:true,attributeFilter:['data-phase']});
  frame=requestAnimationFrame(tick);
  document.querySelector('button[aria-label="Next card"]').click();
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
  frames: { phase: "settled room (may render on demand after degradation)", medianMs: sorted[Math.floor(sorted.length * 0.5)], p95Ms: sorted[Math.floor(sorted.length * 0.95)] },
  activeSwitch,
  instrumentDraws,
  entranceDrawDelta: instrumentDraws ? entranceDrawsB - entranceDrawsA : null,
  afterBackDrawDelta: instrumentDraws ? backDrawsB - backDrawsA : null,
}, null, 2));
await context.close();
await browser.close();
