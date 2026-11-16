// Run: node tests/inventory-iteration2.test.cjs
// No dependencies. These tests exercise the actual shipped engine.
const assert=require('node:assert/strict');
global.window=global;
require('../dist/inventory-engine.js');
const clean=g=>INVENTORY_ITEMS.forEach(i=>g.discard(i.name));
const snapshot=lots=>lots.map(({rotationOrder,...lot})=>({...lot})).sort((a,b)=>a.id-b.id);
const order=(name,qty=2)=>({name,qty,supplier:'quick',frozen:false,express:false});
const wait=g=>{let n=0;while(g.deliveries.some(d=>!d.arrived&&!d.cancelled&&d.dueDay<=g.day)&&n++<50)g.advancePlanning();assert(n<50);g.deliveries.filter(d=>d.arrived&&!d.shelved).forEach(d=>g.shelve(d.id));};
let tests=0;
function test(name,fn){fn();tests++;console.log('PASS:',name);}
test('default FIFO is unchanged until the player rotates',()=>{
  const g=new InventorySim(4);clean(g);
  g.addLot('Whole Milk',2,.4,5,false,.95,null,1);g.addLot('Whole Milk',2,.7,1,false,.8,null,2);
  assert.equal(g.consume('Whole Milk').cost,.4);
});
test('explicit rotation uses the soonest usable expiry, changes no stock facts, and targets only that product',()=>{
  const g=new InventorySim(4);clean(g);
  g.addLot('Whole Milk',2,.4,5,false,.95,null,1);g.addLot('Whole Milk',2,.7,1,false,.8,null,2);
  g.addLot('Whole Milk',3,.5,3,true,.8,null,0);
  const before=snapshot(g.lots['Whole Milk']),coffee=JSON.stringify(g.lots['Original Blend']),cash=g.cash,metrics=JSON.stringify(g.metrics),seed=g.seed;
  assert.equal(g.rotate('Whole Milk'),true);
  assert.deepEqual(snapshot(g.lots['Whole Milk']),before);
  assert.equal(g.cash,cash);assert.equal(JSON.stringify(g.metrics),metrics);assert.equal(g.seed,seed);
  assert.equal(JSON.stringify(g.lots['Original Blend']),coffee);
  assert.equal(g.consume('Whole Milk').cost,.7);
  assert.equal(g.consume('Whole Milk',1,true).cost,.5);
  const xp=g.xp;g.rotate('Whole Milk');assert.equal(g.xp,xp,'repeated clicks cannot earn extra rewards');
});
test('rotation survives multiple deliveries, partial use, save/resume and a later round',()=>{
  let g=new InventorySim(5);clean(g);g.addLot('Whole Milk',4,.4,7,false,.9,null,1);g.addLot('Whole Milk',4,.7,3,false,.8,null,2);
  g.rotate('Whole Milk');assert.equal(g.consume('Whole Milk').cost,.7);
  assert.equal(g.placeOrder([order('Whole Milk')]),null);wait(g);
  assert.equal(g.placeOrder([order('Whole Milk')]),null);wait(g);
  g=InventorySim.restore(g.save());assert(g);assert.equal(g.consume('Whole Milk').cost,.7);
  g.phase='review';g.lesson.review={answer:'fifo'};assert(g.nextDay());
  assert.equal(g.day,2);assert.equal(g.consume('Whole Milk').cost,.7);
  const quantities=g.stock('Whole Milk');g.rotate('Whole Milk');assert.equal(g.stock('Whole Milk'),quantities);
});
test('expired batches never become usable after rotation and wastage is not charged twice',()=>{
  const g=new InventorySim(4);clean(g);g.addLot('Whole Milk',2,.4,1);g.addLot('Whole Milk',2,.7,4);
  g.rotate('Whole Milk');g.day=2;g.markExpired();const waste=g.metrics.waste;
  g.rotate('Whole Milk');assert.equal(g.consume('Whole Milk').cost,.7);assert.equal(g.metrics.waste,waste);
  g.discard('Whole Milk');g.markExpired();assert.equal(g.metrics.waste,waste);
  assert.equal(g.rotate('not a product'),false);assert.equal(g.rotate('Cup'),false);
});
test('legacy unrotated saves remain compatible; no timing, price or scoring constants change',()=>{
  const g=new InventorySim(1);const restored=InventorySim.restore(g.save());assert(restored);
  assert.equal(restored.save(),g.save());
  assert.equal(RESCUE.CONFIG.days,5);assert.equal(RESCUE.CONFIG.shiftSeconds,75);assert.equal(RESCUE.CONFIG.patience,12);
  assert.equal(RESCUE.CONFIG.openingCash,-500);assert.equal(RESCUE.CONFIG.creditLimit,750);
});
test('loss explanations record actual price, menu, stock and capacity outcomes without double losses',()=>{
  for(const reason of ['price','menu','stock','capacity']){
    const g=new InventorySim(8);clean(g);
    if(reason==='capacity')for(const name of RESCUE.MENU[0].recipe)g.addLot(name,2,.2,7);
    const o={id:++g.serial,name:'Test',products:['latte'],price:6,status:'waiting',arrival:g.clock};g.orders.push(o);g.metrics.arrived++;
    const cash=g.cash,lots=JSON.stringify(g.lots),seed=g.seed;
    g.lose(o,reason==='capacity'?'stock':reason);
    assert.equal(o.lossReason,reason);assert.equal(g.metrics.lost,1);assert.equal(g.metrics.lostSales,6);
    assert.equal(g.cash,cash);assert.equal(JSON.stringify(g.lots),lots);assert.equal(g.seed,seed);
    if(reason==='stock')assert(o.missingAtLoss.includes('Whole Milk'));
    if(reason==='capacity')assert.deepEqual(o.missingAtLoss,[]);
    g.lose(o);assert.equal(g.metrics.lost,1);assert.equal(InventorySim.restore(g.save()).orders.at(-1).lossReason,reason);
  }
});
test('delivery acknowledgement remains persistent and does not change delivery accounting',()=>{
  let g=new InventorySim(6);clean(g);g.placeOrder([order('Cup',4)]);wait(g);
  const d=g.deliveries[0],cash=g.cash,metrics=JSON.stringify(g.metrics),stock=g.stock('Cup');
  d.notified=true;g=InventorySim.restore(g.save());assert(g.deliveries[0].notified);
  g.processDeliveries();assert.equal(g.cash,cash);assert.equal(g.stock('Cup'),stock);assert.equal(JSON.stringify(g.metrics),metrics);
});
console.log(`PASS: ${tests} Inventory Manager iteration 2 engine regressions.`);
