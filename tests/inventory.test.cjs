const assert = require('node:assert/strict');
global.window = global;
require('../dist/inventory-engine.js');
const product = name => INVENTORY_ITEMS.find(item => item.name === name);

assert(!INVENTORY_ITEMS.some(item => item.name === 'Baking Mix'));
for (const name of ['Cup','Lid','Straw','Utensil','Bakery Bag','Napkin']) {
  assert(product(name));
  assert.equal(new InventorySim().stock(name),16);
}
assert(INVENTORY_ITEMS.every(item => item.company && item.lead > 0));
assert.equal(new Set(INVENTORY_ITEMS.map(item => item.company)).size,INVENTORY_ITEMS.length);

const g = new InventorySim();
assert.equal(g.purchase({'Oat Milk':4},'CupCraft'),'Order this product from its assigned company.');
assert(g.purchase({'Oat Milk':0},'Oatfield'));
assert(g.purchase({'Oat Milk':1.5},'Oatfield'));
assert(g.purchase({'Cup':100},'CupCraft'));
assert(g.purchase({'Oat Milk':2,'Whole Milk':1},'Oatfield'));
const cash = g.cash;
assert.equal(g.purchase({'Oat Milk':4},'Oatfield'),null);
assert(Math.abs(g.cash - (cash - 1.45)) < 1e-9);
assert.equal(g.deliveries[0].eta,25);
assert.equal(g.receive(1),false);
g.running = true;
for (let t = 0; t < 25; t++) g.tick(1);
assert.equal(g.receive(1),true);
assert.equal(g.receive(1),false);
assert(g.stock('Oat Milk') >= 4);
assert.equal(g.stock('Baking Mix'),0);
g.elapsed = 290;
assert(g.purchase({Cup:1},'CupCraft'));

const recipe = new InventorySim().recipe(1);
assert(new InventorySim().needed(recipe).includes('Lid'));
assert(new InventorySim().needed(recipe).includes('Napkin'));
const special = {...recipe,coffee:'Cold Brew',bakery:'Breakfast Sandwich'};
for (const name of ['Straw','Bakery Bag','Utensil']) assert(new InventorySim().needed(special).includes(name));

// A viable player strategy: buy recommended stock from each product's assigned supplier.
const planned = new InventorySim();
let served = 0;
for (let shift = 0; shift < 3; shift++) {
  for (const item of INVENTORY_ITEMS) {
    const quantity = planned.suggested(item.name);
    if (quantity) assert.equal(planned.purchase({[item.name]:quantity},item.company),null);
  }
  planned.running = true;
  while (!planned.ended) {
    planned.tick(1);
    planned.deliveries.filter(delivery => !delivery.received && delivery.eta <= planned.clock).forEach(delivery => planned.receive(delivery.id));
    // Recheck after spoilage or changing demand, as a player would during a shift.
    if (planned.elapsed % 5 === 0) for (const item of INVENTORY_ITEMS) {
      const quantity = planned.suggested(item.name);
      if (quantity && planned.elapsed + item.lead < 300) assert.equal(planned.purchase({[item.name]:quantity},item.company),null);
    }
  }
  served += planned.metrics.served;
  assert.equal(planned.metrics.served + planned.metrics.lost,planned.schedule.length);
  const report = planned.reports.at(-1);
  assert(Math.abs(report.profit - (report.revenue-report.cogs-report.waste-report.fees)) < 1e-9);
  assert(INVENTORY_ITEMS.every(item => planned.stock(item.name) >= 0));
  if (shift < 2) planned.next();
}
assert(served >= 22);
assert.equal(planned.reports.length,3);
assert(planned.reports.some(report => report.waste > 0));
const pause = new InventorySim();
pause.tick(30);
assert.equal(pause.clock,0);
console.log(`PASS: six relevant supplies, assigned suppliers, budget, capacity, lead time, one-time receipt, closing cutoff, consumption, pause, three shifts, waste, and accounting. Served ${served}/24.`);
