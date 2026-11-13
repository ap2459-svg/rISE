// Run: node tests/save-home.cjs (serves the checked-out files through browser routing).
// Requires Playwright (or set PLAYWRIGHT_PATH to its installed package).
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const path=require('node:path'),fs=require('node:fs');
const url=process.env.RISE_TEST_URL||'http://rise.test/dist/';
const key='rise.cafe-rescue.five-day.v1';
(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  try {
    for(const mobile of [false,true]){
      const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
      const page=await context.newPage(),errors=[];
      if(!process.env.RISE_TEST_URL)await page.route('http://rise.test/**',async route=>{
        let name=decodeURIComponent(new URL(route.request().url()).pathname);
        if(name.endsWith('/'))name+='index.html';
        const root=path.resolve(__dirname,'..'),file=path.resolve(root,'.'+name);
        if(!file.startsWith(root+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:''});
        await route.fulfill({path:file,contentType:{'.js':'text/javascript','.html':'text/html','.css':'text/css','.png':'image/png'}[path.extname(file)]||'application/octet-stream'});
      });
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(url);
      const click=a=>page.locator(`#cr-modal [data-action="${a}"]`).click();
      async function fixture(phase){
        await page.evaluate(({key,phase})=>{
          roles();
          const g=new InventorySim(42);g.skipTutorial();g.introSeen=true;g.briefed=true;
          g.phase=phase;g.elapsed=phase==='shift'?23.5:0;g.clock=31.25;g.running=false;
          g.lesson.draft={servings:17,supplier:'budget'};
          g.tutorial.cart=[{name:'Cup',qty:4,supplier:'quick',frozen:false,express:false}];
          g.tutorial.recipeTargets={latte:17};g.tutorial.selectedSupplier='quick';
          localStorage.setItem(key,g.save());
        },{key,phase});
        await page.reload();await page.locator('#inventory-continue').click();await click('resume-save');
      }
      for(const phase of ['planning','shift']){
        await fixture(phase);
        for(const running of phase==='shift'?[false,true]:[false]){
          await page.evaluate(r=>inventoryGame.running=r,running);
          await page.locator('#cr-home').click();
          const snapshot=await page.evaluate(()=>JSON.parse(inventoryGame.save()).state);
          await page.waitForTimeout(250);
          assert.equal(await page.evaluate(()=>inventoryGame.clock),snapshot.clock,'dialog freezes logistics and shift');
          await click('close');
          assert.equal(await page.evaluate(()=>inventoryGame.running),running,'cancel preserves pause state '+JSON.stringify(await page.evaluate(()=>({phase:inventoryGame.phase,event:inventoryGame.pendingEvent,hidden:document.hidden,dialog:document.querySelector('[data-dialog]')?.dataset.dialog}))));
          await page.locator('#cr-home').click();await page.keyboard.press('Escape');
          assert.equal(await page.evaluate(()=>inventoryGame.running),running,'Escape preserves pause state');
          await page.locator('#cr-home').click();
          await page.locator('#cr-modal').click({position:{x:2,y:2}});
          assert.equal(await page.evaluate(()=>inventoryGame.running),running,'backdrop dismissal preserves pause state');
        }
        await page.locator('#cr-home').click();
        assert.equal(await page.locator('#cr-dialog-title').textContent(),'Return to homepage?');
        assert.equal(await page.locator('#cr-exit-message').textContent(),'Your progress will be saved so you can continue later.');
        await page.keyboard.press('Shift+Tab');
        assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'save-home','focus wraps backward');
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'close','focus wraps forward');
        const bounds=await page.locator('.cr-dialog').boundingBox();
        assert(bounds.x>=0&&bounds.x+bounds.width<= (mobile?390:1440),'dialog fits viewport');
        if(process.env.SCREENSHOT_DIR)await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,`save-home-${mobile?'mobile':'desktop'}.png`),animations:'disabled'});
        // Throwing and silently dropped writes both keep the paused game and offer retry.
        for(const failure of ['throw','drop']){
          await page.evaluate(f=>{
            window.realSetItem ||= Storage.prototype.setItem;
            Storage.prototype.setItem=function(){if(f==='throw')throw Error('Quota exceeded');};
            inventoryGame.cash+=.01; // Ensure a dropped write cannot match an older snapshot.
          },failure);
          await click('save-home');
          assert(await page.locator('#cr-dialog-error').textContent());
          assert.equal(await page.locator('#inventory-continue').count(),0);
          assert.equal(await page.evaluate(()=>inventoryGame.running),false);
        }
        await page.evaluate(()=>{
          window.saveWrites=0;Storage.prototype.setItem=function(...args){saveWrites++;return realSetItem.apply(this,args);};
        });
        await page.evaluate(()=>{
          const button=document.querySelector('[data-action="save-home"]');button.click();button.click();button.click();
        });
        assert.equal(await page.evaluate(()=>saveWrites),1,'repeated clicks save exactly once');
        assert.equal(await page.locator('#inventory-continue').count(),1);
        const saved=await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).state,key);
        assert.deepEqual(saved.tutorial.cart,[{name:'Cup',qty:4,supplier:'quick',frozen:false,express:false}]);
        assert.deepEqual(saved.tutorial.recipeTargets,{latte:17});
        await page.waitForTimeout(250);await page.reload();
        await page.locator('#inventory-continue').click();
        const restored=await page.evaluate(()=>JSON.parse(inventoryGame.save()).state);
        assert.deepEqual(restored,saved,'homepage time and reload preserve the entire engine state');
        await click('resume-save');
        assert.equal(await page.evaluate(()=>inventoryGame.phase),phase);
        assert.equal(await page.evaluate(()=>inventoryGame.day),saved.day);
        assert.deepEqual(await page.evaluate(()=>inventoryGame.lesson.draft),saved.learning.days[saved.day-1]?.draft||saved.learning.days[saved.day]?.draft);
        if(phase==='shift')assert.equal(await page.evaluate(()=>inventoryGame.running),true);
        await page.locator('#cr-home').click();await click('save-home');
        await page.locator('#inventory-start').click();
        assert.equal(await page.locator('[data-dialog="restart"]').count(),1,'New game explicitly confirms replacing a save');
        await click('resume-save');
        assert.equal(await page.evaluate(()=>inventoryGame.day),saved.day);
        if(phase==='shift'){
          await page.evaluate(()=>{inventoryGame.running=false;});
          await page.locator('#cr-home').click();await click('save-home');await page.reload();
          await page.locator('#inventory-continue').click();await click('resume-save');
          assert.equal(await page.evaluate(()=>inventoryGame.running),false,'saved paused shift remains paused after Continue');
        }
      }
      await page.evaluate(k=>{roles();localStorage.setItem(k,'invalid save');},key);
      await page.reload();assert.equal(await page.locator('#inventory-continue').count(),0,'invalid save is not offered');
      assert.deepEqual(errors,[]);
      await context.close();
    }
    console.log('PASS: desktop/mobile cancel, Escape, pause, focus, preparation/shift save, failures/retry, repeated clicks, homepage reload, full-state resume, and separate New game.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
