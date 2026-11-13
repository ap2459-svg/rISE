// Run: node tests/inventory-empty-stock.test.cjs
const assert=require('node:assert/strict');
global.window=global;
require('../dist/inventory-engine.js');
const empty=()=>{const g=new InventorySim();for(const i of INVENTORY_ITEMS)g.lots[i.name]=[];return g;};
const apply=(cart,plan)=>{for(const l of plan.lines){const old=cart.find(c=>c.name===l.name&&!!c.frozen===!!l.frozen);if(old)old.qty+=l.qty;else cart.push({...l});}};
const line=(name,qty)=>({name,qty,supplier:'budget',frozen:false,express:true});
{
  const g=empty(),cart=[line('Whole Milk',1),line('Cup',30)];
  const before=JSON.stringify(cart),plan=g.emptyStockPlan(cart);
  assert.equal(JSON.stringify(cart),before,'planning does not mutate cart');
  assert.equal(plan.lines.length,INVENTORY_ITEMS.length-1,'every empty item, across categories');
  apply(cart,plan);
  assert.equal(cart.length,INVENTORY_ITEMS.length);
  const milk=cart.find(l=>l.name==='Whole Milk');
  assert.equal(milk.qty,g.suggested('Whole Milk')||6);
  assert.equal(milk.supplier,'budget');assert.equal(milk.express,true);
  assert.equal(cart.find(l=>l.name==='Cup').qty,30,'larger quantities preserved');
  assert(g.quote(cart).total>0);
  const filled=JSON.stringify(cart),total=g.quote(cart).total;
  for(let n=0;n<10;n++){const p=g.emptyStockPlan(cart);assert.equal(p.lines.length,0);apply(cart,p);}
  assert.equal(JSON.stringify(cart),filled);assert.equal(g.quote(cart).total,total);
}
{
  const g=empty();
  for(const i of INVENTORY_ITEMS)g.lots[i.name]=[{qty:1,expires:g.day+2,frozen:false}];
  assert.equal(g.emptyStockPlan().lines.length,0,'no out-of-stock items');
}
{
  const g=empty();
  g.lots['Whole Milk']=[{qty:g.capacity('Whole Milk'),expires:g.day,frozen:false}];
  const plan=g.emptyStockPlan();
  assert(plan.skipped.some(s=>s.name==='Whole Milk'&&/shelf space/.test(s.reason)));
  assert(plan.lines.some(l=>l.name==='Cup'),'other items still added');
  g.lots['Whole Milk']=[];
  assert.equal(g.emptyStockPlan([], 'missing').lines.length,0);
  assert(g.emptyStockPlan([], 'missing').skipped.every(s=>/unavailable/.test(s.reason)));
  g.phase='review';assert.equal(g.emptyStockPlan().lines.length,0);
}
{
  const g=empty();g.strategy='inhouse';
  assert(g.emptyStockPlan().lines.filter(l=>INVENTORY_ITEMS.find(i=>i.name===l.name).group==='bakery').every(l=>l.frozen));
  g.lots.Cookie=[{qty:4,expires:g.day+2,frozen:true}];
  assert(!g.emptyStockPlan().lines.some(l=>l.name==='Cookie'),'usable frozen stock is not empty');
  const plan=g.emptyStockPlan([line('Croissant',1)]);
  assert(plan.skipped.some(s=>s.name==='Croissant'&&/strategy/.test(s.reason)));
}
console.log('PASS: bulk empty-stock planning, preserved carts, repeated clicks, no empty items, limits, suppliers and bakery packs.');
