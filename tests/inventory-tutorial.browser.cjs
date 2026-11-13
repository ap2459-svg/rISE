// Run with Playwright installed, or set PLAYWRIGHT_MODULE and CHROME_PATH.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const url=pathToFileURL(path.resolve(__dirname,'../dist/index.html')).href;
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try {
    for(const viewport of [{width:1280,height:900},{width:375,height:812},{width:667,height:375}]) {
      const page=await browser.newPage({viewport}),errors=[];
      page.setDefaultTimeout(5000);page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>sessionStorage.setItem('rise.pre-survey.6Wcy1Vtr1EciL6f1A.seen','yes'));
      await page.goto(url);await page.click('#inventory-start');
      assert.match(await page.locator('#cr-modal').innerText(),/five days/);
      await page.click('[data-action="intro-done"]');
      const visited=new Set();let resumed=false,detoured=false;
      for(let n=0;n<85;n++) {
        const step=await page.evaluate(()=>inventoryGame.tutorialStep());visited.add(step);
        if(step==='ready')break;
        if(step==='suppliers'&&!resumed) {
          await page.reload();await page.click('#inventory-start');await page.click('[data-action="resume-save"]');resumed=true;
        }
        if(step==='recipe'&&!detoured) {
          await page.click('[data-action="tab"][data-tab="trends"]');
          await page.click('[data-action="tour-locate"]');detoured=true;
        }
        const root=await page.locator('#cr-modal').count()?page.locator('#cr-modal'):page.locator('.cr-game');
        const targets=root.locator('.cr-tour-target');
        let clicked=false;
        for(let i=0;i<await targets.count();i++) {
          const target=targets.nth(i);
          if(await target.isVisible()&&await target.isEnabled()) {await target.click();clicked=true;break;}
        }
        if(!clicked) {
          if(await page.locator('#cr-modal').count())await page.locator('#cr-modal [data-action="close"]').click();
          await page.click('[data-action="tour-locate"]');
        }
      }
      assert.equal(await page.evaluate(()=>inventoryGame.tutorialStep()),'ready','guided actions reach completion');
      assert(visited.has('cart'));assert(visited.has('plan'));assert(visited.has('delivery'));
      assert(await page.evaluate(()=>inventoryGame.servings('latte')>0));
      assert.equal(await page.evaluate(()=>inventoryGame.planProblem()),null);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal overflow');
      await page.screenshot({path:path.resolve(__dirname,`.rescue-tutorial-${viewport.width}.png`),fullPage:true});
      await page.click('[data-action="finish-tour"]');await page.click('[data-action="begin-day"]');
      assert.equal(await page.evaluate(()=>inventoryGame.phase),'shift');
      await page.click('[data-action="help"]');
      const snapshot=await page.evaluate(()=>JSON.stringify({cash:inventoryGame.cash,lots:inventoryGame.lots,cart:inventoryGame.tutorial.cart,day:inventoryGame.day}));
      await page.click('[data-action="replay-tutorial"]');
      assert(await page.locator('[data-action="replay-page"][data-page="-1"]').isDisabled());
      await page.click('[data-action="replay-page"][data-page="1"]');await page.click('[data-action="replay-page"][data-page="0"]');
      for(let i=1;i<7;i++)await page.click(`[data-action="replay-page"][data-page="${i}"]`);
      assert.equal(await page.evaluate(()=>JSON.stringify({cash:inventoryGame.cash,lots:inventoryGame.lots,cart:inventoryGame.tutorial.cart,day:inventoryGame.day})),snapshot,'replay preserves campaign');
      await page.getByRole('button',{name:'Finish replay',exact:true}).click();
      assert.equal(await page.evaluate(()=>inventoryGame.running),true,'replay restores running shift');
      assert.deepEqual(errors,[]);
      await page.close();
    }
    // Skip directly from the introduction, then replay without restarting.
    const page=await browser.newPage();
    await page.addInitScript(()=>sessionStorage.setItem('rise.pre-survey.6Wcy1Vtr1EciL6f1A.seen','yes'));
    await page.goto(url);await page.click('#inventory-start');await page.click('[data-action="skip-tour-intro"]');
    await page.click('[data-action="briefing-done"]');
    assert.equal(await page.evaluate(()=>inventoryGame.tutorialStep()),null);
    assert.equal(await page.evaluate(()=>inventoryGame.cash),-500);
    await page.click('[data-action="help"]');await page.click('[data-action="replay-tutorial"]');
    await page.getByRole('button',{name:'Close replay',exact:true}).click();
    assert.equal(await page.evaluate(()=>inventoryGame.tutorial.skipped),true);
    await page.evaluate(()=>localStorage.removeItem('rise.cafe-rescue.five-day.v1'));
    await page.reload();await page.click('#inventory-start');await page.click('[data-action="intro-done"]');
    await page.click('[data-action="tab"][data-tab="stock"]');
    await page.click('[data-action="inspect"][data-product="Whole Milk"]');
    await page.locator('#cr-modal [data-action="skip-guide"]').click();
    assert.equal(await page.evaluate(()=>inventoryGame.tutorialStep()),null,'skip works inside a guided dialog');
    assert.equal(await page.evaluate(()=>inventoryGame.cash),-500);
    console.log('PASS: complete tutorial, navigation recovery, reload/resume, real ordering/storage/opening, skip and non-destructive replay on desktop and mobile.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
