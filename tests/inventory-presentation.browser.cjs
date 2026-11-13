// PLAYWRIGHT_MODULE / CHROME_PATH are optional; SCREENSHOTS writes review images.
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path'),fs=require('node:fs');
const url=pathToFileURL(path.resolve(__dirname,'../dist/index.html')).href;
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  const errors=[];
  async function shot(page,name){if(process.env.SCREENSHOTS){fs.mkdirSync(process.env.SCREENSHOTS,{recursive:true});await page.screenshot({path:path.join(process.env.SCREENSHOTS,name+'.png'),fullPage:true,animations:'disabled'});}}
  async function paint(page){await page.clock.fastForward(600);}
  try{
    for(const viewport of [{width:1366,height:768},{width:1280,height:720},{width:375,height:812},{width:667,height:375}]){
      const page=await browser.newPage({viewport,reducedMotion:'reduce'});page.setDefaultTimeout(5000);
      page.on('pageerror',e=>errors.push(e.message));
      await page.addInitScript(()=>sessionStorage.setItem('rise.pre-survey.6Wcy1Vtr1EciL6f1A.seen','yes'));
      await page.clock.install();await page.goto(url);await page.click('#inventory-start');
      await page.click('[data-action="skip-tour-intro"]');await page.click('[data-action="briefing-done"]');
      assert.equal(await page.locator('.cr-service-view .cr-customer-art').count(),0,'preparation does not invent customers');
      assert.match(await page.locator('.cr-service-view').innerText(),/Preparing to open/);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'no horizontal page overflow');
      for(const category of ['rescue','milk','supplies','coffee']){
        await page.click(`[data-category="${category}"]`);
        assert(await page.locator('.cr-stock-item').count()>0);
        assert(await page.locator('.cr-stock-item').evaluateAll(nodes=>nodes.every(n=>n.scrollWidth<=n.clientWidth+2)),'stock labels fit their buttons');
      }
      await page.click('[data-category="milk"]');await shot(page,'chilled-'+viewport.width);
      const inspect=page.locator('[data-action="inspect"][data-product="Whole Milk"]');
      await inspect.focus();await page.keyboard.press('Enter');
      assert(await page.getByRole('dialog').isVisible(),'stock is keyboard accessible');
      await shot(page,'inspect-'+viewport.width);await page.locator('#cr-modal [data-action="close"]').click();
      await page.click('[data-category="rescue"]');await shot(page,'planning-'+viewport.width);

      // Fixture preparation uses the same plan, order, delivery and FIFO methods as play.
      await page.evaluate(()=>{
        const g=inventoryGame;INVENTORY_ITEMS.forEach(i=>g.discard(i.name));
        g.observe('supplier','quick');g.observe('supplier','budget');g.commitPlan({servings:8,supplier:'quick'});
        g.placeOrder([{name:'Cup',qty:1,supplier:'quick',frozen:false,express:false}]);g.advancePlanning();
        g.deliveries.forEach(d=>{g.shelve(d.id,true);d.notified=true;});
        for(const name of RESCUE.MENU.find(p=>p.id==='latte').recipe)g.addLot(name,20,.1,14);
        g.menu.cookie.enabled=false;
      });
      await page.click('#cr-play');await page.click('#cr-play'); // Open, then pause to examine actual simulation events.
      await page.evaluate(()=>{
        const g=inventoryGame;g.seed=42;for(let i=0;i<10&&g.reactions[0]?.emotion!=='happy';i++){
          g.customer();g.processCustomers();g.clock+=RESCUE.CONFIG.serviceSeconds;g.processCustomers();
        }
      });
      await paint(page);
      assert.equal(await page.evaluate(()=>inventoryGame.reactions[0].emotion),'happy');
      assert(await page.locator('.cr-service-view .cr-reaction--happy').count());
      assert.match(await page.locator('.cr-service-view').innerText(),/Satisfied customer/);
      assert(await page.evaluate(()=>document.querySelector('.cr-service-view').textContent.includes(inventoryGame.reactions[0].text)),'bubble uses the actual reaction');
      await page.clock.fastForward(5000); // Let the opening toast yield to the normal feedback bubble.
      assert(await page.locator('#cr-feedback .cr-reaction--happy').count());
      const happyIds=await page.locator('.cr-game [id]').evaluateAll(nodes=>nodes.map(n=>n.id));assert.equal(new Set(happyIds).size,happyIds.length,'window and feedback portraits do not share SVG IDs');
      await shot(page,'happy-'+viewport.width);
      await page.evaluate(()=>{
        const g=inventoryGame;g.seed=256;g.customer(); // Seeded real price rejection at the existing price.
      });
      await paint(page);
      assert.match(await page.locator('.cr-service-view').innerText(),/Too expensive for me today/);
      assert(await page.locator('.cr-service-view .cr-reaction--disappointed').count());
      assert.equal(await page.locator('.cr-service-view .face-change').evaluate(n=>getComputedStyle(n).display),'block');
      await shot(page,'disappointed-'+viewport.width);
      await page.evaluate(()=>{
        const g=inventoryGame;g.seed=42;for(const lot of [...g.lots['Whole Milk']])g.discard('Whole Milk',lot.id);
        g.customer();g.processCustomers();g.clock+=RESCUE.CONFIG.patience;g.processCustomers();
      });
      await paint(page);
      assert.match(await page.locator('.cr-service-view').innerText(),/Left · missing supplies/);
      assert.match(await page.locator('.cr-service-view .cr-speech').innerText(),/Whole Milk/);
      assert(await page.locator('[data-action="loss-details"]').isVisible(),'lost-sales controls stay available');
      assert(await page.evaluate(()=>{const view=document.querySelector('.cr-service-view').getBoundingClientRect(),speech=document.querySelector('.cr-service-view .cr-speech').getBoundingClientRect();return speech.top>=view.top&&speech.bottom<=view.bottom+1;}),'customer status and speech remain fully visible');
      await shot(page,'shortage-'+viewport.width);
      assert(await page.evaluate(()=>document.querySelector('.cr-stock-floor').getBoundingClientRect().bottom<=document.querySelector('.cr-stock-scene').getBoundingClientRect().bottom+1),'stock controls stay inside the room during alerts');
      const state=()=>page.evaluate(()=>JSON.stringify({cash:inventoryGame.cash,lots:inventoryGame.lots,metrics:inventoryGame.metrics,seed:inventoryGame.seed,orders:inventoryGame.orders,reactions:inventoryGame.reactions,learning:inventoryGame.learning,deliveries:inventoryGame.deliveries}));
      const before=await state();await paint(page);await paint(page);
      assert.equal(await state(),before,'painting reactions never mutates the simulation');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      assert.equal(await page.locator('.cr-stock-item').first().evaluate(n=>getComputedStyle(n).animationName),'none','reduced motion suppresses stock animations');
      const ids=await page.locator('.cr-game [id]').evaluateAll(nodes=>nodes.map(n=>n.id));assert.equal(new Set(ids).size,ids.length,'shared portraits have unique SVG IDs');
      await page.click('[data-action="help"]');await page.click('[data-action="replay-tutorial"]');
      await page.getByRole('button',{name:'Close replay',exact:true}).click();
      await page.evaluate(()=>inventoryGame.finish());await paint(page);
      assert(await page.locator('[data-dialog="report"]').isVisible());await shot(page,'results-'+viewport.width);
      await page.close();
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: real happy, price-loss and shortage reactions; keyboard stock controls; exact feedback; render purity; unique portraits; results/replay; reduced motion; desktop/mobile layouts.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
