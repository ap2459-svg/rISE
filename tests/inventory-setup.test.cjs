const assert=require('node:assert/strict');
global.window=global;require('../dist/inventory-engine.js');
const {CONFIG,MENU}=RESCUE;
const near=(a,b)=>assert(Math.abs(a-b)<1e-6,`${a} != ${b}`);
// Reloads retain the active wall deadline; repeated rendering cannot extend it.
{
 const g=new InventorySim(42),wall=Date.now();g.resumePlanningClock(1000,wall);
 for(let n=1;n<20;n++)g.resumePlanningClock(1000+n*1000,wall+n*1000);
 const restored=InventorySim.restore(g.save(31000));assert(restored);
 assert.equal(restored.planningTimeLeft(999999,wall+50000),40);
 restored.resumePlanningClock(900000,wall+50000);
 assert.equal(restored.planningExpiresAt,g.planningExpiresAt);
 assert.equal(restored.planningTimeLeft(950000,wall+100000),0);
 assert.equal(g.planningTimeLeft(91000,wall-30000),0,'a backward wall-clock change cannot extend the monotonic deadline');
 const old=JSON.parse(g.save(31000));delete old.state.planningExpiresAt;delete old.state.openingOwed;
 assert(InventorySim.restore(JSON.stringify(old)),'previous saves migrate');
 for(const bad of ['',42,'not a date']){old.state.planningExpiresAt=bad;assert.equal(InventorySim.restore(JSON.stringify(old)),null);}
}
// Every morning can open at expiry without stock, fake observations, cart purchases or upgrades.
{
 const g=new InventorySim(42);g.tutorial.cart=[{name:'Cup',qty:7,supplier:'quick',frozen:false,express:false}];
 for(let day=1;day<=5;day++){
  assert.equal(g.planningRemaining,90);g.briefed=true;
  g.lesson.draft={servings:'7',supplier:'premium',buffer:'',reorder:'no',capacity:'helper',investment:'fridge',strategy:'outsource','price-latte':'not a price'};
  const before={lots:JSON.stringify(g.lots),cart:JSON.stringify(g.tutorial.cart),cash:g.cash,upgrades:JSON.stringify(g.upgrades),strategy:g.strategy};
  g.planningRemaining=0;assert.equal(g.open(),null);assert.equal(g.phase,'shift');assert(g.running);
  assert(g.lesson.plan.automatic);assert.equal(g.lesson.compared.length,0);assert.equal(g.lesson.viewed.length,0);
  assert.equal(g.metrics.purchases,0);assert.equal(g.deliveries.length,0);
  assert.equal(JSON.stringify(g.lots),before.lots);assert.equal(JSON.stringify(g.tutorial.cart),before.cart);
  assert.equal(JSON.stringify(g.upgrades),before.upgrades);assert.equal(g.strategy,before.strategy);assert.equal(g.helper,false);
  assert.equal(g.cash,before.cash-CONFIG.dailyOverhead);assert.equal(g.metrics.operating,CONFIG.dailyOverhead);
  assert.equal(g._planningDeadline,null);assert.equal(g.planningExpiresAt,null);
  if([1,2,5].includes(day))assert.equal(g.lesson.plan.servings,7);
  assert(g.open());assert.equal(g.metrics.operating,CONFIG.dailyOverhead,'duplicate starts do not charge twice');
  assert.equal(g.learning.events.filter(e=>e.kind==='opening'&&e.day===day).length,1);
  assert(InventorySim.restore(g.save()),'automatic plans restore');
  g.finish();assert.equal(g.reflect(g.reviewOptions().correct),null);if(day<5)assert(g.nextDay());
 }
}
// Normal opening costs remain real expenses even when credit is exhausted.
{
 const g=new InventorySim(42);g.briefed=true;g.cash=-749;g.planningRemaining=0;
 const balance=g.balance,lots=JSON.stringify(g.lots);
 assert.equal(g.open(),null);assert.equal(g.cash,-750);assert.equal(g.openingOwed,13);assert.equal(g.spendable,0);
 near(g.balance,balance-14);assert.equal(g.metrics.operating,14);assert.equal(JSON.stringify(g.lots),lots);
 assert.equal(g.consume('Whole Milk'),null,'expired goods still cannot sell');
 assert.equal(InventorySim.restore(g.save()).openingOwed,13);
 for(const i of INVENTORY_ITEMS)g.discard(i.name);
 for(const n of MENU[0].recipe)g.addLot(n,5,.1,14);
 g.menu.cookie.enabled=false;g.seed=42;g.customer();g.processCustomers();g.clock+=CONFIG.serviceSeconds;g.processCustomers();
 assert(g.metrics.revenue>0);near(g.openingOwed,13-g.metrics.revenue);assert.equal(g.cash,-750);assert.equal(g.metrics.operating,14,'repaying owed cost is not a second expense');
 g.finish();assert.equal(g.reports[0].openingOwed,g.openingOwed);
 const e=new InventorySim(1);e.briefed=true;e.upgrades.push('energy');e.planningRemaining=0;const cash=e.cash;assert.equal(e.open(),null);assert.equal(e.cash,cash-9);
}
// Explicit refunds repay owed fees without counting them twice, and unpaid fees carry overnight.
{
 const g=new InventorySim(42);g.placeOrder([{name:'Cup',qty:20,supplier:'budget',frozen:false,express:false}]);
 const refund=g.deliveries[0].lines.reduce((sum,line)=>sum+line.qty*line.cost,0);
 g.cash=-750;g.briefed=true;g.planningRemaining=0;assert.equal(g.open(),null);assert.equal(g.openingOwed,14);
 const operating=g.metrics.operating;assert.equal(g.deliveryDecision(g.deliveries[0].id,'refund'),null);
 near(g.openingOwed,14-refund);assert.equal(g.cash,-750);assert.equal(g.metrics.operating,operating);
 g.finish();g.reflect(g.reviewOptions().correct);assert(g.nextDay());g.briefed=true;g.planningRemaining=0;
 assert.equal(g.open(),null);near(g.openingOwed,28-refund);assert.equal(g.metrics.operating,14);
 assert.equal(InventorySim.restore(g.save()).openingOwed,g.openingOwed);
}
// A real order from a newly chosen supplier satisfies the first-shift preparation.
{
 const g=new InventorySim(42);g.briefed=true;g.skipTutorial();INVENTORY_ITEMS.forEach(i=>g.discard(i.name));
 g.observe('supplier','quick');g.observe('supplier','premium');assert.equal(g.commitPlan({servings:7,supplier:'quick'}),null);
 g.placeOrder([{name:'Cup',qty:1,supplier:'premium',frozen:false,express:false}]);g.advancePlanning();g.deliveries.forEach(d=>g.shelve(d.id,true));
 for(const n of MENU[0].recipe)g.addLot(n,5,.1,14);
 assert.equal(g.openingProblem(),null);assert.equal(g.open(),null);
}
console.log('PASS: persistent deadlines, all five automatic starts, safe free defaults, unpaid opening-cost accounting, duplicate prevention, supplier changes and save compatibility.');
