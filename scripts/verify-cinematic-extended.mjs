import { unlockCinematic } from './cinematic-password.mjs';
// Focused acceptance cases that complement verify-cinematic.mjs. No AI mocks.
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";

const base = process.env.CINEMATIC_URL || "http://127.0.0.1:3011";
const launchOptions = { headless: true, executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--enable-unsafe-swiftshader"] };
const results = [];
const requestedCases = new Set((process.env.CINEMATIC_CASES || "").split(",").filter(Boolean));

async function run(name, options, test) {
  if (requestedCases.size && !requestedCases.has(name)) return;
  const browser = await chromium.launch(launchOptions);
  const context = await browser.newContext(options);
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  const errors = [];
  page.on("pageerror", error => errors.push(error.message));
  try {
    await test(page, context);
    assert.deepEqual(errors, []);
    results.push({ name, passed: true });
  } catch (error) {
    results.push({ name, passed: false, error: String(error), errors });
  } finally {
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}
const fresh = page => page.addInitScript(() => sessionStorage.removeItem("yash-room-v1"));
const ready = (page, card) => page.locator(`main[data-stage="room"][data-phase="ready"]${card ? `[data-card="${card}"]` : ""}`).waitFor();
async function enter(page) {
  await page.goto(`${base}/cinematic`); await unlockCinematic(page);
  await page.getByRole("button", { name: "click here", exact: true }).click();
  await ready(page, "About");
}
async function move(page, label, card) {
  await page.getByRole("button", { name: label, exact: true }).click();
  await ready(page, card);
}

await run("wrap-rapid-keyboard", { viewport: { width: 1440, height: 900 } }, async page => {
  await fresh(page); await enter(page);
  await move(page, "Previous card", "Lab");
  await move(page, "Previous card", "Resume");
  await move(page, "Previous card", "About");
  const next = page.getByRole("button", { name: "Next card", exact: true });
  await next.evaluate(button => { for (let i = 0; i < 20; i++) button.click(); });
  await ready(page, "Resume");
  await page.getByRole("button", { name: "Open Resume", exact: true }).focus();
  await page.keyboard.press("ArrowLeft");
  await ready(page, "About");
  assert.match(await page.locator('[aria-live="polite"]').textContent(), /About, 1 of 3/);
  assert.equal(await page.locator("audio,video").count(), 0);
});

await run("unavailable-storage-replay", { viewport: { width: 1000, height: 700 } }, async page => {
  await page.addInitScript(() => {
    for (const method of ["getItem", "setItem", "removeItem"]) Object.defineProperty(Storage.prototype, method, { value() { throw new Error("storage unavailable"); } });
  });
  await enter(page);
  await move(page, "Next card", "Resume");
  await page.getByRole("button", { name: "Back to entrance", exact: true }).click();
  await page.getByRole("button", { name: "click here", exact: true }).click();
  await ready(page, "About");
  assert.equal(await page.locator("canvas").count(), 1);
});

await run("webgl-init-fallback", { viewport: { width: 1000, height: 700 } }, async page => {
  await page.addInitScript(() => {
    sessionStorage.removeItem("yash-room-v1");
    const original = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
      if (kind === "webgl" || kind === "webgl2" || kind === "experimental-webgl") return null;
      return original.call(this, kind, ...args);
    };
  });
  await enter(page);
  assert.equal(await page.locator("main").getAttribute("data-renderer"), "fallback");
  assert.equal(await page.locator("canvas").count(), 0);
  await page.getByRole("button", { name: "Previous card", exact: true }).click();
  await ready(page, "Lab");
  await page.getByRole("button", { name: "Back to entrance", exact: true }).click();
  await page.getByRole("button", { name: "click here", exact: true }).click();
  await ready(page, "About");
});

await run("texture-timeout-fallback", { viewport: { width: 1000, height: 700 } }, async page => {
  await fresh(page);
  await page.route("**/room/*.jpg", async route => {
    await new Promise(resolve => setTimeout(resolve, 6200));
    await route.continue();
  });
  await enter(page);
  assert.equal(await page.locator("main").getAttribute("data-renderer"), "fallback");
  await page.waitForTimeout(2500);
  assert.equal(await page.locator("canvas").count(), 0);
});

await run("reduced-motion-timing", { viewport: { width: 1000, height: 700 }, reducedMotion: "reduce" }, async page => {
  await fresh(page); await page.goto(`${base}/cinematic`); await unlockCinematic(page);
  // Isolate the approved reduced-motion choreography from software-renderer
  // initialization; the room is deliberately preloaded behind the entrance.
  await page.locator('main[data-scene-ready="true"]').waitFor();
  await page.evaluate(() => {
    const main = document.querySelector("main");
    const button = [...document.querySelectorAll("button")].find(item => item.textContent.trim() === "click here");
    button.addEventListener("click", () => {
      const started = performance.now();
      const observer = new MutationObserver(() => {
        if (main.dataset.stage === "room" && main.dataset.phase === "ready") {
          window.__reducedIntroMs = performance.now() - started;
          observer.disconnect();
        }
      });
      observer.observe(main, { attributes: true });
    }, { once: true, capture: true });
  });
  await page.getByRole("button", { name: "click here", exact: true }).click();
  await ready(page, "About");
  const introMs = await page.evaluate(() => window.__reducedIntroMs);
  assert.ok(introMs < 1500, `reduced-motion entry took ${introMs}ms`);
  await page.evaluate(() => {
    const main = document.querySelector("main");
    const button = document.querySelector('button[aria-label="Next card"]');
    button.addEventListener("click", () => {
      const started = performance.now();
      const observer = new MutationObserver(() => {
        if (main.dataset.card === "Resume" && main.dataset.phase === "ready") {
          window.__reducedSwitchMs = performance.now() - started;
          observer.disconnect();
        }
      });
      observer.observe(main, { attributes: true });
    }, { once: true, capture: true });
  });
  await move(page, "Next card", "Resume");
  const switchMs = await page.evaluate(() => window.__reducedSwitchMs);
  assert.ok(switchMs < 1000, `reduced-motion switch took ${switchMs}ms`);
});

await run("short-landscape-bounds", { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }, async page => {
  await fresh(page); await enter(page);
  for (const name of ["Back to entrance", "Previous card", "Next card", "Open About"]) {
    const box = await page.getByRole("button", { name, exact: true }).boundingBox();
    assert.ok(box && box.width >= 44 && box.height >= 44, `${name} is smaller than 44px`);
    assert.ok(box.x >= 0 && box.y >= 0 && box.x + box.width <= 844 && box.y + box.height <= 390, `${name} is out of bounds`);
  }
});

await writeFile("docs/CINEMATIC_EXTENDED_VALIDATION.json", JSON.stringify(results, null, 2));
console.log(JSON.stringify(results, null, 2));
if (results.some(result => !result.passed)) process.exitCode = 1;
