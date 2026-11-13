// PLAYWRIGHT_MODULE and CHROME_PATH may point to existing local installations.
// Run: node tests/inventory-empty-stock.browser.cjs
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
(async()=>{
  const browser=await chromium.launch({headless:true,...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
  try {
    for(const width of [1280,375]) {
      const page=await browser.newPage({viewport:{width,height:900}}),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      await page.goto(pathToFileURL(path.resolve(__dirname,'../dist/index.html')).href);
      await page.evaluate(()=>{
        const g=new InventorySim();g.skipTutorial();g.introSeen=true;g.briefed=true;
        for(const i of INVENTORY_ITEMS)g.lots[i.name]=[];
        g.tutorial.cart=[{name:'Whole Milk',qty:1,supplier:'budget',frozen:false,express:true},{name:'Cup',qty:30,supplier:'quick',frozen:false,express:false}];
        localStorage.setItem('rise.cafe-rescue.five-day.v1',g.save());
      });
      await page.click('#inventory-start');await page.click('[data-action="resume-save"]');
      const button=page.locator('[data-action="add-empty-stock"]');
      await button.click();
      assert(await button.isDisabled());
      assert.match(await page.locator('.cr-empty-restock [role="status"]').innerText(),/26 out-of-stock items added or topped up/);
      const cart=await page.evaluate(()=>inventoryGame.tutorial.cart);
      assert.equal(cart.length,27);assert.equal(cart.find(l=>l.name==='Cup').qty,30);
      assert.equal(cart.find(l=>l.name==='Whole Milk').supplier,'budget');
      await button.evaluate(b=>{for(let i=0;i<10;i++)b.click();});
      assert.deepEqual(await page.evaluate(()=>inventoryGame.tutorial.cart),cart);
      await page.click('[data-action="tab"][data-tab="supply"]');
      assert.equal(await page.locator('.cr-cart-lines>div').count(),27);
      const total=await page.evaluate(()=>inventoryGame.quote(inventoryGame.tutorial.cart).total);
      assert((await page.locator('.cr-cart-total').innerText()).includes(total.toFixed(2)));
      const bounds=await button.boundingBox();assert(bounds.x>=0&&bounds.x+bounds.width<=width+1);
      await page.screenshot({path:path.resolve(__dirname,`.rescue-empty-stock-${width}.png`),fullPage:true});
      const old=await page.evaluate(()=>inventoryGame.tutorial.cart.reduce((s,l)=>s+l.qty,0));
      await page.click('[data-action="add-cart"]');
      assert.equal(await page.evaluate(()=>inventoryGame.tutorial.cart.reduce((s,l)=>s+l.qty,0)),old+6,'individual add still works');
      await page.evaluate(()=>{for(const i of INVENTORY_ITEMS)inventoryGame.lots[i.name]=[{qty:1,expires:inventoryGame.day+2,frozen:false}];});
      await page.click('[data-action="clear-cart"]');assert(await button.isDisabled());
      await page.evaluate(()=>{inventoryGame.lots.Cup=[];inventoryGame.lots['Whole Milk']=[{qty:40,expires:inventoryGame.day,frozen:false}];});
      await page.click('[data-action="tab"][data-tab="stock"]');await button.click();
      assert.match(await page.locator('.cr-empty-restock [role="status"]').innerText(),/Whole Milk: No shelf space/);
      assert.equal((await page.evaluate(()=>inventoryGame.tutorial.cart))[0].name,'Cup');
      assert.deepEqual(errors,[]);await page.close();
    }
    console.log('PASS: desktop/mobile bulk UI, immediate totals/counts, rapid clicks, individual add, disabled empty state and partial failure feedback.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
