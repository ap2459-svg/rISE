const test=require('node:test');
const assert=require('node:assert/strict');
const {InventoryShift,catalog}=require('./inventory-engine.js');
test('ordering enforces budget, valid portions, and closing time',()=>{
 const s=new InventoryShift(()=>.99);
 for(const q of [0,-1,1.5,NaN,101])assert.ok(s.order('Oat Milk',q,'local'));
 assert.ok(s.order('unknown',10,'local'));
 for(let i=0;i<4;i++)assert.equal(s.order('Cookies',100,'local'),i===0?null:'This order exceeds your remaining purchasing budget.');
 assert.ok(s.spent<=s.budget);s.time=59;assert.ok(s.order('Cups',1,'local'));
});
test('supplier deliveries respect lead time and freshness',()=>{
 const s=new InventoryShift(()=>.99),before=s.qty('Croissants');
 assert.equal(s.order('Croissants',10,'premium'),null);
 s.tick();assert.equal(s.qty('Croissants'),before);s.tick();assert.equal(s.qty('Croissants'),before+10);
 assert.equal(s.stock.Croissants[1].expires,16);
});
test('stockouts lose sales without consuming a partial recipe',()=>{
 const s=new InventoryShift(()=>.4);s.stock.Cups=[];
 const before=s.qty('Original Blend');s.customer();assert.equal(s.lost,1);assert.equal(s.served,0);assert.equal(s.qty('Original Blend'),before);assert.equal(s.revenue,0);assert.equal(s.stockouts,1);
});
test('fulfilled orders consume every component and record cost',()=>{
 const s=new InventoryShift(()=>.4);const before=s.qty('Cups');s.customer();assert.equal(s.served,1);assert.equal(s.qty('Cups'),before-1);assert.equal(s.revenue,5.5);assert.ok(s.cogs>0);
});
test('expiry records waste once, and shift cannot run past closing',()=>{
 const s=new InventoryShift(()=>.99);for(let i=0;i<60;i++)s.tick();assert.equal(s.time,60);assert.ok(s.waste>0);assert.ok(s.wasteCost>0);assert.ok(s.score>=0&&s.score<=100);const snapshot=JSON.stringify(s);s.tick();assert.equal(JSON.stringify(s),snapshot);
});
test('random strategies preserve nonnegative stock and accounting',()=>{
 let seed=42;const rand=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const s=new InventoryShift(rand);
 for(let i=0;i<60;i++){const p=catalog[Math.floor(rand()*catalog.length)];s.order(p.name,Math.ceil(rand()*20),'local');s.tick();assert.ok(s.spent<=s.budget);for(const p of catalog)assert.ok(s.qty(p.name)>=0);}
 const remaining=catalog.reduce((sum,p)=>sum+s.stock[p.name].reduce((a,b)=>a+b.qty*b.cost,0),0);
 assert.ok(Math.abs(s.openingValue+s.spent-s.cogs-s.wasteCost-remaining)<1e-8);
 assert.equal(s.profit,s.revenue-s.cogs-s.wasteCost-s.holding);
});
