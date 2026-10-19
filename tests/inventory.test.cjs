const assert=require('node:assert/strict');
global.window=global;require('../dist/inventory-engine.js');
const item=name=>INVENTORY_ITEMS.find(product=>product.name===name);
function rng(seed){return()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function receiveAll(g){g.deliveries.filter(d=>!d.received&&d.eta<=g.clock).forEach(d=>g.receive(d.id));}
function waitPlanning(g){const pending=g.deliveries.filter(d=>!d.received);g.clock=Math.max(g.clock,...pending.map(d=>d.eta));g.markExpired();receiveAll(g);}

const opening=new InventorySim(rng(1));
assert.equal(opening.balance,-35);assert.equal(opening.cash,90);
assert(INVENTORY_ITEMS.every(product=>opening.stock(product.name)===0));
assert.equal(opening.spoiled('Oat Milk'),4);
assert.equal(opening.consume('Oat Milk'),0,'expired food must never be served');
assert(opening.open());assert(opening.starter());
assert.equal(opening.clearExpired(),14);
assert.equal(opening.metrics.waste,0,'inherited writeoff must not be charged twice');
assert.equal(opening.metrics.cleared,14);assert(opening.quests.cleanup);
assert.equal(opening.clearExpired(),0);assert.equal(opening.xp,25);
assert.equal(opening.starter(),null);assert(opening.starter(),'kit cannot be bought twice');
assert.equal(opening.stock('Cup'),0,'kit is not instant');waitPlanning(opening);
assert.equal(opening.stock('Cup'),14);assert.equal(opening.stock('Cookie'),0);
assert.equal(opening.open(),null);

const choices=new InventorySim(rng(2));choices.clearExpired();
const fresh=choices.offer('Oat Milk','fresh'),deal=choices.offer('Oat Milk','value');
assert(deal.unit<fresh.unit);assert(deal.life<fresh.life);assert(deal.lead>fresh.lead);
assert.equal(choices.offer('Cup','value'),null);
assert(choices.purchase({'Oat Milk':3},'CupCraft'));
assert(choices.purchase({'Oat Milk':0},'Oatfield'));
assert(choices.purchase({'Oat Milk':1.5},'Oatfield'));
assert(choices.purchase({'Oat Milk':100},'Oatfield'));
assert(choices.purchase({'Oat Milk':3,'Whole Milk':2},'Oatfield'));
assert.equal(choices.purchase({'Oat Milk':3},'Oatfield','value'),null);
assert.equal(choices.receive(1),false);waitPlanning(choices);
assert.equal(choices.receive(1),false,'receive once only');
assert.equal(choices.stock('Oat Milk'),3);choices.clock+=76;choices.markExpired();
assert.equal(choices.stock('Oat Milk'),0);assert.equal(choices.spoiled('Oat Milk'),3);
assert(Math.abs(choices.metrics.waste-deal.unit*3)<1e-9);
const charged=choices.metrics.waste;choices.discard('Oat Milk');assert.equal(choices.metrics.waste,charged);

const bakery=new InventorySim(rng(3));bakery.clearExpired();
assert.equal(bakery.purchase({Cookie:6},'Cookie Corner','frozen'),null);waitPlanning(bakery);
assert.equal(bakery.stock('Cookie'),0);assert.equal(bakery.frozen('Cookie'),6);
assert.equal(bakery.bake('Cookie'),null);assert(bakery.bake('Cookie'),'single oven capacity');
assert.equal(bakery.frozen('Cookie'),3);
bakery.starterUsed=true;bakery.running=true;for(let n=0;n<25;n++)bakery.tick(1);
assert.equal(bakery.stock('Cookie'),3);assert.equal(bakery.oven,null);
const upgradeCash=bakery.cash;assert(bakery.buyUpgrade('delivery'));assert.equal(bakery.cash,upgradeCash,'no upgrades during the opening tutorial or a running chapter');
assert(!INVENTORY_ITEMS.some(product=>product.name==='Baking Mix'));

const unknown=new InventorySim(rng(5));
assert(!('schedule' in unknown),'no future schedule is generated');
assert(Object.values(unknown.forecast()).every(qty=>qty===0),'forecast starts from observations, not future recipes');
const paused=unknown.clock;unknown.tick(100);assert.equal(unknown.clock,paused);

const runs=[];
for(let seed=1;seed<=6;seed++){
  const openingPlay=new InventorySim(rng(seed));openingPlay.clearExpired();openingPlay.starter();openingPlay.purchase({Cookie:4},'Cookie Corner');waitPlanning(openingPlay);openingPlay.open();
  for(let second=0;second<85;second++)openingPlay.tick(1);
  assert(openingPlay.metrics.served>0,'the featured-pastry opening should produce an early playable win');
  assert(openingPlay.orders.every(order=>!order.recipe.bakery||order.recipe.bakery==='Cookie'));
}
for(let seed=1;seed<=6;seed++){
  const g=new InventorySim(rng(seed));g.clearExpired();g.starter();
  g.purchase({Cookie:4},'Cookie Corner');g.purchase({Croissant:4},'Butter Fold');waitPlanning(g);
  let totalServed=0,totalArrived=0;
  for(let chapter=0;chapter<3;chapter++){
    g.clearExpired();assert.equal(g.open(),null);
    while(!g.ended){
      if(g.pendingEvent)g.chooseEvent(seed%2?'promote':'steady');
      g.tick(1);receiveAll(g);
      if(Math.floor(g.elapsed)%5===0){
        g.clearExpired();
        // A player strategy based only on observed requests and visible stock.
        for(const [name,count]of Object.entries(g.metrics.demand)){
          const qty=g.suggested(name);
          if(count&&qty&&g.elapsed+item(name).lead<300)g.purchase({[name]:qty},item(name).company);
        }
      }
      assert(INVENTORY_ITEMS.every(product=>g.stock(product.name)>=0));
    }
    const report=g.reports.at(-1);totalServed+=report.served;totalArrived+=report.arrived;
    assert.equal(report.served+report.lost,report.arrived);
    assert(Math.abs(report.profit-(report.revenue-report.cogs-report.waste-report.fees))<1e-8);
    assert(g.cash>=0);
    if(chapter===0){const before=report.profit;if(g.cash>=12){assert.equal(g.buyUpgrade('fridge'),null);assert.equal(report.profit,before-12);assert(g.buyUpgrade('delivery'));}}
    if(chapter<2)g.next();
  }
  assert.equal(g.reports.length,3);assert(totalServed/totalArrived>=.65,`recoverable strategy, seed ${seed}: ${totalServed}/${totalArrived}`);
  assert(g.balance>0,`recovery should be achievable, seed ${seed}`);
  runs.push({seed,served:totalServed,arrived:totalArrived,balance:g.balance.toFixed(2)});
}
assert(new Set(runs.map(run=>run.arrived)).size>1,'replays must not have a fixed customer count');
console.log('PASS: opening deficit, quarantine/disposal, no double writeoff, cash, supplier choices, expiration, frozen stock, oven bottleneck, uncertain arrivals, observed forecasts, story decisions, upgrades, and six recoverable three-chapter runs.');
console.log(runs);
