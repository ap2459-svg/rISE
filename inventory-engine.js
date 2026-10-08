/* Independent Inventory Manager simulation. Units are recipe portions; time is café minutes. */
(() => {
const groups = {
 Coffee: ['Original Blend','Cold Brew','Decaf'],
 Milk: ['Almond Milk','Oat Milk','Whole Milk','Cream','Sweet Cream'],
 Syrup: ['Vanilla','Caramel','Mocha','Pumpkin Spice','Brown Sugar'],
 Topping: ['Whipped Cream','Cinnamon','Chocolate Drizzle','Cold Foam','Caramel Drizzle'],
 Supply: ['Cups','Lids','Napkins'],
 Bakery: ['Croissants','Breakfast Sandwiches','Cookies']
};
const suppliers = {
 value: {name:'Value Wholesale', multiplier:.8, lead:8, quality:.85},
 local: {name:'Local Cooperative', multiplier:1, lead:4, quality:1},
 premium: {name:'Artisan Express', multiplier:1.3, lead:2, quality:1.15}
};
const catalog = Object.entries(groups).flatMap(([group,names])=>names.map((name,i)=>({name,group,cost:group==='Bakery'?1.5+i*.3:group==='Coffee'?.65:group==='Supply'?.12:.3,life:group==='Bakery'?12:group==='Milk'||name==='Cold Foam'||name==='Whipped Cream'?24:90,initial:group==='Supply'?36:group==='Coffee'?14:group==='Bakery'?7:10})));
class InventoryShift {
 constructor(random=Math.random){this.random=random;this.time=0;this.duration=60;this.budget=250;this.spent=0;this.revenue=0;this.lostRevenue=0;this.lost=0;this.served=0;this.requests=0;this.stockouts=0;this.waste=0;this.wasteCost=0;this.cogs=0;this.holding=0;this.area=0;this.deliveries=[];this.log=[];this.prices={drink:5.5,bakery:4};this.used={};this.stock=Object.fromEntries(catalog.map(p=>[p.name,[{qty:p.initial,cost:p.cost,expires:p.life,quality:1}]]));this.openingValue=catalog.reduce((s,p)=>s+p.initial*p.cost,0);}
 qty(name){return this.stock[name].reduce((s,b)=>s+b.qty,0);}
 incoming(name){return this.deliveries.filter(d=>d.name===name).reduce((s,d)=>s+d.qty,0);}
 phase(){return this.time<15?'Morning warm-up':this.time<30?'Oat Milk demand increased!':this.time<45?'Rush! Cold Brew is trending!':'Customers are ordering more bakery items!';}
 rate(p){const total=this.requests?Object.values(this.used).reduce((s,n)=>s+n,0):0;return this.time>=5&&total?(this.used[p.name]||0)/this.time:(p.group==='Supply'?.9:p.group==='Coffee'?.3:p.group==='Bakery'?.18:.16);}
 reorder(p,supplier='local'){return Math.ceil(this.rate(p)*(suppliers[supplier].lead+(p.group==='Bakery'?2:4)));}
 order(name,qty,supplier){const p=catalog.find(p=>p.name===name),s=suppliers[supplier];if(!p||!s||!Number.isInteger(qty)||qty<1||qty>100)return 'Choose 1–100 whole portions.';if(this.time>=this.duration)return 'The shift has ended.';const cost=qty*p.cost*s.multiplier;if(cost>this.budget-this.spent+1e-9)return 'This order exceeds your remaining purchasing budget.';if(this.time+s.lead>=this.duration)return 'This delivery would arrive after closing.';this.spent+=cost;this.deliveries.push({name,qty,cost:p.cost*s.multiplier,quality:s.quality,at:this.time+s.lead,life:p.life,supplier:s.name});return null;}
 price(kind,value){if(!['drink','bakery'].includes(kind)||!Number.isFinite(value)||value<1||value>12)return false;this.prices[kind]=value;return true;}
 take(name){const batches=this.stock[name].sort((a,b)=>a.expires-b.expires),b=batches.find(b=>b.qty>0);b.qty--;this.cogs+=b.cost;return b.quality;}
 choose(group){const names=groups[group];if(group==='Milk'&&this.time>=15&&this.random()<.55)return 'Oat Milk';if(group==='Coffee'&&this.time>=30&&this.time<45&&this.random()<.65)return 'Cold Brew';return names[Math.floor(this.random()*names.length)];}
 customer(){const bakery=this.random()<(this.time>=45?.65:.3),kind=bakery?'bakery':'drink',price=this.prices[kind];if(this.random()>Math.min(1,(bakery?4:5.5)/price))return;const recipe=bakery?[this.choose('Bakery'),'Napkins']:[this.choose('Coffee'),this.choose('Milk'),this.choose('Syrup'),this.choose('Topping'),'Cups','Lids','Napkins'];this.requests++;recipe.forEach(n=>this.used[n]=(this.used[n]||0)+1);const missing=recipe.filter(n=>this.qty(n)<1);if(missing.length){this.stockouts+=missing.length;this.lost++;this.lostRevenue+=price;this.log.unshift(`Lost ${kind} sale: ${missing.join(', ')} out of stock.`);}else{const quality=recipe.reduce((s,n)=>s+this.take(n),0)/recipe.length;this.revenue+=price*Math.min(1,quality);this.served++;this.log.unshift(`Served ${bakery?recipe[0]:recipe[0]+' + '+recipe[1]} · $${(price*Math.min(1,quality)).toFixed(2)}`);}this.log=this.log.slice(0,8);}
 tick(){if(this.time>=this.duration)return;this.time++;for(const d of this.deliveries.filter(d=>d.at<=this.time)){this.stock[d.name].push({qty:d.qty,cost:d.cost,quality:d.quality,expires:this.time+Math.round(d.life*d.quality)});this.log.unshift(`Delivery received: ${d.qty} ${d.name}.`);}this.deliveries=this.deliveries.filter(d=>d.at>this.time);for(const p of catalog){for(const b of this.stock[p.name])if(b.expires<=this.time&&b.qty){this.waste+=b.qty;this.wasteCost+=b.qty*b.cost;b.qty=0;}this.stock[p.name]=this.stock[p.name].filter(b=>b.qty>0);}const units=catalog.reduce((s,p)=>s+this.qty(p.name),0);this.area+=units;this.holding+=units*.001;const arrivals=this.time>=30&&this.time<45?4:2;for(let i=0;i<arrivals;i++)if(this.random()<.65)this.customer();this.log=this.log.slice(0,8);}
 get profit(){return this.revenue-this.cogs-this.wasteCost-this.holding;}
 get score(){const service=this.requests?this.served/this.requests:0,wasteRatio=this.wasteCost/(this.openingValue+this.spent);return Math.round(Math.max(0,Math.min(100,service*60+(1-wasteRatio)*20+Math.max(0,Math.min(1,this.profit/200))*20)));}
}
const api={InventoryShift,catalog,groups,suppliers};if(typeof module!=='undefined')module.exports=api;else window.InventoryModel=api;
})();
