const assert=require('node:assert/strict');
global.window=global;
require('../dist/inventory-engine.js');
const {CONFIG,MENU}=RESCUE;
const fixtures={};
const near=(a,b,label)=>assert(Math.abs(a-b)<1e-6,`${label}: ${a} != ${b}`);
const line=(name,qty,supplier='quick',frozen=false,express=false)=>({name,qty,supplier,frozen,express});
const clear=g=>INVENTORY_ITEMS.forEach(i=>g.discard(i.name));
function requiredPlan(g,style='balanced') {
  g.observe('tab','trends');g.observe('supplier','quick');g.observe('supplier','budget');
  const buffer={buffer:3,reorder:3},capacity=g.helper?'helper':'buffer';
  const plans={1:{servings:12,supplier:'quick'},2:{...buffer,servings:12},3:{...buffer,strategy:g.strategy,capacity,investment:'hold',reason:'cash'},4:{prices:{latte:g.menu.latte.price,oat:g.menu.oat.price}},5:{...buffer,servings:18,capacity,investment:'hold',reason:'cash'}};
  assert.equal(g.commitPlan(plans[g.day]),null);
}
function requiredReview(g) { assert.equal(g.reflect(g.reviewOptions().correct),null); }
function shelve(g,fifo=true){g.deliveries.filter(d=>d.arrived&&!d.shelved).forEach(d=>g.shelve(d.id,fifo));}
function waitPlanning(g){
  let limit=100;
  while((g.deliveries.some(d=>!d.arrived&&!d.cancelled&&d.dueDay<=g.day)||g.batches.length)&&limit--){assert(g.advancePlanning());shelve(g);}
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
  assert.equal(g.cash,-500);assert.equal(g.spendable,250);assert.equal(g.rating,1);
  assert(g.expiredCount()>0);assert.equal(g.stock('Cup'),0);assert(g.stock('Original Blend')>0);
  assert.equal(g.consume('Whole Milk'),null);
  assert(g.open());g.briefed=true;assert(g.open());
  clear(g);assert.equal(g.expiredCount(),0);near(g.metrics.waste,0,'inherited loss is not charged twice');
  const xp=g.xp;clear(g);assert.equal(g.xp,xp);
  g.addLot('Whole Milk',2,.45,1);g.day+=1;g.markExpired();
  near(g.metrics.waste,.9,'expired value recognized');g.markExpired();g.discard('Whole Milk');
  near(g.metrics.waste,.9,'expiry plus disposal must not double charge');
  g.addLot('Cookie',2,.9,2);const lot=g.lots.Cookie.at(-1);g.discard('Cookie',lot.id);
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
// Calendar freshness does not decrease with seconds, speed, or planning waits.
{
  const g=new InventorySim(21);clear(g);g.placeOrder([line('Cup',1)]);waitPlanning(g);
  g.day=2;g.beginDay();g.skipTutorial();g.briefed=true;g.observe('tab','trends');
  assert.equal(g.commitPlan({servings:8,buffer:2,reorder:2}),null);
  assert.match(g.open(),/Cold Brew/,'opening initially needs cold brew stock');
  const plan=g.recipePlan({oat:8});assert.equal(g.placeOrder(plan.lines),null);
  assert.equal(g.placeOrder([line('Decaf',2,'budget')]),null);
  const today=g.deliveries.find(d=>d.learningDay===2&&d.supplier==='quick'),tomorrow=g.deliveries.at(-1),before=g.cash;
  g.tickPlanning(4);assert.equal(today.arrived,false,'normal lead time still applies');
  g.tickPlanning(20);assert(today.arrived);assert(today.shelved,'learned FIFO allows routine deliveries onto shelves');
  assert(g.servings('oat')>=8,'cold brew ingredients arrive before opening');
  assert.equal(g.phase,'planning');assert.equal(g.elapsed,0);assert.equal(g.metrics.arrived,0);assert.equal(g.cash,before,'transport does not spend money again');
  assert.equal(tomorrow.arrived,false,'next-day shipping never becomes same-day');
  const copy=InventorySim.restore(g.save());assert.equal(copy.servings('oat'),g.servings('oat'));
  assert.equal(copy.open(),null,'Day 2 can start after preparation delivery');assert.equal(copy.elapsed,0,'entire shift remains available');
  const clock=copy.clock;copy.tickPlanning(10);assert.equal(copy.clock,clock,'planning tick cannot advance an open shift');
}
{
  const g=new InventorySim(2),cart=[line('Cup',20,'quick'),line('Whole Milk',8,'budget'),line('Cookie',4,'quick',true,true)];
  const original=JSON.stringify(cart),saved=g.save();
  const changed=g.repriceCart(cart,'premium');assert(changed);
  assert(changed.lines.every(l=>l.supplier==='premium'));
  assert.deepEqual(changed.lines.map(({supplier,...l})=>l),cart.map(({supplier,...l})=>l),'quantities, frozen packs and express shipping are preserved');
  assert.equal(JSON.stringify(cart),original,'comparison does not mutate the old cart');
  assert.equal(g.save(),saved,'switching a cart does not spend cash, schedule deliveries or change stock');
  near(changed.before.total,g.quote(cart).total,'old cart uses actual mixed-supplier freight');
  near(changed.after.total,g.quote(changed.lines).total,'new cart uses current prices and bulk discounts');
  near(changed.difference,changed.after.total-changed.before.total,'displayed total difference');
  near(changed.after.shipping,6.25,'standard and express freight groups remain separate');
  const fast=g.repriceCart(changed.lines,'quick');assert(fast.difference>0);
  const cheap=g.repriceCart(changed.lines,'budget');assert(cheap.difference<0);
  assert.equal(g.offer('Whole Milk',cheap.lines[1].supplier).dayOffset,1,'switching does not secretly upgrade budget shipping');
  assert.equal(g.repriceCart(cheap.lines,'budget').difference,0);
  assert.equal(g.repriceCart([],'quick'),null);assert.equal(g.repriceCart(cart,'missing'),null);
  g.discount=true;const discounted=g.repriceCart(cart,'budget');assert(discounted.after.goods<cheap.after.goods,'supplier promotions are included');
  g.tutorial.cart=changed.lines;assert.deepEqual(InventorySim.restore(g.save()).tutorial.cart,changed.lines,'repriced cart survives reload');
}
{
  const g=new InventorySim(3);clear(g);
  g.addLot('Whole Milk',1,2,3);g.clock+=5000;g.markExpired();
  assert.equal(g.stock('Whole Milk'),1,'time alone must not spoil food');
  assert.equal(g.lots['Whole Milk'][0].expires,4);
  g.clock+=1;g.addLot('Whole Milk',1,3,1);g.lots['Whole Milk'].reverse();
  assert.equal(g.consume('Whole Milk').cost,2,'oldest receipt is always first');
  g.day=2;g.markExpired();assert.equal(g.consume('Whole Milk'),null);
  near(g.metrics.waste,3,'day boundary writes off expired milk once');
  g.markExpired();g.discard('Whole Milk');near(g.metrics.waste,3,'no duplicate loss');
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
  assert(budgetBad>40&&budgetBad>premiumBad*1.5,`risk frequency ${budgetBad}/${premiumBad}`);
  const g=new InventorySim(4);g.day=2;
  assert(g.offer('Whole Milk','budget').unit<g.offer('Whole Milk','premium').unit);
  assert(g.offer('Original Blend','budget').life<g.offer('Original Blend','premium').life);
  assert(g.offer('Cup','quick',20).unit<g.offer('Cup','quick',2).unit);
  assert(g.offer('Cup','quick',2,false,true).lead<g.offer('Cup','quick',2).lead);
}
// Delivery faults respect their promised time; shortages are refunded without extra expenses.
{
  const g=new InventorySim(21);
  assert.equal(RESCUE.SUPPLIERS.filter(s=>s.unlock<=1).length,3,'three opening-day supplier choices');
  const budget=g.offer('Original Blend','budget'),middle=g.offer('Original Blend','premium'),quick=g.offer('Original Blend','quick');
  for(const field of ['unit','quality','reliability','life'])assert(budget[field]<middle[field]&&middle[field]<quick[field],`middle supplier ${field} sits between alternatives`);
  assert.equal(middle.dayOffset,0);assert(middle.lead>quick.lead);assert(middle.lead<CONFIG.shiftSeconds);
  assert.equal(g.placeOrder([line('Cup',5,'premium')]),null);
  const d=g.deliveries[0];assert.equal(d.dueDay,1);assert.equal(d.expected,10);
  g.clock=d.expected-1;g.processDeliveries();assert.equal(d.arrived,false);
  g.clock=d.eta;g.processDeliveries();assert(d.arrived);assert(g.shelve(d.id));assert(g.stock('Cup')>0);
  assert(InventorySim.restore(g.save()),'new supplier orders survive save/resume');
}
{
  let late,short;
  for(let seed=1;seed<500&&(!late||!short);seed++){
    const g=new InventorySim(seed*1031);g.placeOrder([line('Whole Milk',8,'budget')]);
    if(g.deliveries[0].delayed&&!late)late=g;
    if(g.deliveries[0].error&&!short)short=g;
  }
  assert(late&&short);
  const d=late.deliveries[0];late.day=d.dueDay;late.clock=d.expected;late.processDeliveries();
  assert(d.delayNotified);assert.equal(d.arrived,false);assert.equal(late.stock('Whole Milk'),0);
  late.clock=d.eta;late.processDeliveries();assert(d.arrived);shelve(late);accounting(late);
  const s=short.deliveries[0],cash=short.cash;
  short.day=s.dueDay;short.clock=s.eta;short.processDeliveries();assert(s.problem);assert(short.cash>cash);
  shelve(short);assert.equal(short.stock('Whole Milk'),6);accounting(short);
  let empty;
  for(let seed=1;seed<500&&!empty;seed++){
    const candidate=new InventorySim(seed*1031);
    candidate.placeOrder([line('Cup',1,'budget',false,true)]);
    if(candidate.deliveries[0].error)empty=candidate;
  }
  assert(empty);empty.advancePlanning();
  const missing=empty.deliveries[0];
  assert.equal(missing.lines.length,0);assert.equal(empty.stock('Cup'),0);accounting(empty);
  empty.introSeen=true;empty.briefed=true;empty.skipTutorial();fixtures['empty-delivery']=empty.save();
  const refundCash=empty.cash;assert(empty.shelve(missing.id,false));assert.equal(empty.shelve(missing.id,false),false);
  empty.processDeliveries();near(empty.cash,refundCash,'empty delivery cannot refund twice');accounting(empty);
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
  assert.equal(g.lots.Cookie.at(-1).expires,g.day+2,'bakery freshness is measured in days, not seconds');
  accounting(g);
}
// Pricing, one-off events, upgrades, saving in transit and at a paused decision.
{
  let g=new InventorySim(55);clear(g);g.day=4;
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
  const g=new InventorySim(18);g.day=2;g.phase='shift';g.pendingEvent=g.eventData();
  const before=g.cash;assert.equal(g.chooseEvent('emergency'),null);
  near(g.cash,before-14,'emergency purchase');assert.equal(g.deliveries.length,1);accounting(g);
  assert(g.chooseEvent('emergency'));assert.equal(g.deliveries.length,1);
  const poor=new InventorySim(18);poor.day=2;poor.phase='shift';poor.cash=-745;poor.pendingEvent=poor.eventData();
  assert(poor.chooseEvent('emergency'));assert.equal(poor.cash,-745);assert.equal(poor.deliveries.length,0);
  assert.equal(poor.chooseEvent('alternative'),null,'every emergency has a no-cash response');
}

// Supplier calendar lead times, safe refunds, and one-time interactive tutorial state.
{
  const g=new InventorySim(12);clear(g);g.briefed=true;
  g.placeOrder([line('Cup',8,'budget')]);const d=g.deliveries[0];
  g.clock=10000;g.processDeliveries();assert.equal(d.arrived,false);
  assert.equal(g.advancePlanning(),false,'cannot skip a future campaign day in planning');
  assert.equal(g.deliveryDecision(d.id,'refund'),null);const cash=g.cash;
  assert(g.deliveryDecision(d.id,'refund'));assert.equal(g.cash,cash);accounting(g);
  g.day=d.dueDay;g.clock+=100;g.processDeliveries();assert.equal(g.metrics.deliveries,0,'cancelled orders never arrive or affect supplier performance');g.day=1;
  g.placeOrder([line('Cup',8,'budget')]);g.phase='shift';g.finish();assert.equal(g.nextDay(),false);requiredReview(g);assert(g.nextDay());
  assert(g.deliveries[1].arrived,'budget order arrives next morning');
  const fresh=new InventorySim(12);fresh.placeOrder([line('Cup',8,'quick',false,true)]);
  assert(fresh.deliveries[0].expected<=5,'express is fast');
}
{
  const g=new InventorySim(9),t=g.tutorial;
  assert.equal(g.tutorialStep(),'stock');t.stockOpened=true;
  assert.equal(g.tutorialStep(),'inspect');t.inspected=true;
  assert.equal(g.tutorialStep(),'clean');clear(g);
  assert.equal(g.tutorialStep(),'missing');t.missing=true;
  assert.equal(g.tutorialStep(),'suppliers');t.suppliersOpened=true;
  assert.equal(g.tutorialStep(),'compare');t.compared=['budget','quick'];
  assert.equal(g.tutorialStep(),'cart');t.cartAdded=true;
  assert.equal(g.tutorialStep(),'review');t.reviewed=true;
  assert.equal(g.tutorialStep(),'order');const cart=g.restockPlan(8);
  assert(cart.filter(l=>INVENTORY_ITEMS.find(i=>i.name===l.name).group==='bakery').every(l=>l.qty<=2));
  const before=g.cash,q=g.quote(cart);assert.equal(g.placeOrder(cart),null);near(g.cash,before-q.total,'tutorial order charged once');
  assert.equal(g.tutorialStep(),'delivery');waitPlanning(g);
  assert.equal(g.tutorialStep(),'menu');t.menuSeen=true;
  assert.equal(g.tutorialStep(),'recipe');t.recipeSeen=true;
  assert.equal(g.tutorialStep(),'trends');t.trendsSeen=true;
  assert.equal(g.tutorialStep(),'ready');
  g.menu.latte.enabled=false;
  assert.equal(g.tutorialStep(),'restock');assert.equal(g.completeTutorial(),false,'tutorial cannot finish without a usable drink');
  g.menu.latte.enabled=true;
  assert(g.completeTutorial());assert.equal(g.completeTutorial(),false);
  g.briefed=true;fixtures['day-1-ready']=g.save();assert(g.open(),'tutorial does not bypass required plan');requiredPlan(g);assert.equal(g.open(),null);accounting(g);
  const skip=new InventorySim(9),prior=skip.cash;skip.skipTutorial();assert.equal(skip.cash,prior);assert.equal(skip.tutorialStep(),null);assert(skip.open(),'skipping cannot bypass food safety');
  assert(InventorySim.restore(skip.save()).tutorial.skipped);
}
// Seven-day saves are not silently relabeled as five-day progress.
{for(const version of [2,3,4,5]){const old=JSON.parse(new InventorySim(1).save());old.version=version;assert.equal(InventorySim.restore(JSON.stringify(old)),null);}assert(InventorySim.restore(new InventorySim(1).save()));}
// Recipe targets allocate shared ingredients once; planning never purchases anything.
{
  const g=new InventorySim(42);clear(g);g.day=2;
  const before=g.save(),plan=g.recipePlan({latte:5});
  assert.equal(plan.lines.find(l=>l.name==='Original Blend').qty,1);
  assert.equal(plan.lines.find(l=>l.name==='Whole Milk').qty,5);
  assert.equal(plan.lines.find(l=>l.name==='Vanilla').qty,2);
  assert.equal(plan.lines.some(l=>l.name==='Straw'),false,'uses actual recipe');
  assert.equal(g.save(),before,'draft has no inventory, cash or RNG side effects');
  assert.equal(g.recipePlan({latte:5},plan.lines).lines.length,0,'repeated click does not duplicate');
  const second=g.recipePlan({latte:5,caramel:5},plan.lines,'budget',true);
  assert.equal(second.lines.find(l=>l.name==='Original Blend').qty,5,'shared coffee covers ten drinks');
  assert.equal(second.lines.find(l=>l.name==='Cup').qty,5);
  assert.equal(second.lines.find(l=>l.name==='Original Blend').supplier,'quick','shared cart keeps selected supplier');
  assert.equal(second.lines.find(l=>l.name==='Almond Milk').supplier,'budget');
  const merged=plan.lines.map(l=>({...l}));
  for(const l of second.lines){const existing=merged.find(c=>c.name===l.name&&c.frozen===l.frozen);if(existing)existing.qty+=l.qty;else merged.push(l);}
  assert.equal(new Set(merged.map(l=>l.name)).size,merged.length);assert.equal(merged.find(l=>l.name==='Original Blend').qty,6);
  assert.equal(g.recipePlan({latte:5,caramel:5},merged).lines.length,0);
  assert.equal(new InventorySim(1).recipePlan({oat:5}),null,'locked products are not planned early');
  for(const n of [0,-1,2.5,NaN,101])assert.equal(g.recipePlan({latte:n}),null);
  const capped=g.recipePlan({latte:100});assert(capped.unfilled>0);
  for(const l of capped.lines)assert(l.qty+g.occupied(l.name)+g.incoming(l.name)<=g.capacity(l.name));
  g.addLot('Whole Milk',8,.45,0,false,.94,g.day);assert.equal(g.recipePlan({latte:5}).rows.find(r=>r.name==='Whole Milk').stock,0,'expired milk excluded');
}
{
  const g=new InventorySim(42);clear(g);
  g.placeOrder([line('Whole Milk',3),line('Cup',5,'budget')]);
  assert.equal(g.recipePlan({latte:5}).lines.find(l=>l.name==='Whole Milk').qty,2,'usable inbound stock counts');
  assert.equal(g.recipePlan({latte:5}).lines.find(l=>l.name==='Cup').qty,5,'tomorrow delivery cannot serve today');
  g.advancePlanning();const delivery=g.deliveries.find(d=>d.arrived);assert(delivery);
  delivery.lines[0].expires=g.day;
  assert.equal(g.recipePlan({latte:5}).lines.find(l=>l.name==='Whole Milk').qty,5,'expired uncollected stock excluded');
  delivery.cancelled=true;assert.equal(g.usableIncoming('Whole Milk'),0);
  const bakery=new InventorySim(12);clear(bakery);bakery.setStrategy('inhouse');bakery.addLot('Cookie',3,.4,7,true);
  const frozen=bakery.recipePlan({cookie:5}).lines.find(l=>l.name==='Cookie');assert.equal(frozen.qty,5);assert(frozen.frozen,'buys enough portions for full oven batches');
  bakery.ovenBroken=true;assert(bakery.recipePlan({cookie:5}).blocked,'broken oven requires a strategy decision');
}
// Near-expiry alerts use campaign days, persist dismissal, and allow a new lot to warn.
{
  const g=new InventorySim(12);clear(g);g.addLot('Whole Milk',4,.45,2);
  assert.equal(g.expiryNotice(),null);g.clock+=8000;assert.equal(g.expiryNotice(),null);
  g.day++;assert.equal(g.expiryNotice().name,'Whole Milk');assert.equal(g.expiryNotice().days,1);
  g.dismissExpiry('Whole Milk');assert.equal(g.expiryNotice(),null);
  assert.equal(InventorySim.restore(g.save()).expiryNotice(),null,'dismissal survives reload');
  assert.equal(g.expiringItems()[0].qty,4,'stockroom warning remains after dismissal');
  g.addLot('Whole Milk',2,.45,1);assert(g.expiryNotice());g.day++;assert.equal(g.expiryNotice(),null);assert.equal(g.stock('Whole Milk'),0);
}
// Loss alerts come only from actual failed customer orders and never consume stock.
{
  const g=new InventorySim(16);clear(g);g.skipTutorial();g.menu.cookie.enabled=false;g.phase='shift';g.briefed=true;g.introSeen=true;
  for(const name of MENU.find(p=>p.id==='latte').recipe)if(name!=='Whole Milk')g.addLot(name,20,.4,14);
  for(let i=0;i<3;i++)g.customer();
  const waiting=g.orders.filter(o=>o.status==='waiting');assert(waiting.length);
  const inventory=JSON.stringify(g.lots),cash=g.cash;
  assert.equal(g.lossNotice(),null,'waiting is not a lost sale');
  g.clock+=CONFIG.patience;g.processCustomers();
  const notice=g.lossNotice();assert(notice);assert.equal(notice.count,waiting.length);
  assert.deepEqual(notice.missing,['Whole Milk']);assert.deepEqual(notice.products,['latte']);
  near(notice.revenue,waiting.reduce((n,o)=>n+o.price,0),'loss revenue is actual quoted order total');
  assert.equal(JSON.stringify(g.lots),inventory);assert.equal(g.cash,cash);
  const losses=g.metrics.lost;waiting.forEach(o=>g.lose(o));assert.equal(g.metrics.lost,losses,'same order cannot lose twice');
  assert.equal(InventorySim.restore(g.save()).lossNotice().count,notice.count);
  fixtures['stock-loss']=g.save();g.dismissLosses();assert.equal(InventorySim.restore(g.save()).lossNotice(),null);
  g.customer();const priceOrder=g.orders.at(-1);if(priceOrder.status==='waiting')g.lose(priceOrder,'price');assert.equal(g.lossNotice(),null,'price loss is not a stock alert');
  g.finish();assert.equal(g.reports[0].stockLost,waiting.length);near(g.reports[0].stockLostRevenue,notice.revenue,'summary stock losses');
}
{
  const g=new InventorySim(8);clear(g);g.skipTutorial();g.introSeen=true;g.briefed=true;
  g.addLot('Whole Milk',4,.45,1);fixtures.expiry=g.save();
  fixtures['new-day-one']=new InventorySim(19725).save();
}
// Ratings reflect real quality, wait and availability outcomes in either direction.
{
  const good=new InventorySim(1),bad=new InventorySim(1);
  for(const g of [good,bad]){g.phase='shift';g.metrics.arrived=10;}
  good.metrics.served=10;good.metrics.satisfactionTotal=900;
  bad.metrics.served=1;bad.metrics.lost=9;bad.metrics.satisfactionTotal=40;
  good.finish();bad.finish();assert(good.rating>1);assert(bad.rating<1);
}
{
  const g=new InventorySim(42);let drinks=0,bakery=0;
  for(let i=0;i<1000;i++){g.customer();const o=g.orders.at(-1);drinks+=o.products.filter(id=>MENU.find(p=>p.id===id).kind==='drink').length;bakery+=o.products.filter(id=>MENU.find(p=>p.id===id).kind==='bakery').length;}
  assert.equal(drinks,1000);assert(bakery<220&&bakery>80,'Day 1 is coffee-led with occasional bakery');
  assert(!g.eventData().text.toLowerCase().includes('cookie'));
}
{
  const fs=require('node:fs');
  for(const file of ['dist/inventory.js','dist/inventory-engine.js']) {
    const source=fs.readFileSync(require('node:path').join(__dirname,'..',file),'utf8');
    assert(!/\p{Extended_Pictographic}/u.test(source),'no emoji in '+file);
    assert(!/Jules|quarantined/i.test(source),'simple, unnamed interface');
  }
}

// Five required teaching days, actual decisions, and reflection attempts persist independently.
{
  assert.equal(CONFIG.days,5);assert.equal(CONFIG.shiftSeconds,75);assert.equal(RESCUE.DAYS.length,5);
  const g=new InventorySim(4);clear(g);g.skipTutorial();g.briefed=true;
  for(const n of MENU[0].recipe)g.addLot(n,8,.2,14);
  assert(g.open());assert(g.commitPlan({servings:8,supplier:'quick'}));
  g.observe('supplier','quick');g.observe('supplier','budget');assert.equal(g.commitPlan({servings:8,supplier:'quick'}),null);
  assert.match(g.planProblem(),/Unpack/);g.placeOrder([line('Cup',1)]);waitPlanning(g);assert.equal(g.open(),null);
  g.tick(30);assert(g.pendingEvent,'event occurs inside the shortened shift');assert.equal(g.elapsed,30);
  assert.equal(g.chooseEvent('steady'),null);g.tick(75);assert.equal(g.phase,'review');assert.equal(g.nextDay(),false);
  const q=g.reviewOptions();assert.equal(q.options.length,3);const bad=q.options.find(o=>o[0]!==q.correct)[0],cash=g.cash,rating=g.rating;
  assert(g.reflect(bad));assert.equal(g.cash,cash);assert.equal(g.rating,rating);assert.equal(g.lesson.review,null);
  let restored=InventorySim.restore(g.save());assert.equal(restored.lesson.attempts.length,1);requiredReview(restored);
  assert.equal(restored.lesson.review.firstCorrect,false);assert.equal(restored.lesson.review.attempts,2);
  assert(restored.reflect(q.correct),'no repeated rewards');assert(restored.nextDay());assert.equal(restored.day,2);
  assert(restored.commitPlan({servings:12,buffer:3,reorder:3}));restored.observe('tab','trends');assert.equal(restored.commitPlan({servings:12,buffer:3,reorder:3}),null);
  assert.match(restored.planProblem(),/Cold Brew/);
  const record=restored.learningRecord();assert.equal(record.curriculum.length,5);record.events.length=0;assert(restored.learning.events.length);
}
{
  const g=new InventorySim(1);g.day=3;
  const plan={strategy:'hybrid',capacity:'helper',investment:'fridge',reason:'waste',buffer:3,reorder:3};
  g.cash=-740;assert(g.commitPlan(plan));assert.equal(g.cash,-740);assert(!g.helper);
  g.cash=-500;assert.equal(g.commitPlan(plan),null);assert(g.helper);assert(g.upgrades.includes('fridge'));near(g.cash,-567,'combined investment charged once');
  assert(g.commitPlan(plan));assert.equal(g.cash,-567);g.day=4;
  assert(g.commitPlan({prices:{latte:6,oat:999}}));assert.equal(g.commitPlan({prices:{latte:6.25,oat:7}}),null);assert.equal(g.menu.latte.price,6.25);
  for(let day=1;day<=5;day++){
    const r=new InventorySim(day);r.day=day;r.phase='shift';r.metrics.served=3;r.metrics.revenue=20;r.metrics.lostSales=7;r.finish();
    const q=r.reviewOptions();assert.equal(q.options.length,3);assert(q.topic);requiredReview(r);assert(r.lesson.review.firstCorrect);
    assert.equal(InventorySim.restore(r.save()).lesson.review.answer,q.correct);
  }
}
// A public-information player: small batches, periodic observed-stock checks, no future schedule.
function campaign(seed,style='balanced',saveMidway=false){
  let g=new InventorySim(seed);g.introSeen=true;const daily=[];
  const provider=()=>style==='premium'&&g.day>1?'premium':style==='budget'&&g.day>1?'budget':'quick';
  const stockUp=(planning=false)=>{
    clear(g);
    const active=g.activeIngredients(),lines=[];
    for(const name of active){
      const i=INVENTORY_ITEMS.find(i=>i.name===name),bakery=i.group==='bakery';
      const isFrozen=bakery&&g.strategy==='inhouse';
      const have=g.stock(name)+g.frozen(name)+g.incoming(name);
      const threshold=bakery?3:Math.max(4,Math.ceil(g.rate(name)*16));
      let target=bakery?(isFrozen?8:6):i.group==='supplies'?26:14;
      if(style==='hoard')target=g.capacity(name);
      if(!planning&&have>threshold&&style!=='hoard')continue;
      let qty=Math.max(0,Math.min(target-have,g.capacity(name)-g.occupied(name)-g.incoming(name)));
      if(isFrozen)qty=Math.floor(qty/4)*4;
      if(qty)lines.push(line(name,qty,provider(),isFrozen,style==='budget'));
    }
    if(lines.length){const q=g.quote(lines);if(q.total<=g.spendable)g.placeOrder(lines);}
  };
  const bake=()=>{
    if(g.strategy==='outsource')return;
    for(const p of MENU.filter(p=>p.kind==='bakery'&&g.menu[p.id].enabled))if(g.stock(p.name)<=3&&g.frozen(p.name)>=4)g.bake(p.name);
  };
  for(let day=1;day<=CONFIG.days;day++){
    if(seed===11&&style==='balanced'&&[2,3,4,5,6,7].includes(day))fixtures[`day-${day}`]=g.save();
    assert.equal(g.day,day);g.briefed=true;clear(g);
    g.setStrategy(style==='inhouse'?'inhouse':'outsource');
    if(style==='overprice'&&day>=4) for(const p of MENU)if(p.day<=day)g.setPrice(p.id,Math.floor(p.price*1.75*4)/4);
    if(style==='balanced'&&day===2)g.buyUpgrade('fridge');
    if(style==='premium'&&day===4)g.buyUpgrade('ordering');
    if(day>=3&&style==='inhouse')g.hireHelper();
    stockUp(true);waitPlanning(g);bake();waitPlanning(g);clear(g);
    requiredPlan(g,style);
    const opening=g.open();
    if(opening) return {seed,style,blocked:opening,day,cash:g.cash};
    for(let second=0;g.phase==='shift'&&second<1000;second++){
      if(g.pendingEvent){
        if(seed===11&&style==='balanced'&&day===5)fixtures.rush=g.save();
        const choices=g.pendingEvent.choices.map(c=>c[0]);
        const choice=choices.includes('steady')?'steady':choices.includes('repair')&&style==='inhouse'?'repair':choices.includes('outsource')?'outsource':choices.includes('quality')?'quality':choices.includes('alternative')?'alternative':choices[0];
        assert.equal(g.chooseEvent(choice),null);g.running=true;
      }
      shelve(g);bake();
      if(second%3===0&&g.elapsed<CONFIG.shiftSeconds-12)stockUp();
      g.tick(1);accounting(g);
      if(saveMidway&&day===4&&second===35){
        const copy=InventorySim.restore(g.save());assert(copy);g=copy;g.running=true;
      }
    }
    assert.equal(g.phase,'review');assert.equal(g.metrics.served+g.metrics.lost,g.metrics.arrived);
    const r=g.reports.at(-1);
    near(r.profit,r.revenue-r.cogs-r.waste-r.operating,'daily results');
    near(r.cash-r.openingCash,r.revenue-r.purchases-r.operating-r.conversion,'daily cash flow');
    daily.push({day,served:r.served,arrived:r.arrived,profit:Math.round(r.profit),cash:Math.round(g.cash)});
    accounting(g);assert.equal(g.finish(),false,'cannot collect result twice');
    if(seed===11&&style==='balanced')fixtures[`review-${day}`]=g.save();
    requiredReview(g);
    if(day<CONFIG.days)assert(g.nextDay());
  }
  const end=g.ending();assert(end);assert.equal(g.reports.length,5);
  assert(g.learningRecord().curriculum.every(c=>c.completed),'every campaign requires all five concept groups');
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
  assert(runs.every(r=>!r.blocked),`${style} can play all five days`);
  assert(runs.some(r=>['gold','silver','bronze'].includes(r.tier)),`${style} offers a viable rescue strategy`);
}
assert(results.filter(r=>r.style==='balanced').some(r=>['gold','silver'].includes(r.tier)),'good play can clear inherited debt');
const regular=results.filter(r=>r.style==='balanced').reduce((s,r)=>s+r.balance,0);
const excess=results.filter(r=>r.style==='hoard').reduce((s,r)=>s+(r.balance||-750),0);
assert(regular>excess,'filling every shelf should be worse than measured purchasing');
assert(results.some(r=>r.tier==='failure'||r.blocked),'success is not guaranteed');
console.log('PASS: inventory safety, FIFO, supplier risk, pricing, production, finance, persistence, and 18 five-day campaigns.');
if(process.argv.includes('--fixtures')){
  const fs=require('node:fs'),path=require('node:path');
  const html=fs.readFileSync(path.join(__dirname,'../dist/index.html'),'utf8');
  for(const [name,save] of Object.entries(fixtures)){
    const loader=`<script>if(location.port!=='8789')throw new Error('Use the isolated QA preview port 8789');localStorage.setItem('rise.cafe-rescue.five-day.v1',${JSON.stringify(save).replace(/</g,'\\u003c')});</script>`;
    fs.writeFileSync(path.join(__dirname,`.rescue-qa-${name}.html`),html.replace('<head>','<head><base href="/dist/">').replace('<script src="engine.js">',loader+'<script src="engine.js">'));
  }
  console.log('Generated isolated browser fixtures in tests/.rescue-qa-*.html. Serve on port 8789 only.');
}
