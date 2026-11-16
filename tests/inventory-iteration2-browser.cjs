// Run with Playwright installed, or PLAYWRIGHT_PATH set to its package path.
// RISE_OFFLINE_CONTENT=1 is a local fallback only: it uses in-memory storage;
// CI uses real navigation, browser storage and reloads.
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const root=path.resolve(__dirname,'..'),key='rise.cafe-rescue.five-day.v1';
const offline=process.env.RISE_OFFLINE_CONTENT==='1';
(async()=>{
  const browser=await chromium.launch(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE,headless:true}:{channel:'chrome',headless:true});
  try{
    for(const mobile of [false,true]){
      const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
      const page=await context.newPage(),errors=[];page.setDefaultTimeout(8000);
      page.on('pageerror',e=>errors.push(e.message));
      await page.route('**/*',async route=>{
        if(!route.request().url().startsWith('http://rise.test/'))return route.abort();
        let name=decodeURIComponent(new URL(route.request().url()).pathname);if(name.endsWith('/'))name+='index.html';
        const file=path.resolve(root,'.'+name);
        return route.fulfill(file.startsWith(root+path.sep)&&fs.existsSync(file)?{path:file}:{status:404,body:''});
      });
      async function load(){
        if(offline){
          await page.evaluate(()=>{const store=new Map();Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)}});});
          await page.setContent(fs.readFileSync(path.join(root,'dist/index.html'),'utf8').replace('<head>','<head><base href="http://rise.test/dist/">'),{waitUntil:'domcontentloaded'});
        }else await page.goto('http://rise.test/dist/');
        await page.locator('#inventory-start').waitFor();
      }
      const click=a=>page.locator(`#cr-modal [data-action="${a}"]`).click();
      const tab=id=>page.locator(`.cr-nav [data-tab="${id}"]`).click();
      async function shot(name){if(process.env.SCREENSHOT_DIR){fs.mkdirSync(process.env.SCREENSHOT_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOT_DIR,`${name}-${mobile?'mobile':'desktop'}.png`),animations:'disabled'});}}
      async function verifyTarget(){
        await page.locator('.cr-tour-target').waitFor();await page.waitForTimeout(240);
        assert.equal(await page.locator('.cr-tour-target').count(),1,'one precise tutorial target');
        const data=await page.locator('.cr-tour-target').evaluate(el=>{
          const r=el.getBoundingClientRect(),center={x:r.x+r.width/2,y:r.y+r.height/2},top=document.elementFromPoint(center.x,center.y);
          const mask=document.querySelector('#cr-tour-mask rect[fill="black"]');
          return {action:el.dataset.action,disabled:el.disabled,clickable:el===top||el.contains(top),visible:r.top>=0&&r.left>=0&&r.bottom<=innerHeight+1&&r.right<=innerWidth+1,pointer:getComputedStyle(document.querySelector('#cr-tour-spotlight')).pointerEvents,maskX:Number(mask?.getAttribute('x')),maskY:Number(mask?.getAttribute('y')),left:r.left,top:r.top};
        });
        assert(!data.disabled&&data.visible&&data.clickable,`highlighted button must remain usable: ${JSON.stringify(data)}`);
        assert.equal(data.pointer,'none');assert(Math.abs(data.maskX-Math.max(0,data.left-6))<2&&Math.abs(data.maskY-Math.max(0,data.top-6))<2,'spotlight follows actual button after layout changes '+JSON.stringify(data));
        return data.action;
      }
      await load();await page.locator('#inventory-start').click();
      await page.evaluate(()=>{inventoryGame.seed=42;inventoryGame.sound=false;});
      await click('intro-next');await click('intro-done');await click('tour-begin');
      let wrongStorage=false,wrongFIFO=false,restockChecked=false,steps=0;
      for(;steps<65;steps++){
        const state=await page.evaluate(()=>({step:inventoryGame.tutorialStep(),dialog:document.querySelector('[data-dialog]')?.dataset.dialog}));
        if(state.dialog==='tutorial-complete')break;
        if(state.step==='ready'&&!restockChecked){
          await page.evaluate(()=>{for(const lot of [...inventoryGame.lots['Whole Milk']])inventoryGame.discard('Whole Milk',lot.id);});
          await page.waitForTimeout(650);assert.equal(await page.evaluate(()=>inventoryGame.tutorialStep()),'restock');restockChecked=true;
        }
        const action=await verifyTarget();
        if(steps===0)await shot('tutorial');
        if(state.dialog==='unpack'&&!wrongStorage){
          const good=await page.locator('.cr-tour-target').getAttribute('data-storage'),bad=good==='cold'?'dry':'cold';
          const before=await page.evaluate(()=>({cash:inventoryGame.cash,step:inventoryGame.tutorialStep(),stock:inventoryGame.inventoryValue()}));
          await page.locator(`[data-storage="${bad}"]`).click();
          assert.deepEqual(await page.evaluate(()=>({cash:inventoryGame.cash,step:inventoryGame.tutorialStep(),stock:inventoryGame.inventoryValue()})),before,'wrong storage does not advance or charge');
          assert(await page.locator('#cr-dialog-error').textContent());wrongStorage=true;await verifyTarget();await shot('tutorial-unpack');
        }
        if(state.dialog==='fifo'&&!wrongFIFO){
          await click('fifo-new');assert.equal(await page.evaluate(()=>inventoryGame.tutorialStep()),'delivery');
          assert(await page.locator('#cr-dialog-error').textContent());wrongFIFO=true;await verifyTarget();
        }
        await page.locator('.cr-tour-target').click();
        if(process.env.DEBUG_TOUR)console.log({mobile,step:state.step,dialog:state.dialog,action});
      }
      assert(steps<65&&wrongStorage&&wrongFIFO,'complete the existing tutorial via real controls');
      assert.equal(await page.locator('#cr-tour-spotlight').count(),0,'spotlight removed after completion');
      assert.equal(await page.evaluate(()=>inventoryGame.deliveries.length),2,'one initial order and one deliberate repair order, no duplicate purchases');
      assert(await page.evaluate(()=>inventoryGame.deliveries[0].notified),'manual teaching delivery acknowledged');
      const announcement=await page.locator('#cr-delivery-announcement').textContent();
      await page.waitForTimeout(1200);assert.equal(await page.locator('#cr-delivery-announcement').textContent(),announcement,'no duplicate routine announcement after manual delivery');
      await click('begin-day');
      await click('save-plan');
      await page.locator('#cr-play').click();
      assert.equal(await page.evaluate(()=>inventoryGame.phase),'shift');
      // Advance the actual simulator clock, choosing its existing story event in the UI.
      async function finishRound(){
        for(let i=0;i<6;i++){
          await page.evaluate(()=>{inventoryGame.running=true;inventoryGame.tick(75);});
          await page.waitForTimeout(650);
          const dialog=await page.locator('[data-dialog]').getAttribute('data-dialog');
          if(dialog==='event'){
            await shot('event');
            await page.locator('#cr-modal [data-action="event-choice"]').last().click();
          }else if(dialog==='report')return;
        }
        throw Error('round did not reach its existing report');
      }
      await finishRound();
      assert.equal(await page.evaluate(()=>inventoryGame.elapsed),75,'round length unchanged');
      await click('engineer-review');
      const answer=await page.evaluate(()=>inventoryGame.reviewOptions().correct);
      await page.locator(`[data-action="answer-reflection"][data-answer="${answer}"]`).click();await click('next-day');await click('briefing-done');
      assert.equal(await page.evaluate(()=>inventoryGame.day),2);
      await tab('trends');
      // Help retains access to the required plan on narrow screens where the sidebar is hidden.
      await page.locator('[data-action="help"]').click();await click('operations-plan');await click('save-plan');
      await page.locator('[data-action="review-cart"]').click();await click('place-order');
      await page.locator('#cr-dock').click();
      if(await page.locator('#cr-modal [data-action="advance"]').count())await click('advance');else await click('close');
      await page.waitForTimeout(700);
      // Problems remain visible; do not bypass the original receipt path.
      for(let i=0;i<8&&await page.locator('#cr-modal').count();i++){
        for(const action of ['unpack','fifo-old','close'])if(await page.locator(`#cr-modal [data-action="${action}"]`).count()){await click(action);break;}
        if(await page.locator('#cr-modal [data-action="store-bundle"]').count()){
          const group=await page.locator('[data-bundle]').getAttribute('data-bundle');await page.locator(`[data-storage="${group}"]`).click();
        }
      }
      await page.locator('#cr-play').click();
      assert.equal(await page.evaluate(()=>inventoryGame.phase),'shift',await page.locator('body').innerText());
      await finishRound();assert.equal(await page.evaluate(()=>inventoryGame.reports.length),2);
      await page.keyboard.press('Escape');await tab('trends');
      assert(await page.locator('.cr-event-summary').isVisible(),'actual chosen event remains visible');
      assert(await page.locator('.cr-profit-help').isVisible(),'profit explanation is easy to find');
      assert(await page.locator('.cr-trend-layout').evaluate(el=>{
const box=el.getBoundingClientRect();return [...el.querySelectorAll('p,button,.cr-compare')].every(n=>n.getBoundingClientRect().bottom<=box.bottom+1);
      }),'all trend details fit their cards; the existing workspace scrolls instead of overlapping');
      await page.locator('.cr-chart-card [data-action="performance"]').click();await click('close');
      await shot('trends');
      // Restore a planning fixture to exercise rotation and navigation without changing campaign mechanics.
      await page.evaluate(k=>{
        roles();const g=new InventorySim(42);g.skipTutorial();g.introSeen=true;g.briefed=true;g.sound=false;
        INVENTORY_ITEMS.forEach(i=>g.discard(i.name));g.addLot('Whole Milk',4,.4,5);g.addLot('Whole Milk',3,.7,1);
        localStorage.setItem(k,g.save());roles();
      },key);
      await page.locator('#inventory-continue').click();await click('resume-save');await tab('stock');
      await page.locator('[data-category="milk"]').click();await page.locator('[data-action="inspect"][data-product="Whole Milk"]').click();
      const facts=await page.evaluate(()=>inventoryGame.lots['Whole Milk'].map(({rotationOrder,...l})=>l));
      await click('rotate');
      assert.match(await page.locator('.cr-lots').innerText(),/Used next/);
      assert.equal(await page.evaluate(()=>inventoryGame.lots['Whole Milk'][0].cost),.7);
      assert.deepEqual(await page.evaluate(()=>inventoryGame.lots['Whole Milk'].map(({rotationOrder,...l})=>l).sort((a,b)=>a.id-b.id)),facts,'rotation changes order only');
      await shot('rotation');await click('close');
      for(const id of ['supply','menu','trends','stock']){await tab(id);assert.equal(await page.locator(`.cr-nav [data-tab="${id}"]`).getAttribute('aria-current'),'page');}
      for(const category of ['rescue','coffee','milk','syrup','topping','bakery','supplies'])await page.locator(`[data-category="${category}"]`).click();
      await tab('supply');await page.locator('.cr-extra-tools summary').click();await page.locator('[data-action="qty-up"]').click();
      assert(await page.locator('.cr-extra-tools').evaluate(el=>el.open),'optional tools stay open across redraw');
      await page.locator('[data-action="assistant-offer"]').click();assert.equal(await page.locator('[data-dialog]').getAttribute('data-dialog'),'assistant-offer');await click('close');
      await page.locator('#cr-live-stats [data-action="performance"]').click();assert.match(await page.locator('.cr-dialog').innerText(),/Buying stock/i);await click('close');
      // Group simultaneous routine arrivals, acknowledge once, preserve the acknowledgement in storage.
      await page.evaluate(()=>{
        const g=inventoryGame;g.learning.events.push({kind:'fifo',day:g.day});
        g.placeOrder([{name:'Cup',qty:2,supplier:'quick'},{name:'Lid',qty:2,supplier:'premium'}]);g.advancePlanning();g.advancePlanning();
      });
      await page.waitForFunction(()=>document.querySelector('#cr-dock')?.classList.contains('cr-delivery-new'));
      assert(await page.locator('#cr-dock').evaluate(el=>el.classList.contains('cr-delivery-new')));
      const ids=await page.locator('#cr-delivery-announcement').getAttribute('data-deliveries');assert.equal(ids.split(',').length,2);
      assert(await page.evaluate(k=>JSON.parse(localStorage.getItem(k)).state.deliveries.every(d=>d.notified),key));
      await page.waitForTimeout(650);assert.equal(await page.locator('#cr-delivery-announcement').getAttribute('data-deliveries'),ids);
      await shot('delivery');
      if(!offline){
        await page.reload();await page.locator('#inventory-continue').click();await click('resume-save');
        await page.waitForTimeout(650);assert.equal(await page.locator('#cr-delivery-announcement').textContent(),'','no repeated arrival after real reload');
      }
      // Actual recorded non-stock reasons, and no invented explanation for legacy orders.
      for(const reason of ['price','menu','capacity']){
        await page.evaluate(reason=>{
          const g=inventoryGame;g.phase='shift';g.running=false;g.alerts.losses=[];g.orders=[];
          if(reason==='capacity')for(const name of RESCUE.MENU[0].recipe)g.addLot(name,2,.2,7);
          const order={id:++g.serial,name:'Test',products:['latte'],price:6,status:'waiting',arrival:g.clock};g.orders.push(order);g.metrics.arrived++;
          g.lose(order,reason==='capacity'?'stock':reason);
        },reason);
        await page.waitForTimeout(650);assert(await page.locator('#cr-feedback [data-action="dismiss-reason"]').isVisible(),reason+' explanation');
        await page.locator('[data-action="dismiss-reason"]').click();
        assert.equal(await page.locator('[data-action="dismiss-reason"]').count(),0);
      }
      await page.evaluate(()=>{inventoryGame.orders.forEach(o=>{delete o.lossReason;delete o.lossRead;});});
      await page.waitForTimeout(650);assert.equal(await page.locator('[data-action="dismiss-reason"]').count(),0);
      await page.locator('#cr-home').click();await click('save-home');
      assert.equal(await page.locator('#cr-tour-spotlight').count(),0);assert.equal(await page.locator('.cr-tour-target').count(),0);
      assert.equal(await page.locator('.role-choice').count(),3,'all mode cards preserved');assert.deepEqual(errors,[]);
      console.log(`PASS: ${mobile?'mobile':'desktop'} tutorial, incorrect-action guards, two rounds, tabs/tools, rotation, profit, actual loss reasons, event summary, delivery deduplication and cleanup${offline?' (offline DOM; storage is mocked)':''}.`);
      await context.close();
    }
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
