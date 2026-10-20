const assert=require('node:assert/strict');
global.window=global;
require('../dist/inventory-engine.js');
const {CONFIG,MENU}=RESCUE;
const fixtures={};
const near=(a,b,label)=>assert(Math.abs(a-b)<1e-6,`${label}: ${a} != ${b}`);
const line=(name,qty,supplier='quick',frozen=false,express=false)=>({name,qty,supplier,frozen,express});
const clear=g=>INVENTORY_ITEMS.forEach(i=>g.discard(i.name));
function shelve(g,fifo=true){g.deliveries.filter(d=>d.arrived&&!d.shelved).forEach(d=>g.shelve(d.id,fifo));}
function waitPlanning(g){
  let limit=100;
  while((g.deliveries.some(d=>!d.arrived)||g.batches.length)&&limit--){assert(g.advancePlanning());shelve(g);}
  assert(limit>0);shelve(g);
}
function accounting(g){
  const reports=g.reports.filter(r=>r.day!==g.day);
  const all=[...reports,g.metrics];
  const total=k=>all.reduce((s,r)=>s+(r[k]||0),0);
  near(g.cash,CONFIG.openingCash+total('revenue')-total('purchases')-total('operating')-total('conversion'),'cash reconciliation');
  near(g.balance,CONFIG.openingCash+g.openingValue+total('revenue')-total('cogs')-total('waste')-total('operating'),'asset / profit reconciliation');
  assert(g.cash>=-g.creditLimit-1e-6,'credit limit');
  for(const i of INVENTORY_ITEMS) {
    assert(g.stock(i.name)>=0,'stock cannot go negative');
    assert(g.lots[i.name].every(l=>l.qty>=0&&Number.isInteger(l.qty)),'whole nonnegative lot quantity');
  }
}
// Safety, opening conditions, and idempotent cleanup rewards.
{
  const g=new InventorySim(1);
  assert.equal(g.cash,-500);assert.equal(g.spendable,250);assert.equal(g.reputation,18);
  assert(g.expiredCount()>0);assert.equal(g.stock('Cup'),0);assert(g.stock('Original Blend')>0);
  assert.equal(g.consume('Whole Milk'),null);
  assert(g.open());g.briefed=true;assert(g.open());
  clear(g);assert.equal(g.expiredCount(),0);near(g.metrics.waste,0,'inherited loss is not charged twice');
  const xp=g.xp;clear(g);assert.equal(g.xp,xp);
  g.addLot('Whole Milk',2,.45,1);g.clock+=2;g.markExpired();
  near(g.metrics.waste,.9,'expired value recognized');g.markExpired();g.discard('Whole Milk');
  near(g.metrics.waste,.9,'expiry plus disposal must not double charge');
  g.addLot('Cookie',2,.9,200);const lot=g.lots.Cookie.at(-1);g.discard('Cookie',lot.id);
  near(g.metrics.waste,2.7,'usable disposal is waste');
}
// Atomic cart validation, capacity, cash, quotes and delayed receipt.
{
  const g=new InventorySim(10);clear(g);
  const cash=g.cash;
  for(const bad of [[line('Cup',-1)],[line('Cup',1.2)],[line('Not a product',2)],[line('Cup',10,'missing')],[line('Cup',65)],[line('Cup',1,'quick',true)]]) {
    assert(g.placeOrder(bad));assert.equal(g.cash,cash);assert.equal(g.deliveries.length,0);
  }
  assert(g.placeOrder([line('Cup',35),line('Cup',35)]),'combined cart capacity checked');
  const cart=[line('Whole Milk',6),line('Cup',8)],q=g.quote(cart);
  assert.equal(g.placeOrder(cart),null);near(g.cash,cash-q.total,'purchase cash');near(g.profit,-q.shipping,'only freight expensed');
  const d=g.deliveries[0];assert.equal(g.shelve(d.id),false);assert.equal(g.stock('Cup'),0);
  waitPlanning(g);assert.equal(g.stock('Cup'),8);const after=g.inventoryValue();
  assert.equal(g.shelve(d.id),false);near(g.inventoryValue(),after,'no duplicate delivery');
  accounting(g);
  g.cash=-750;assert(g.placeOrder([line('Cup',1)]));assert.equal(g.spendable,0);
}
// Choosing shelf order genuinely changes which lot is used; expired food stays blocked.
{
  const g=new InventorySim(3);clear(g);
  g.addLot('Whole Milk',1,2,60);g.addLot('Whole Milk',1,3,120);
  g.lots['Whole Milk'].reverse();assert.equal(g.consume('Whole Milk').cost,3);
  g.addLot('Whole Milk',1,4,180);g.rotate('Whole Milk');
  assert.equal(g.consume('Whole Milk').cost,2);
  g.clock+=200;g.markExpired();assert.equal(g.consume('Whole Milk'),null);
  g.discard('Whole Milk');g.addLot('Whole Milk',1,2,150);g.clock+=5;g.addLot('Whole Milk',1,3,25);
  g.lots['Whole Milk'].reverse();g.rotate('Whole Milk');
  assert.equal(g.consume('Whole Milk').cost,2,'FIFO follows receipt order, not a newer short-date lot');
}
// Supplier risk is seeded, stronger reliability changes the observed frequency.
{
  let budgetBad=0,premiumBad=0;
  for(let seed=1;seed<=300;seed++){
    const a=new InventorySim(seed*1337),b=new InventorySim(seed*1337);a.day=b.day=2;
    a.placeOrder([line('Cup',4,'budget')]);b.placeOrder([line('Cup',4,'premium')]);
    budgetBad+=a.deliveries[0].delayed||a.deliveries[0].error?1:0;
    premiumBad+=b.deliveries[0].delayed||b.deliveries[0].error?1:0;
  }
  assert(budgetBad>40&&budgetBad>premiumBad*5,`risk frequency ${budgetBad}/${premiumBad}`);
  const g=new InventorySim(4);g.day=2;
  assert(g.offer('Whole Milk','budget').unit<g.offer('Whole Milk','premium').unit);
  assert(g.offer('Whole Milk','budget').life<g.offer('Whole Milk','premium').life);
  assert(g.offer('Cup','quick',20).unit<g.offer('Cup','quick',2).unit);
  assert(g.offer('Cup','quick',2,false,true).lead<g.offer('Cup','quick',2).lead);
}
// Delivery faults respect their promised time; shortages are refunded without extra expenses.
{
  let late,short;
  for(let seed=1;seed<500&&(!late||!short);seed++){
    const g=new InventorySim(seed*1031);g.placeOrder([line('Whole Milk',8,'budget')]);
    if(g.deliveries[0].delayed&&!late)late=g;
    if(g.deliveries[0].error&&!short)short=g;
  }
  assert(late&&short);
  const d=late.deliveries[0];late.clock=d.expected;late.processDeliveries();
  assert(d.delayNotified);assert.equal(d.arrived,false);assert.equal(late.stock('Whole Milk'),0);
  late.clock=d.eta;late.processDeliveries();assert(d.arrived);shelve(late);accounting(late);
  const s=short.deliveries[0],cash=short.cash;
  short.clock=s.eta;short.processDeliveries();assert(s.problem);assert(short.cash>cash);
  shelve(short);assert.equal(short.stock('Whole Milk'),6);accounting(short);
}
// In-house production uses money, time and capacity; stock value includes conversion.
{
  const g=new InventorySim(12);clear(g);g.setStrategy('inhouse');
  assert(g.placeOrder([line('Cookie',4,'quick',false)]));
  assert.equal(g.placeOrder([line('Cookie',8,'quick',true)]),null);waitPlanning(g);
  assert.equal(g.stock('Cookie'),0);assert.equal(g.frozen('Cookie'),8);
  const value=g.inventoryValue(),cash=g.cash;
  assert.equal(g.bake('Cookie'),null);assert(g.bake('Cookie'));
  near(g.inventoryValue(),value+CONFIG.bakeConversion,'baking conversion asset');
  near(g.cash,cash-CONFIG.bakeConversion,'baking cash');
  assert.equal(g.stock('Cookie'),0);waitPlanning(g);assert.equal(g.stock('Cookie'),4);accounting(g);
  assert.equal(g.placeOrder([line('Cookie',16,'quick',true)]),null);waitPlanning(g);
  assert.equal(g.bake('Cookie'),null);
  assert(g.placeOrder([line('Cookie',4,'quick',true)]),'oven batches reserve their eventual shelf space');
  const finishedAt=g.batches[0].ready;g.clock=finishedAt+30;g.processBatches();
  assert.equal(g.lots.Cookie.at(-1).expires,finishedAt+185,'freshness starts at completion, even across a time jump');
  accounting(g);
}
// Pricing, one-off events, upgrades, saving in transit and at a paused decision.
{
  let g=new InventorySim(55);clear(g);g.day=5;
  assert(g.setPrice('latte',9));assert(g.priceAcceptance(MENU[0])<.5);
  assert(g.setPrice('latte',4));assert(g.priceAcceptance(MENU[0])>.95);
  assert.equal(g.setPrice('latte',100),false);
  assert(g.buyUpgrade('ordering'));const cash=g.cash;
  assert.equal(g.buyUpgrade('ordering'),false);assert.equal(g.cash,cash);
  g.placeOrder([line('Cup',10,'budget')]);
  const restored=InventorySim.restore(g.save());assert(restored);
  assert.equal(restored.save(),g.save());assert.equal(restored.random(),g.random());
  g=restored;g.phase='shift';g.running=true;g.pendingEvent=g.eventData();
  const atDecision=InventorySim.restore(g.save());assert(atDecision.pendingEvent);assert.equal(atDecision.running,false);
  assert.equal(atDecision.chooseEvent('value'),null);const xp=atDecision.xp;
  assert(atDecision.chooseEvent('value'));assert.equal(atDecision.xp,xp);
  assert.equal(InventorySim.restore('bad JSON'),null);
  const invalid=JSON.parse(g.save());invalid.state.lots.Cup=[{qty:-2,cost:1,expires:20}];
  assert.equal(InventorySim.restore(JSON.stringify(invalid)),null);
}
// Emergency choices are atomic; replaying the same popup cannot collect supplies twice.
{
  const g=new InventorySim(18);g.day=3;g.phase='shift';g.pendingEvent=g.eventData();
  const before=g.cash;assert.equal(g.chooseEvent('emergency'),null);
  near(g.cash,before-14,'emergency purchase');assert.equal(g.deliveries.length,1);accounting(g);
  assert(g.chooseEvent('emergency'));assert.equal(g.deliveries.length,1);
  const poor=new InventorySim(18);poor.day=3;poor.phase='shift';poor.cash=-745;poor.pendingEvent=poor.eventData();
  assert(poor.chooseEvent('emergency'));assert.equal(poor.cash,-745);assert.equal(poor.deliveries.length,0);
  assert.equal(poor.chooseEvent('alternative'),null,'every emergency has a no-cash response');
}

// A public-information player: small batches, periodic observed-stock checks, no future schedule.
function campaign(seed,style='balanced',saveMidway=false){
  let g=new InventorySim(seed);g.introSeen=true;const daily=[];
  const provider=()=>style==='premium'&&g.day>1?'premium':style==='budget'?'budget':'quick';
  const stockUp=(planning=false)=>{
    clear(g);
    const active=g.activeIngredients(),lines=[];
    for(const name of active){
      const i=INVENTORY_ITEMS.find(i=>i.name===name),bakery=i.group==='bakery';
      const isFrozen=bakery&&g.strategy==='inhouse';
      const have=g.stock(name)+g.frozen(name)+g.incoming(name);
      const threshold=bakery?3:Math.max(4,Math.ceil(g.rate(name)*55));
      let target=bakery?(isFrozen?8:6):i.group==='supplies'?26:14;
      if(style==='hoard')target=g.capacity(name);
      if(!planning&&have>threshold&&style!=='hoard')continue;
      let qty=Math.max(0,Math.min(target-have,g.capacity(name)-g.occupied(name)-g.incoming(name)));
      if(isFrozen)qty=Math.floor(qty/4)*4;
      if(qty)lines.push(line(name,qty,provider(),isFrozen));
    }
    if(lines.length){const q=g.quote(lines);if(q.total<=g.spendable)g.placeOrder(lines);}
  };
  const bake=()=>{
    if(g.strategy==='outsource')return;
    for(const p of MENU.filter(p=>p.kind==='bakery'&&g.menu[p.id].enabled))if(g.stock(p.name)<=3&&g.frozen(p.name)>=4)g.bake(p.name);
  };
  for(let day=1;day<=7;day++){
    if(seed===11&&style==='balanced'&&[4,5,6,7].includes(day))fixtures[`day-${day}`]=g.save();
    assert.equal(g.day,day);g.briefed=true;clear(g);
    g.setStrategy(style==='inhouse'?'inhouse':'outsource');
    if(style==='overprice'&&day>=5) for(const p of MENU)if(p.day<=day)g.setPrice(p.id,Math.floor(p.price*1.75*4)/4);
    if(style==='balanced'&&day===3)g.buyUpgrade('fridge');
    if(style==='premium'&&day===4)g.buyUpgrade('ordering');
    if(day>=6&&style==='inhouse')g.hireHelper();
    stockUp(true);waitPlanning(g);bake();waitPlanning(g);clear(g);
    const opening=g.open();
    if(opening) return {seed,style,blocked:opening,day,cash:g.cash};
    for(let second=0;g.phase==='shift'&&second<1000;second++){
      if(g.pendingEvent){
        if(seed===11&&style==='balanced'&&day===6)fixtures.rush=g.save();
        const choices=g.pendingEvent.choices.map(c=>c[0]);
        const choice=choices.includes('steady')?'steady':choices.includes('repair')&&style==='inhouse'?'repair':choices.includes('outsource')?'outsource':choices.includes('quality')?'quality':choices.includes('alternative')?'alternative':choices[0];
        assert.equal(g.chooseEvent(choice),null);g.running=true;
      }
      shelve(g);bake();
      if(second%10===0&&g.elapsed<CONFIG.shiftSeconds-45)stockUp();
      g.tick(1);accounting(g);
      if(saveMidway&&day===4&&second===130){
        const copy=InventorySim.restore(g.save());assert(copy);g=copy;g.running=true;
      }
    }
    assert.equal(g.phase,'review');assert.equal(g.metrics.served+g.metrics.lost,g.metrics.arrived);
    const r=g.reports.at(-1);
    near(r.profit,r.revenue-r.cogs-r.waste-r.operating,'daily results');
    near(r.cash-r.openingCash,r.revenue-r.purchases-r.operating-r.conversion,'daily cash flow');
    daily.push({day,served:r.served,arrived:r.arrived,profit:Math.round(r.profit),cash:Math.round(g.cash)});
    accounting(g);assert.equal(g.finish(),false,'cannot collect result twice');
    if(day<7)assert(g.nextDay());
  }
  const end=g.ending();assert(end);assert.equal(g.reports.length,7);
  if(seed===11&&style==='balanced')fixtures.ending=g.save();
  if(seed===11&&style==='overprice')fixtures.failure=g.save();
  return {seed,style,tier:end.tier,balance:Math.round(end.balance),service:Math.round(end.service*100),reputation:end.reputation,waste:Math.round(end.waste),daily};
}
const results=[];
for(const style of ['balanced','premium','inhouse','budget','hoard','overprice'])
  for(const seed of [11,42,19725])results.push(campaign(seed,style,true));
console.table(results.map(({daily,...r})=>r));
if(process.env.RESCUE_VERBOSE)console.log(JSON.stringify(results,null,2));
for(const style of ['balanced','premium','inhouse']){
  const runs=results.filter(r=>r.style===style);
  assert(runs.every(r=>!r.blocked),`${style} can play all seven days`);
  assert(runs.some(r=>['gold','silver','bronze'].includes(r.tier)),`${style} offers a viable rescue strategy`);
}
assert(results.filter(r=>r.style==='balanced').some(r=>['gold','silver'].includes(r.tier)),'good play can clear inherited debt');
const regular=results.filter(r=>r.style==='balanced').reduce((s,r)=>s+r.balance,0);
const excess=results.filter(r=>r.style==='hoard').reduce((s,r)=>s+(r.balance||-750),0);
assert(regular>excess,'filling every shelf should be worse than measured purchasing');
assert(results.some(r=>r.tier==='failure'||r.blocked),'success is not guaranteed');
console.log('PASS: inventory safety, FIFO, supplier risk, pricing, production, finance, persistence, and 18 seven-day campaigns.');
if(process.argv.includes('--fixtures')){
  const fs=require('node:fs'),path=require('node:path');
  const html=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8');
  for(const [name,save] of Object.entries(fixtures)){
    const loader=`<script>if(location.port!=='8789')throw new Error('Use the isolated QA preview port 8789');localStorage.setItem('rise.cafe-rescue.v2',${JSON.stringify(save).replace(/</g,'\\u003c')});</script>`;
    fs.writeFileSync(path.join(__dirname,`.rescue-qa-${name}.html`),html.replace('<head>','<head><base href="/dist/">').replace('<script src="engine.js">',loader+'<script src="engine.js">'));
  }
  console.log('Generated isolated browser fixtures in tests/.rescue-qa-*.html. Serve on port 8789 only.');
}
