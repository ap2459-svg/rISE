/* Café Rescue only. Buildless, seeded simulation; no dependency on other game modes. */
(() => {
  'use strict';
  const CONFIG = Object.freeze({
    version:3, days:7, shiftSeconds:240, openingCash:-500, creditLimit:750,
    openingReputation:20, dailyOverhead:14, overnightSeconds:75,
    patience:38, bakeSeconds:24, bakeBatch:4, bakeConversion:3.4,
    arrivalIntervals:[15,13,11,11,10,6.8,6.5], serviceSeconds:6, seed:19725
  });
  const GROUPS = {
    coffee:['Original Blend','Cold Brew','Decaf'],
    milk:['Almond Milk','Oat Milk','Whole Milk','Cream','Sweet Cream'],
    syrup:['Vanilla','Caramel','Mocha','Pumpkin Spice','Brown Sugar'],
    topping:['Whipped Cream','Cinnamon','Chocolate Drizzle','Cold Foam','Caramel Drizzle'],
    bakery:['Croissant','Breakfast Sandwich','Cookie'],
    supplies:['Cup','Lid','Straw','Utensil','Bakery Bag','Napkin']
  };
  const ICONS={coffee:'coffee',milk:'milk',syrup:'syrup',topping:'topping',bakery:'croissant',supplies:'box'};
  const ITEMS=Object.entries(GROUPS).flatMap(([group,names])=>names.map((name,i)=>({
    name,group,icon:group==='bakery'?['croissant','sandwich','cookie'][i]:group==='supplies'?['cup','lid','straw','utensil','bag','napkin'][i]:ICONS[group],
    cost:group==='bakery'?[1.4,2.2,.9][i]:group==='coffee'?.55:group==='milk'?.45:group==='supplies'?[.18,.08,.05,.08,.12,.04][i]:.22,
    cap:group==='supplies'?64:group==='bakery'?24:40,
    life:group==='supplies'?100000000:group==='bakery'?(name==='Breakfast Sandwich'?1:2):group==='milk'?(['Oat Milk','Almond Milk'].includes(name)?5:3):['Whipped Cream','Cold Foam'].includes(name)?3:14
  })));
  const BY_NAME=Object.fromEntries(ITEMS.map(i=>[i.name,i]));
  const SUPPLIERS=[
    {id:'budget',name:'Budget Beans & Basics',icon:'budget',color:'#a36b30',multiplier:.72,lead:12,nextDay:true,reliability:.78,quality:.76,life:.7,bulk:12,discount:.12,unlock:1,note:'Lowest cost. Standard orders arrive tomorrow; more risk.'},
    {id:'quick',name:'QuickShip Co-op',icon:'truck',color:'#277565',multiplier:1,lead:14,reliability:.96,quality:.94,life:1,bulk:18,discount:.06,unlock:1,note:'Fast, dependable, small orders welcome.'},
    {id:'premium',name:'Sunrise Select',icon:'sun',color:'#8b5e94',multiplier:1.3,lead:20,reliability:.995,quality:1,life:1.5,bulk:16,discount:.1,unlock:2,note:'Longer freshness and happier customers.'}
  ];
  const MENU=[
    {id:'latte',name:'Vanilla Latte',icon:'coffee',price:6,day:1,kind:'drink',recipe:['Original Blend','Whole Milk','Vanilla','Cup','Lid','Napkin']},
    {id:'caramel',name:'Almond Caramel',icon:'cup',price:6.5,day:2,kind:'drink',recipe:['Original Blend','Almond Milk','Caramel','Cup','Lid','Napkin']},
    {id:'oat',name:'Oat Milk Cold Brew',icon:'coldbrew',price:7,day:3,kind:'drink',recipe:['Cold Brew','Oat Milk','Brown Sugar','Cup','Lid','Straw','Napkin']},
    {id:'decaf',name:'Decaf Cloud',icon:'topping',price:6,day:2,kind:'drink',recipe:['Decaf','Cream','Whipped Cream','Cup','Lid','Napkin']},
    {id:'mocha',name:'Mocha Melt',icon:'mocha',price:7,day:5,kind:'drink',recipe:['Original Blend','Whole Milk','Mocha','Chocolate Drizzle','Cup','Lid','Napkin']},
    {id:'pumpkin',name:'Pumpkin Hug',icon:'pumpkin',price:7,day:5,kind:'drink',recipe:['Original Blend','Oat Milk','Pumpkin Spice','Cinnamon','Cup','Lid','Napkin']},
    {id:'sweet',name:'Sweet Cream Chill',icon:'cream',price:7.5,day:5,kind:'drink',recipe:['Cold Brew','Sweet Cream','Cold Foam','Caramel Drizzle','Cup','Lid','Straw','Napkin']},
    {id:'cookie',name:'Cookie',icon:'cookie',price:3.25,day:1,kind:'bakery',recipe:['Cookie','Bakery Bag','Napkin']},
    {id:'croissant',name:'Croissant',icon:'croissant',price:4,day:1,kind:'bakery',recipe:['Croissant','Bakery Bag','Napkin']},
    {id:'sandwich',name:'Breakfast Sandwich',icon:'sandwich',price:5.5,day:4,kind:'bakery',recipe:['Breakfast Sandwich','Bakery Bag','Napkin','Utensil']}
  ];
  const DAYS=[
    {title:'The keys are yours',chapter:'REOPEN',face:'shop',text:'You have seven days to save this café. Start with safe shelves, fresh coffee and the supplies to serve it.',goals:['Clear expired ingredients','Restock coffee, milk, cups and lids','Serve your first coffee customers'],concept:'Inventory control',event:'welcome'},
    {title:'Cheap can get expensive',chapter:'SUPPLY CHAIN',face:'box',text:'“A bargain supplier is calling. A cheap order is only useful if it arrives when we need it.”',goals:['Compare price, dates and reliability','Keep a small safety buffer','Learn from delivery performance'],concept:'Supplier lead time',event:'discount'},
    {title:'Someone posted our cold brew!',chapter:'FORECAST',face:'trend',text:'Maya: “Your Oat Milk Cold Brew is trending!” Stock a small batch, watch actual requests, and react. Nobody knows the size of the crowd.',goals:['Prepare the new cold brew recipe','Watch recent demand arrows','Respond to the oat milk spike'],concept:'Safety stock',event:'oat'},
    {title:'The great bakery debate',chapter:'MAKE OR BUY',face:'croissant',text:'“Should we bake here, buy from a bakery, or mix both? Our oven and staff can only do so much.”',goals:['Choose a bakery strategy','Account for labor and oven time','Compare profit and availability'],concept:'Make-or-buy analysis',event:'oven'},
    {title:'What is a latte worth?',chapter:'PRICE LAB',face:'menu',text:'Maya: “We love the café, but we’re still students.” Test your prices. A bigger margin means little if nobody buys.',goals:['Try the visual price editor','Watch price-related lost sales','Protect profit and customer rating'],concept:'Engineering economics',event:'price'},
    {title:'The school festival',chapter:'RUSH DAY',face:'trend',text:'“Big event today! More people are nearby, but traffic is still uncertain.” Prepare supplies, capacity and a backup plan.',goals:['Build a sensible safety buffer','Consider a helper or smaller menu','Handle a rush decision'],concept:'Resource allocation',event:'rush'},
    {title:'One last chance to rISE',chapter:'THE COMEBACK',face:'shop',text:'“The landlord is coming after the shift. Let’s prove this café can earn its place in the neighborhood.”',goals:['Improve the recovery balance','Keep customers coming back','Finish with useful stock, not waste'],concept:'Continuous improvement',event:'final'}
  ];
  const UPGRADES=[
    {id:'fridge',name:'Better refrigerator',icon:'fridge',cost:45,day:2,effect:'New milk and fresh bakery last 50% longer.'},
    {id:'storage',name:'Organized shelving',icon:'shelf',cost:30,day:2,effect:'50% more storage; easier FIFO rotation.'},
    {id:'tracker',name:'Inventory tracker',icon:'trend',cost:22,day:3,effect:'Live low-stock alerts and a reorder-cart shortcut.'},
    {id:'contract',name:'Supplier partnership',icon:'contract',cost:38,day:3,effect:'+10 points supplier reliability, up to 100%.'},
    {id:'oven',name:'Second bakery rack',icon:'oven',cost:48,day:4,effect:'Two batches at once; baking takes 16 seconds.'},
    {id:'ordering',name:'Combined ordering',icon:'menu',cost:26,day:4,effect:'Half the shipping fees; 5 seconds off lead times.'},
    {id:'energy',name:'Efficient equipment',icon:'leaf',cost:38,day:5,effect:'Daily operating cost drops by $5; baking costs $0.80 less.'}
  ];
  const clone=value=>JSON.parse(JSON.stringify(value));
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const sum=values=>values.reduce((a,b)=>a+b,0);
  const newMetrics=()=>({
    arrived:0,served:0,lost:0,revenue:0,cogs:0,waste:0,wasteUnits:0,purchases:0,operating:0,conversion:0,refunds:0,
    stockouts:0,lostSales:0,priceLost:0,menuLost:0,satisfactionTotal:0,waitTotal:0,qualityTotal:0,
    requested:{},demand:{},sold:{},missing:{},lostByItem:{},wasteByItem:{},deliveries:0,onTime:0,correct:0,
    cleared:0,stockSamples:0,stockValueSum:0
  });
  class InventorySim {
    constructor(seed=Date.now()) {
      this.seed=(Number(seed)>>>0)||CONFIG.seed;
      this.day=1; this.clock=0; this.cash=CONFIG.openingCash; this.creditLimit=CONFIG.creditLimit;
      this.reputation=CONFIG.openingReputation; this.lots=Object.fromEntries(ITEMS.map(i=>[i.name,[]]));
      this.deliveries=[]; this.batches=[]; this.reports=[]; this.history=[]; this.upgrades=[];
      this.badges=[]; this.rewards={}; this.xp=0;
      this.menu=Object.fromEntries(MENU.map(p=>[p.id,{enabled:['latte','cookie'].includes(p.id),price:p.price}]));
      this.strategy='hybrid'; this.serial=0; this.supplierStats={};
      this.tutorial={active:true,stockOpened:false,inspected:false,missing:false,suppliersOpened:false,compared:[],cartAdded:false,reviewed:false,ordered:false,shelved:false,menuSeen:false,recipeSeen:false,trendsSeen:false,finished:false,skipped:false};
      this.notes=[]; this.reactions=[]; this.introSeen=false; this.sound=true; this.lastExplanation='';
      // The previous manager's spoiled goods are already included in the inherited debt.
      for(const [name,qty] of [['Whole Milk',3],['Oat Milk',2],['Croissant',3],['Cookie',2]])
        this.lots[name].push({id:++this.serial,qty,cost:0,quality:.8,received:-100,expires:0,frozen:false,written:true,inherited:true});
      this.addLot('Original Blend',4,.55,14); this.addLot('Vanilla',3,.22,14); this.addLot('Napkin',4,.04,100000000);
      this.openingValue=this.inventoryValue(); this.beginDay();
    }
    random() {
      // Saving the generator state prevents reloads from rerolling supplier outcomes.
      this.seed=(Math.imul(this.seed,1664525)+1013904223)>>>0; return this.seed/4294967296;
    }
    pick(list) { return list[Math.floor(this.random()*list.length)]; }
    get info() { return DAYS[this.day-1]; }
    get rating() { return Math.round(this.reputation/2)/10; }
    get spendable() { return Math.max(0,this.cash+this.creditLimit); }
    get profit() { return this.metrics.revenue-this.metrics.cogs-this.metrics.waste-this.metrics.operating; }
    get balance() { return this.cash+this.inventoryValue(); }
    get satisfaction() { return this.metrics.served?Math.round(this.metrics.satisfactionTotal/this.metrics.served):this.reputation; }
    get visualLevel() { return this.reputation>=70&&this.balance>-150?3:this.reputation>=45?2:this.tutorial.shelved?1:0; }
    get health() {
      const names=this.activeIngredients(),ready=names.length?names.filter(n=>this.stock(n)>0&&!this.spoiled(n)).length/names.length:0;
      return Math.round(ready*75+(this.expiredCount()?0:25));
    }
    say(text) { this.notes.unshift(text); this.notes=this.notes.slice(0,5); }
    earn(key,title,points=25) {
      if(this.rewards[key]) return false;
      this.rewards[key]=true; this.badges.push(title); this.xp+=points; return true;
    }
    beginDay() {
      this.phase='planning'; this.running=false; this.elapsed=0; this.pendingEvent=null; this.eventSeen=false;
      this.briefed=false; this.orders=[]; this.helper=false; this.discount=false; this.promotion=null;
      this.ovenBroken=false; this.slowOven=false; this.safetyAlert=false; this.metrics=newMetrics();
      this.openingCash=this.cash; this.dayOpeningValue=this.inventoryValue();
      this.nextArrival=12+this.random()*8; this.nextSample=0; this.strategyChosen=this.day!==4;
      this.reviewSeen=false; this.quizAnswered=false;
      if(this.day===3) this.menu.oat.enabled=true;
      this.say(this.info.text);
    }
    /* Inventory: fresh, expired and frozen lots are separate. */
    stock(name,frozen=false) { return sum((this.lots[name]||[]).filter(l=>l.expires>this.day&&l.frozen===frozen).map(l=>l.qty)); }
    frozen(name) { return this.stock(name,true); }
    spoiled(name) { return sum((this.lots[name]||[]).filter(l=>l.expires<=this.day).map(l=>l.qty)); }
    expiredCount() { return sum(ITEMS.map(i=>this.spoiled(i.name))); }
    occupied(name) { return sum((this.lots[name]||[]).map(l=>l.qty))+sum(this.batches.filter(b=>b.name===name).map(b=>b.qty)); }
    capacity(name) { return Math.floor(BY_NAME[name].cap*(this.upgrades.includes('storage')?1.5:1)); }
    incoming(name) { return sum(this.deliveries.filter(d=>!d.shelved).flatMap(d=>d.lines.filter(l=>l.name===name).map(l=>l.qty))); }
    inventoryValue() {
      return sum(Object.values(this.lots).flat().filter(l=>!l.written).map(l=>l.qty*l.cost))
        +sum(this.deliveries.filter(d=>!d.shelved).flatMap(d=>d.lines.filter(l=>!l.written).map(l=>l.qty*l.cost)))
        +sum(this.batches.map(b=>b.cost));
    }
    addLot(name,qty,cost,life,frozen=false,quality=.94,expires=null,received=null) {
      if(!BY_NAME[name]||!Number.isInteger(qty)||qty<=0||!Number.isFinite(cost)||cost<0||!Number.isFinite(life)||life<0) return;
      this.lots[name].push({id:++this.serial,qty,cost,quality,received:received??this.clock,expires:expires??this.day+Math.max(1,Math.ceil(life)),frozen,written:false});
    }
    markExpired() {
      const lots=[...Object.entries(this.lots).flatMap(([name,list])=>list.map(l=>({name,lot:l}))),
        ...this.deliveries.filter(d=>d.arrived&&!d.shelved).flatMap(d=>d.lines.map(l=>({name:l.name,lot:l})))];
      for(const {name,lot} of lots) if(lot.expires<=this.day&&!lot.written) {
        lot.written=true; const cost=lot.qty*lot.cost; this.metrics.waste+=cost; this.metrics.wasteUnits+=lot.qty;
        this.metrics.wasteByItem[name]=(this.metrics.wasteByItem[name]||0)+cost; this.safetyAlert=true;
        this.say(`${name} expired. Remove it from the shelf; try a smaller order next time.`);
      }
    }
    discard(name,lotId=null) {
      if(!BY_NAME[name]||['complete','review'].includes(this.phase)) return 0;
      this.markExpired();
      const removed=this.lots[name].filter(l=>lotId===null?l.expires<=this.day:l.id===lotId);
      for(const l of removed) if(!l.written) {
        this.metrics.waste+=l.qty*l.cost; this.metrics.wasteUnits+=l.qty;
        this.metrics.wasteByItem[name]=(this.metrics.wasteByItem[name]||0)+l.qty*l.cost;
      }
      const ids=new Set(removed.map(l=>l.id)); this.lots[name]=this.lots[name].filter(l=>!ids.has(l.id));
      const count=sum(removed.map(l=>l.qty)); this.metrics.cleared+=count;
      if(count&&!this.expiredCount()) { this.safetyAlert=false; this.earn('cleanup','Fresh start'); this.say('Safe shelves! Expired food is never served.'); }
      return count;
    }
    consume(name,qty=1,frozen=false) {
      if(!Number.isInteger(qty)||qty<=0||this.stock(name,frozen)<qty) return null;
      let left=qty,cost=0,quality=0;
      // Delivery organization sets shelf order. Expired stock is always excluded.
      for(const l of this.lots[name].filter(l=>l.expires>this.day&&l.frozen===frozen).sort((a,b)=>(a.received??0)-(b.received??0)||a.id-b.id)) {
        const take=Math.min(left,l.qty); l.qty-=take; left-=take; cost+=take*l.cost; quality+=take*l.quality;
        if(!left) break;
      }
      this.lots[name]=this.lots[name].filter(l=>l.qty>0); return {cost,quality:quality/qty};
    }
    rotate(name) {
      if(!BY_NAME[name]) return;
      this.lots[name].sort((a,b)=>(a.received??0)-(b.received??0)||a.id-b.id); this.earn('fifo','First in, first out');
      this.lastExplanation='Older stock is now at the front. FIFO helps you sell it before it expires.';
    }
    /* Suppliers: quote first, then sample delivery risk once at checkout. */
    supplier(id) { return SUPPLIERS.find(s=>s.id===id&&s.unlock<=this.day); }
    offer(name,supplierId='quick',qty=1,frozen=false,express=false) {
      const item=BY_NAME[name], supplier=this.supplier(supplierId);
      if(!item||!supplier||!Number.isInteger(qty)||qty<1||qty>200||(frozen&&item.group!=='bakery')) return null;
      const bulk=qty>=supplier.bulk?supplier.discount:0, sale=this.discount&&supplierId==='budget'?.1:0;
      return {
        unit:item.cost*supplier.multiplier*(frozen?.48:1)*(1-bulk)*(1-sale),
        lead:Math.max(4,express?5:supplier.lead-(this.upgrades.includes('ordering')?5:0)),
        dayOffset:supplier.nextDay&&!express?1:0,
        reliability:Math.min(1,supplier.reliability+(this.upgrades.includes('contract')?.1:0)),
        quality:supplier.quality,life:frozen?7:Math.max(1,Math.floor(item.life*supplier.life*(this.upgrades.includes('fridge')&&['milk','bakery'].includes(item.group)?1.5:1))),
        frozen,bulk
      };
    }
    quote(cart) {
      if(!Array.isArray(cart)||!cart.length||cart.length>60) return null;
      const groups={}; let goods=0;
      for(const l of cart) {
        const offer=this.offer(l.name,l.supplier,l.qty,!!l.frozen,!!l.express); if(!offer) return null;
        goods+=offer.unit*l.qty; groups[`${l.supplier}:${!!l.express}`]={supplier:l.supplier,express:!!l.express};
      }
      const shipping=sum(Object.values(groups).map(g=>(g.express?5:1.25)*(this.upgrades.includes('ordering')?.5:1)));
      return {goods,shipping,total:goods+shipping};
    }
    placeOrder(cart) {
      if(!['planning','shift'].includes(this.phase)) return 'Orders open again tomorrow.';
      const quote=this.quote(cart); if(!quote) return 'Add a valid quantity to your cart.';
      if(quote.total>this.spendable+1e-8) return 'That exceeds your cash and remaining credit. Reduce the cart.';
      const quantities={};
      for(const l of cart) {
        quantities[l.name]=(quantities[l.name]||0)+l.qty;
        if(BY_NAME[l.name].group==='bakery'&&((this.strategy==='inhouse'&&!l.frozen)||(this.strategy==='outsource'&&l.frozen)))
          return 'This pack does not match your bakery strategy. Change strategy in Menu & bakery.';
      }
      for(const [name,qty] of Object.entries(quantities))
        if(this.occupied(name)+this.incoming(name)+qty>this.capacity(name)) return `${name}: not enough shelf space. Order less or clear stock.`;
      const grouped={};
      for(const l of cart) (grouped[`${l.supplier}:${!!l.express}`]||=[]).push({...l,offer:this.offer(l.name,l.supplier,l.qty,!!l.frozen,!!l.express)});
      this.cash-=quote.total; this.metrics.purchases+=quote.goods; this.metrics.operating+=quote.shipping;
      for(const lines of Object.values(grouped)) {
        const offer=lines[0].offer, supplier=this.supplier(lines[0].supplier), failed=this.random()>offer.reliability;
        const delayed=failed&&this.random()<.7, error=failed&&!delayed, lead=offer.lead;
        this.deliveries.push({
          id:++this.serial,supplier:supplier.id,name:supplier.name,placed:this.clock,expected:this.clock+lead,dueDay:this.day+offer.dayOffset,nextMorning:!!offer.dayOffset,
          eta:this.clock+lead+(delayed?10+Math.floor(this.random()*9):0),reliability:offer.reliability,
          delayed,error,arrived:false,shelved:false,notified:false,delayNotified:false,
          lines:lines.map(l=>({name:l.name,qty:l.qty,cost:l.offer.unit,quality:l.offer.quality,life:l.offer.life,frozen:l.offer.frozen,written:false}))
        });
      }
      this.tutorial.ordered=true; this.earn('order','Supply chain started');
      this.say('Order placed. Credit pays for stock now; sold or wasted stock becomes a product expense.');
      return null;
    }
    processDeliveries() {
      for(const d of this.deliveries) {
        if(d.arrived||d.cancelled||d.dueDay>this.day) continue;
        if(d.nextMorning) {
          const delay=d.eta-d.expected;d.expected=this.clock;d.eta=this.clock+delay;d.nextMorning=false;
        }
        if(d.delayed&&this.clock>=d.expected&&!d.delayNotified) {
          d.delayNotified=true; this.say(`${d.name} is late. Safety stock buys you time while you wait.`);
        }
        if(this.clock<d.eta) continue;
        d.arrived=true; this.metrics.deliveries++; this.metrics.onTime+=!d.delayed?1:0; this.metrics.correct+=!d.error?1:0;
        const stat=this.supplierStats[d.supplier]||={orders:0,onTime:0,correct:0};
        stat.orders++; stat.onTime+=!d.delayed?1:0; stat.correct+=!d.error?1:0;
        if(d.error) {
          const l=d.lines[0], missing=Math.max(1,Math.floor(l.qty*.25)), refund=missing*l.cost;
          l.qty-=missing; this.cash+=refund; this.metrics.refunds+=refund; this.metrics.purchases-=refund;
          d.problem=`${missing} ${l.name} missing; $${refund.toFixed(2)} refunded.`;
        }
        d.lines=d.lines.filter(l=>l.qty>0);
        for(const l of d.lines) l.expires=this.day+l.life;
        this.say(`Supplies arrived from ${d.name}! Place older products in front.`);
      }
    }
    shelve(id,fifo=true) {
      const d=this.deliveries.find(d=>d.id===id); if(!d||!d.arrived||d.shelved) return false;
      this.markExpired();
      for(const l of d.lines) {
        this.lots[l.name].push({id:++this.serial,qty:l.qty,cost:l.cost,quality:l.quality,received:d.eta,expires:l.expires,frozen:l.frozen,written:l.written});
        this.lots[l.name].sort((a,b)=>((a.received??0)-(b.received??0)||a.id-b.id));
      }
      d.shelved=true; this.tutorial.shelved=true;
      if(fifo) { this.earn('fifo','First in, first out'); this.lastExplanation='Older products in front: fewer items expire before you can sell them. That is FIFO.'; }
      else this.lastExplanation='Delivery stored. Older stock stays in front so it is used first.';
      return true;
    }
    tutorialStep() {
      const t=this.tutorial;
      if(!t.active||this.day!==1)return null;
      if(!t.stockOpened)return 'stock';
      if(!t.inspected)return 'inspect';
      if(this.expiredCount())return 'clean';
      if(!t.missing)return 'missing';
      if(!t.suppliersOpened)return 'suppliers';
      if(t.compared.length<2)return 'compare';
      if(!t.cartAdded)return 'cart';
      if(!t.reviewed)return 'review';
      if(!t.ordered)return 'order';
      if(!t.shelved)return 'delivery';
      if(!t.menuSeen)return 'menu';
      if(!t.recipeSeen)return 'recipe';
      if(!t.trendsSeen)return 'trends';
      if(!MENU.some(p=>p.kind==='drink'&&this.menu[p.id].enabled&&this.servings(p.id)>0))return 'restock';
      return 'ready';
    }
    completeTutorial() {
      if(this.tutorialStep()!=='ready')return false;
      this.tutorial.active=false;this.tutorial.finished=true;return true;
    }
    skipTutorial() { this.tutorial.active=false;this.tutorial.skipped=true; }
    deliveryDecision(id,choice) {
      const d=this.deliveries.find(d=>d.id===id);
      if(!d||d.shelved||d.resolved||(!d.delayNotified&&!d.problem&&d.dueDay<=this.day))return 'This delivery has no unresolved issue.';
      if(!['wait','refund'].includes(choice))return 'Choose wait or refund.';
      if(choice==='refund') {
        const refund=sum(d.lines.filter(l=>!l.written).map(l=>l.qty*l.cost));
        this.cash+=refund;this.metrics.purchases-=refund;this.metrics.refunds+=refund;
        d.lines=[];d.shelved=true;d.cancelled=true;
      }
      d.resolved=true;return null;
    }
    activeIngredients() { return [...new Set(MENU.filter(p=>p.day<=this.day&&this.menu[p.id].enabled).flatMap(p=>p.recipe))]; }
    restockPlan(size=8,supplier='quick') {
      const needs={};
      for(const p of MENU.filter(p=>p.day<=this.day&&this.menu[p.id].enabled)) for(const name of p.recipe)
        needs[name]=(needs[name]||0)+(p.kind==='bakery'?Math.max(2,Math.floor(size*(this.day===1?.2:.45))):size);
      return Object.entries(needs).map(([name,qty])=>{
        const frozen=BY_NAME[name].group==='bakery'&&this.strategy==='inhouse';
        const wanted=Math.max(0,qty-this.stock(name)-this.frozen(name)-this.incoming(name));
        return {name,qty:Math.min(frozen?Math.ceil(wanted/4)*4:wanted,this.capacity(name)-this.occupied(name)-this.incoming(name)),supplier,frozen,express:false};
      }).filter(l=>l.qty>0);
    }
    reorderPlan(supplier='quick') {
      return this.activeIngredients().map(name=>({name,qty:this.suggested(name),supplier,frozen:BY_NAME[name].group==='bakery'&&this.strategy==='inhouse',express:false})).filter(l=>l.qty>0);
    }
    /* Menu, production and finance. Conversion costs stay in inventory until sold. */
    unitCost(id) {
      const p=MENU.find(p=>p.id===id); if(!p) return 0;
      return sum(p.recipe.map(name=>{
        const lots=this.lots[name].filter(l=>!l.written&&!l.frozen);
        return lots.length?sum(lots.map(l=>l.qty*l.cost))/sum(lots.map(l=>l.qty)):BY_NAME[name].cost;
      }));
    }
    setPrice(id,value) {
      const p=MENU.find(p=>p.id===id);
      if(this.day<5||!p||p.day>this.day||!Number.isFinite(value)||value<p.price*.5||value>p.price*1.8||!['planning','shift'].includes(this.phase)) return false;
      this.menu[id].price=Math.round(value*4)/4; this.earn('pricing','Price experiment'); return true;
    }
    toggleMenu(id) {
      const p=MENU.find(p=>p.id===id);
      if(!p||p.day>this.day||!['planning','shift'].includes(this.phase)) return false;
      if(p.kind==='drink'&&this.menu[id].enabled&&MENU.filter(p=>p.kind==='drink'&&this.menu[p.id].enabled).length<=1) return false;
      this.menu[id].enabled=!this.menu[id].enabled; return true;
    }
    setStrategy(strategy) {
      if(!['inhouse','outsource','hybrid'].includes(strategy)||!['planning','shift'].includes(this.phase)) return false;
      this.strategy=strategy; this.strategyChosen=true; this.earn('strategy','Make or buy?'); return true;
    }
    bake(name) {
      if(!['planning','shift'].includes(this.phase)||BY_NAME[name]?.group!=='bakery') return 'Choose a pastry during planning or a shift.';
      if(this.strategy==='outsource') return 'Switch to in-house or hybrid to use the oven.';
      if(this.ovenBroken) return 'The oven is unavailable today. Buy ready-made pastries.';
      if(this.batches.length>=(this.upgrades.includes('oven')?2:1)) return 'All oven racks are busy.';
      if(this.frozen(name)<CONFIG.bakeBatch) return 'Order and shelve 4 frozen portions first.';
      const conversion=CONFIG.bakeConversion-(this.upgrades.includes('energy')?.8:0);
      if(this.spendable<conversion) return 'Not enough available credit for labor and oven energy.';
      const portion=this.consume(name,CONFIG.bakeBatch,true);
      this.cash-=conversion; this.metrics.conversion+=conversion;
      this.batches.push({id:++this.serial,name,qty:CONFIG.bakeBatch,cost:portion.cost+conversion,quality:portion.quality,day:this.day,ready:this.clock+(this.upgrades.includes('oven')?16:CONFIG.bakeSeconds)+(this.slowOven?12:0)});
      this.earn('bake','Small batch, big idea'); return null;
    }
    processBatches() {
      for(const b of this.batches.filter(b=>b.ready<=this.clock)) {
        const life=BY_NAME[b.name].life*(this.upgrades.includes('fridge')?1.5:1);
        this.addLot(b.name,b.qty,b.cost/b.qty,life,false,b.quality,(b.day??this.day)+Math.ceil(life),b.ready);
        this.say(`Fresh from the oven: ${b.qty} ${b.name}.`);
      }
      this.batches=this.batches.filter(b=>b.ready>this.clock);
    }
    spendOperating(amount) {
      if(!Number.isFinite(amount)||amount<0||amount>this.spendable+1e-8) return false;
      this.cash-=amount; this.metrics.operating+=amount; return true;
    }
    hireHelper() {
      if(this.day<4||this.helper||this.phase!=='planning'||!this.spendOperating(22)) return false;
      this.helper=true; return true;
    }
    buyUpgrade(id) {
      const u=UPGRADES.find(u=>u.id===id);
      if(!u||this.upgrades.includes(id)||u.day>this.day||!['planning','review'].includes(this.phase)||(this.day===7&&this.phase==='review')||!this.spendOperating(u.cost)) return false;
      this.upgrades.push(id); this.earn(`upgrade-${id}`,'Continuous improvement');
      if(this.phase==='review') this.refreshReport();
      return true;
    }
    /* Demand uses observations and seeded uncertainty, never a future customer list. */
    rate(name) {
      const last=this.reports.at(-1), prior=last?(last.demand[name]||0)/CONFIG.shiftSeconds:0;
      return ((this.metrics.demand[name]||0)+prior*45)/(Math.max(this.elapsed,30)+45);
    }
    trend(name) {
      const last=this.reports.at(-1), before=this.reports.at(-2);
      const current=this.elapsed>=35?this.rate(name):(last?.demand[name]||0)/CONFIG.shiftSeconds;
      const baseline=(this.elapsed>=35?last?.demand[name]:before?.demand[name])||0;
      if((this.day===3||this.day===6)&&['Oat Milk','Cold Brew'].includes(name)) return {label:'Trending up',arrow:'↑',level:'up'};
      if(current===0) return {label:'Not observed yet',arrow:'·',level:'unknown'};
      if(current<.012) return {label:'Low demand',arrow:'↓',level:'down'};
      if(current>baseline/CONFIG.shiftSeconds*1.2) return {label:'Increasing',arrow:'↑',level:'up'};
      if(current<baseline/CONFIG.shiftSeconds*.8) return {label:'Slowing',arrow:'↓',level:'down'};
      return {label:'Steady',arrow:'→',level:'steady'};
    }
    suggested(name) {
      const target=Math.ceil(this.rate(name)*65)+(this.day>=6?4:2);
      return Math.max(0,Math.min(target-this.stock(name)-this.frozen(name)-this.incoming(name),this.capacity(name)-this.occupied(name)-this.incoming(name)));
    }
    chooseProduct(kind) {
      const available=MENU.filter(p=>p.kind===kind&&p.day<=this.day&&this.menu[p.id].enabled);
      if(!available.length) return null;
      const weighted=available.map(p=>({p,weight:(p.id==='oat'&&this.day>=3?2.4:1)*(this.promotion===p.id?2:1)}));
      let roll=this.random()*sum(weighted.map(p=>p.weight));
      for(const v of weighted) { roll-=v.weight; if(roll<=0) return v.p; }
      return weighted.at(-1).p;
    }
    priceAcceptance(p) { return clamp(1.04-Math.max(0,this.menu[p.id].price/p.price-1)*1.3,.12,.99); }
    customer() {
      const drink=this.chooseProduct('drink'); if(!drink) return;
      const pastry=this.random()<(this.day===1?.15:this.promotion==='cookie'?.65:.4)?this.chooseProduct('bakery'):null, products=[drink,...(pastry?[pastry]:[])];
      const order={id:++this.serial,name:this.pick(['Maya','Leo','Sam','Noor','Ava','Kai','Alex']),face:this.pick([0,1,2]),arrival:this.clock,products:products.map(p=>p.id),status:'waiting',price:sum(products.map(p=>this.menu[p.id].price)),warned:false};
      this.metrics.arrived++;
      for(const p of products) {
        this.metrics.requested[p.id]=(this.metrics.requested[p.id]||0)+1;
        for(const name of p.recipe) this.metrics.demand[name]=(this.metrics.demand[name]||0)+1;
      }
      this.orders.push(order);
      if(products.some(p=>this.random()>this.priceAcceptance(p))) { this.lose(order,'price'); this.react(order,'Too expensive for me today.','disappointed'); return; }
      // A very limited menu sacrifices some variety but remains a viable capacity strategy.
      if(this.day>=4&&MENU.filter(p=>p.kind==='drink'&&this.menu[p.id].enabled).length===1&&this.random()<.1) {
        this.lose(order,'menu'); this.react(order,'I was hoping for another option.','neutral');
      }
    }
    requirements(order) {
      const result={};
      for(const id of order.products) for(const name of MENU.find(p=>p.id===id).recipe) result[name]=(result[name]||0)+1;
      return result;
    }
    missing(order) { return Object.entries(this.requirements(order)).filter(([name,qty])=>this.stock(name)<qty).map(([name])=>name); }
    lose(order,reason='stock') {
      if(['lost','served'].includes(order.status)) return;
      order.status='lost'; this.metrics.lost++; this.metrics.lostSales+=order.price;
      if(reason==='price') this.metrics.priceLost++;
      else if(reason==='menu') this.metrics.menuLost++;
      else { const key=this.missing(order)[0]||'Service capacity'; this.metrics.lostByItem[key]=(this.metrics.lostByItem[key]||0)+order.price; }
    }
    react(order,text,emotion='happy') {
      this.reactions.unshift({id:order.id,name:order.name,face:order.face,emotion,text}); this.reactions=this.reactions.slice(0,3);
    }
    substituteWaiting(from,to) {
      for(const order of this.orders.filter(o=>o.status==='waiting'&&o.products.includes(from))) {
        if(this.random()>.8){this.lose(order,'menu');this.react(order,'I’ll come back for cold brew another day.','neutral');continue;}
        order.products=order.products.map(id=>id===from?to:id);
        order.price=sum(order.products.map(id=>this.menu[id].price));order.warned=false;
        this.react(order,'A vanilla latte works for me!','pleased');
      }
    }
    processCustomers() {
      for(const order of this.orders) {
        if(['lost','served'].includes(order.status)) continue;
        const missing=this.missing(order);
        if(missing.length&&!order.warned) {
          order.warned=true; this.metrics.stockouts++;
          for(const name of missing) this.metrics.missing[name]=(this.metrics.missing[name]||0)+1;
          this.say(`${order.name} is waiting for ${missing[0]}. Restock or promote a stocked alternative.`);
        }
        if(this.clock-order.arrival>=CONFIG.patience) { this.lose(order); this.react(order,'Maybe I’ll try again tomorrow.','disappointed'); continue; }
        if(order.status==='preparing'&&this.clock>=order.ready) {
          if(missing.length) { order.status='waiting'; continue; }
          let cost=0,quality=0,units=0;
          for(const [name,qty] of Object.entries(this.requirements(order))) {
            const used=this.consume(name,qty); cost+=used.cost; quality+=used.quality*qty; units+=qty;
          }
          order.status='served'; this.metrics.served++; this.cash+=order.price;
          this.metrics.revenue+=order.price; this.metrics.cogs+=cost;
          const wait=this.clock-order.arrival,q=quality/units;
          const priceRatio=sum(order.products.map(id=>this.menu[id].price/MENU.find(p=>p.id===id).price))/order.products.length;
          const satisfaction=clamp(92-(wait-6)*.65-(1-q)*45-Math.max(0,priceRatio-1)*35,30,100);
          this.metrics.satisfactionTotal+=satisfaction; this.metrics.qualityTotal+=q; this.metrics.waitTotal+=wait;
          for(const id of order.products) this.metrics.sold[id]=(this.metrics.sold[id]||0)+1;
          this.react(order,satisfaction>78?this.pick(['This place is getting better!','I’m telling my friends.','Worth coming back for.']):'Good coffee. The wait could be shorter.',satisfaction>78?'happy':'pleased');
          if(this.metrics.served>=5) this.earn('first-five','Five reasons to reopen');
        }
      }
      let free=(this.helper?2:1)-this.orders.filter(o=>o.status==='preparing').length;
      for(const order of this.orders.filter(o=>o.status==='waiting'&&!this.missing(o).length)) {
        if(free--<=0) break;
        order.status='preparing'; order.ready=this.clock+CONFIG.serviceSeconds+(this.batches.length&&!this.helper?5:0);
      }
    }
    /* Short consequential story decisions. Rewards and expenses apply only once. */
    eventData() {
      const kind=this.info.event;
      const data={
        welcome:{title:'Our first regular is back!',text:'A customer wants to bring the robotics club for coffee. Can your milk, cups and coffee stock keep up?',choices:[['promote','Feature Vanilla Latte','More coffee orders; keep a small buffer.'],['steady','Keep a small menu','A calmer start while we learn.']]},
        discount:{title:'A bargain with a catch',text:'Budget Beans offers 10% off for the rest of today. Their delivery reliability stays the same.',choices:[['deal','Take the discount','Cheaper orders; same risk.'],['steady','Stick to the plan','Protect the supply chain you trust.']]},
        oat:{title:'Oat Milk Cold Brew is trending!',text:'Requests are climbing. Extra stock could help, but leftovers still expire.',choices:[['emergency','Express oat kit · $14','8 oat milk, 8 cold brew, 8 straws; 5s.'],['alternative','Promote Vanilla Latte','Shift demand to the original menu.'],['hide','Pause the oat special','Fewer choices; preserve other supplies.']]},
        oven:{title:'The oven is acting up',text:'The thermostat failed between batches. How should we keep the pastry case stocked?',choices:[['repair','Repair it · $12','Keep baking here today.'],['outsource','Use the local bakery','Buy ready-made; no oven work.'],['hybrid','Work around it','Slower batches; mix make and buy.']]},
        price:{title:'“We’re on a student budget”',text:'Maya suggests a value special. You can test it without permanently changing every price.',choices:[['value','Vanilla Latte: 10% off','Lower margin; better price acceptance.'],['quality','Keep prices; explain quality','Protect margins and watch reactions.']]},
        rush:{title:'The festival crowd is here!',text:'Keep the system moving. An express buffer costs money; a focused menu reduces complexity.',choices:[['emergency','Express oat kit · $14','8 oat milk, 8 cold brew, 8 straws; 5s.'],['alternative','Promote Vanilla Latte','Use a different set of ingredients.'],['focus','Focus the drink menu','Offer only your best-stocked drink.']]},
        final:{title:'The neighborhood is watching',text:'The landlord arrives tonight. Invite a few more neighbors, or focus on serving the people already here.',choices:[['invite','Community invite · $10','More traffic for the rest of the shift.'],['steady','Make every order count','Keep the current pace.']]}
      };
      return {...data[kind],kind};
    }
    chooseEvent(choice) {
      const event=this.pendingEvent;
      if(!event||!event.choices.some(c=>c[0]===choice)) return 'Choose one of the available decisions.';
      this.lastExplanation='';
      if(choice==='emergency') {
        const cart=[['Oat Milk',8],['Cold Brew',8],['Straw',8]];
        if(cart.some(([n,q])=>this.occupied(n)+this.incoming(n)+q>this.capacity(n))) return 'The express kit will not fit. Choose another response.';
        if(this.spendable<14) return 'You need $14 of cash or credit for this kit.';
        const goods=sum(cart.map(([n,q])=>BY_NAME[n].cost*q));
        this.cash-=14; this.metrics.purchases+=goods; this.metrics.operating+=14-goods;
        this.deliveries.push({id:++this.serial,supplier:'quick',name:'QuickShip emergency',placed:this.clock,expected:this.clock+5,eta:this.clock+5,dueDay:this.day,reliability:1,delayed:false,error:false,arrived:false,shelved:false,notified:false,
          lines:cart.map(([name,qty])=>({name,qty,cost:BY_NAME[name].cost,quality:.94,life:BY_NAME[name].life,frozen:false,written:false}))});
        this.lastExplanation='Emergency shipping protects sales, but its fee reduces profit. A safety buffer can cost less.';
      }
      if(choice==='repair'&&!this.spendOperating(12)) return 'Not enough available credit for the repair.';
      if(choice==='invite'&&!this.spendOperating(10)) return 'Not enough available credit for an invitation.';
      if(choice==='promote') { this.promotion='latte'; this.lastExplanation='A coffee special brings more drink requests. Check milk and cups before promising more than you can serve.'; }
      if(choice==='deal') this.discount=true;
      if(choice==='alternative') {
        this.promotion='latte'; this.menu.latte.enabled=true; this.menu.oat.enabled=false;
        this.substituteWaiting('oat','latte');
        this.lastExplanation='Waiting cold-brew customers were offered a latte. Some accept; others leave. Substitution protects service but changes what you sell.';
      }
      if(choice==='hide') { this.menu.latte.enabled=true; this.menu.oat.enabled=false; }
      if(choice==='focus') {
        const best=MENU.filter(p=>p.kind==='drink'&&p.day<=this.day).sort((a,b)=>this.servings(b.id)-this.servings(a.id))[0];
        for(const p of MENU.filter(p=>p.kind==='drink')) this.menu[p.id].enabled=p.id===best.id;
        this.lastExplanation='A focused menu needs fewer ingredients. Some customers will miss the variety.';
      }
      if(choice==='outsource') { this.strategy='outsource'; this.ovenBroken=true; }
      if(choice==='hybrid') { this.strategy='hybrid'; this.ovenBroken=false; this.slowOven=true; }
      if(choice==='repair') { this.ovenBroken=false; this.slowOven=false; }
      if(choice==='value') this.menu.latte.price=Math.round(MENU[0].price*.9*4)/4;
      if(choice==='invite') this.promotion='invite';
      if(!this.lastExplanation) this.lastExplanation='Watch the next sales and waste results. Improving a system means testing a decision, then adjusting.';
      this.earn(`decision-${this.day}`,'Rescue decision',15); this.pendingEvent=null; return null;
    }
    servings(id) { const p=MENU.find(p=>p.id===id); return p?Math.min(...p.recipe.map(n=>this.stock(n))):0; }
    quiz(answer) {
      if(this.phase!=='review'||this.quizAnswered) return false;
      this.quizAnswered=true; const correct=answer==='buffer';
      if(correct) this.earn(`reflection-${this.day}`,'Engineer’s reflection',10);
      return correct;
    }
    /* Campaign clock: planning advances logistics only; the live shift advances everything. */
    open() {
      if(this.phase!=='planning') return 'This day has already started.';
      if(!this.briefed) return 'Read today’s short briefing first.';
      if(this.expiredCount()) return 'Clear the expired stock before opening. Expired food cannot be served.';
      if(!this.strategyChosen) return 'Choose today’s bakery strategy in Menu & bakery.';
      if(!MENU.some(p=>p.kind==='drink'&&this.menu[p.id].enabled&&this.servings(p.id)>0)) return 'Stock at least one complete drink recipe before opening.';
      const overhead=CONFIG.dailyOverhead-(this.upgrades.includes('energy')?5:0);
      if(!this.spendOperating(overhead)) return `Keep $${overhead} available for today’s rent, power and staff.`;
      this.phase='shift'; this.running=true; this.tutorial.finished=true; this.tutorial.active=false; return null;
    }
    advancePlanning() {
      if(this.phase!=='planning') return false;
      const targets=[...this.deliveries.filter(d=>!d.arrived&&!d.cancelled&&d.dueDay<=this.day).map(d=>d.eta),...this.batches.map(b=>b.ready)];
      if(!targets.length) return false;
      this.clock=Math.max(this.clock,Math.min(...targets));
      this.processDeliveries(); this.processBatches(); this.markExpired(); return true;
    }
    tick(seconds) {
      if(!this.running||this.phase!=='shift'||this.pendingEvent||!Number.isFinite(seconds)||seconds<=0) return;
      // Small steps preserve causal ordering at every simulation speed.
      for(let left=Math.min(seconds,CONFIG.shiftSeconds);left>1e-8;) {
        const dt=Math.min(left,1,CONFIG.shiftSeconds-this.elapsed); left-=dt;
        this.clock+=dt; this.elapsed+=dt; this.processDeliveries(); this.processBatches(); this.markExpired();
        if(this.elapsed>=this.nextArrival&&this.elapsed<CONFIG.shiftSeconds-8) {
          this.customer();
          const enabled=MENU.filter(p=>p.kind==='drink'&&this.menu[p.id].enabled);
          const priceFactor=sum(enabled.map(p=>this.menu[p.id].price/p.price))/Math.max(1,enabled.length);
          this.nextArrival=this.elapsed+CONFIG.arrivalIntervals[this.day-1]*(.65+this.random()*.7)*(1.2-this.reputation/100*.45)*clamp(priceFactor,.65,1.5)*(this.promotion==='invite'||(this.day===1&&this.promotion==='latte')?.8:1);
        }
        this.processCustomers();
        if(this.elapsed>=this.nextSample) {
          this.history.push({day:this.day,t:this.elapsed,arrived:this.metrics.arrived,served:this.metrics.served});
          this.metrics.stockSamples++; this.metrics.stockValueSum+=this.inventoryValue(); this.nextSample+=20;
        }
        if(!this.eventSeen&&this.elapsed>=100) { this.eventSeen=true; this.pendingEvent=this.eventData(); break; }
        if(this.elapsed>=CONFIG.shiftSeconds) { this.finish(); break; }
      }
    }
    biggestProblem() {
      const lost=Object.entries(this.metrics.lostByItem).sort((a,b)=>b[1]-a[1])[0];
      const waste=Object.entries(this.metrics.wasteByItem).sort((a,b)=>b[1]-a[1])[0];
      if(this.metrics.priceLost>=3) return `${this.metrics.priceLost} customers left because of prices. Try a smaller margin on one popular drink.`;
      if(this.metrics.menuLost>=2&&!lost) return `${this.metrics.menuLost} customers wanted more variety. Try adding one well-stocked drink while protecting service speed.`;
      if(lost&&(!waste||lost[1]>waste[1])) return `$${lost[1].toFixed(2)} in missed sales: ${lost[0]}. A small safety buffer or more capacity could help.`;
      if(waste&&waste[1]>2) return `$${waste[1].toFixed(2)} of ${waste[0]} was wasted. Buy smaller batches and move older stock forward.`;
      return 'A stable shift. Keep watching actual demand before expanding the menu.';
    }
    finish() {
      if(this.phase!=='shift') return false;
      for(const o of this.orders) if(!['served','lost'].includes(o.status)) this.lose(o);
      this.running=false; this.phase='review'; this.elapsed=CONFIG.shiftSeconds;
      const service=this.metrics.served/Math.max(1,this.metrics.arrived);
      this.reputation=clamp(Math.round(this.reputation*.72+this.satisfaction*service*.28),0,100);
      if(service>=.85) this.earn(`service-${this.day}`,'Customers come back',20);
      if(this.metrics.waste<2&&this.metrics.served>5) this.earn(`waste-${this.day}`,'Waste watcher',20);
      this.reports.push({day:this.day}); this.refreshReport(); return true;
    }
    refreshReport() {
      const report=this.reports.find(r=>r.day===this.day); if(!report) return;
      Object.assign(report,clone(this.metrics),{
        day:this.day,title:this.info.title,profit:this.profit,cash:this.cash,balance:this.balance,
        inventoryValue:this.inventoryValue(),remaining:sum(ITEMS.map(i=>this.stock(i.name))),
        reputation:this.reputation,satisfaction:this.satisfaction,problem:this.biggestProblem(),
        openingCash:this.openingCash,openingValue:this.dayOpeningValue,
        averageInventory:this.metrics.stockSamples?this.metrics.stockValueSum/this.metrics.stockSamples:0,
        // Faults are mutually exclusive: on-time + correct - total = fault-free orders.
        supplierPerformance:this.metrics.deliveries?100*(this.metrics.onTime+this.metrics.correct-this.metrics.deliveries)/this.metrics.deliveries:null
      });
    }
    nextDay() {
      if(this.phase!=='review'||this.day>=CONFIG.days) return false;
      this.day++; this.beginDay(); this.clock+=CONFIG.overnightSeconds;
      this.processDeliveries(); this.processBatches(); this.markExpired(); return true;
    }
    ending() {
      if(this.day!==7||!['review','complete'].includes(this.phase)) return null;
      const served=sum(this.reports.map(r=>r.served)),arrived=sum(this.reports.map(r=>r.arrived)),service=served/Math.max(1,arrived);
      const waste=sum(this.reports.map(r=>r.waste)),revenue=sum(this.reports.map(r=>r.revenue)),profit=sum(this.reports.map(r=>r.profit));
      const score=Math.round(clamp(service*35+this.reputation*.35+clamp((this.balance+500)/700,0,1)*20+Math.max(0,10-waste/12),0,100));
      // Solvency and real service matter. XP alone cannot save the café.
      const tier=this.cash>=0&&this.balance>=75&&this.reputation>=70&&service>=.85?'gold':
        this.balance>=0&&this.reputation>=50&&service>=.7?'silver':
        this.balance>=-200&&this.reputation>=35&&this.reports.at(-1).profit>0&&service>=.5?'bronze':'failure';
      return {tier,title:{gold:'Café Turnaround Champion',silver:'Café Saved',bronze:'Barely Survived',failure:'Café Closed — Try Again'}[tier],
        score,service,served,arrived,waste,revenue,profit,balance:this.balance,reputation:this.reputation,
        lostSales:sum(this.reports.map(r=>r.lostSales)),efficiency:Math.round(service*100),
        turnover:sum(this.reports.map(r=>r.cogs))/Math.max(1,sum(this.reports.map(r=>r.averageInventory))/7)};
    }
    /* Versioned, mode-specific saves. Resume always pauses to orient the player. */
    save() {
      const data=clone(this); data.running=false; return JSON.stringify({version:CONFIG.version,state:data});
    }
    static restore(serialized) {
      try {
        if(typeof serialized!=='string'||serialized.length>1500000) return null;
        const envelope=JSON.parse(serialized),s=envelope.state;
        if(![2,CONFIG.version].includes(envelope.version)||!s||!Number.isInteger(s.day)||s.day<1||s.day>7) return null;
        if(envelope.version===2) {
          for(const [name,lots] of Object.entries(s.lots||{})) for(const l of lots) {
            l.expires=l.expires<=s.clock?s.day:s.day+Math.max(1,Math.ceil((l.expires-s.clock)/(name==='Croissant'||name==='Cookie'?185:360)));
          }
          for(const d of s.deliveries||[]) { d.dueDay=s.day; for(const l of d.lines) {
            l.life=BY_NAME[l.name]?.life||2;if(d.arrived)l.expires=s.day+l.life;
          }}
          for(const b of s.batches||[])b.day=s.day;
          s.notes=[];s.reactions=[];
          for(const o of s.orders||[]) {o.face=0;if(o.name?.includes('neighbor'))o.name='Alex';}
        }
        const safe=value=>{
          if(typeof value==='number') return Number.isFinite(value)&&Math.abs(value)<1e12;
          if(Array.isArray(value)) return value.length<20000&&value.every(safe);
          if(value&&typeof value==='object') return Object.keys(value).every(k=>!['__proto__','constructor','prototype'].includes(k))&&Object.values(value).every(safe);
          return true;
        };
        if(!safe(s)||!Number.isInteger(s.seed)||s.seed<0||s.seed>4294967295||
          !Number.isFinite(s.cash)||!Number.isFinite(s.clock)||!Number.isFinite(s.elapsed)||
          s.cash < -s.creditLimit-1e-6||s.creditLimit!==CONFIG.creditLimit||
          !['planning','shift','review','complete'].includes(s.phase)||s.clock<0||s.elapsed<0||s.elapsed>CONFIG.shiftSeconds||
          !s.lots||!s.menu||!s.metrics||!Array.isArray(s.reports)||!Array.isArray(s.deliveries)||!Array.isArray(s.batches)||
          !Array.isArray(s.upgrades)||!s.tutorial||!Array.isArray(s.tutorial.compared)||!Array.isArray(s.history)||!Array.isArray(s.reactions)||
          !Array.isArray(s.orders)||!Array.isArray(s.badges)||!s.rewards||!s.supplierStats||!Array.isArray(s.notes)||
          !['inhouse','outsource','hybrid'].includes(s.strategy)||!Number.isFinite(s.reputation)||s.reputation<0||s.reputation>100) return null;
        if(Object.entries(newMetrics()).some(([k,v])=>typeof v==='number'?typeof s.metrics[k]!=='number'||(k!=='purchases'&&s.metrics[k]<0):!s.metrics[k]||typeof s.metrics[k]!=='object')) return null;
        if(s.orders.some(o=>!Array.isArray(o.products)||o.products.some(id=>!MENU.some(p=>p.id===id)))) return null;
        if(s.pendingEvent&&(!Array.isArray(s.pendingEvent.choices)||!DAYS.some(d=>d.event===s.pendingEvent.kind))) return null;
        if(ITEMS.some(i=>!Array.isArray(s.lots[i.name])||s.lots[i.name].some(l=>!Number.isInteger(l.qty)||l.qty<0||l.cost<0||typeof l.expires!=='number'))) return null;
        if(MENU.some(p=>!s.menu[p.id]||typeof s.menu[p.id].enabled!=='boolean'||!Number.isFinite(s.menu[p.id].price)||s.menu[p.id].price<p.price*.5||s.menu[p.id].price>p.price*1.8)) return null;
        if(s.deliveries.some(d=>!Array.isArray(d.lines)||d.lines.some(l=>!BY_NAME[l.name]||!Number.isInteger(l.qty)||l.qty<0))) return null;
        const game=new InventorySim(s.seed);
        if(Object.keys(game).some(key=>!Object.hasOwn(s,key))) return null;
        for(const key of Object.keys(game)) if(Object.hasOwn(s,key)) game[key]=s[key];
        game.tutorial={...new InventorySim(1).tutorial,...s.tutorial};
        if(envelope.version===2){if(game.phase!=='planning')game.tutorial.active=false;if(game.pendingEvent)game.pendingEvent=game.eventData();}
        game.running=false; return game;
      } catch { return null; }
    }
  }
  window.InventorySim=InventorySim; window.INVENTORY_ITEMS=ITEMS; window.INVENTORY_GROUPS=GROUPS;
  window.RESCUE={CONFIG,SUPPLIERS,MENU,DAYS,UPGRADES};
})();
