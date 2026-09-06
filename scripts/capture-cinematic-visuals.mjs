// Focused visual evidence capture. This never calls application AI routes.
import { chromium } from "playwright";
import { mkdir, rm, writeFile } from "node:fs/promises";

const base = process.env.CINEMATIC_URL || "http://127.0.0.1:3011";
const [width, height] = (process.env.CINEMATIC_VIEWPORT || "1440x900").split("x").map(Number);
const out = width === 1440 && height === 900 ? "output/playwright/visual-review" : `output/playwright/visual-review-${width}x${height}`;
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const browser = await chromium.launch({
  headless: true,
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ["--enable-unsafe-swiftshader"],
});
const context = await browser.newContext({
  viewport: { width, height },
  recordVideo: { dir: out, size: width === 1440 ? { width: 960, height: 600 } : { width, height } },
});
await context.addInitScript(() => sessionStorage.removeItem("yash-room-v1"));
const page = await context.newPage();
page.setDefaultTimeout(60000);
const browserMessages = [];
page.on("pageerror", error => browserMessages.push({ type: "pageerror", text: error.message }));
page.on("console", message => {
  if (message.type() === "error" || message.type() === "warning") browserMessages.push({ type: message.type(), text: message.text() });
});
const shot = name => page.screenshot({ path: `${out}/${name}.png` });

try {
  await page.goto(base);
  await shot("01-entrance");
  await page.getByRole("button", { name: "click here", exact: true }).click();
  await page.waitForTimeout(650); await shot("02-expansion-650ms");
  await page.waitForTimeout(800); await shot("03-reveal-1450ms");
  await page.locator('main[data-stage="room"][data-phase="ready"]').waitFor();
  await shot("04-room-about-ready");

  await page.getByRole("button", { name: "Next card", exact: true }).click();
  let previous = 0;
  for (const elapsed of [50, 150, 300, 470, 530, 650, 760, 950, 1100]) {
    await page.waitForTimeout(elapsed - previous);
    await shot(`05-switch-${String(elapsed).padStart(4, "0")}ms`);
    previous = elapsed;
  }
  await page.locator('main[data-card="Resume"][data-phase="ready"]').waitFor();
  await shot("06-room-resume-ready");
} finally {
  const video = page.video();
  await context.close();
  if (video) await video.saveAs(`${out}/desktop-entry-switch.webm`);
  await browser.close();
  await writeFile(`${out}/browser-messages.json`, JSON.stringify(browserMessages, null, 2));
}
