// Run with Playwright installed, or set PLAYWRIGHT_MODULE and CHROME_PATH.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const fs=require('node:fs');
const url=pathToFileURL(path.resolve(__dirname,'../dist/index.html')).href;
const saveKey='rise.cafe-rescue.five-day.v1';
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  const errors=[];
  async function pageFor(viewport={width:1280,height:900},ready=true){
    const page=await browser.newPage({viewport,reducedMotion:'reduce'});
    page.setDefaultTimeout(5000);page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>sessionStorage.setItem('rise.pre-survey.6Wcy1Vtr1EciL6f1A.seen','yes'));
    await page.clock.install();await page.goto(url);
    if(ready)await page.evaluate(key=>{
      const g=new InventorySim(42);g.briefed=true;g.introSeen=true;g.skipTutorial();
      INVENTORY_ITEMS.forEach(i=>g.discard(i.name));
      g.observe('supplier','quick');g.observe('supplier','budget');g.commitPlan({servings:6,supplier:'quick'});
      g.placeOrder([{name:'Cup',qty:1,supplier:'quick',frozen:false,express:false}]);
      g.advancePlanning();g.deliveries.forEach(d=>{g.shelve(d.id,true);d.notified=true;});
      for(const name of RESCUE.MENU.find(p=>p.id==='latte').recipe)g.addLot(name,6,.1,14);
      // An unfinished cart is deliberate: expiry must neither buy nor discard it.
      g.tutorial.cart=[{name:'Cup',qty:3,supplier:'quick',frozen:false,express:false}];
      localStorage.setItem(key,g.save());
    },saveKey);
    await page.click('#inventory-start');
    return page;
  }
  async function resume(page){await page.click('[data-action="resume-save"]');}
  async function left(page){return page.evaluate(()=>inventoryGame.planningTimeLeft());}
  async function noOverflow(page){
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page has no horizontal overflow');
    assert(await page.locator('#cr-planning').evaluate(n=>n.scrollWidth<=n.clientWidth+1),'timer content fits');
    assert(await page.locator('#cr-workspace').evaluate(n=>n.clientHeight>=150),'planning controls are not squeezed out on short screens');
    await page.locator('#cr-planning').scrollIntoViewIfNeeded();
    const box=await page.locator('#cr-planning').boundingBox();
    assert(box.y>=0&&box.y+box.height<=page.viewportSize().height+1,'timer is readable in the viewport');
  }
  async function snapshot(page,name){
    if(!process.env.PLANNING_SCREENSHOTS)return;
    fs.mkdirSync(process.env.PLANNING_SCREENSHOTS,{recursive:true});
    await page.screenshot({path:path.join(process.env.PLANNING_SCREENSHOTS,name+'.png'),fullPage:true,animations:'disabled'});
  }
  try {
    for(const viewport of [{width:1280,height:900},{width:375,height:812},{width:667,height:375}]){
      const page=await pageFor(viewport,false);
      await page.clock.fastForward(120000);
      assert.equal(await left(page),90,'introduction has no time limit');
      await page.click('[data-action="skip-tour-intro"]');
      await page.clock.fastForward(120000);
      assert.equal(await left(page),90,'first briefing has no time limit');
      await page.click('[data-action="briefing-done"]');
      assert.equal(await page.locator('#cr-planning-time').textContent(),'1:30');
      await noOverflow(page);await snapshot(page,'planning-'+viewport.width);
      await page.clock.fastForward(30000);
      let remaining=await left(page);assert(remaining>58&&remaining<=60);
      // Internal navigation, speed changes and repeated paints cannot renew time.
      for(const tab of ['supply','menu','trends','stock'])await page.click(`[data-action="tab"][data-tab="${tab}"]`);
      await page.click('[data-speed="3"]');
      assert(await left(page)<=remaining);
      await page.clock.fastForward(10000);remaining=await left(page);
      assert(remaining>46&&remaining<50,'3× still uses real seconds');
      await page.click('[data-action="help"]');const paused=await left(page);
      await page.clock.fastForward(120000);assert.equal(await left(page),paused,'dialogs preserve remaining time');
      await page.locator('#cr-modal [data-action="close"]').click();
      // Exercise the actual visibility handler without relying on headless tab focus.
      await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
      const hidden=await left(page);await page.clock.fastForward(120000);
      assert.equal(await left(page),hidden,'hidden tab intentionally pauses without resetting');
      await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
      await page.clock.fastForward(60000);
      assert.equal(await left(page),0);assert.equal(await page.locator('#cr-planning-time').textContent(),'0:00');
      assert.equal(await page.evaluate(()=>inventoryGame.phase),'planning');
      assert.match(await page.locator('#cr-planning-note').innerText(),/expired stock/);
      assert.equal(await page.evaluate(()=>inventoryGame.cash),-500,'expiry cannot buy supplies');
      await noOverflow(page);await snapshot(page,'expired-'+viewport.width);
      // Expired state survives a reload; it does not grant a fresh allowance.
      await page.reload();await page.click('#inventory-start');await resume(page);
      assert.equal(await left(page),0);
      await page.click('[data-action="exit"]');await page.click('[data-action="exit-now"]');
      await page.clock.fastForward(120000);
      assert.equal(await page.evaluate(()=>inventoryGame),null,'exiting removes the active campaign');
      await page.click('#inventory-start');await resume(page);assert.equal(await left(page),0);
      await page.close();
    }

    const page=await pageFor();
    await page.clock.fastForward(120000);assert.equal(await left(page),90,'resume dialog is paused');
    await resume(page);
    const before=await page.evaluate(()=>({cash:inventoryGame.cash,orders:inventoryGame.deliveries.length,cart:inventoryGame.tutorial.cart,plan:inventoryGame.lesson.plan}));
    await page.clock.fastForward(88000);assert.equal(await page.evaluate(()=>inventoryGame.phase),'planning');
    // Queue an early-start click for the same deadline as the automatic callback.
    await page.evaluate(()=>{
      const button=document.querySelector('#cr-play');window.oldOpenButton=button;
      setTimeout(()=>button.click(),inventoryGame.planningTimeLeft()*1000);
    });
    await page.clock.fastForward(2500);
    assert.equal(await page.evaluate(()=>inventoryGame.phase),'shift');
    assert.equal(await page.evaluate(()=>inventoryGame.running),true,'queued Open click cannot toggle Pause');
    assert.equal(await page.evaluate(()=>inventoryGame.cash),before.cash-14,'opening costs charged once');
    assert.equal(await page.evaluate(()=>inventoryGame.deliveries.length),before.orders,'unfinished cart was not purchased');
    assert.deepEqual(await page.evaluate(()=>inventoryGame.tutorial.cart),before.cart);
    assert.deepEqual(await page.evaluate(()=>inventoryGame.lesson.plan),before.plan);
    assert(await page.locator('#cr-planning').isHidden());
    await page.evaluate(()=>oldOpenButton.click());
    assert.equal(await page.evaluate(()=>inventoryGame.running),true);

    // Go through the real results/reflection/next-morning navigation.
    await page.evaluate(()=>{inventoryGame.finish();inventoryGame.reflect(inventoryGame.reviewOptions().correct);});
    await page.clock.fastForward(1000);await page.click('[data-action="next-day"]');
    await page.clock.fastForward(120000);assert.equal(await left(page),90,'later briefing waits for planning controls');
    await page.click('[data-action="briefing-done"]');
    assert.equal(await page.locator('#cr-planning-time').textContent(),'1:30');
    await page.clock.fastForward(20000);
    const retained=await left(page);await page.reload();await page.click('#inventory-start');
    assert(Math.abs(await left(page)-retained)<1,'reload retains partial allowance');
    await resume(page);await page.clock.fastForward(80000);
    assert.equal(await page.evaluate(()=>inventoryGame.day),2);assert.equal(await left(page),0);
    assert.match(await page.locator('#cr-planning-note').textContent(),/operations plan/);
    await page.click('[data-action="operations-plan"]');
    const draftCash=await page.evaluate(()=>inventoryGame.cash);
    await page.clock.fastForward(120000);
    assert.equal(await page.evaluate(()=>inventoryGame.lesson.plan),null,'draft is not submitted at zero');
    assert.equal(await page.evaluate(()=>inventoryGame.cash),draftCash);
    await page.locator('#cr-modal [data-action="close"]').click();
    // Supply the actual prerequisites; the expired countdown starts without another click.
    await page.evaluate(()=>{
      const g=inventoryGame;g.observe('tab','trends');g.commitPlan({servings:6,buffer:2,reorder:2});
      for(const name of RESCUE.MENU.find(p=>p.id==='oat').recipe)g.addLot(name,4,.1,14);
    });
    await page.clock.fastForward(600);
    assert.equal(await page.evaluate(()=>inventoryGame.phase),'shift','resolved requirements trigger automatic start');
    assert.equal(await page.evaluate(()=>inventoryGame.cash),draftCash-14);
    await page.close();

    const early=await pageFor();await resume(early);
    const earlyCash=await early.evaluate(()=>inventoryGame.cash);
    await early.clock.fastForward(10000);await early.click('#cr-play');
    assert.equal(await early.evaluate(()=>inventoryGame.phase),'shift');
    assert.equal(await early.evaluate(()=>inventoryGame.cash),earlyCash-14);
    await early.click('#cr-play'); // Existing shift Pause still works.
    assert.equal(await early.evaluate(()=>inventoryGame.running),false);
    await early.clock.fastForward(120000);
    assert.equal(await early.evaluate(()=>inventoryGame.running),false,'old planning timeout is cleared');
    await early.click('[data-action="exit"]');await early.click('[data-action="exit-now"]');
    await early.click('#inventory-start');await early.click('[data-action="restart-confirm"]');
    await early.click('[data-action="restart"]');
    await early.clock.fastForward(120000);assert.equal(await left(early),90,'reset clears the old timer');
    await early.click('[data-action="skip-tour-intro"]');await early.click('[data-action="briefing-done"]');
    assert.equal(await early.locator('#cr-planning-time').textContent(),'1:30');
    await early.close();
    assert.deepEqual(errors,[]);
    console.log('PASS: first/later planning, automatic and early opening, same-deadline race, blockers, unsent selections, pause/reload/exit/reset, speed/navigation and desktop/mobile layouts.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
