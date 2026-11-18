// Focused regressions for iteration 2 on deployed base 442e348 (inventory-manager).
const assert=require('node:assert/strict');
global.window=global;require('../dist/inventory-engine.js');
let passed=0;const test=(name,fn)=>{fn();passed++;console.log('PASS: '+name);};
const clear=g=>INVENTORY_ITEMS.forEach(i=>g.discard(i.name));
const facts=g=>Object.fromEntries(Object.entries(g.lots).map(([n,list])=>[n,list.map(({rotationOrder,...lot})=>lot).sort((a,b)=>a.id-b.id)]));
const cashFacts=g=>JSON.stringify({cash:g.cash,metrics:g.metrics,inventory:g.inventoryValue().toFixed(8),seed:g.seed,planning:g.planningExpiresAt});
function batches(){const g=new InventorySim(42);clear(g);g.addLot('Whole Milk',3,.45,5,false,.9,null,1);g.addLot('Whole Milk',2,.4,1,false,.8,null,9);return g;}
test('deployed 90-second preparation, five days and 75-second shifts are retained',()=>{
 assert.equal(RESCUE.CONFIG.planningSeconds,90);assert.equal(RESCUE.CONFIG.shiftSeconds,75);assert.equal(RESCUE.CONFIG.days,5);
 const g=new InventorySim(42);assert.equal(g.cash,-500);assert.equal(g.spendable,250);assert.equal(g.planningTimeLeft(),90);
});
test('ordinary stock still uses receipt-order FIFO without a rotation',()=>{
 const g=batches(),old=g.lots['Whole Milk'][0],soon=g.lots['Whole Milk'][1];assert.equal(g.consume('Whole Milk').cost,.45);
 assert.equal(old.qty,2);assert.equal(soon.qty,2);assert(!Object.values(g.lots).flat().some(l=>'rotationOrder' in l));
});
test('manual rotation targets the correct product and changes no quantity, date, cost or financial calculation',()=>{
 const g=batches(),before=facts(g),cash=cashFacts(g),other=JSON.stringify(g.lots['Original Blend']);
 assert(g.rotate('Whole Milk'));assert.deepEqual(facts(g),before);assert.equal(cashFacts(g),cash);assert.equal(JSON.stringify(g.lots['Original Blend']),other);
 assert.equal(g.lots['Whole Milk'][0].expires,g.day+1);assert.equal(g.consume('Whole Milk').cost,.4);
 const xp=g.xp;g.rotate('Whole Milk');assert.equal(g.xp,xp,'reward is not repeatable');
});
test('chosen order survives partial consumption, repeated deliveries, saves and later rounds',()=>{
 let g=batches();g.rotate('Whole Milk');g.consume('Whole Milk');
 const first=g.lots['Whole Milk'][0].id;
 for(let n=0;n<2;n++){
  assert.equal(g.placeOrder([{name:'Whole Milk',qty:2,supplier:'quick',frozen:false,express:false}]),null);
  g.advancePlanning();g.deliveries.filter(d=>d.arrived&&!d.shelved).forEach(d=>g.shelve(d.id));
  assert.equal(g.lots['Whole Milk'][0].id,first,'new delivery must not reset manual order');
  g=InventorySim.restore(g.save());assert(g);assert.equal(g.lots['Whole Milk'][0].id,first);
 }
 g.consume('Whole Milk');g.day=2;g.beginDay();g.markExpired();
 const before=facts(g);assert(g.rotate('Whole Milk'));assert.deepEqual(facts(g),before);assert.equal(InventorySim.restore(g.save()).lots['Whole Milk'][0].id,g.lots['Whole Milk'][0].id);
});
test('expired goods stay blocked and frozen/ready quantities remain separate',()=>{
 const g=batches();g.addLot('Cookie',4,.9,2,true);g.addLot('Cookie',2,1,1,false);
 const ready=g.stock('Cookie'),frozen=g.frozen('Cookie');g.rotate('Cookie');assert.equal(g.stock('Cookie'),ready);assert.equal(g.frozen('Cookie'),frozen);
 assert.equal(g.consume('Cookie',1,true).cost,.9);assert.equal(g.stock('Cookie'),ready);
 g.day=2;g.markExpired();const waste=g.metrics.waste;g.rotate('Whole Milk');assert(g.lots['Whole Milk'].some(l=>l.expires<=g.day));
 assert.equal(g.consume('Whole Milk').cost,.45);g.discard('Whole Milk');assert.equal(g.metrics.waste,waste);
 g.lots['Whole Milk']=[];assert.equal(g.rotate('Whole Milk'),false);assert.equal(g.rotate('Unknown'),false);
});
test('real loss reasons persist without changing penalties, counts or stock',()=>{
 const g=batches();
 for(const reason of ['price','menu','stock','capacity']){
  if(reason==='capacity')for(const n of RESCUE.MENU[0].recipe)g.addLot(n,2,.1,14);
  const o={id:++g.serial,products:['latte'],price:6,status:'waiting',arrival:g.clock};g.orders.push(o);
  const cash=g.cash,lots=facts(g),lost=g.metrics.lost;
  g.lose(o,reason==='capacity'?'stock':reason);assert.equal(o.lossReason,reason);assert.equal(g.metrics.lost,lost+1);
  assert.equal(g.cash,cash);assert.deepEqual(facts(g),lots);g.lose(o);assert.equal(g.metrics.lost,lost+1);
 }
 assert.equal(g.metrics.priceLost,1);assert.equal(g.metrics.menuLost,1);assert.equal(g.metrics.stockLost,1);
 const copy=InventorySim.restore(g.save());assert.deepEqual(copy.orders.map(o=>o.lossReason),['price','menu','stock','capacity']);
});
test('event explanations record only successful choices and do not duplicate effects',()=>{
 const g=new InventorySim(42);g.pendingEvent=g.eventData();const before=g.cash;
 assert(g.chooseEvent('not-a-choice'));assert(!g.learning.events.some(e=>e.kind==='story-choice'));
 assert.equal(g.chooseEvent('promote'),null);assert.equal(g.cash,before);assert.equal(g.promotion,'latte');
 const record=g.learning.events.find(e=>e.kind==='story-choice');assert.equal(record.choice,'Feature Vanilla Latte');assert(record.effect);
 const xp=g.xp;assert(g.chooseEvent('promote'));assert.equal(g.xp,xp);assert.equal(g.learning.events.filter(e=>e.kind==='story-choice').length,1);
 assert.deepEqual(InventorySim.restore(g.save()).learning.events.find(e=>e.kind==='story-choice'),record);
});
test('legacy saves and delivery notification acknowledgements remain compatible',()=>{
 const g=batches();assert.equal(InventorySim.restore(g.save()).consume('Whole Milk').cost,.45);
 g.placeOrder([{name:'Cup',qty:2,supplier:'quick',frozen:false,express:false}]);g.advancePlanning();g.shelve(g.deliveries[0].id);
 g.deliveries[0].notified=true;const restored=InventorySim.restore(g.save());assert(restored.deliveries[0].notified);assert.equal(restored.stock('Cup'),2);
});
console.log(`PASS: ${passed} deployed-base iteration 2 engine regressions.`);
