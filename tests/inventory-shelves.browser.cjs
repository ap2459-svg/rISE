// Run with PLAYWRIGHT_MODULE / CHROME_PATH if Playwright or Chrome is not on PATH.
// Optional INVENTORY_PREVIEW_URL and SCREENSHOTS support local HTTP review.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path'),fs=require('node:fs');
const url=process.env.INVENTORY_PREVIEW_URL||pathToFileURL(path.resolve(__dirname,'../dist/index.html')).href;
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  for(const viewport of [{width:1920,height:1080},{width:1440,height:900},{width:1366,height:768},{width:1280,height:720},{width:900,height:700},{width:750,height:700},{width:375,height:812},{width:667,height:375},{width:320,height:740}]){
   const page=await browser.newPage({viewport,reducedMotion:'reduce'}),errors=[];
   page.setDefaultTimeout(5000);page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>sessionStorage.setItem('rise.pre-survey.6Wcy1Vtr1EciL6f1A.seen','yes'));
   await page.clock.install();await page.goto(url);
   await page.click('#inventory-start');await page.click('[data-action="skip-tour-intro"]');await page.click('[data-action="briefing-done"]');
   assert.equal(await page.evaluate(()=>scrollY),0,'entering preparation starts at the top of the stockroom');
   const expected=await page.evaluate(()=>INVENTORY_ITEMS.map(i=>({name:i.name,group:i.group})));
   const positions=await page.locator('.cr-stock-item').evaluateAll(nodes=>nodes.map(n=>({name:n.dataset.product,group:n.closest('[data-shelf]').dataset.shelf})));
   assert.deepEqual(positions,expected,'every item appears once, in its logical shelf group');
   assert.equal(new Set(positions.map(p=>p.name)).size,27);
   assert.equal(await page.locator('[data-action="category"]').count(),0);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal page overflow');
   assert(await page.evaluate(()=>document.querySelector('.cr-workspace').getBoundingClientRect().bottom<=document.querySelector('.cr-live').getBoundingClientRect().top),'stockroom and feedback never overlap');
   assert.deepEqual(await page.locator('.cr-stock-item').evaluateAll(nodes=>nodes.filter(n=>n.scrollWidth>n.clientWidth+1).map(n=>n.dataset.product)),[],`item contents fit at ${viewport.width}px`);
   assert(await page.locator('.cr-stock-item').evaluateAll(nodes=>nodes.every(n=>{
    const b=n.getBoundingClientRect(),art=n.querySelector('.cr-product-art').getBoundingClientRect(),group=n.closest('[data-shelf]').getBoundingClientRect();
    const base=parseFloat(getComputedStyle(n.closest('[data-shelf]')).getPropertyValue('--art-height'));
    return Math.abs(art.bottom-b.top-base)<1&&b.left>=group.left&&b.right<=group.right&&b.bottom<=group.bottom&&b.width>=44;
   })),'every illustration rests at its shelf baseline and every item fits its shelf');
   if(viewport.width>=1366)assert(await page.evaluate(()=>{
    const view=document.querySelector('#cr-workspace').getBoundingClientRect();
    return [...document.querySelectorAll('.cr-shelf-group,.cr-stock-tools')].every(n=>{const b=n.getBoundingClientRect();return b.top>=view.top&&b.bottom<=view.bottom;});
   }),'full desktop stockroom fits without scrolling');
   if(process.env.SCREENSHOTS){fs.mkdirSync(process.env.SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOTS,`stockroom-${viewport.width}.png`),fullPage:true,animations:'disabled'});}
   // Every product remains inspectable, including every empty or expired position.
   for(const {name} of expected){
    const button=page.locator('.cr-stock-item').filter({has:page.locator('b',{hasText:new RegExp('^'+name+'$')})});
    const fresh=await page.evaluate(n=>inventoryGame.stock(n),name),id=await button.getAttribute('id');
    await button.click();
    assert.match(await page.locator('#cr-dialog-title').innerText(),new RegExp(name));
    assert.equal(await page.locator('.cr-stat-row>span').first().locator('b').innerText(),String(fresh));
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(()=>document.activeElement.id),id,'closing inspection restores the shelf keyboard position');
   }
   const cup=page.locator('.cr-stock-item[data-product="Cup"]');
   await cup.focus();await page.keyboard.press('Enter');await page.click('[data-action="order-selected"]');
   assert.equal(await page.locator('#cr-product').inputValue(),'Cup','restocking opens the selected product');
   await page.click('[data-action="tab"][data-tab="stock"]');
   assert.deepEqual(await page.locator('.cr-stock-item').evaluateAll(nodes=>nodes.map(n=>({name:n.dataset.product,group:n.closest('[data-shelf]').dataset.shelf}))),positions);
   if(viewport.width===1366){
    await page.locator('.cr-stock-item[data-product="Whole Milk"]').dragTo(page.locator('[data-action="bin"]'));
    assert.equal(await page.evaluate(()=>inventoryGame.spoiled('Whole Milk')),0,'dragging expired stock to the header bin still discards it');
    assert.equal(await page.locator('.cr-stock-item[data-product="Whole Milk"]').count(),1,'discarding leaves the empty shelf position');
   }
   // Update quantities through the existing engine; rendering must preserve positions.
   await page.evaluate(()=>{
    inventoryGame.addLot('Cup',9,.18,100000000);
    inventoryGame.discard('Whole Milk');inventoryGame.addLot('Whole Milk',1,.45,3);
    inventoryGame.addLot('Cookie',4,.9,14,true);
    inventoryGame.addLot('Cinnamon',40,.22,1);
   });
   await page.clock.fastForward(600);
   assert.match(await cup.innerText(),/9 ready/);
   assert.match(await page.locator('.cr-stock-item[data-product="Whole Milk"]').innerText(),/1 · CRITICAL/);
   assert.match(await page.locator('.cr-stock-item[data-product="Cookie"]').getAttribute('aria-label'),/4 frozen/);
   assert.match(await page.locator('.cr-stock-item[data-product="Cinnamon"]').innerText(),/40 expire in 1 day/);
   assert.deepEqual(await page.locator('.cr-stock-item').evaluateAll(nodes=>nodes.filter(n=>n.scrollWidth>n.clientWidth+1).map(n=>n.dataset.product)),[],`quantity and expiry states fit at ${viewport.width}px`);
   const frozen=page.locator('.cr-stock-item[data-product="Cookie"]');await frozen.click();
   await page.click('[data-action="trash-selected"]'); // Discard inherited expired cookies only.
   assert.equal(await page.evaluate(()=>inventoryGame.frozen('Cookie')),4,'removing expired stock keeps frozen units');
   assert.match(await page.locator('.cr-stock-item[data-product="Cookie"]').innerText(),/4 frozen/);
   assert.equal(await page.locator('.cr-stock-item').count(),27,'updates never remove empty shelf positions');
   // Renders retain keyboard focus even when the focused product count changes.
   await cup.focus();await page.evaluate(()=>inventoryGame.addLot('Cup',1,.18,100000000));await page.clock.fastForward(600);
   assert.equal(await page.evaluate(()=>document.activeElement.dataset.product),'Cup');
   await page.click('[data-action="exit"]');await page.click('[data-action="exit-now"]');
   await page.click('#inventory-start');await page.click('[data-action="resume-save"]');
   assert.equal(await page.locator('.cr-stock-item').count(),27);
   assert.match(await page.locator('.cr-stock-item[data-product="Cup"]').innerText(),/10 ready/);
   assert.deepEqual(errors,[]);await page.close();
  }
  console.log('PASS: all 27 items on permanent shelves, no duplicates or missing items, shelf alignment, desktop/mobile overflow, every item inspection, keyboard/focus, restock selection, stock/frozen/expiry updates and save/resume.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
