/* Café Rescue only. Buildless, seeded simulation; no dependency on other game modes. */
(() => {
  'use strict';
  const CONFIG = Object.freeze({
    version:6, days:5, shiftSeconds:75, openingCash:-500, creditLimit:750,
    openingReputation:20, dailyOverhead:14, overnightSeconds:75,
    patience:12, bakeSeconds:8, bakeBatch:4, bakeConversion:3.4,
    arrivalIntervals:[2.8,2.3,2,1.8,1.3], serviceSeconds:2, seed:19725
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
    {id:'budget',name:'Budget Beans & Basics',icon:'budget',color:'#a36b30',multiplier:.72,lead:4,nextDay:true,reliability:.78,quality:.76,life:.7,bulk:12,discount:.12,unlock:1,note:'Lowest cost. Standard orders arrive tomorrow; more risk.'},
    {id:'quick',name:'QuickShip Co-op',icon:'truck',color:'#277565',multiplier:1,lead:5,reliability:.96,quality:.94,life:1,bulk:18,discount:.06,unlock:1,note:'Fast, dependable, small orders welcome.'},
    // Keep the existing supplier ID so saved orders and contracts remain compatible.
    {id:'premium',name:'Neighborhood Supply',icon:'shop',color:'#477ca6',multiplier:.86,lead:10,reliability:.90,quality:.86,life:.85,bulk:16,discount:.08,unlock:1,note:'Middle price and quality. Same-day delivery takes longer than QuickShip; 90% reliable.'}
  ];
  const MENU=[
    {id:'latte',name:'Vanilla Latte',icon:'coffee',price:6,day:1,kind:'drink',recipe:['Original Blend','Whole Milk','Vanilla','Cup','Lid','Napkin']},
    {id:'caramel',name:'Almond Caramel',icon:'cup',price:6.5,day:2,kind:'drink',recipe:['Original Blend','Almond Milk','Caramel','Cup','Lid','Napkin']},
    {id:'oat',name:'Oat Milk Cold Brew',icon:'coldbrew',price:7,day:2,kind:'drink',recipe:['Cold Brew','Oat Milk','Brown Sugar','Cup','Lid','Straw','Napkin']},
    {id:'decaf',name:'Decaf Cloud',icon:'topping',price:6,day:2,kind:'drink',recipe:['Decaf','Cream','Whipped Cream','Cup','Lid','Napkin']},
    {id:'mocha',name:'Mocha Melt',icon:'mocha',price:7,day:4,kind:'drink',recipe:['Original Blend','Whole Milk','Mocha','Chocolate Drizzle','Cup','Lid','Napkin']},
    {id:'pumpkin',name:'Pumpkin Hug',icon:'pumpkin',price:7,day:4,kind:'drink',recipe:['Original Blend','Oat Milk','Pumpkin Spice','Cinnamon','Cup','Lid','Napkin']},
    {id:'sweet',name:'Sweet Cream Chill',icon:'cream',price:7.5,day:4,kind:'drink',recipe:['Cold Brew','Sweet Cream','Cold Foam','Caramel Drizzle','Cup','Lid','Straw','Napkin']},
    {id:'cookie',name:'Cookie',icon:'cookie',price:3.25,day:1,kind:'bakery',recipe:['Cookie','Bakery Bag','Napkin']},
    {id:'croissant',name:'Croissant',icon:'croissant',price:4,day:1,kind:'bakery',recipe:['Croissant','Bakery Bag','Napkin']},
    {id:'sandwich',name:'Breakfast Sandwich',icon:'sandwich',price:5.5,day:3,kind:'bakery',recipe:['Breakfast Sandwich','Bakery Bag','Napkin','Utensil']}
  ];
  const DAYS=[
    {title:'Reopen the café',chapter:'REOPEN',face:'shop',text:'Five days to save rISE Café. Clear expired stock and choose a supplier to restart coffee service.',goals:['Clear expired stock and use FIFO','Compare suppliers and restock coffee','Serve your first customers'],concept:'Inventory and supply chains',event:'welcome'},
    {title:'The trending drink',chapter:'FORECAST',face:'trend',text:'Your Oat Milk Cold Brew is trending! Use actual sales to prepare for uncertain demand.',goals:['Inspect demand trends','Choose a forecast, buffer and reorder point','Test the cold brew special'],concept:'Forecasting and safety stock',event:'oat'},
    {title:'The bakery decision',chapter:'MAKE OR BUY',face:'croissant',text:'Baking and drinks share staff time. Choose how to supply pastries and where your limited money helps most.',goals:['Choose make, buy or hybrid','Plan staff and equipment capacity','Compare an improvement with keeping cash'],concept:'Make-or-buy and resource allocation',event:'oven'},
    {title:'Price it right',chapter:'PRICE LAB',face:'menu',text:'A higher price earns more per drink, but some customers may walk away. Find your balance.',goals:['Confirm two drink prices','Compare unit costs and margins','Observe customer response'],concept:'Engineering economics',event:'price'},
    {title:'The festival finale',chapter:'THE COMEBACK',face:'shop',text:'Festival traffic is coming, and the landlord visits tonight. Use what you learned to save the café.',goals:['Use results to improve your stock plan','Prepare capacity for the rush','Balance service, profit and waste'],concept:'Systems thinking and continuous improvement',event:'rush'}
  ];
  const UPGRADES=[
    {id:'fridge',name:'Better refrigerator',icon:'fridge',cost:45,day:2,effect:'New milk and fresh bakery last 50% longer.'},
    {id:'storage',name:'Organized shelving',icon:'shelf',cost:30,day:2,effect:'50% more storage; easier FIFO rotation.'},
    {id:'tracker',name:'Stockroom Assistant',icon:'trend',cost:18,day:1,effect:'One-time unlock: draft all out-of-stock active-menu supplies together, plus low-stock alerts. Goods and shipping cost extra.'},
    {id:'contract',name:'Supplier partnership',icon:'contract',cost:38,day:2,effect:'+10 points supplier reliability, up to 100%.'},
    {id:'oven',name:'Second bakery rack',icon:'oven',cost:48,day:3,effect:'Two batches at once; baking takes 5 seconds.'},
    {id:'ordering',name:'Combined ordering',icon:'menu',cost:26,day:3,effect:'Half the shipping fees; 5 seconds off lead times.'},
    {id:'energy',name:'Efficient equipment',icon:'leaf',cost:38,day:4,effect:'Daily operating cost drops by $5; baking costs $0.80 less.'}
  ];
  const clone=value=>JSON.parse(JSON.stringify(value));
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const sum=values=>values.reduce((a,b)=>a+b,0);
  const newMetrics=()=>({
    arrived:0,served:0,lost:0,revenue:0,cogs:0,waste:0,wasteUnits:0,purchases:0,operating:0,conversion:0,refunds:0,
    stockouts:0,lostSales:0,stockLost:0,stockLostRevenue:0,priceLost:0,menuLost:0,satisfactionTotal:0,waitTotal:0,qualityTotal:0,
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
      this.alerts={dismissedExpiry:[],losses:[]};
      this.learning={days:{},events:[]}; this.reorderPoint=2; this.safetyStock=2;
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
    get lesson() { return this.learning.days[this.day]||={compared:[],viewed:[],plan:null,review:null,attempts:[]}; }
    observe(section,value) {
      if(this.phase!=='planning') return;
      if(section==='supplier'&&this.supplier(value)&&!this.lesson.compared.includes(value))this.lesson.compared.push(value);
      if(section==='tab'&&['stock','supply','menu','trends'].includes(value)&&!this.lesson.viewed.includes(value))this.lesson.viewed.push(value);
    }
    planProblem() {
      if(!this.lesson.plan)return 'Complete today’s required operations plan before opening.';
      if(this.day===1&&!this.learning.legacyFIFO&&!this.learning.events.some(e=>e.kind==='fifo'))return 'Unpack a delivery with older stock in front before opening.';
      if(this.day===1&&!this.deliveries.some(d=>!d.cancelled&&d.learningDay===1&&d.supplier===this.lesson.plan.supplier))return 'Place an order with your chosen supplier so you can evaluate the delivery.';
      if(this.day===2&&(!this.menu.oat.enabled||this.servings('oat')<1))return 'Prepare at least one Oat Milk Cold Brew and put it on the menu. Same-day deliveries arrive while you prepare. Budget standard orders arrive tomorrow; choose a same-day supplier or express shipping for ingredients needed today.';
      if(this.day===3&&!MENU.some(p=>p.kind==='bakery'&&this.menu[p.id].enabled&&this.servings(p.id)>0))return 'Put a stocked bakery item on the menu to test your make-or-buy strategy. Bake frozen portions or order ready-made stock.';
      if(this.day===4&&!['latte','oat'].some(id=>this.menu[id].enabled&&this.servings(id)>0))return 'Stock and enable at least one of the drinks you priced so customers can respond to your decision.';
      return null;
    }
    commitPlan(p) {
      if(this.phase!=='planning'||!p||this.lesson.plan)return 'This operations plan is already saved or the shift has started.';
      const whole=(v,min,max)=>Number.isInteger(v)&&v>=min&&v<=max;
      if([1,2,5].includes(this.day)&&!whole(p.servings,1,40))return 'Choose a whole serving target from 1 to 40.';
      if([2,3,5].includes(this.day)&&(!whole(p.buffer,0,12)||!whole(p.reorder,1,12)))return 'Choose safety stock from 0 to 12 and a reorder point from 1 to 12.';
      if(this.day===1&&(this.lesson.compared.length<2||!this.lesson.compared.includes(p.supplier)))return 'Inspect at least two supplier offers and select one you compared.';
      if([2,5].includes(this.day)&&!this.lesson.viewed.includes('trends'))return 'Open Sales & trends before making your forecast.';
      if(this.day===3&&!['inhouse','outsource','hybrid'].includes(p.strategy))return 'Choose how to supply your bakery.';
      if(this.day===4) {
        if(!p.prices||Object.keys(p.prices).length!==2)return 'Set and confirm prices for both drinks.';
        for(const id of ['latte','oat']) {
          const product=MENU.find(m=>m.id===id),v=p.prices[id];
          if(!Number.isFinite(v)||v<product.price*.5||v>product.price*1.8||Math.abs(v*4-Math.round(v*4))>1e-8)return 'Use valid prices in $0.25 steps for both drinks.';
        }
      }
      if([3,5].includes(this.day)&&!['helper','focus','buffer'].includes(p.capacity))return 'Choose a rush capacity strategy.';
      if([3,5].includes(this.day)&&!['fridge','storage','energy','hold'].includes(p.investment))return 'Compare improvements and choose one, or preserve cash.';
      if([3,5].includes(this.day)&&!['waste','capacity','cash'].includes(p.reason))return 'Choose the operational reason for your investment decision.';
      if(p.capacity==='buffer'&&p.buffer===0)return 'A buffer strategy needs at least one extra unit. Otherwise choose a helper or focused menu.';
      const upgrade=UPGRADES.find(u=>u.id===p.investment&&!this.upgrades.includes(u.id));
      const cost=(upgrade?.cost||0)+([3,5].includes(this.day)&&p.capacity==='helper'&&!this.helper?22:0);
      if(cost>this.spendable)return 'This plan exceeds available cash and credit. Choose another strategy.';
      // Validate everything before applying choices. No cart purchases happen here.
      if(this.day===3)this.setStrategy(p.strategy);
      if(this.day===4)for(const [id,value]of Object.entries(p.prices))this.setPrice(id,value);
      if([3,5].includes(this.day)&&p.capacity==='helper'&&!this.helper)this.hireHelper();
      if([3,5].includes(this.day)&&p.capacity==='focus') {
        const best=MENU.filter(m=>m.kind==='drink'&&m.day<=this.day).sort((a,b)=>this.servings(b.id)-this.servings(a.id))[0];
        for(const m of MENU.filter(m=>m.kind==='drink'))this.menu[m.id].enabled=m.id===best.id;
        p={...p,focused:best.id};
      }
      if(upgrade)this.buyUpgrade(upgrade.id);
      if(p.buffer!==undefined){this.safetyStock=p.buffer;this.reorderPoint=p.reorder;}
      this.lesson.plan=clone(p);
      this.learning.events.push({kind:'plan',day:this.day,clock:this.clock,decision:clone(p),cash:this.cash});
      return null;
    }
    reviewOptions() {
      const r=this.reports.find(r=>r.day===this.day);if(!r)return null;
      const sold=r.served,loss=r.lostSales||0,waste=r.waste||0;
      const checks={
        1:{topic:'FIFO and waste prevention',prompt:'You placed older usable stock in front of a new delivery. Why does that help the café?',options:[['fifo','It helps use stock before it expires'],['speed','It makes the coffee machine work faster'],['price','It automatically raises selling prices']],correct:'fifo',explanation:'Using older usable stock first is FIFO. It reduces the chance of ingredients expiring unused.'},
        2:{topic:'Forecasting and safety stock',prompt:loss>0?'Your café missed $'+loss.toFixed(2)+' in possible sales. If unexpected demand causes a shortage, what can help?':'You served '+sold+' customers. How can you prepare for a popular drink without knowing exactly who will arrive?',options:[['maximum','Fill every shelf to its maximum'],['buffer','Use recent demand and keep a small stock buffer'],['guess','Ignore sales trends and repeat the same order']],correct:'buffer',explanation:'Forecasts use past demand; safety stock covers some uncertainty. Too much extra stock still costs money and can expire.'},
        3:{topic:'Make-or-buy and capacity',prompt:this.lesson.plan?.strategy==='inhouse'?'Your plan kept baking in-house. Which cost belongs in that decision?':'Your bakery plan used '+(this.lesson.plan?.strategy==='outsource'?'outsourcing':'a mix of making and buying')+'. What tradeoff matters?',options:[['free','Supplier deliveries remove all costs and risks'],['cost','Compare purchase costs with labor, oven time and delivery risk'],['unlimited','More bakery choices always create unlimited capacity']],correct:'cost',explanation:'Making and buying use different resources. Outsourcing frees staff and ovens but can cost more and creates supplier dependence.'},
        4:{topic:'Engineering economics',prompt:r.priceLost>0?r.priceLost+' customers declined a price today. How should you evaluate your prices?':'Your café earned $'+r.revenue.toFixed(2)+' in sales today. What should you compare when testing a new price?',options:[['highest','Choose the highest selling price every time'],['volume','Look only at the number of drinks sold'],['profit','Compare total profit, costs and customer response']],correct:'profit',explanation:'A larger margin per drink does not guarantee more total profit. Price affects both demand and earnings.'},
        5:{topic:'Systems thinking',prompt:loss>waste?'Your final shift missed $'+loss.toFixed(2)+' in possible revenue. Why should a new plan consider suppliers, stock and service together?':'Across five days, stock, prices and capacity affected your results. Why consider these decisions together?',options:[['system','Changes in one part affect other parts of the café'],['cheap','The cheapest choice is always best for the whole café'],['stock','Buying more ingredients fixes every operational problem']],correct:'system',explanation:'ISE improves the whole system. Use results to balance availability, capacity, cost and customer experience, then test an improvement.'}
      };
      return {...checks[this.day],loss,waste,profit:r.profit};
    }
    reflect(answer) {
      if(this.phase!=='review'||this.lesson.review)return 'This reflection is already complete or the shift is still running.';
      const evidence=this.reviewOptions();
      if(!evidence||!evidence.options.some(o=>o[0]===answer))return 'Choose one response.';
      const correct=answer===evidence.correct;
      this.lesson.attempts.push({answer,answerText:evidence.options.find(o=>o[0]===answer)[1],prompt:evidence.prompt,correct,topic:evidence.topic,evidence:{served:this.metrics.served,lostSales:evidence.loss,waste:evidence.waste,profit:evidence.profit}});
      if(!correct)return 'Not quite. '+evidence.explanation+' Try another response.';
      this.lesson.review={answer,topic:evidence.topic,explanation:evidence.explanation,firstCorrect:this.lesson.attempts[0].correct,attempts:this.lesson.attempts.length};
      this.learning.events.push({kind:'review',day:this.day,decision:clone(this.lesson.review)});
      return null;
    }
    learningRecord() {
      const concepts={1:['Inventory management','Expiration','FIFO','Supplier reliability','Lead time'],2:['Demand forecasting','Safety stock','Reorder points'],3:['Make-or-buy analysis','Capacity','Resource allocation','Investment tradeoffs'],4:['Engineering economics','Profit margins','Price-sensitive demand'],5:['Systems thinking','Optimization','Continuous improvement']};
      return {version:2,campaignVersion:CONFIG.version,totalDays:CONFIG.days,targetMinutes:15,scope:'Participation and in-game decisions; not a validated knowledge test.',day:this.day,curriculum:Object.entries(concepts).map(([day,topics])=>({day:Number(day),topics,completed:!!this.learning.days[day]?.review&&!this.learning.days[day]?.plan?.legacy})),days:clone(this.learning.days),events:clone(this.learning.events),results:clone(this.reports)};
    }
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
      this.nextArrival=2+this.random()*2; this.nextSample=0; this.strategyChosen=this.day!==3;
      this.reviewSeen=false; this.quizAnswered=false;
      if(this.day===2) this.menu.oat.enabled=true;
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
    usableIncoming(name,frozen=false) {
      return sum(this.deliveries.filter(d=>!d.shelved&&!d.cancelled&&d.dueDay<=this.day).flatMap(d=>d.lines
        .filter(l=>l.name===name&&!!l.frozen===frozen&&!l.written&&(!d.arrived||l.expires>this.day)).map(l=>l.qty)));
    }
    expiringItems() {
      return ITEMS.filter(i=>i.group!=='supplies').flatMap(i=>{
        const lots=this.lots[i.name].filter(l=>l.qty>0&&!l.written&&l.expires-this.day===1);
        return lots.length?[{name:i.name,days:1,qty:sum(lots.map(l=>l.qty)),keys:lots.map(l=>`${l.id}:${l.expires}`)}]:[];
      });
    }
    expiryNotice() { return this.expiringItems().find(i=>i.keys.some(k=>!this.alerts.dismissedExpiry.includes(k)))||null; }
    dismissExpiry(name) {
      const notice=this.expiringItems().find(i=>i.name===name);if(!notice)return;
      this.alerts.dismissedExpiry=[...new Set([...this.alerts.dismissedExpiry,...notice.keys])];
    }
    lossNotice() {
      const losses=this.alerts.losses.filter(l=>l.day===this.day&&!l.read);if(!losses.length)return null;
      const missing=[...new Set(losses.flatMap(l=>l.missing))],products=[...new Set(losses.flatMap(l=>l.products))];
      return {ids:losses.map(l=>l.id),count:losses.length,revenue:sum(losses.map(l=>l.revenue)),missing,products};
    }
    dismissLosses() { this.alerts.losses.filter(l=>l.day===this.day).forEach(l=>{l.read=true;}); }
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
        lead:Math.max(2,express?2:supplier.lead-(this.upgrades.includes('ordering')?5:0)),
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
    repriceCart(cart,supplierId) {
      if(!this.supplier(supplierId))return null;
      const before=this.quote(cart);if(!before)return null;
      const lines=cart.map(l=>({...l,supplier:supplierId})),after=this.quote(lines);
      return after?{lines,before,after,difference:after.total-before.total}:null;
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
          id:++this.serial,learningDay:this.day,supplier:supplier.id,name:supplier.name,placed:this.clock,expected:this.clock+lead,dueDay:this.day+offer.dayOffset,nextMorning:!!offer.dayOffset,
          eta:this.clock+lead+(delayed?3+Math.floor(this.random()*4):0),reliability:offer.reliability,
          delayed,error,arrived:false,shelved:false,notified:false,delayNotified:false,
          lines:lines.map(l=>({name:l.name,qty:l.qty,cost:l.offer.unit,quality:l.offer.quality,life:l.offer.life,frozen:l.offer.frozen,written:false}))
        });
      }
      this.learning.events.push({kind:'purchase',day:this.day,clock:this.clock,cart:clone(cart),goods:quote.goods,shipping:quote.shipping,total:quote.total});
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
      this.collectRoutineDeliveries();
    }
    collectRoutineDeliveries() {
      if(!this.learning.events.some(e=>e.kind==='fifo'))return;
      for(const d of this.deliveries.filter(d=>d.arrived&&!d.shelved&&!d.problem))this.shelve(d.id,true);
    }
    shelve(id,fifo=true) {
      const d=this.deliveries.find(d=>d.id===id); if(!d||!d.arrived||d.shelved) return false;
      this.markExpired();
      for(const l of d.lines) {
        this.lots[l.name].push({id:++this.serial,qty:l.qty,cost:l.cost,quality:l.quality,received:d.eta,expires:l.expires,frozen:l.frozen,written:l.written});
        this.lots[l.name].sort((a,b)=>((a.received??0)-(b.received??0)||a.id-b.id));
      }
      d.shelved=true; this.tutorial.shelved=true;
      if(fifo) { this.learning.events.push({kind:'fifo',day:this.day,delivery:id}); this.earn('fifo','First in, first out'); this.lastExplanation='Older products in front: fewer items expire before you can sell them. That is FIFO.'; }
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
    // Targets are total servings in this shopping plan, not repeated additions.
    // Shared stock is allocated once across all recipes; manual cart choices remain intact.
    recipePlan(targets,cart=[],supplier='quick',express=false) {
      if(!targets||!Array.isArray(cart)||!this.supplier(supplier))return null;
      const needs={};
      for(const [id,servings] of Object.entries(targets)) {
        const p=MENU.find(p=>p.id===id&&p.day<=this.day);
        if(!p||!Number.isInteger(servings)||servings<1||servings>100)return null;
        for(const name of p.recipe)needs[name]=(needs[name]||0)+servings;
      }
      const rows=Object.entries(needs).map(([name,required])=>{
        const bakery=BY_NAME[name].group==='bakery',canBake=bakery&&this.strategy!=='outsource'&&!this.ovenBroken;
        const frozen=bakery&&this.strategy==='inhouse';
        const ready=this.stock(name),incoming=this.usableIncoming(name);
        const baking=sum(this.batches.filter(b=>b.name===name&&(b.day??this.day)+BY_NAME[name].life>this.day).map(b=>b.qty));
        const cartReady=sum(cart.filter(l=>l.name===name&&!l.frozen).map(l=>l.qty));
        const frozenTotal=canBake?this.frozen(name)+this.usableIncoming(name,true)+sum(cart.filter(l=>l.name===name&&l.frozen).map(l=>l.qty)):0;
        const frozenCoverage=Math.floor(frozenTotal/CONFIG.bakeBatch)*CONFIG.bakeBatch;
        const shortage=Math.max(0,required-ready-incoming-baking-cartReady-frozenCoverage);
        const wanted=frozen&&shortage?Math.ceil(Math.max(0,required-ready-incoming-baking-cartReady)/CONFIG.bakeBatch)*CONFIG.bakeBatch-frozenTotal:shortage;
        const space=Math.max(0,this.capacity(name)-this.occupied(name)-this.incoming(name)-sum(cart.filter(l=>l.name===name).map(l=>l.qty)));
        const qty=Math.min(space,wanted);
        // Reuse the chosen company for a shared ingredient already in the cart.
        const existing=cart.find(l=>l.name===name&&!!l.frozen===frozen);
        return {name,required,stock:ready,incoming,baking,frozenCoverage,inCart:cartReady,qty,unfilled:Math.max(0,wanted-qty),
          supplier:existing?.supplier||supplier,frozen,express:existing?!!existing.express:!!express};
      });
      const blocked=this.ovenBroken&&rows.some(r=>r.frozen&&r.required>r.stock+r.incoming+r.inCart+r.baking)?'The oven is unavailable. Change your bakery strategy before planning pastries for today.':null;
      return {rows,lines:rows.filter(r=>r.qty>0).map(({name,qty,supplier,frozen,express})=>({name,qty,supplier,frozen,express})),unfilled:sum(rows.map(r=>r.unfilled)),blocked};
    }
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
    bulkStockoutPlan(cart=[],supplier='quick',size=8,express=false) {
      if(!this.upgrades.includes('tracker')||!['planning','shift'].includes(this.phase)||!Number.isInteger(size)||size<1||size>40)return null;
      const targets=Object.fromEntries(MENU.filter(p=>p.day<=this.day&&this.menu[p.id].enabled).map(p=>[p.id,p.kind==='bakery'?Math.max(2,Math.floor(size*.25)):size]));
      const plan=this.recipePlan(targets,cart,supplier,express);if(!plan)return null;
      const empty=new Set(plan.rows.filter(r=>r.stock===0).map(r=>r.name));
      const lines=plan.lines.filter(l=>empty.has(l.name)),combined=cart.map(l=>({...l}));
      for(const l of lines){const existing=combined.find(c=>c.name===l.name&&!!c.frozen===!!l.frozen);if(existing)existing.qty+=l.qty;else combined.push({...l});}
      return {lines,quote:this.quote(combined),unfilled:sum(plan.rows.filter(r=>empty.has(r.name)).map(r=>r.unfilled)),blocked:plan.blocked};
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
      if(this.day<4||!p||p.day>this.day||!Number.isFinite(value)||value<p.price*.5||value>p.price*1.8||!['planning','shift'].includes(this.phase)) return false;
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
      this.batches.push({id:++this.serial,name,qty:CONFIG.bakeBatch,cost:portion.cost+conversion,quality:portion.quality,day:this.day,ready:this.clock+(this.upgrades.includes('oven')?5:CONFIG.bakeSeconds)+(this.slowOven?4:0)});
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
      if(this.day<3||this.helper||this.phase!=='planning'||!this.spendOperating(22)) return false;
      this.helper=true; return true;
    }
    buyUpgrade(id) {
      const u=UPGRADES.find(u=>u.id===id);
      if(!u||this.upgrades.includes(id)||u.day>this.day||!(['planning','review'].includes(this.phase)||(id==='tracker'&&this.phase==='shift'))||(this.day===5&&this.phase==='review')||!this.spendOperating(u.cost)) return false;
      this.upgrades.push(id); this.earn(`upgrade-${id}`,'Continuous improvement');
      if(this.phase==='review') this.refreshReport();
      return true;
    }
    /* Demand uses observations and seeded uncertainty, never a future customer list. */
    rate(name) {
      const last=this.reports.at(-1), prior=last?(last.demand[name]||0)/CONFIG.shiftSeconds:0;
      return ((this.metrics.demand[name]||0)+prior*15)/(Math.max(this.elapsed,10)+15);
    }
    trend(name) {
      const last=this.reports.at(-1), before=this.reports.at(-2);
      const current=this.elapsed>=12?this.rate(name):(last?.demand[name]||0)/CONFIG.shiftSeconds;
      const baseline=(this.elapsed>=12?last?.demand[name]:before?.demand[name])||0;
      if((this.day===2||this.day===5)&&['Oat Milk','Cold Brew'].includes(name)) return {label:'Trending up',arrow:'↑',level:'up'};
      if(current===0) return {label:'Not observed yet',arrow:'·',level:'unknown'};
      if(current<.04) return {label:'Low demand',arrow:'↓',level:'down'};
      if(current>baseline/CONFIG.shiftSeconds*1.2) return {label:'Increasing',arrow:'↑',level:'up'};
      if(current<baseline/CONFIG.shiftSeconds*.8) return {label:'Slowing',arrow:'↓',level:'down'};
      return {label:'Steady',arrow:'→',level:'steady'};
    }
    suggested(name) {
      const target=Math.max(this.reorderPoint,Math.ceil(this.rate(name)*18))+this.safetyStock;
      return Math.max(0,Math.min(target-this.stock(name)-this.frozen(name)-this.incoming(name),this.capacity(name)-this.occupied(name)-this.incoming(name)));
    }
    chooseProduct(kind) {
      const available=MENU.filter(p=>p.kind===kind&&p.day<=this.day&&this.menu[p.id].enabled);
      if(!available.length) return null;
      const weighted=available.map(p=>({p,weight:(p.id==='oat'&&this.day>=2?2.4:1)*(this.promotion===p.id?2:1)}));
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
      if(this.day>=3&&MENU.filter(p=>p.kind==='drink'&&this.menu[p.id].enabled).length===1&&this.random()<.1) {
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
      else {
        const missing=this.missing(order),key=missing[0]||'Service capacity';
        this.metrics.lostByItem[key]=(this.metrics.lostByItem[key]||0)+order.price;
        if(missing.length) {
          this.metrics.stockLost++;this.metrics.stockLostRevenue+=order.price;
          this.alerts.losses.push({id:order.id,day:this.day,clock:this.clock,missing,products:order.products.slice(),revenue:order.price,read:false});
        }
      }
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
        order.status='preparing'; order.ready=this.clock+CONFIG.serviceSeconds+(this.batches.length&&!this.helper?2:0);
      }
    }
    /* Short consequential story decisions. Rewards and expenses apply only once. */
    eventData() {
      const kind=this.info.event;
      const data={
        welcome:{title:'Our first regular is back!',text:'A customer wants to bring the robotics club for coffee. Can your milk, cups and coffee stock keep up?',choices:[['promote','Feature Vanilla Latte','More coffee orders; keep a small buffer.'],['steady','Keep a small menu','A calmer start while we learn.']]},
        discount:{title:'A bargain with a catch',text:'Budget Beans offers 10% off for the rest of today. Their delivery reliability stays the same.',choices:[['deal','Take the discount','Cheaper orders; same risk.'],['steady','Stick to the plan','Protect the supply chain you trust.']]},
        oat:{title:'Oat Milk Cold Brew is trending!',text:'Requests are climbing. Extra stock could help, but leftovers still expire.',choices:[['emergency','Express oat kit · $14','8 oat milk, 8 cold brew, 8 straws; 2s.'],['alternative','Promote Vanilla Latte','Shift demand to the original menu.'],['hide','Pause the oat special','Fewer choices; preserve other supplies.']]},
        oven:{title:'The oven is acting up',text:'The thermostat failed between batches. How should we keep the pastry case stocked?',choices:[['repair','Repair it · $12','Keep baking here today.'],['outsource','Use the local bakery','Buy ready-made; no oven work.'],['hybrid','Work around it','Slower batches; mix make and buy.']]},
        price:{title:'“We’re on a student budget”',text:'Maya suggests a value special. You can test it without permanently changing every price.',choices:[['value','Vanilla Latte: 10% off','Lower margin; better price acceptance.'],['quality','Keep prices; explain quality','Protect margins and watch reactions.']]},
        rush:{title:'The festival crowd is here!',text:'Keep the system moving. An express buffer costs money; a focused menu reduces complexity.',choices:[['emergency','Express oat kit · $14','8 oat milk, 8 cold brew, 8 straws; 2s.'],['alternative','Promote Vanilla Latte','Use a different set of ingredients.'],['focus','Focus the drink menu','Offer only your best-stocked drink.']]},
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
        this.deliveries.push({id:++this.serial,supplier:'quick',name:'QuickShip emergency',placed:this.clock,expected:this.clock+2,eta:this.clock+2,dueDay:this.day,reliability:1,delayed:false,error:false,arrived:false,shelved:false,notified:false,
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
      const lessonProblem=this.planProblem();if(lessonProblem)return lessonProblem;
      if(!MENU.some(p=>p.kind==='drink'&&this.menu[p.id].enabled&&this.servings(p.id)>0)) return 'Stock at least one complete drink recipe before opening.';
      const overhead=CONFIG.dailyOverhead-(this.upgrades.includes('energy')?5:0);
      if(!this.spendOperating(overhead)) return `Keep $${overhead} available for today’s rent, power and staff.`;
      this.phase='shift'; this.running=true; this.tutorial.finished=true; this.tutorial.active=false; return null;
    }
    tickPlanning(seconds) {
      if(this.phase!=='planning'||!Number.isFinite(seconds)||seconds<=0)return;
      this.clock+=Math.min(seconds,CONFIG.shiftSeconds);
      this.processDeliveries();this.processBatches();this.markExpired();
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
        if(this.elapsed>=this.nextArrival&&this.elapsed<CONFIG.shiftSeconds-3) {
          this.customer();
          const enabled=MENU.filter(p=>p.kind==='drink'&&this.menu[p.id].enabled);
          const priceFactor=sum(enabled.map(p=>this.menu[p.id].price/p.price))/Math.max(1,enabled.length);
          this.nextArrival=this.elapsed+CONFIG.arrivalIntervals[this.day-1]*(.65+this.random()*.7)*(1.2-this.reputation/100*.45)*clamp(priceFactor,.65,1.5)*(this.promotion==='invite'||(this.day===1&&this.promotion==='latte')?.8:1);
        }
        this.processCustomers();
        if(this.elapsed>=this.nextSample) {
          this.history.push({day:this.day,t:this.elapsed,arrived:this.metrics.arrived,served:this.metrics.served});
          this.metrics.stockSamples++; this.metrics.stockValueSum+=this.inventoryValue(); this.nextSample+=6;
        }
        if(!this.eventSeen&&this.elapsed>=CONFIG.shiftSeconds*.4) { this.eventSeen=true; this.pendingEvent=this.eventData(); break; }
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
      if(!this.lesson.review)return false;
      this.day++; this.beginDay(); this.clock+=CONFIG.overnightSeconds;
      this.processDeliveries(); this.processBatches(); this.markExpired(); return true;
    }
    ending() {
      if(this.day!==5||!['review','complete'].includes(this.phase)) return null;
      if(!this.lesson.review)return null;
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
        turnover:sum(this.reports.map(r=>r.cogs))/Math.max(1,sum(this.reports.map(r=>r.averageInventory))/CONFIG.days)};
    }
    /* Versioned, mode-specific saves. Resume always pauses to orient the player. */
    save() {
      const data=clone(this); data.running=false; return JSON.stringify({version:CONFIG.version,state:data});
    }
    static restore(serialized) {
      try {
        if(typeof serialized!=='string'||serialized.length>1500000) return null;
        const envelope=JSON.parse(serialized),s=envelope.state;
        if(envelope.version!==CONFIG.version||!s||!Number.isInteger(s.day)||s.day<1||s.day>CONFIG.days) return null;
        const safe=value=>{
          if(typeof value==='number') return Number.isFinite(value)&&Math.abs(value)<1e12;
          if(Array.isArray(value)) return value.length<20000&&value.every(safe);
          if(value&&typeof value==='object') return Object.keys(value).every(k=>!['__proto__','constructor','prototype'].includes(k))&&Object.values(value).every(safe);
          return true;
        };
        if(!safe(s)||!s.learning||!s.learning.days||!Array.isArray(s.learning.events)||!Number.isInteger(s.reorderPoint)||s.reorderPoint<1||s.reorderPoint>12||!Number.isInteger(s.safetyStock)||s.safetyStock<0||s.safetyStock>12||
          Object.values(s.learning.days).some(l=>!l||!Array.isArray(l.compared)||!Array.isArray(l.viewed)||!Array.isArray(l.attempts))||
          !s.alerts||!Array.isArray(s.alerts.dismissedExpiry)||!Array.isArray(s.alerts.losses)||
          s.alerts.losses.some(l=>!Array.isArray(l.missing)||l.missing.some(n=>!BY_NAME[n])||!Array.isArray(l.products)||l.products.some(id=>!MENU.some(p=>p.id===id))||!Number.isFinite(l.revenue)||l.revenue<0)||
          !Number.isInteger(s.seed)||s.seed<0||s.seed>4294967295||
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
