// Real browser regressions for the deployed stockroom, guided controls and two shifts.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {pathToFileURL}=require('node:url');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const url=process.env.INVENTORY_PREVIEW_URL||pathToFileURL(path.resolve(__dirname,'../dist/index.html')).href;
const key='rise.cafe-rescue.five-day.v1';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 const errors=[];
 try{
  for(const viewport of [{width:1366,height:900},{width:375,height:812},{width:667,height:375}]){
   const page=await browser.newPage({viewport,reducedMotion:'reduce'});page.setDefaultTimeout(7000);page.on('pageerror',e=>errors.push(e.message));
   await page.addInitScript(()=>sessionStorage.setItem('rise.pre-survey.6Wcy1Vtr1EciL6f1A.seen','yes'));
   await page.clock.install();await page.goto(url);
   const paint=()=>page.clock.fastForward(600);
   const click=a=>page.locator(`#cr-modal [data-action="${a}"]`).click();
   const shot=async name=>{if(process.env.SCREENSHOTS){fs.mkdirSync(process.env.SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOTS,`${name}-${viewport.width}.png`),fullPage:true,animations:'disabled'});}};
   await page.click('#inventory-start');await click('intro-done');
   assert.equal(await page.locator('.cr-stock-item').count(),27,'retain every item in the deployed unified stockroom');
   assert.equal(await page.locator('[data-action="category"]').count(),0,'do not bring back the old category tabs');
   assert.equal(await page.locator('#cr-planning-time').textContent(),'1:30','retain deployed preparation timer');
   let badStorage=false,badFIFO=false;
   for(let n=0;n<85;n++){
    if(await page.evaluate(()=>inventoryGame.tutorialStep())==='ready')break;
    const root=await page.locator('#cr-modal').count()?page.locator('#cr-modal'):page.locator('.cr-game');
    const target=root.locator('.cr-tour-target');
    if(!(await target.count())){await page.click('[data-action="tour-locate"]');continue;}
    assert.equal(await target.count(),1,'one exact target, not every supplier or expired product');
    assert.equal(await page.locator('#cr-tour-spotlight').evaluate(n=>getComputedStyle(n).pointerEvents),'none','shade never intercepts input');
    if(await page.locator('[data-dialog="unpack"]').count()&&!badStorage){
     const group=await target.getAttribute('data-storage');
     const before=await page.evaluate(()=>JSON.stringify(inventoryGame.deliveries));
     await page.locator(`[data-storage="${group==='cold'?'dry':'cold'}"]`).click();
     assert.equal(await page.evaluate(()=>JSON.stringify(inventoryGame.deliveries)),before);
     assert(await page.locator('#cr-dialog-error').innerText());badStorage=true;await shot('delivery-guide');
    }
    if(await page.locator('[data-dialog="fifo"]').count()&&!badFIFO){
     await click('fifo-new');assert(await page.locator('[data-dialog="fifo"]').count());
     assert.equal(await page.evaluate(()=>inventoryGame.tutorial.shelved),false);badFIFO=true;
    }
    if(n===0){await shot('tutorial');await page.setViewportSize({width:viewport.width-5,height:viewport.height});await page.setViewportSize(viewport);}
    await target.click();
   }
   assert.equal(await page.evaluate(()=>inventoryGame.tutorialStep()),'ready');assert(badStorage&&badFIFO);
   await page.click('[data-action="finish-tour"]');await click('begin-day');
   assert.equal(await page.evaluate(()=>inventoryGame.phase),'shift');assert.equal(await page.locator('#cr-tour-spotlight').count(),0);
   async function finishShift(){
    for(let n=0;n<6;n++){
     await page.evaluate(()=>{const g=inventoryGame;g.running=true;for(let i=0;i<400&&g.phase==='shift'&&!g.pendingEvent;i++)g.tick(.25);});
     await paint();
     if(await page.locator('[data-dialog="event"]').count()){
      const choices=await page.locator('[data-action="event-choice"]').evaluateAll(ns=>ns.map(n=>n.dataset.choice));
      const choice=choices.includes('steady')?'steady':choices.includes('alternative')?'alternative':choices[0];
      await page.locator(`[data-action="event-choice"][data-choice="${choice}"]`).click();continue;
     }
     if(await page.evaluate(()=>inventoryGame.phase)==='review')break;
    }
    assert.equal(await page.evaluate(()=>inventoryGame.phase),'review');assert(await page.locator('[data-dialog="report"]').count());
    await click('engineer-review');const answer=await page.evaluate(()=>inventoryGame.reviewOptions().correct);
    await page.locator(`[data-answer="${answer}"]`).click();
   }
   await finishShift();await click('next-day');await click('briefing-done');
   assert.equal(await page.evaluate(()=>inventoryGame.day),2);assert.equal(await page.locator('#cr-planning-time').textContent(),'1:30');
   await page.click('[data-tab="trends"]');await page.click('#cr-play');
   await page.fill('#cr-plan-servings','6');await page.fill('#cr-plan-buffer','2');await page.fill('#cr-plan-reorder','2');await click('save-plan');
   await page.click('[data-action="supplier"][data-supplier="quick"]');await page.click('[data-action="review-cart"]');await click('place-order');
   await page.evaluate(()=>{for(let i=0;i<25;i++)inventoryGame.tickPlanning(1);});await paint();
   // All subsequent problem-free deliveries already auto-store in the deployed game.
   for(let n=0;n<12&&await page.locator('#cr-modal').count();n++){
    const kind=await page.locator('[data-dialog]').getAttribute('data-dialog');
    if(kind==='delivery')await click('unpack');
    else if(kind==='unpack'){
     const group=await page.locator('[data-bundle]').getAttribute('data-bundle');await page.locator(`[data-storage="${group}"]`).click();
    }else if(kind==='fifo')await click('fifo-old');else await click('close');
   }
   await page.click('[data-tab="stock"]');
   while(await page.locator('.cr-stock-item.expired').count()){await page.locator('.cr-stock-item.expired').first().click();await click('trash-selected');}
   assert.equal(await page.evaluate(()=>inventoryGame.planProblem()),null);
   await page.click('#cr-play');assert.equal(await page.evaluate(()=>inventoryGame.phase),'shift');await finishShift();
   // Return from reflection to the existing results view, then inspect other panels.
   if(await page.locator('#cr-modal').count())await page.keyboard.press('Escape');
   await page.click('[data-tab="trends"]');await shot('trends');
   assert(await page.locator('.cr-event-summary').count(),'chosen event remains visible after its popup');
   await page.locator('.cr-trend-summary [data-action="performance"]').click();assert.match(await page.locator('#cr-modal').innerText(),/not twice/);await click('close');
   await page.locator('.cr-trend-summary [data-action="loss-reasons"]').click();assert.match(await page.locator('#cr-modal').innerText(),/recorded outcomes/);await click('close');
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   console.log(`PASS: ${viewport.width}px guided tutorial, wrong-action guards, current stockroom, two rounds, profit and event details`);
   await page.close();
  }
  // Explicit fixtures isolate the repaired controls from unrelated random outcomes.
  const page=await browser.newPage({viewport:{width:1280,height:900}});page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>sessionStorage.setItem('rise.pre-survey.6Wcy1Vtr1EciL6f1A.seen','yes'));await page.clock.install();await page.goto(url);
  await page.evaluate(key=>{
   const g=new InventorySim(42);g.skipTutorial();g.introSeen=true;g.briefed=true;INVENTORY_ITEMS.forEach(i=>g.discard(i.name));
   g.addLot('Whole Milk',3,.45,5,false,.9,null,1);g.addLot('Whole Milk',2,.4,1,false,.9,null,9);
   g.learning.events.push({kind:'fifo',day:1});localStorage.setItem(key,g.save());
  },key);
  await page.reload();await page.click('#inventory-continue');await page.click('[data-action="resume-save"]');
  await page.click('[data-action="inspect"][data-product="Whole Milk"]');
  const before=await page.evaluate(()=>JSON.stringify(inventoryGame.lots['Whole Milk'].map(l=>({id:l.id,qty:l.qty,expires:l.expires})).sort((a,b)=>a.id-b.id)));
  await page.locator('[data-action="rotate"]').click();
  assert.match(await page.locator('.cr-lots>div').first().innerText(),/2 units · Front/);
  assert.equal(await page.evaluate(()=>JSON.stringify(inventoryGame.lots['Whole Milk'].map(l=>({id:l.id,qty:l.qty,expires:l.expires})).sort((a,b)=>a.id-b.id))),before);
  await page.click('[data-action="close"]');
  await page.evaluate(()=>{
   const g=inventoryGame;g.placeOrder([{name:'Cup',qty:2,supplier:'quick',frozen:false,express:false}]);g.deliveries.at(-1).error=false;g.deliveries.at(-1).delayed=false;g.deliveries.at(-1).eta=g.clock;g.processDeliveries();
  });await page.clock.runFor(1200);
  assert.equal(await page.locator('#cr-dock').getAttribute('data-delivery-state'),'new-stock');assert.match(await page.locator('#cr-dock').innerText(),/2 units on shelves/);
  const announced=await page.locator('#cr-delivery-announcement').getAttribute('data-deliveries');
  await page.clock.fastForward(1200);assert.equal(await page.locator('#cr-delivery-announcement').getAttribute('data-deliveries'),announced);
  await page.reload();await page.click('#inventory-continue');await page.click('[data-action="resume-save"]');await page.clock.fastForward(600);
  assert.notEqual(await page.locator('#cr-dock').getAttribute('data-delivery-state'),'new-stock','saved acknowledgement prevents repeat delivery alert');
  await page.click('[data-tab="supply"]');await page.locator('.cr-order-tools summary').click();
  for(const action of ['draft-small','draft-buffer','assistant-offer'])assert(await page.locator(`[data-action="${action}"]`).isVisible());
  await page.click('[data-action="qty-up"]');assert(await page.locator('.cr-order-tools').getAttribute('open')!==null,'expanded shortcuts survive rerender');
  await page.locator('[data-action="assistant-offer"]').click();await page.locator('#cr-modal [data-action="close"]').click();
  await page.evaluate(()=>{const g=inventoryGame;for(const reason of ['price','menu']){const o={id:++g.serial,products:['latte'],price:6,status:'waiting'};g.orders.push(o);g.lose(o,reason);}g.orders.push({id:++g.serial,products:['latte'],price:6,status:'lost'});});
  await page.click('[data-tab="trends"]');await page.click('[data-action="loss-reasons"]');
  const text=await page.locator('#cr-modal').innerText();assert.match(text,/price too high/);assert.match(text,/another menu choice/);assert.match(text,/Reason not recorded/);
  assert.deepEqual(errors,[]);console.log('PASS: real rotation button, lot facts, delivery deduplication/reload, optional controls and factual legacy-safe loss reasons');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
