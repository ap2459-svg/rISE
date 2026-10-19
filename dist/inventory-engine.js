/* Inventory Manager only. Clocks use café seconds; demand is sampled as play advances. */
(() => {
  const groups = {coffee:['Original Blend','Cold Brew','Decaf'],milk:['Almond','Oat Milk','Whole Milk','Cream','Sweet Cream'],syrup:['Vanilla','Caramel','Mocha','Pumpkin Spice','Brown Sugar'],topping:['Whipped Cream','Cinnamon','Chocolate Drizzle','Cold Foam','Caramel Drizzle'],bakery:['Croissant','Breakfast Sandwich','Cookie'],supplies:['Cup','Lid','Straw','Utensil','Bakery Bag','Napkin']};
  const companies = {
    'Original Blend':['Rise Roasters','☕','#865a36',25], 'Cold Brew':['Chill Coffee Co.','❄','#327d8e',25], Decaf:['Gentle Bean','☕','#947249',25],
    Almond:['Almond Grove','✿','#987447',20], 'Oat Milk':['Oatfield','🌾','#a77d36',20], 'Whole Milk':['Meadow Dairy','🥛','#477c64',20], Cream:['Creamery Lane','🥛','#568c80',20], 'Sweet Cream':['Sweet Meadow','🥛','#a46b79',20],
    Vanilla:['Vanilla House','✿','#94732e',25], Caramel:['Golden Kettle','◆','#b67b2d',25], Mocha:['Cocoa Works','◆','#7a503a',25], 'Pumpkin Spice':['Harvest Spice','✿','#b76535',25], 'Brown Sugar':['Amber Pantry','◆','#94703a',25],
    'Whipped Cream':['Cloud Creamery','☁','#7c8ba7',20], Cinnamon:['Cinnamon Grove','✿','#a6603c',25], 'Chocolate Drizzle':['Cocoa Ribbon','◆','#795240',25], 'Cold Foam':['Foam & Co.','☁','#5d8b94',20], 'Caramel Drizzle':['Caramel Ribbon','◆','#b08536',25],
    Croissant:['Butter Fold','🥐','#aa7b42',20], 'Breakfast Sandwich':['Morning Kitchen','🥪','#75854b',20], Cookie:['Cookie Corner','🍪','#ac764b',20],
    Cup:['CupCraft','☕','#547d64',15], Lid:['SnapSeal','◎','#507f94',15], Straw:['Sip & Stem','╱','#7a9461',15], Utensil:['TableKind','🍴','#7a7f9b',15], 'Bakery Bag':['Paper Parcel','▣','#a78455',15], Napkin:['SoftFold','▧','#8c829f',15]
  };
  const items = Object.entries(groups).flatMap(([group,names]) => names.map((name,index) => ({name,group,cost:group==='bakery'?[.85,1.5,.55][index]:group==='coffee'?.4:group==='milk'?.3:group==='supplies'?[.15,.06,.04,.08,.1,.03][index]:.18,cap:group==='bakery'?16:group==='supplies'?40:24,life:group==='bakery'?170:group==='milk'||['Whipped Cream','Cold Foam'].includes(name)?250:1800,company:companies[name][0],icon:companies[name][1],color:companies[name][2],lead:companies[name][3]})));
  const names = ['Maya','Lily','Sophie','Ava','Zoe','Noah','Leo','Amir','Ethan','Miles'];
  const product = name => items.find(item => item.name === name);
  class InventorySim {
    constructor(random = Math.random) {
      this.random = random; this.clock = 0; this.daypart = 0; this.cash = 90; this.debt = 35;
      this.running = false; this.ended = false; this.reports = []; this.deliveries = []; this.lots = {};
      this.orders = []; this.messages = []; this.serial = 0; this.deliveryCount = 0; this.history = [];
      this.nextSample = 0; this.totalWaste = 0; this.xp = 0; this.badges = []; this.quests = {};
      this.starterUsed = false; this.featuredBakery = null; this.oven = null; this.upgrade = null; this.pendingEvent = null;
      items.forEach(item => { this.lots[item.name] = []; });
      // The inherited write-off is already in the $35 opening deficit. Never charge it twice.
      for (const [name,qty] of [['Oat Milk',4],['Whole Milk',3],['Croissant',3],['Cookie',4]]) this.lots[name].push({qty,cost:product(name).cost,expires:0,accounted:true,inherited:true});
      this.begin();
    }
    begin() {
      this.elapsed = 0; this.nextArrival = 38 + this.random()*20; this.orders = []; this.ended = false; this.running = false;
      this.eventSeen = false; this.pendingEvent = null; this.trend = this.daypart === 1 ? 'cold' : 'normal';
      this.metrics = {arrived:0,served:0,lost:0,revenue:0,cogs:0,waste:0,wasteUnits:0,fees:0,purchases:0,wait:0,supplyWait:0,satisfaction:0,lostSales:0,demand:{},stockouts:0,cleared:0};
      this.notice(['Jules: “The fridge failed. Save our café before the school fundraiser!”','Jules: “Word is spreading. Watch what people actually order.”','Jules: “Last push! Protect profit without overbuying.”'][this.daypart]);
      this.sample();
    }
    get label() { return ['Rescue morning','The fundraiser','The comeback'][this.daypart]; }
    get balance() { return -this.debt + this.reports.filter(report => report.daypart !== this.daypart).reduce((sum,report) => sum + report.profit,0) + this.metrics.revenue - this.metrics.cogs - this.metrics.waste - this.metrics.fees; }
    stock(name) { return (this.lots[name]||[]).filter(lot => lot.expires>this.clock&&!lot.frozen).reduce((sum,lot) => sum+lot.qty,0); }
    spoiled(name) { return (this.lots[name]||[]).filter(lot => lot.expires<=this.clock).reduce((sum,lot) => sum+lot.qty,0); }
    frozen(name) { return (this.lots[name]||[]).filter(lot => lot.expires>this.clock&&lot.frozen).reduce((sum,lot) => sum+lot.qty,0); }
    occupied(name) { return (this.lots[name]||[]).reduce((sum,lot) => sum+lot.qty,0); }
    add(name,qty,cost,life,frozen=false) { if(qty>0)this.lots[name].push({qty,cost,expires:this.clock+life,frozen,accounted:false}); }
    notice(text) { this.messages.unshift(text); this.messages=this.messages.slice(0,6); }
    earn(key,title) { if(this.quests[key])return;this.quests[key]=true;this.xp+=25;this.badges.push(title);this.notice(`★ +25 IE XP · ${title}`); }
    markExpired() { for(const item of items)for(const lot of this.lots[item.name])if(lot.expires<=this.clock&&!lot.accounted){lot.accounted=true;this.metrics.waste+=lot.qty*lot.cost;this.metrics.wasteUnits+=lot.qty;this.totalWaste+=lot.qty;this.notice(`${item.name} expired. Clear the shelf, then try a smaller order.`);} }
    discard(name) {
      this.markExpired(); const qty=this.spoiled(name); if(!qty)return 0;
      this.lots[name]=this.lots[name].filter(lot=>lot.expires>this.clock);this.metrics.cleared+=qty;
      if(!items.some(item=>this.spoiled(item.name)>0))this.earn('cleanup','Quality control: café cleared');
      return qty;
    }
    clearExpired() { let qty=0;items.forEach(item=>qty+=this.discard(item.name));return qty; }
    open() { if(this.ended)return 'This chapter is complete.';if(items.some(item=>this.spoiled(item.name)))return 'Clear the expired stock before reopening.';if(!this.starterUsed)return 'Order the reopening kit before reopening.';this.running=true;return null; }
    // Observations only: no future customer schedule, recipes, or exact arrival counts.
    rate(name) { const previous=this.reports.at(-1);return previous?((this.metrics.demand[name]||0)+(previous.demand[name]||0)/300*30)/(Math.max(30,this.elapsed)+30):(this.metrics.demand[name]||0)/Math.max(30,this.elapsed); }
    forecast() { return Object.fromEntries(items.map(item=>[item.name,Math.ceil(this.rate(item.name)*60)])); }
    suggested(name) { const incoming=this.deliveries.filter(delivery=>!delivery.received).reduce((sum,delivery)=>sum+(delivery.cart[name]||0),0);return Math.max(0,Math.ceil(this.rate(name)*(product(name).lead+30))+2-this.stock(name)-incoming); }
    pick(list) { return list[Math.min(list.length-1,Math.floor(this.random()*list.length))]; }
    recipe() {
      const expanded=this.daypart>0;
      return {coffee:this.trend==='cold'&&this.random()<.65?'Cold Brew':expanded?this.pick(groups.coffee):'Original Blend',milk:this.random()<(this.trend==='oat'?.7:.45)?'Oat Milk':this.pick(['Whole Milk','Almond']),syrup:this.pick(expanded?groups.syrup:['Vanilla','Caramel']),topping:expanded?this.pick(groups.topping):'Whipped Cream',bakery:this.random()<(this.trend==='bakery'?.8:.5)?(expanded?this.pick(groups.bakery):(this.featuredBakery||'Cookie')):null};
    }
    needed(recipe) { return ['Cup','Lid','Napkin',...(recipe.coffee==='Cold Brew'?['Straw']:[]),recipe.coffee,recipe.milk,recipe.syrup,recipe.topping,...(recipe.bakery?[recipe.bakery,'Bakery Bag',...(recipe.bakery==='Breakfast Sandwich'?['Utensil']:[])]:[])]; }
    missing(order) { return this.needed(order.recipe).filter(name=>this.stock(name)<1); }
    consume(name,qty=1,frozen=false) {
      let cost=0,left=qty;
      for(const lot of this.lots[name].filter(lot=>lot.expires>this.clock&&!!lot.frozen===frozen).sort((a,b)=>a.expires-b.expires)){const take=Math.min(left,lot.qty);lot.qty-=take;left-=take;cost+=take*lot.cost;if(!left)break;}
      this.lots[name]=this.lots[name].filter(lot=>lot.qty>0);return cost;
    }
    offer(name,pack='fresh') {
      const item=product(name),fast=this.upgrade==='delivery'?8:0;
      if(!item||!['fresh','value','frozen'].includes(pack)||(pack==='frozen'&&item.group!=='bakery')||(pack==='value'&&item.group==='supplies'))return null;
      return {unit:item.cost*(pack==='value'?.6:pack==='frozen'?.65:1),lead:Math.max(8,item.lead+(pack==='value'?15:0)-fast),life:pack==='value'?75:pack==='frozen'?800:item.life*(this.upgrade==='fridge'&&item.group!=='supplies'?1.4:1),frozen:pack==='frozen'};
    }
    quote(cart,supplier,pack='fresh') { return Object.entries(cart).reduce((sum,[name,qty])=>sum+(this.offer(name,pack)?.unit||0)*qty,.25); }
    purchase(cart,supplier,pack='fresh') {
      if(this.ended)return 'This chapter is finished.';
      const entries=Object.entries(cart);if(entries.length!==1)return 'Choose one product at a time.';
      const [name,qty]=entries[0],item=product(name),offer=this.offer(name,pack);
      if(!item||!offer||!Number.isInteger(qty)||qty<1)return 'Choose a valid product and whole quantity.';
      if(supplier!==item.company)return 'Use this product’s assigned company.';
      const incoming=this.deliveries.filter(delivery=>!delivery.received).reduce((sum,delivery)=>sum+(delivery.cart[name]||0),0);
      if(this.occupied(name)+incoming+qty>item.cap)return 'Shelf full. Clear expired stock or order less.';
      if(this.elapsed+offer.lead>=300)return 'This order would arrive after closing.';
      const cost=this.quote(cart,supplier,pack);if(cost>this.cash)return 'Not enough working cash. Try a smaller order.';
      this.cash-=cost;this.metrics.purchases+=cost;this.metrics.fees+=.25;
      this.deliveries.push({id:++this.deliveryCount,cart:{...cart},supplier,cost,eta:this.clock+offer.lead,lead:offer.lead,offer,received:false});
      if(this.daypart===0&&item.group==='bakery'&&!this.featuredBakery)this.featuredBakery=name;
      if(pack==='value')this.earn('supplychoice','Engineering economics: tested a tradeoff');
      this.notice(`${item.company}: ${qty} ${name} on the way.`);return null;
    }
    starter() {
      if(this.starterUsed)return 'Kit already ordered.';
      if(items.some(item=>this.spoiled(item.name)))return 'Clear expired stock first.';
      // A bounded core-menu kit prevents 15 repetitive purchases before the first decision.
      const cart={'Original Blend':12,'Oat Milk':4,'Whole Milk':4,Almond:4,Vanilla:7,Caramel:7,'Whipped Cream':12,Cup:14,Lid:14,Napkin:14,'Bakery Bag':8,Straw:6,Utensil:6};
      const cost=Object.entries(cart).reduce((sum,[name,qty])=>sum+product(name).cost*qty,1);
      if(cost>this.cash)return 'Not enough cash for the reopening kit.';
      if(Object.entries(cart).some(([name,qty])=>this.occupied(name)+this.deliveries.filter(d=>!d.received).reduce((sum,d)=>sum+(d.cart[name]||0),0)+qty>product(name).cap))return 'Make room for the kit before ordering more stock.';
      this.cash-=cost;this.metrics.purchases+=cost;this.metrics.fees+=1;this.starterUsed=true;
      this.deliveries.push({id:++this.deliveryCount,cart,supplier:'Campus Supply Co-op',cost,eta:this.clock+15,lead:15,kit:true,received:false});
      this.earn('kit','Supply chain: reopening kit on the way');return null;
    }
    receive(id) {
      const delivery=this.deliveries.find(delivery=>delivery.id===id);
      if(!delivery||delivery.received||this.clock<delivery.eta)return false;
      for(const [name,qty]of Object.entries(delivery.cart)){const item=product(name),offer=delivery.offer||{unit:item.cost,life:item.life,frozen:false};this.add(name,qty,offer.unit,offer.life,offer.frozen);}
      delivery.received=true;this.notice(`Delivery shelved: ${delivery.supplier}.`);return true;
    }
    bake(name) {
      const item=product(name);if(this.ended||!item||item.group!=='bakery')return 'Choose a bakery item.';
      if(this.oven)return 'One oven, one batch. Wait for this batch to finish.';
      if(this.frozen(name)<3)return 'Order at least 3 frozen portions first.';
      if(this.cash<.4)return 'Need $0.40 for oven energy.';
      const cost=this.consume(name,3,true)+.4;this.cash-=.4;this.metrics.purchases+=.4;
      this.oven={name,ready:this.clock+25,cost};this.earn('bakery','Process design: microbatch started');return null;
    }
    chooseEvent(choice) {
      if(!this.pendingEvent)return;
      if(choice==='promote'){this.trend=this.pendingEvent.trend;this.earn('event','Optimization: took a demand risk');this.notice('Jules: “Promotion is up! Watch the trend chart.”');}
      else{this.notice('Jules: “A steady menu works too. Protect our stock.”');}
      this.pendingEvent=null;
    }
    buyUpgrade(kind) {
      if(!this.ended)return 'Finish this chapter to unlock an improvement.';
      if(this.upgrade)return 'You already chose an upgrade.';
      if(!['fridge','delivery'].includes(kind))return 'Choose an upgrade.';
      const cost=kind==='fridge'?12:8;if(this.cash<cost)return 'Not enough working cash.';
      this.cash-=cost;this.metrics.fees+=cost;this.upgrade=kind;
      if(this.ended){const report=this.reports.at(-1);report.fees+=cost;report.profit-=cost;report.cash=this.cash;report.balance=this.balance;}
      this.earn('upgrade','Continuous improvement: café upgraded');return null;
    }
    sample() { this.history.push({t:this.clock,shift:this.daypart,arrived:this.metrics.arrived,served:this.metrics.served,waste:this.metrics.waste,stock:Object.fromEntries(items.map(item=>[item.name,this.stock(item.name)]))});this.nextSample=this.clock+10; }
    tick(dt) {
      if(!this.running||this.ended||this.pendingEvent)return;
      dt=Math.max(0,Math.min(dt,1));this.clock+=dt;this.elapsed+=dt;this.markExpired();
      if(this.oven&&this.clock>=this.oven.ready){const batch=this.oven;this.add(batch.name,3,batch.cost/3,170);this.oven=null;this.notice(`🥐 Fresh batch! +3 ${batch.name}.`);}
      if(!this.eventSeen&&this.elapsed>=110){this.eventSeen=true;this.pendingEvent=this.random()<.5?{title:'The robotics club needs a café!',trend:'bakery',text:'Jules: “They’ll promote our pastries if we say yes. More sales are possible, but bakery demand could jump.”'}:{title:'Oat Milk just went viral',trend:'oat',text:'Jules: “A student posted our oat latte. Put it on special, or keep a quieter menu?”'};return;}
      if(this.elapsed>=this.nextArrival){
        const recipe=this.recipe();const order={id:++this.serial,name:this.pick(names),recipe,arrival:this.clock,status:'waiting',supplyWait:0,price:6+(recipe.bakery?3:0),warned:false};
        this.orders.push(order);this.metrics.arrived++;this.needed(recipe).forEach(name=>this.metrics.demand[name]=(this.metrics.demand[name]||0)+1);
        // Random interarrival intervals. Future orders and their count do not exist yet.
        const rush=this.elapsed>100&&this.elapsed<220,boost=this.trend==='normal'?1:.8;
        this.nextArrival=this.elapsed+(rush?15+this.random()*14:25+this.random()*22)*boost;
      }
      for(const order of this.orders){if(order.status!=='waiting')continue;if(this.missing(order).length){order.supplyWait+=dt;this.metrics.supplyWait+=dt;if(!order.warned){order.warned=true;this.metrics.stockouts++;this.notice(`Missed ingredient: ${this.missing(order).join(', ')}. Can you restock in time?`);}}if(this.clock-order.arrival>=75){order.status='lost';this.metrics.lost++;this.metrics.lostSales+=order.price;this.notice(`Lost a sale. Use the demand chart to adjust your safety stock.`);}}
      const active=this.orders.find(order=>order.status==='preparing');
      if(active&&this.clock>=active.ready){active.status='served';const wait=this.clock-active.arrival;this.cash+=active.price;this.metrics.served++;this.metrics.revenue+=active.price;this.metrics.wait+=wait;if(this.metrics.served>=5)this.earn('service','Inventory control: five customers saved');}
      if(!this.orders.some(order=>order.status==='preparing')){const order=this.orders.find(order=>order.status==='waiting'&&!this.missing(order).length);if(order){order.status='preparing';order.ready=this.clock+9+(order.recipe.bakery?4:0);this.needed(order.recipe).forEach(name=>this.metrics.cogs+=this.consume(name));}}
      if(this.clock>=this.nextSample)this.sample();if(this.elapsed>=300)this.finish();
    }
    finish() {
      if(this.ended)return;this.orders.filter(order=>['waiting','preparing'].includes(order.status)).forEach(order=>{order.status='lost';this.metrics.lost++;this.metrics.lostSales+=order.price;});
      this.running=false;this.ended=true;this.elapsed=300;const metrics=this.metrics;
      this.reports.push({...metrics,daypart:this.daypart,label:this.label,profit:metrics.revenue-metrics.cogs-metrics.waste-metrics.fees,cash:this.cash,balance:this.balance});this.sample();
    }
    next() { if(!this.ended||this.daypart===2)return;this.daypart++;this.begin(); }
  }
  window.InventorySim=InventorySim;window.INVENTORY_ITEMS=items;window.INVENTORY_GROUPS=groups;
})();
