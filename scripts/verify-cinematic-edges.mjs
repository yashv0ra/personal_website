// Browser regressions for cancellation, storage, reverse navigation and input.
// Runs against a built site; does not call provider APIs.
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.CINEMATIC_URL || 'http://localhost:3014';
const out = 'output/playwright/edges';
await mkdir(out, {recursive:true});
const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_PATH || undefined,args:['--enable-unsafe-swiftshader']});
const results=[];
async function run(name, setup, check, options={}) {
  const context=await browser.newContext({viewport:{width:1440,height:900},...options});
  const errors=[];
  const page=await context.newPage(); page.setDefaultTimeout(20000);
  page.on('pageerror',e=>errors.push(e.message));
  try {
    await setup(context,page); await page.goto(`${base}/cinematic`); await check(page,context);
    assert.deepEqual(errors,[]); results.push({name,passed:true,errors});
  } catch(error) { results.push({name,passed:false,error:String(error),errors}); throw error; }
  finally {await context.close();}
}
const ready=page=>page.locator('main[data-stage="room"][data-phase="ready"]').waitFor();
const enter=async page=>{await page.getByRole('button',{name:'click here',exact:true}).click();await ready(page);};
const card=page=>page.locator('main').getAttribute('data-card');
try {
  await run('normal-landing-x-and-return-paths',async()=>{},async page=>{
    await page.goto(base);
    assert.equal(await page.getByRole('heading',{name:'Yash Vora'}).count(),1);
    const link=page.getByRole('link',{name:'Enter cinematic experience',exact:true});
    const box=await link.boundingBox();assert.ok(box && box.width>=44 && box.height>=44 && box.x>1300 && box.y<60);
    await page.screenshot({path:`${out}/normal-landing.png`});
    await link.click();await page.waitForURL('**/cinematic');
    assert.equal(await page.getByRole('button',{name:'click here',exact:true}).count(),1);
    await page.goto(`${base}/resume`);await page.getByRole('link',{name:'Home',exact:true}).click();await page.waitForURL(base+'/');
    await page.goto(`${base}/lab`);await page.getByRole('link',{name:'Back to home',exact:true}).click();await page.waitForURL(base+'/');
    await page.setViewportSize({width:390,height:844});
    assert.ok(await link.isVisible());await page.screenshot({path:`${out}/normal-landing-mobile.png`});
  });
  await run('keyboard-reverse-rapid-reload-replay',async()=>{},async page=>{
    await page.getByRole('button',{name:'click here',exact:true}).press('Enter');await ready(page);
    assert.equal(await page.locator('main').getAttribute('data-renderer'),'three');
    await page.getByRole('button',{name:'Open About',exact:true}).press('ArrowLeft');await ready(page);assert.equal(await card(page),'Lab');
    await page.getByRole('button',{name:'Open Lab',exact:true}).press('ArrowLeft');await ready(page);assert.equal(await card(page),'Resume');
    await page.getByRole('button',{name:'Open Resume',exact:true}).press('ArrowLeft');await ready(page);assert.equal(await card(page),'About');
    await page.getByRole('button',{name:'Next card',exact:true}).evaluate(button=>{for(let i=0;i<12;i++) button.click();});
    await ready(page);assert.equal(await card(page),'Resume');
    await page.reload();await ready(page);assert.equal(await card(page),'Resume');assert.equal(await page.locator('canvas').count(),1);
    await page.getByRole('button',{name:'Previous card',exact:true}).press('Enter');await ready(page);
    await page.getByRole('button',{name:'Open About',exact:true}).press('Enter');await page.getByRole('dialog').waitFor();
    await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'hidden'});
    await page.waitForFunction(()=>document.activeElement?.getAttribute('aria-label')==='Open About');
    await page.getByRole('button',{name:'Back to entrance',exact:true}).press('Enter');
    assert.equal(await page.evaluate(()=>sessionStorage.getItem('yash-room-v1')),null);
    await page.waitForFunction(()=>document.activeElement?.textContent==='click here');
    await enter(page);assert.equal(await page.locator('canvas').count(),1);
    await page.screenshot({path:`${out}/desktop.png`});
  });
  await run('storage-denied',async context=>context.addInitScript(()=>{for(const method of ['getItem','setItem','removeItem'])Storage.prototype[method]=()=>{throw new DOMException('blocked','SecurityError');};}),async page=>{
    await enter(page);await page.getByRole('button',{name:'Previous card',exact:true}).click();await ready(page);assert.equal(await card(page),'Lab');
    await page.getByRole('button',{name:'Back to entrance',exact:true}).click();await enter(page);assert.equal(await card(page),'About');
  });
  await run('hanging-texture-timeout-replay-cleanup',async context=>context.route('**/room/*.jpg',()=>{}),async page=>{
    await enter(page);assert.equal(await page.locator('main').getAttribute('data-renderer'),'fallback');assert.equal(await page.locator('canvas').count(),0);
    await page.getByRole('button',{name:'Previous card',exact:true}).click();assert.equal(await card(page),'Lab');
    await page.getByRole('button',{name:'Back to entrance',exact:true}).click();await enter(page);assert.equal(await page.locator('canvas').count(),0);
  });
  await run('unmount-during-texture-load',async context=>context.route('**/room/*.jpg',route=>new Promise(resolve=>setTimeout(()=>{void route.continue().catch(()=>{}).finally(resolve);},2500))),async page=>{
    await page.locator('canvas').waitFor({state:'attached'});
    await page.goto(`${base}/resume?from=cinematic`);
    await page.waitForTimeout(3000);
    assert.equal(await page.locator('canvas').count(),0);
    await page.getByRole('link',{name:'Home',exact:true}).click();await enter(page);assert.equal(await page.locator('canvas').count(),1);
  });
  await run('reduced-motion-landscape-replay',async()=>{},async page=>{
    await enter(page);await page.getByRole('button',{name:'Previous card',exact:true}).click();await ready(page);assert.equal(await card(page),'Lab');
    for(const name of ['Previous card','Next card','Back to entrance']) {const box=await page.getByRole('button',{name,exact:true}).boundingBox();assert.ok(box && box.width>=44 && box.height>=44 && box.x>=0 && box.y>=0 && box.x+box.width<=844 && box.y+box.height<=390);}
    await page.screenshot({path:`${out}/landscape.png`});
    await page.getByRole('button',{name:'Back to entrance',exact:true}).click();await enter(page);assert.equal(await page.locator('canvas').count(),1);
  },{viewport:{width:844,height:390},reducedMotion:'reduce',hasTouch:true});
} finally {await browser.close();await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));}
