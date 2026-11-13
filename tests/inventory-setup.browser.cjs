const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {pathToFileURL}=require('node:url');const path=require('node:path'),fs=require('node:fs');
const url=process.env.INVENTORY_PREVIEW_URL||pathToFileURL(path.resolve(__dirname,'../dist/index.html')).href;
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});const errors=[];
 try{
  async function pageFor(viewport={width:1366,height:768},start=true){
   const p=await browser.newPage({viewport,reducedMotion:'reduce'});p.setDefaultTimeout(5000);p.on('pageerror',e=>errors.push(e.message));
   await p.addInitScript(()=>sessionStorage.setItem('rise.pre-survey.6Wcy1Vtr1EciL6f1A.seen','yes'));await p.clock.install();await p.goto(url);
   if(start){await p.click('#inventory-start');await p.click('[data-action="skip-tour-intro"]');await p.click('[data-action="briefing-done"]');}return p;
  }
  async function shot(p,name,fullPage=false){if(process.env.SCREENSHOTS){fs.mkdirSync(process.env.SCREENSHOTS,{recursive:true});await p.mouse.move(0,0);await p.screenshot({path:path.join(process.env.SCREENSHOTS,name+'.png'),fullPage,animations:'disabled'});}}
  for(const viewport of [{width:1366,height:768},{width:375,height:812}]){
   const p=await pageFor(viewport);assert.equal(await p.locator('#cr-play').textContent(),'Set up plan →');await p.click('#cr-play');
   assert(await p.locator('[data-action="save-plan"]').isDisabled());assert.match(await p.locator('#cr-plan-problem').textContent(),/two supplier/);
   await p.locator('#cr-plan-servings').fill('7');await p.reload();await p.click('#inventory-start');await p.click('[data-action="resume-save"]');await p.click('#cr-play');
   assert.equal(await p.locator('#cr-plan-servings').inputValue(),'7','typing is saved without needing blur');
   await p.click('[data-action="plan-compare"][data-supplier="quick"]');await p.click('[data-action="plan-compare"][data-supplier="premium"]');
   assert.equal(await p.locator('#cr-plan-servings').inputValue(),'7','comparison redraws preserve the draft');assert(await p.locator('[data-action="save-plan"]').isEnabled());
   await shot(p,'setup-'+viewport.width);await p.click('[data-action="save-plan"]');assert.equal(await p.evaluate(()=>inventoryGame.lesson.plan.servings),7);
   // Explicitly select a different supplier after saving; no second purchase should be required.
   await p.click('[data-action="supplier"][data-supplier="premium"]');
   const cart=await p.evaluate(()=>JSON.stringify(inventoryGame.tutorial.cart));
   for(let n=0;n<4;n++){assert.match(await p.locator('#cr-setup-note').textContent(),/expired units remain/);await p.click('#cr-play');await p.click('[data-action="trash-selected"]');}
   assert.equal(await p.evaluate(()=>JSON.stringify(inventoryGame.tutorial.cart)),cart,'cleanup preserves the prepared order');
   assert.equal(await p.locator('#cr-play').textContent(),'Review order →');await p.click('#cr-play');await p.click('[data-action="place-order"]');
   await p.click('#cr-play');if(await p.locator('[data-action="advance"]').count())await p.click('[data-action="advance"]');
   await p.click('[data-action="unpack"]');
   for(let n=0;n<2;n++){const group=await p.locator('[data-bundle]').getAttribute('data-bundle');await p.click(`[data-action="store-bundle"][data-storage="${group}"]`);}
   await p.click('[data-action="fifo-old"]');assert.equal(await p.locator('#cr-play').textContent(),'Open café →');
   const cash=await p.evaluate(()=>inventoryGame.cash);await p.click('#cr-play');assert.equal(await p.evaluate(()=>inventoryGame.phase),'shift');assert.equal(await p.evaluate(()=>inventoryGame.cash),cash-14);
   assert.equal(await p.evaluate(()=>inventoryGame.deliveries.length),1);assert.equal(await p.evaluate(()=>inventoryGame.deliveries[0].supplier),'premium');
   assert(await p.evaluate(()=>inventoryGame.servings('latte')>=7));await p.close();
  }
  for(const viewport of [{width:1366,height:768},{width:375,height:812}]){
   const p=await pageFor(viewport);const bin=p.locator('#cr-trash');await bin.scrollIntoViewIfNeeded();
   assert(await bin.isVisible());assert(await p.evaluate(()=>{const b=document.querySelector('#cr-trash').getBoundingClientRect(),room=document.querySelector('.cr-stock-scene').getBoundingClientRect();return b.bottom<=room.bottom&&b.bottom>room.bottom-20;}),'trash can is at the bottom of the room');
   await shot(p,'trash-'+viewport.width);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await p.evaluate(()=>{inventoryGame.addLot('Whole Milk',2,.45,3);for(const n of ['Oat Milk','Croissant','Cookie'])inventoryGame.discard(n);});await p.clock.fastForward(600);
   const milk=p.locator('.cr-stock-item[data-product="Whole Milk"]'),fresh=p.locator('.cr-stock-item[data-product="Original Blend"]'),data=await p.evaluateHandle(()=>new DataTransfer());
   await milk.dispatchEvent('dragstart',{dataTransfer:data});await bin.dispatchEvent('dragover',{dataTransfer:data});assert(await bin.evaluate(n=>n.classList.contains('is-dragover')));
   await p.clock.fastForward(600);assert(await bin.evaluate(n=>n.classList.contains('is-dragover')),'highlight survives HUD redraws');
   await milk.dispatchEvent('dragend',{dataTransfer:data});assert(!(await bin.evaluate(n=>n.classList.contains('is-dragover'))));
   const stock=await p.evaluate(()=>inventoryGame.stock('Original Blend'));
   await fresh.dispatchEvent('dragstart',{dataTransfer:data});await bin.dispatchEvent('dragover',{dataTransfer:data});assert(!(await bin.evaluate(n=>n.classList.contains('is-dragover'))));await bin.dispatchEvent('drop',{dataTransfer:data});assert.equal(await p.evaluate(()=>inventoryGame.stock('Original Blend')),stock);
   if(viewport.width===1366)await milk.dragTo(bin);
   else{await bin.focus();await p.keyboard.press('Enter');assert.match(await p.locator('#cr-dialog-title').innerText(),/Whole Milk/);await p.click('[data-action="trash-selected"]');}
   assert.equal(await p.evaluate(()=>inventoryGame.spoiled('Whole Milk')),0);assert.equal(await p.evaluate(()=>inventoryGame.stock('Whole Milk')),2,'disposal keeps usable goods');assert.equal(await p.locator('.cr-stock-item').count(),27);await p.close();
  }
  // Store one bundle, reload, expire while storing the next, then finish without repeating work.
  const partial=await pageFor(undefined,false);
  await partial.evaluate(()=>{const g=new InventorySim(42);g.briefed=true;g.introSeen=true;g.skipTutorial();INVENTORY_ITEMS.forEach(i=>g.discard(i.name));g.placeOrder([{name:'Whole Milk',qty:2,supplier:'quick',frozen:false,express:false},{name:'Cup',qty:2,supplier:'quick',frozen:false,express:false}]);g.advancePlanning();localStorage.setItem('rise.cafe-rescue.five-day.v1',g.save());});
  await partial.click('#inventory-start');await partial.click('[data-action="resume-save"]');await partial.click('[data-action="unpack"]');await partial.click('[data-action="store-bundle"][data-storage="cold"]');
  await partial.reload();await partial.click('#inventory-start');await partial.click('[data-action="resume-save"]');await partial.click('[data-action="unpack"]');assert.equal(await partial.locator('[data-bundle]').getAttribute('data-bundle'),'dry');
  await partial.clock.fastForward(95000);assert.equal(await partial.evaluate(()=>inventoryGame.phase),'shift');assert.equal(await partial.locator('#cr-modal').count(),0);assert.equal(await partial.evaluate(()=>inventoryGame.stock('Whole Milk')),0,'timeout does not silently shelve goods');
  await partial.click('#cr-dock');await partial.click('[data-action="unpack"]');assert.equal(await partial.locator('[data-bundle]').getAttribute('data-bundle'),'dry');await partial.click('[data-action="store-bundle"][data-storage="dry"]');await partial.click('[data-action="fifo-old"]');assert.equal(await partial.evaluate(()=>inventoryGame.stock('Whole Milk')),2);await partial.close();
  assert.deepEqual(errors,[]);console.log('PASS: fresh first-shift plan/order/storage/opening, typed drafts, supplier changes, bottom trash/drop highlight, usable-stock safety, keyboard/mobile disposal and partial unpacking across reload/expiry.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
