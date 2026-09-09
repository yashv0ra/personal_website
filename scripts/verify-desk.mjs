import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { unlockCinematic } from './cinematic-password.mjs';
const base = process.env.DESK_URL || 'http://localhost:3025';
const output = 'output/playwright/desk';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const errors = [];
async function check(name, fn) { await fn(); results.push(name); console.log('PASS', name); }
async function openDesk(page) { await page.goto(`${base}/cinematic`); await unlockCinematic(page); await page.locator('[data-stage="desk"]').waitFor(); await page.locator('img[src="/desk/desk.webp"]').evaluate(img => img.decode()); }
async function close(page) { await page.getByRole('button', { name: 'Close panel', exact: true }).click(); await page.locator('dialog').waitFor({state:'hidden'}); }
try {
 const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
 const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
 await check('Homepage X opens password gate; invalid password rejected', async () => {
  await page.goto(base); await page.getByRole('link',{name:'Enter Yash’s desk'}).click();
  await page.getByLabel('Password',{exact:true}).fill('wrong-test-input'); await page.getByRole('button',{name:'Unlock',exact:true}).click();
  await page.getByText('Incorrect password. Try again.').waitFor(); assert.equal(await page.locator('[data-stage="desk"]').count(),0);
 });
 await check('Valid password opens desk directly, with no light room/intro', async () => { await unlockCinematic(page); await page.locator('[data-stage="desk"]').waitFor(); await page.locator('img[src="/desk/desk.webp"]').evaluate(img => img.decode()); assert.equal(await page.locator('canvas').count(),1); assert.equal(await page.getByText('click here',{exact:true}).count(),0); });
 await page.screenshot({path:`${output}/desktop.png`});
 await check('Nameplate opens About and Escape restores focus', async () => { const b=page.getByRole('button',{name:'About Yash',exact:true}); await b.click(); await page.getByRole('heading',{name:'Yash Vora',exact:true}).waitFor(); await page.keyboard.press('Escape'); assert.equal(await b.evaluate(el=>el===document.activeElement),true); });
 await check('Experience book opens and pages through verified resume content', async () => { await page.getByRole('button',{name:'Experience',exact:true}).click(); await page.getByRole('heading',{name:'Apple',exact:true}).waitFor(); await page.waitForTimeout(600); await page.screenshot({path:`${output}/experience.png`}); await page.getByRole('button',{name:'Next experience'}).click(); await page.getByRole('heading',{name:'Hyphen',exact:true}).waitFor(); await page.getByRole('button',{name:'Next experience'}).click(); await page.getByRole('heading',{name:'Kwality Foods',exact:true}).waitFor(); assert.equal(await page.getByRole('button',{name:'Next experience'}).isDisabled(),true); await close(page); });
 await check('Projects, lab, contact and interests have functional destinations', async () => {
  for(const [label,heading] of [['Projects','On my Mac'],['Play · The lab','A little play'],['Get in touch','Say hello.'],['Away from the desk','Away from the desk']]) { await page.getByRole('button',{name:label,exact:true}).click(); await page.getByRole('heading',{name:heading,exact:true}).waitFor(); if(label==='Projects') assert.equal(await page.locator('dialog a[href="/lab?from=cinematic"]').count(),1); if(label==='Get in touch') assert.match(await page.locator('dialog a').first().getAttribute('href'),/^mailto:/); await close(page); }
 });
 await check('Scratchpad edits persist across reload and the gate relocks', async () => { await page.getByRole('button',{name:'Your scratchpad'}).click(); await page.getByLabel('Your note').fill('Desk QA note'); await close(page); await page.reload(); await page.getByRole('heading',{name:'Enter password'}).waitFor(); await unlockCinematic(page); await page.getByRole('button',{name:'Your scratchpad'}).click(); assert.equal(await page.getByLabel('Your note').inputValue(),'Desk QA note'); await page.getByRole('button',{name:'Clear note'}).click(); await close(page); });
 await check('Focus timer starts, counts down while panel closed, pauses and resets', async () => { await page.getByRole('button',{name:'Coffee break · Focus timer'}).click(); await page.getByRole('button',{name:'5 min',exact:true}).click(); await page.getByRole('button',{name:'Resume',exact:true}).click(); await close(page); await page.waitForTimeout(2100); await page.getByRole('button',{name:'Coffee break · Focus timer'}).click(); const time=await page.locator('dialog [aria-label^="Time remaining"]').textContent(); assert.ok(time < '05:00'); await page.getByRole('button',{name:'Pause',exact:true}).click(); await page.getByRole('button',{name:'Reset',exact:true}).click(); assert.equal(await page.locator('dialog [aria-label^="Time remaining"]').textContent(),'25:00'); await close(page); });
 await check('World clocks show real formatted times', async () => { await page.getByRole('button',{name:'World clocks',exact:true}).click(); assert.equal(await page.locator('dialog time').count(),5); assert.match(await page.locator('dialog time').first().textContent(),/^\d{2}:\d{2}$/); await close(page); });
 await check('Globe rotates only on hover; steam, typing and lamp animations advance', async () => {
  await page.getByRole('button',{name:'World clocks',exact:true}).hover(); await page.waitForTimeout(250);
  await page.locator('[data-object="world"] canvas[data-ready="true"]').waitFor(); const a = await page.locator('[data-object="world"] canvas').evaluate(el => el.toDataURL());
  await page.waitForTimeout(350); const b = await page.locator('[data-object="world"] canvas').evaluate(el => el.toDataURL()); assert.notEqual(a,b);
  const names = await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').map(a=>a.animationName||''));
  for(const n of ['steamRise','lampBreathe','typing']) assert.ok(names.some(name=>name.includes(n)),`Missing running ${n}`);
  await page.screenshot({path:`${output}/globe-hover.png`}); await page.mouse.move(800,880);
 });
 await check('Lamp dims; rain radio toggles; motion pause freezes animations', async () => {
  await page.getByRole('button',{name:'Dim desk light'}).click(); assert.equal(await page.locator('main').getAttribute('data-lamp'),'false'); await page.getByRole('button',{name:'Brighten desk light'}).click();
  await page.getByRole('button',{name:'Play rain ambience'}).click(); await page.getByRole('button',{name:'Stop rain ambience'}).waitFor(); await page.getByRole('button',{name:'Stop rain ambience'}).click();
  await page.getByRole('button',{name:'Pause animations'}).click(); assert.equal(await page.locator('main').getAttribute('data-motion'),'false'); await page.waitForTimeout(350); const moving = await page.evaluate(()=>document.querySelector('main').getAnimations({subtree:true}).filter(a=>a instanceof CSSAnimation && a.playState==='running').length); assert.equal(moving,0); await page.getByRole('button',{name:'Resume animations'}).click();
 });
 await check('Keyboard-only controls open panels with focus trapped in dialog', async () => { const b=page.getByRole('button',{name:'About Yash',exact:true}); await b.focus(); await page.keyboard.press('Enter'); assert.equal(await page.locator('dialog').getAttribute('data-keyboard'),'true'); for(let i=0;i<8;i++) await page.keyboard.press('Tab'); assert.equal(await page.evaluate(()=>!!document.activeElement.closest('dialog')),true); await page.keyboard.press('Escape'); });
 const mobileContext = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});
 const mobile=await mobileContext.newPage(); mobile.on('pageerror',e=>errors.push(e.message)); await openDesk(mobile);
 await check('Mobile starts centered and can pan to both ends',async()=>{ const v=mobile.getByLabel('Pan across the desk',{exact:true}); const initial=await v.evaluate(e=>e.scrollLeft); assert.ok(initial>300); await mobile.screenshot({path:`${output}/mobile-center.png`}); await mobile.getByRole('button',{name:'Pan desk left'}).click(); await mobile.waitForTimeout(700); assert.ok(await v.evaluate(e=>e.scrollLeft)<initial); await mobile.screenshot({path:`${output}/mobile-left.png`}); for(let i=0;i<5;i++) await mobile.getByRole('button',{name:'Pan desk right'}).click(); await mobile.waitForTimeout(700); assert.ok(await v.evaluate(e=>e.scrollLeft)>initial); await mobile.screenshot({path:`${output}/mobile-right.png`}); });
 await check('Native mobile swipe pans the desk without opening an object',async()=>{const v=mobile.getByLabel('Pan across the desk',{exact:true});await v.evaluate(e=>{e.scrollLeft=(e.scrollWidth-e.clientWidth)/2;});const start=await v.evaluate(e=>e.scrollLeft);const cdp=await mobileContext.newCDPSession(mobile);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:300,y:550}]});for(let x=280;x>=80;x-=20){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x,y:550}]});await mobile.waitForTimeout(20);}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await mobile.waitForTimeout(400);assert.ok(await v.evaluate(e=>e.scrollLeft)>start);assert.equal(await mobile.locator('dialog[open]').count(),0);await cdp.detach();});
 await check('Mobile objects open readable dialogs and close',async()=>{await mobile.getByRole('button',{name:'Experience',exact:true}).click(); await mobile.getByRole('heading',{name:'Apple',exact:true}).waitFor(); await mobile.waitForTimeout(650); await mobile.screenshot({path:`${output}/mobile-book.png`}); await close(mobile);});
 const reducedContext=await browser.newContext({viewport:{width:1280,height:800},reducedMotion:'reduce'});const rp=await reducedContext.newPage();await openDesk(rp);
 await check('Reduced motion disables decorative animation and keeps all functions',async()=>{assert.equal(await rp.locator('main').getAttribute('data-motion'),'false');assert.equal(await rp.evaluate(()=>document.querySelector('main').getAnimations({subtree:true}).filter(a=>a instanceof CSSAnimation && a.playState==='running').length),0);await rp.getByRole('button',{name:'Experience',exact:true}).click();await rp.getByRole('heading',{name:'Apple',exact:true}).waitFor();await close(rp);});
 assert.deepEqual(errors,[]);results.push('No page errors');
 await writeFile(`${output}/results.json`,JSON.stringify({base,results,errors},null,2));
} finally {await browser.close();}
