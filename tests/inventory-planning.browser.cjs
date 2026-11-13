const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {pathToFileURL}=require('node:url');const path=require('node:path');
const url=process.env.INVENTORY_PREVIEW_URL||pathToFileURL(path.resolve(__dirname,'../dist/index.html')).href;
const key='rise.cafe-rescue.five-day.v1';
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});const errors=[];
 try{
  async function pageFor(ready=false,viewport={width:1366,height:768}){
   const p=await browser.newPage({viewport,reducedMotion:'reduce'});p.setDefaultTimeout(5000);p.on('pageerror',e=>errors.push(e.message));
   await p.addInitScript(()=>sessionStorage.setItem('rise.pre-survey.6Wcy1Vtr1EciL6f1A.seen','yes'));await p.clock.install();await p.goto(url);
   if(ready)await p.evaluate(key=>{
    const g=new InventorySim(42);g.briefed=true;g.introSeen=true;g.skipTutorial();INVENTORY_ITEMS.forEach(i=>g.discard(i.name));
    g.observe('supplier','quick');g.observe('supplier','premium');g.commitPlan({servings:6,supplier:'quick'});
    g.placeOrder([{name:'Cup',qty:1,supplier:'premium',frozen:false,express:false}]);g.advancePlanning();g.deliveries.forEach(d=>{g.shelve(d.id,true);d.notified=true;});
    for(const n of RESCUE.MENU[0].recipe)g.addLot(n,6,.1,14);
    g.tutorial.cart=[{name:'Cup',qty:3,supplier:'quick',frozen:false,express:false}];localStorage.setItem(key,g.save());
   },key);
   await p.click('#inventory-start');
   if(ready)await p.click('[data-action="resume-save"]');
   else{await p.click('[data-action="skip-tour-intro"]');await p.clock.fastForward(120000);assert.equal(await p.evaluate(()=>inventoryGame.planningTimeLeft()),90);await p.click('[data-action="briefing-done"]');}
   return p;
  }
  for(const viewport of [{width:1366,height:768},{width:375,height:812},{width:667,height:375}]){
   const p=await pageFor(false,viewport);assert.equal(await p.locator('#cr-planning-time').textContent(),'1:30');
   await p.click('#cr-play');await p.locator('#cr-plan-servings').fill('7');
   const before=await p.evaluate(()=>({cash:inventoryGame.cash,lots:JSON.stringify(inventoryGame.lots)}));
   await p.clock.fastForward(30000);assert.equal(await p.locator('#cr-dialog-time').textContent(),'1:00','plan dialog does not pause the deadline');
   await p.clock.fastForward(60500);assert.equal(await p.evaluate(()=>inventoryGame.phase),'shift');assert.equal(await p.locator('#cr-modal').count(),0);
   assert.equal(await p.evaluate(()=>inventoryGame.lesson.plan.servings),7);assert.equal(await p.evaluate(()=>inventoryGame.cash),before.cash-14);
   assert.equal(await p.evaluate(()=>JSON.stringify(inventoryGame.lots)),before.lots,'expiry never silently cleans, stocks or purchases');
   assert.equal(await p.evaluate(()=>inventoryGame.deliveries.length),0);assert(await p.locator('#cr-planning').isHidden());
   assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.close();
  }
  const early=await pageFor(true),cash=await early.evaluate(()=>inventoryGame.cash);
  await early.clock.fastForward(10000);await early.click('#cr-play');assert.equal(await early.evaluate(()=>inventoryGame.phase),'shift');assert.equal(await early.evaluate(()=>inventoryGame.cash),cash-14);
  assert.equal(await early.evaluate(()=>inventoryGame.tutorial.cart[0].qty),3);await early.click('#cr-play');await early.clock.fastForward(120000);assert.equal(await early.evaluate(()=>inventoryGame.running),false,'old callback cannot restart a paused shift');await early.close();
  // Navigation, speed, reload and backgrounding all keep the original deadline.
  const p=await pageFor(true),deadline=await p.evaluate(()=>inventoryGame.planningExpiresAt);
  await p.click('[data-action="tab"][data-tab="trends"]');await p.click('[data-action="speed"][data-speed="3"]');await p.clock.fastForward(20000);
  assert.equal(await p.evaluate(()=>inventoryGame.planningExpiresAt),deadline);await p.reload();await p.click('#inventory-start');await p.click('[data-action="resume-save"]');
  assert.equal(await p.evaluate(()=>inventoryGame.planningExpiresAt),deadline);
  await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  await p.clock.fastForward(80000);assert.equal(await p.evaluate(()=>inventoryGame.phase),'shift','hidden tabs expire on the original deadline');
  await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});
  assert.equal(await p.evaluate(()=>inventoryGame.learning.events.filter(e=>e.kind==='opening').length),1);await p.close();
  const race=await pageFor(true),before=await race.evaluate(()=>({cash:inventoryGame.cash,cart:JSON.stringify(inventoryGame.tutorial.cart),plan:JSON.stringify(inventoryGame.lesson.plan),deliveries:inventoryGame.deliveries.length}));
  await race.clock.fastForward(88000);await race.evaluate(()=>{window.oldOpen=document.querySelector('#cr-play');setTimeout(()=>oldOpen.click(),inventoryGame.planningTimeLeft()*1000);});
  await race.clock.fastForward(2500);await race.evaluate(()=>oldOpen.click());
  assert.equal(await race.evaluate(()=>inventoryGame.running),true);assert.equal(await race.evaluate(()=>inventoryGame.cash),before.cash-14);
  assert.equal(await race.evaluate(()=>JSON.stringify(inventoryGame.tutorial.cart)),before.cart);assert.equal(await race.evaluate(()=>JSON.stringify(inventoryGame.lesson.plan)),before.plan);assert.equal(await race.evaluate(()=>inventoryGame.deliveries.length),before.deliveries);
  // Real results -> reflection -> next-morning navigation gives another full allowance.
  await race.evaluate(()=>{inventoryGame.finish();inventoryGame.reflect(inventoryGame.reviewOptions().correct);});await race.clock.fastForward(600);await race.click('[data-action="next-day"]');
  await race.clock.fastForward(120000);assert.equal(await race.evaluate(()=>inventoryGame.planningTimeLeft()),90);await race.click('[data-action="briefing-done"]');assert.equal(await race.locator('#cr-planning-time').textContent(),'1:30');
  await race.clock.fastForward(90000);assert.equal(await race.evaluate(()=>inventoryGame.phase),'shift');assert.equal(await race.evaluate(()=>inventoryGame.day),2);assert.equal(await race.evaluate(()=>inventoryGame.lesson.plan.automatic),true);await race.close();
  const exit=await pageFor();await exit.clock.fastForward(20000);await exit.click('[data-action="exit"]');await exit.click('[data-action="save-home"]');
  await exit.clock.fastForward(120000);assert.equal(await exit.evaluate(()=>inventoryGame),null);await exit.click('#inventory-start');await exit.click('[data-action="resume-save"]');assert(Math.abs(await exit.evaluate(()=>inventoryGame.planningTimeLeft())-70)<1);
  await exit.click('[data-action="exit"]');await exit.click('[data-action="save-home"]');await exit.click('#inventory-start');await exit.click('[data-action="restart-confirm"]');await exit.click('[data-action="restart"]');await exit.click('[data-action="skip-tour-intro"]');await exit.click('[data-action="briefing-done"]');assert.equal(await exit.locator('#cr-planning-time').textContent(),'1:30');await exit.close();
  assert.deepEqual(errors,[]);console.log('PASS: first/later expiry, incomplete plans, untouched carts, dialogs/background/reload, early start, deadline race, duplicate prevention, exit/reset cleanup and responsive timer.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
