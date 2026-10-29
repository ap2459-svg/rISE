/* Café Rescue presentation. Owns only the Inventory Manager entry and its scoped UI. */
(() => {
  'use strict';
  const {CONFIG,SUPPLIERS,MENU,DAYS,UPGRADES}=RESCUE;
  const SAVE_KEY='rise.cafe-rescue.v2';
  const $=s=>document.querySelector(s);
  const item=n=>INVENTORY_ITEMS.find(i=>i.name===n);
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>`${n<0?'−':''}$${Math.abs(n).toFixed(2)}`;
  const time=n=>{const v=Math.ceil(Math.max(0,n));return `${Math.floor(v/60)}:${String(v%60).padStart(2,'0')}`;};
  const labels={rescue:'Needs care',coffee:'Coffee',milk:'Milk',syrup:'Syrups',topping:'Toppings',bakery:'Bakery',supplies:'Supplies'};
  let game=null,tab='stock',category='rescue',selected='Whole Milk',supplier='quick',qty=6,frozen=false,express=false,cart=[];
  let menuPage=0,menuSection='drinks',speed=1,dialogState=null,lastFrame=0,lastPaint=0,lastSave=0,lastXP=0,saveError=false,audio;
  let inspected=null,upgradePage=0,dragged=null,unpacking=null,recipeTargets={},recipeItem='latte',feedbackMessage=null;

  function uiIcon(key) {
    const shapes={
      warning:'<path d="M32 6L59 55H5z" fill="#ffd365"/><path d="M32 22v15"/><circle cx="32" cy="46" r="2" fill="#573421"/>',
      box:'<path d="M12 19L32 9l20 10v27L32 56 12 46z" fill="#d99b53"/><path d="M12 19l20 11 20-11M32 30v26M23 14l20 11v11" fill="none"/>',
      shelf:'<path d="M9 9v47M55 9v47M9 30h46M9 52h46"/><rect x="15" y="12" width="12" height="17" rx="2" fill="#8ac5dd"/><rect x="35" y="11" width="13" height="18" rx="2" fill="#b4cf85"/>',
      truck:'<path d="M7 19h30v29H7zM37 29h12l8 11v8H37z" fill="#83b7a3"/><path d="M40 32h7l5 9H40z" fill="#f7eed9"/><circle cx="18" cy="49" r="6" fill="#694939"/><circle cx="47" cy="49" r="6" fill="#694939"/>',
      budget:'<path d="M17 17h30l6 35H11z" fill="#d99b53"/><path d="M22 17q10-17 20 0" fill="none"/><path d="M26 29h15M25 38h13"/>',
      sun:'<circle cx="32" cy="32" r="14" fill="#ffd25f"/><path d="M32 4v8M32 52v8M4 32h8M52 32h8M12 12l6 6M46 46l6 6M12 52l6-6M46 18l6-6"/>',
      menu:'<rect x="14" y="7" width="36" height="50" rx="5" fill="#fff3d9"/><path d="M23 19h18M23 29h18M23 39h11M23 48h15"/>',
      trend:'<path d="M10 9v46h46M16 42l13-12 10 4 15-21M42 13h12v12" fill="none"/>',
      bin:'<path d="M16 19h32l-3 37H19z" fill="#a9b5bc"/><path d="M11 19h42M24 12h16M27 27v21M37 27v21" fill="none"/>',
      cup:'<path d="M17 19h30l-4 37H21z" fill="#fff3d9"/><path d="M14 18h36l-3-7H17z" fill="#7c5340"/><path d="M19 31h26v12H19" fill="#b97946"/>',
      lid:'<path d="M8 39h48l-5-12H13z" fill="#fff3d9"/><path d="M20 27v-5h24v5M18 35h28" fill="none"/>',
      straw:'<path d="M25 56V24L44 8l6 7-16 13v28z" fill="#e6a8a0"/><path d="M25 34h9M25 45h9"/>',
      utensil:'<path d="M16 8v16q0 9 6 9v24M22 8v17M28 8v16q0 9-6 9M44 8v49M44 8q-12 7-9 27h9" fill="none"/>',
      bag:'<path d="M14 21h36l4 36H10z" fill="#d9ad73"/><path d="M23 24V14q9-12 18 0v10" fill="none"/>',
      napkin:'<path d="M9 16h44v39H9z" fill="#fff9eb"/><path d="M9 16l22 20 22-20M31 36L9 55" fill="none"/>',
      cookie:'<circle cx="32" cy="32" r="24" fill="#dba158"/><g fill="#69412c"><circle cx="22" cy="22" r="3"/><circle cx="41" cy="21" r="3"/><circle cx="33" cy="37" r="4"/><circle cx="19" cy="42" r="3"/><circle cx="46" cy="42" r="3"/></g>',
      croissant:'<path d="M6 39q1-25 20-19l6-7 8 7q17-6 19 19l-10 9-8-8-17 1-9 8z" fill="#e9b05c"/><path d="M26 20l-2 21M40 20l1 20M15 25l6 18M49 26l-6 16" fill="none"/>',
      sandwich:'<path d="M8 26q24-31 48 0z" fill="#d9a35b"/><path d="M8 32h48v8H8z" fill="#a5c773"/><path d="M8 42h48v11H8z" fill="#d9a35b"/>',
      fridge:'<rect x="13" y="5" width="38" height="54" rx="5" fill="#b9d8df"/><path d="M13 25h38M21 13v6M21 33v12" fill="none"/>',
      oven:'<rect x="6" y="12" width="52" height="44" rx="5" fill="#b9b4b3"/><rect x="14" y="27" width="36" height="22" rx="3" fill="#765140"/><path d="M15 20h4M29 20h4M43 20h4"/>',
      leaf:'<path d="M13 51Q4 8 53 10q5 48-40 41z" fill="#9fca7c"/><path d="M12 54l31-33" fill="none"/>',
      shop:'<rect x="8" y="24" width="48" height="33" fill="#fff0d6"/><path d="M8 9h48l5 15H3z" fill="#a9c49a"/><path d="M23 9v15M42 9v15"/><rect x="14" y="32" width="15" height="13" fill="#b9d8df"/><rect x="37" y="32" width="12" height="25" fill="#bb8454"/>',
      check:'<circle cx="32" cy="32" r="25" fill="#b6d69e"/><path d="M18 32l10 10 19-23" fill="none"/>',
      contract:'<rect x="13" y="6" width="38" height="52" rx="4" fill="#fff0d6"/><path d="M21 19h22M21 29h22M24 43l6 6 12-13" fill="none"/>'
    };
    return `<svg class="cr-ui-icon" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><g stroke="#573421" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${shapes[key]||shapes.box}</g></svg>`;
  }
  function productArt(name) {
    const i=item(name);
    return i&&['coffee','milk','syrup','topping'].includes(i.group)?ingredientIcon(i.group,name==='Almond Milk'?'Almond':name):uiIcon(i?.icon||'cup');
  }
  const drinkArt=p=>p.kind==='bakery'?productArt(p.name):'<img class="cr-coffee-image" src="assets/caramel-coffee.png" alt="">';
  const customerArt=(n=0)=>`<span class="cr-customer-art" style="--person:${Number(n)%3}" aria-hidden="true"></span>`;
  function rating(value=game.rating) {
    const v=Math.max(0,Math.min(5,value));
    return `<span class="cr-rating" role="img" aria-label="${v.toFixed(1)} out of 5 stars"><span class="cr-stars">${Array.from({length:5},(_,i)=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3 6 7 .9-5 4.9 1.3 7-6.3-3.4-6.3 3.4 1.3-7-5-4.9L9 8z" fill="${i<v-.25?'#ffc53e':'#e4ded3'}" stroke="#785229" stroke-width="1.5"/></svg>`).join('')}</span><b>${v.toFixed(1)}/5</b></span>`;
  }
  const freshness=l=>item(l.name)?.group==='supplies'?'Shelf-stable':l.expires<=game.day?'Expired':`${l.expires-game.day} ${l.expires-game.day===1?'Day':'Days'} Left`;
  const arrivalText=o=>o.dayOffset||o.dueDay>game.day?'Tomorrow':`${o.lead??Math.max(0,Math.ceil(o.expected-game.clock))}s · this day`;

  const btn=(action,label,cls='',attrs='')=>`<button type="button" data-action="${action}" class="${cls}" ${attrs}>${label}</button>`;
  const patch=(selector,html)=>{
    const node=$(selector);if(!node||node.dataset.html===html)return;
    const active=document.activeElement,keep=node.contains(active)?{id:active.id,data:{...active.dataset}}:null;
    node.innerHTML=html;node.dataset.html=html;
    if(keep){
      const replacement=keep.id?node.querySelector('#'+CSS.escape(keep.id)):keep.data.action?
        [...node.querySelectorAll('[data-action]')].find(n=>Object.entries(keep.data).every(([k,v])=>n.dataset[k]===v)):null;
      replacement?.focus({preventScroll:true});
    }
  };

  function save() {
    if(!game) return;
    game.tutorial.cart=cart.map(l=>({...l}));
    game.tutorial.recipeTargets={...recipeTargets};
    if(!game.tutorial.ordered&&!cart.length){game.tutorial.cartAdded=false;game.tutorial.reviewed=false;}
    try { localStorage.setItem(SAVE_KEY,game.save()); saveError=false; }
    catch { saveError=true; }
  }
  function savedGame() { try{return InventorySim.restore(localStorage.getItem(SAVE_KEY));}catch{return null;} }
  function sound(success=true) {
    if(!game?.sound) return;
    try {
      audio ||= new (window.AudioContext||window.webkitAudioContext)();
      audio.resume();
      const osc=audio.createOscillator(),gain=audio.createGain();
      osc.connect(gain);gain.connect(audio.destination);
      osc.type='sine';osc.frequency.setValueAtTime(success?540:180,audio.currentTime);
      osc.frequency.exponentialRampToValueAtTime(success?820:120,audio.currentTime+.12);
      gain.gain.setValueAtTime(.035,audio.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.18);
      osc.start();osc.stop(audio.currentTime+.2);
    } catch { /* Audio is optional on managed school browsers. */ }
  }
  function toast(text,success=true) {
    feedbackMessage={text,success,until:Date.now()+4600};
    drawFeedback();
    sound(success);
  }
  function dialog(key,title,body,footer) {
    const resume=dialogState?dialogState.resume:game?.running;
    dialogState={key,resume,focus:document.activeElement?.id};
    if(game)game.running=false;
    $('#cr-modal')?.remove();
    $('.cr-game')?.setAttribute('inert','');
    const overlay=document.createElement('div');overlay.id='cr-modal';overlay.className='cr-overlay';
    overlay.innerHTML=`<section class="cr-dialog ${key==='intro'?'cr-intro':''}" data-dialog="${key}" role="dialog" aria-modal="true" aria-labelledby="cr-dialog-title" tabindex="-1"><div class="cr-kicker">rISE CAFÉ · CAFÉ RESCUE</div><h2 id="cr-dialog-title">${title}</h2><div class="cr-dialog-body">${body}<p id="cr-dialog-error" class="cr-error" role="status"></p></div><footer>${footer}</footer></section>`;
    app.append(overlay);overlay.querySelector('section').focus();
    overlay.onclick=handleClick;
    overlay.onchange=handleChange;
    overlay.onkeydown=e=>{
      if(e.key==='Escape'&&!['intro','delivery','unpack','event','ending','resume','tutorial-complete','tour-intro'].includes(key)){e.preventDefault();closeDialog();return;}
      if(e.key!=='Tab')return;
      const nodes=[...overlay.querySelectorAll('button,input,select,a[href]')].filter(n=>!n.disabled);
      const first=nodes[0],last=nodes.at(-1);
      if(e.shiftKey&&(document.activeElement===first||document.activeElement===overlay.querySelector('section'))){e.preventDefault();last?.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
    };
    updateHUD();
  }
  function closeDialog(resume=true) {
    const prior=dialogState;dialogState=null;$('#cr-modal')?.remove();$('.cr-game')?.removeAttribute('inert');
    if(game&&resume&&prior?.resume&&game.phase==='shift'&&!game.pendingEvent)game.running=true;
    ($('#'+(prior?.focus||'cr-play'))||$('#cr-play'))?.focus();
    drawTab();updateHUD();save();
  }
  function error(message) { const node=$('#cr-dialog-error');if(node)node.textContent=message;else toast(message,false); }
  function start() {
    sim=null;paused=false;modalKind=null;document.body.classList.remove('playing');
    document.querySelectorAll('.modal-backdrop,.station-overlay').forEach(n=>n.remove());
    const previous=savedGame();
    game=previous||new InventorySim();window.inventoryGame=game;
    tab='stock';category='rescue';cart=previous?.tutorial.cart?.map(l=>({...l}))||[];recipeTargets={...(previous?.tutorial.recipeTargets||{})};feedbackMessage=null;speed=1;dialogState=null;
    if(previous&&!game.tutorial.ordered&&!cart.length){game.tutorial.cartAdded=false;game.tutorial.reviewed=false;}
    render();
    if(previous) {
      dialog('resume',`The café is waiting for you`, `<div class="cr-character"><span>${uiIcon(game.info.face)}</span><p><b>Day ${game.day} of 7 · ${esc(game.info.title)}</b>Your decisions, stock, prices and deliveries are saved. The clock is paused.</p></div><div class="cr-stat-row"><span>Bank balance<b>${money(game.cash)}</b></span><span>Customer Rating<b>${rating()}</b></span></div>`,btn('resume-save','Resume rescue →','cr-primary')+btn('restart-confirm','Start a new rescue'));
    } else intro(0);
  }
  // Preserve the other role cards, routes and original event handlers.
  const originalRoles=roles;
  roles=function() {
    if(game)save(); game=null;window.inventoryGame=null;dialogState=null;
    document.body.classList.remove('inventory-playing');originalRoles();
    const card=[...document.querySelectorAll('.role-choice')].find(n=>n.querySelector('h2')?.textContent==='Inventory Manager');
    if(!card)return;
    card.classList.remove('locked');card.classList.add('play');card.querySelector('small')?.remove();
    card.querySelector('h2').textContent='Café Rescue';
    card.querySelector('p').textContent='Inventory Manager · Seven days to save the café.';
    card.insertAdjacentHTML('beforeend','<button id="inventory-start" class="big-btn">Play Café Rescue →</button>');
    $('#inventory-start').onclick=start;
  };
  function intro(step) {
    const scenes=[
      {title:'rISE Café is going out of business!',text:'Empty shelves. Expired milk. Customers who stopped coming back.',note:'You’re the new operations manager. The comeback starts with you.',button:'Take the keys →'},
      {title:'Seven days. One big comeback.',text:'You have seven days to turn things around before the doors close for good.',note:'Fix the system. Win back customers. Make every dollar count.',button:'Learn the controls →'}
    ],s=scenes[step];
    dialog('intro',s.title,`<div class="cr-story-art level-0"><div class="cr-shop">rISE Café<span>LAST CHANCE</span></div></div><blockquote>${s.text}</blockquote><p>${s.note}</p><div class="cr-stat-row"><span>Inherited debt<b>−$500</b></span><span>Customer Rating<b>${rating(1)}</b></span><span>Deadline<b>7 days</b></span></div>${step?'<p class="cr-note"><b>You can still buy supplies.</b> A $750 credit limit leaves $250 available. Sales repay the debt. This is game money.</p>':''}`,btn(step?'intro-done':'intro-next',s.button,'cr-primary')+`<small>${step+1} / 2</small>`);
  }
  function briefing() {
    game.briefed=true;save();
    const prior=game.learning.days[game.day-1]?.review?.action;
    const focus={stock:'stock targets and reorder points',supplier:'supplier and delivery timing',price:'prices and margins',capacity:'service capacity',smaller:'smaller batches',maintain:'monitoring the current strategy'};
    dialog('briefing',`Day ${game.day}: ${esc(game.info.title)}`,`<div class="cr-character"><span>${uiIcon(game.info.face)}</span><p>${esc(game.info.text)}</p></div><ol class="cr-goals">${game.info.goals.map(g=>`<li>${esc(g)}</li>`).join('')}</ol>${prior?`<p class="cr-note">Your improvement focus: ${focus[prior]}. Use today’s controls to test it.</p>`:''}<div class="cr-note">Complete your operations plan before opening. The shift lasts about 4 minutes at 1× speed.</div>${game.day===5?'<p>Pricing is now unlocked in Menu & bakery.</p>':''}`,btn('briefing-done',game.day===1?'Enter the stockroom →':'Prepare the café →','cr-primary'));
  }
  function operationsPlan() {
    if(game.lesson.plan){toast('Today’s operations plan is saved. Use the tabs to carry it out.');return;}
    const day=game.day;
    const number=(id,label,min,max,value='')=>`<label>${label}<input id="cr-plan-${id}" type="number" min="${min}" max="${max}" step="1" value="${value}"></label>`;
    const select=(id,label,options)=>`<label>${label}<select id="cr-plan-${id}"><option value="">Choose…</option>${options.map(([v,t])=>`<option value="${v}">${t}</option>`).join('')}</select></label>`;
    const buffer=number('buffer','Extra units for uncertainty (safety stock)',0,12)+number('reorder','Reorder when stock reaches this many units',1,12);
    const investment=`<div class="cr-plan-offers">${UPGRADES.filter(u=>['fridge','storage','energy'].includes(u.id)).map(u=>`<p><b>${esc(u.name)} · ${money(u.cost)}</b><small>${esc(u.effect)}${game.upgrades.includes(u.id)?' Already installed.':''}</small></p>`).join('')}</div>`+select('investment','Where should limited money go?', [['hold','Preserve cash'],...UPGRADES.filter(u=>['fridge','storage','energy'].includes(u.id)&&!game.upgrades.includes(u.id)).map(u=>[u.id,`${u.name} · ${money(u.cost)}`])])+select('reason','What constraint are you addressing?',[['waste','Freshness and waste'],['capacity','Space or operating capacity'],['cash','Cash and operating costs']]);
    let content='';
    if(day===1)content=`<p>Choose how many Vanilla Lattes to prepare. Each needs coffee, milk, vanilla, a cup, a lid and a napkin. Your plan will draft only missing supplies; review the cart before buying.</p>${number('servings','Opening serving target',1,40)}<p class="cr-note">Inspect dates and discard expired food. At delivery, choose older stock in front: first in, first out (FIFO).</p>`;
    if(day===2)content=`<p>Inspect at least two offers for 8 units of Whole Milk. Prices exclude shipping; tomorrow’s stock cannot serve today’s customers.</p><div class="cr-plan-offers">${SUPPLIERS.filter(s=>s.unlock<=day).map(s=>{const o=game.offer('Whole Milk',s.id,8);return btn('plan-compare',`<b>${s.name}${game.lesson.compared.includes(s.id)?' · inspected':''}</b><small>${money(o.unit*8)} · ${o.dayOffset?'tomorrow':o.lead+'s today'} · ${(o.reliability*100).toFixed(o.reliability>.99&&o.reliability<1?1:0)}% reliable · ${o.life} days fresh · ${Math.round(o.quality*100)}% quality</small>`,'',`data-supplier="${s.id}"`);}).join('')}</div>${select('supplier','Choose your purchasing supplier',SUPPLIERS.filter(s=>s.unlock<=day).map(s=>[s.id,s.name]))}${buffer}<p class="cr-note">Place a real order with this company before opening. Choose only supplies you need; the order is not automatic.</p>`;
    if(day===3||day===7)content=`<p>${day===3?'Cold brew demand is rising.':'Use yesterday’s results to prepare your final shift.'} Open Sales & trends first. Choose a target, then add a buffer for uncertainty. This is your estimate, not a promised customer count.</p>${btn('plan-trends','Inspect Sales & trends')}${number('servings',day===3?'Cold brew serving estimate':'Vanilla Latte serving estimate',1,40)}${buffer}${day===7?investment:''}`;
    if(day===4)content=`<p>Drinks and baking share staff time. Compare the whole process before choosing.</p><div class="cr-plan-offers"><p><b>In-house</b><small>Cheaper frozen portions; 4 per batch. Labor + energy ${money(CONFIG.bakeConversion)} per batch; ${CONFIG.bakeSeconds}s oven time. Baking competes with drink service.</small></p><p><b>Outsource</b><small>Higher ready-made purchase cost. No oven work, but delivery reliability matters.</small></p><p><b>Hybrid</b><small>Combine both. More flexibility, but coordinate two stock types and limited space.</small></p></div>${select('strategy','How will you supply the bakery?',[['inhouse','Bake in-house'],['outsource','Buy ready-made'],['hybrid','Hybrid']])}`;
    if(day===5)content=`<p>Set prices for two drinks. Keeping an existing price is a valid decision. Higher prices improve margin per sale but may reduce demand.</p>${['latte','oat'].map(id=>{const p=MENU.find(p=>p.id===id);return `<label>${p.name} · unit cost ${money(game.unitCost(id))}<input id="cr-plan-price-${id}" type="number" min="${p.price*.5}" max="${p.price*1.8}" step="0.25" value="${game.menu[id].price}"><small id="cr-plan-margin-${id}">Estimated profit per sale: ${money(game.menu[id].price-game.unitCost(id))} before overhead</small></label>`;}).join('')}<p class="cr-note">Confirming applies both prices to the actual menu. Compare revenue, lost sales and profit after the shift.</p>`;
    if(day===6)content=`<p>Festival traffic is uncertain. Choose how to protect service, then allocate money to an improvement or keep it available for supplies.</p>${select('capacity','Rush strategy',[['helper','Hire help · $22 · two customers prepared at once'],['focus','Focus on the best-stocked drink · fewer choices'],['buffer','Use stock buffers · keep current service capacity']])}${buffer}${investment}`;
    dialog('operations-plan',`Day ${day} · Your required operations plan`,`<div class="cr-plan-form">${content}</div><p class="cr-note">${money(game.spendable)} available. Saving applies your choices; cart purchases still need checkout confirmation.</p>`,btn('save-plan','Apply my plan','cr-primary')+btn('close','Prepare first'));
  }
  function saveOperationsPlan() {
    const n=id=>Number($(`#cr-plan-${id}`)?.value),v=id=>$(`#cr-plan-${id}`)?.value;
    const p={};
    if([1,3,7].includes(game.day))p.servings=n('servings');
    if([2,3,6,7].includes(game.day)){p.buffer=v('buffer')===''?NaN:n('buffer');p.reorder=n('reorder');}
    if(game.day===2)p.supplier=v('supplier');
    if(game.day===4)p.strategy=v('strategy');
    if(game.day===5)p.prices={latte:n('price-latte'),oat:n('price-oat')};
    if(game.day===6)p.capacity=v('capacity');
    if([6,7].includes(game.day)){p.investment=v('investment');p.reason=v('reason');}
    const problem=game.commitPlan(p);if(problem){error(problem);return;}
    if(p.supplier)supplier=p.supplier;
    if(p.servings){const id=game.day===3?'oat':'latte';recipeTargets={...recipeTargets,[id]:Math.min(100,p.servings+(p.buffer||0))};const plan=game.recipePlan(recipeTargets,cart,supplier,express);if(plan)addToCart(plan.lines);tab='supply';}
    closeDialog();drawTab();toast('Plan saved. Carry it out, then open the café.');
  }
  function engineerReview() {
    const r=game.reviewOptions();if(!r)return;
    dialog('engineer-review','What did your system teach you?',`<div class="cr-stat-row"><span>Potential revenue missed<b>${money(r.loss)}</b></span><span>Waste cost<b>${money(r.waste)}</b></span><span>Profit<b>${money(r.profit)}</b></span></div><p>${r.previousProfit===null?'This is your first baseline.':`Previous profit: ${money(r.previousProfit)}. Change: ${money(r.profit-r.previousProfit)}.`} Missed revenue is an opportunity, not a charge deducted from cash.</p><div class="cr-plan-form"><label>Which of these two issues was larger?<select id="cr-review-answer"><option value="">Choose…</option><option value="sales">Missed sales revenue</option><option value="waste">Waste cost</option><option value="stable">Neither: both were zero</option></select></label><label>What would you prioritize next?<select id="cr-review-action"><option value="">Choose…</option><option value="stock">Adjust stock targets or reorder points</option><option value="supplier">Change supplier or delivery timing</option><option value="price">Review prices and margins</option><option value="capacity">Improve service capacity</option><option value="smaller">Buy smaller batches to reduce waste</option><option value="maintain">Keep the strategy and monitor results</option></select></label></div><p class="cr-note">Use evidence, then choose your next experiment. Your decision and attempts are saved.</p>`,btn('save-review','Record my improvement','cr-primary')+btn('report','Back to results'));
  }
  function render() {
    lastXP=game.xp;
    document.body.classList.add('inventory-playing');
    app.innerHTML=`<main class="cr-game" data-level="${game.visualLevel}">
      <header class="cr-header"><div class="cr-brand">rISE Café<small>CAFÉ RESCUE</small></div><div class="cr-week" aria-label="Seven day campaign">${DAYS.map((d,i)=>`<span data-day="${i+1}" title="${d.title}">${i+1}</span>`).join('')}</div>
      <button data-action="money" class="cr-bank" id="cr-bank"></button><div class="cr-reputation" id="cr-reputation"></div>${btn('help','?','cr-icon','aria-label="How to play"')}${btn('exit','Exit')}</header>
      <div class="cr-guide" id="cr-guide" aria-live="polite"></div>
      <div class="cr-work"><nav class="cr-nav" aria-label="Café Rescue sections">
        ${[['stock','shelf','Stockroom'],['supply','truck','Suppliers'],['menu','menu','Menu'],['trends','trend','Sales & trends']].map(([id,icon,label])=>btn('tab',`<span>${uiIcon(icon)}</span>${label}`,'',`data-tab="${id}"`)).join('')}
        <div class="cr-nav-bottom"><div class="cr-team">${uiIcon("shop")}<b>Your seven-day comeback</b></div>${btn('operations-plan','Required operations plan')}${btn('brief','Today’s mission')}${btn('upgrades',' Improve café')}<small id="cr-xp"></small></div>
      </nav><section class="cr-workspace" id="cr-workspace" aria-label="Game workspace"></section></div>
      <section class="cr-live"><div id="cr-feedback"></div><button data-action="deliveries" id="cr-dock"></button><div id="cr-live-stats"></div></section>
      <footer class="cr-controls"><div><b id="cr-phase"></b><small id="cr-save"></small></div><div class="cr-clock"><span id="cr-clock"></span><progress id="cr-progress" max="${CONFIG.shiftSeconds}" value="0"></progress></div>
      <div class="cr-speeds" role="group" aria-label="Simulation speed">${[1,2,3].map(s=>btn('speed',`${s}×`,'',`data-speed="${s}" aria-label="${s} times speed"`)).join('')}</div>${btn('play','Open café','cr-primary','id="cr-play"')}</footer>
      </main>`;
    $('.cr-game').onclick=handleClick;
    $('.cr-game').onchange=handleChange;
    $('.cr-game').ondragstart=e=>{const n=e.target.closest('[data-product]');if(n){dragged=n.dataset.product;e.dataTransfer.setData('text/plain',dragged);}};
    $('.cr-game').ondragover=e=>{if(e.target.closest('[data-action="bin"]'))e.preventDefault();};
    $('.cr-game').ondrop=e=>{if(e.target.closest('[data-action="bin"]')){e.preventDefault();trashProduct(dragged);dragged=null;}};
    drawTab();updateHUD();
  }

  const tourSteps={
    stock:['Open the Stockroom. Your first job is to make these shelves safe.','.cr-nav [data-tab="stock"]'],
    inspect:['Select Whole Milk. Look for the EXPIRED label before using any ingredient.','[data-action="inspect"][data-product="Whole Milk"]'],
    clean:['Remove the expired milk and pastries. Select a red item, then move it to the bin.','.cr-stock-item.expired'],
    missing:['Check what coffee service needs. Open Supplies, then inspect the empty Cup shelf.','[data-category="supplies"], [data-action="inspect"][data-product="Cup"]'],
    suppliers:['Open Suppliers to find fresh ingredients and coffee supplies.','.cr-nav [data-tab="supply"]'],
    compare:['Click both supplier cards. Compare price, arrival time and reliability before choosing.','[data-action="supplier"]'],
    cart:['For reopening, choose QuickShip. Draft a small coffee cart, or add products yourself.','[data-action="draft-small"], [data-action="add-cart"]'],
    review:['Check your cart total, then select Review & place order. This is your real opening purchase.','[data-action="review-cart"]'],
    order:['Confirm the quantities and cost. Place your order when you are ready.','[data-action="place-order"]'],
    delivery:['Your delivery is on the way. Open the dock to collect today’s order without waiting.','#cr-dock'],
    menu:['Open Menu. A drink can only sell when every ingredient and supply is in stock.','.cr-nav [data-tab="menu"]'],
    recipe:['Select Recipe on Vanilla Latte to check the coffee, milk, cups and lids you need.','[data-action="recipe"][data-id="latte"]'],
    trends:['Open Sales & trends. These signals come from real requests, not a known future crowd.','.cr-nav [data-tab="trends"]'],
    restock:['Your drink recipe still needs supplies. Open Menu, then Recipe to add what is missing. Collect today’s delivery before opening.','.cr-nav [data-tab="menu"], [data-action="recipe"], #cr-dock'],
    ready:['You know the controls. Finish the tutorial, then open the café for Day 1.','[data-action="finish-tour"]']
  };
  function tourIntro() {
    dialog('tour-intro','Your café. Your comeback.',`<div class="cr-tour-summary">${uiIcon('shop')}<p>Clear expired food. Restock coffee supplies. Win back your customers.</p></div><p class="cr-note"><b>This is your real opening preparation.</b> Cleanup, menu choices and confirmed orders carry into Day 1. You pay for an order once; there are no tutorial fees. The café stays closed while you learn.</p>`,btn('tour-begin','Show me how','cr-primary')+btn('skip-tour-intro','Skip tutorial'));
  }
  function guide() {
    const step=game.tutorialStep();if(!step)return '';
    const steps=Object.keys(tourSteps).filter(k=>k!=='restock'),index=step==='restock'?steps.length:steps.indexOf(step)+1;
    return `<div class="cr-guide-face">${uiIcon('menu')}</div><div><small>GUIDED PREPARATION · ${index} / ${steps.length}</small><b>${tourSteps[step][0]}</b></div>${step==='ready'?btn('finish-tour','Finish tutorial','cr-primary'):''}${btn('skip-guide','Skip tutorial','cr-text')}`;
  }
  function highlightTour() {
    document.querySelectorAll('.cr-tour-target').forEach(n=>{n.classList.remove('cr-tour-target');n.removeAttribute('aria-describedby');});
    const step=game.tutorialStep();if(!step||dialogState)return;
    document.querySelectorAll(tourSteps[step][1]).forEach(n=>{n.classList.add('cr-tour-target');n.setAttribute('aria-describedby','cr-guide');});
    $('#cr-play').disabled=!!step;
  }
  function drawTab() {
    if(!game||!$('#cr-workspace'))return;
    $('.cr-game').dataset.level=game.visualLevel;
    document.querySelectorAll('.cr-nav [data-tab]').forEach(b=>b.setAttribute('aria-current',b.dataset.tab===tab?'page':'false'));
    patch('#cr-guide',guide());$('#cr-guide').hidden=!guide();
    const html=tab==='stock'?stockroom():tab==='supply'?supplies():tab==='menu'?menuView():trends();
    patch('#cr-workspace',html);highlightTour();
  }
  function stockroom() {
    const expiring=game.expiringItems(),care=INVENTORY_ITEMS.filter(i=>game.spoiled(i.name)||expiring.some(e=>e.name===i.name));
    let products=category==='rescue'?(care.length?care.slice(0,6):INVENTORY_ITEMS.filter(i=>game.activeIngredients().includes(i.name)&&game.stock(i.name)<=Math.max(2,Math.ceil(game.rate(i.name)*40))).slice(0,6)):INVENTORY_ITEMS.filter(i=>i.group===category);
    if(!products.length)products=INVENTORY_ITEMS.filter(i=>game.activeIngredients().includes(i.name)).slice(0,6);
    return `<div class="cr-work-title"><div><span class="cr-kicker">MAKE ROOM FOR A COMEBACK</span><h1>Your stockroom</h1></div><span class="cr-health">${game.health}% stock health</span></div>
      <div class="cr-category-tabs" role="group" aria-label="Stock categories">${Object.entries(labels).map(([id,label])=>btn('category',label,'',`data-category="${id}" aria-pressed="${category===id}"`)).join('')}</div>
      <div class="cr-stock-scene"><div class="cr-stock-sign">${['A fresh start begins here','Back in business','The neighborhood is noticing','A café worth coming back to'][game.visualLevel]}</div><div class="cr-window">${uiIcon("sun")}</div>
      <div class="cr-shelves">${products.map(i=>{
        const fresh=game.stock(i.name),expired=game.spoiled(i.name),ice=game.frozen(i.name),low=fresh<=Math.max(game.reorderPoint,Math.ceil(game.rate(i.name)*40));
        const soon=expiring.find(e=>e.name===i.name),status=expired?'expired':fresh===0?'empty':fresh===1?'critical':low?'low':'healthy';
        return `<button class="cr-stock-item ${status} ${soon?'expiring-soon':''}" data-action="inspect" data-product="${esc(i.name)}" draggable="true"><span class="cr-product-art">${productArt(i.name)}</span><b>${esc(i.name)}</b><span class="cr-stock-tag">${expired?` EXPIRED · ${expired}`:fresh?`${fresh} fresh${fresh===1?' · CRITICAL':low?' · LOW':''}`:ice?`${ice} frozen`:'OUT OF STOCK'}</span>${soon?`<small class="cr-expiry-tag">${uiIcon('warning')} ${soon.qty} expire in 1 day</small>`:game.incoming(i.name)?'<small> On the way</small>':!expired&&low?'<small>Reorder recommended</small>':''}</button>`;
      }).join('')}</div>
      <div class="cr-stock-floor"><span>${uiIcon(game.visualLevel>1?'leaf':'shop')} <small>Green = healthy · Yellow = low · Red = empty<br>Striped tags = expired; discard</small></span>${btn('bin',uiIcon('bin')+'<small>Expired goods bin</small>','cr-bin')}</div></div>
      <div class="cr-work-note">Select a product to inspect dates or reorder. Drag an expired product to the bin, or use its discard button.</div>`;
  }
  function inspect(name) {
    selected=name;inspected=name;if(name==='Whole Milk'&&game.tutorial.stockOpened)game.tutorial.inspected=true;if(name==='Cup'&&!game.expiredCount())game.tutorial.missing=true;
    const i=item(name),lots=game.lots[name],expired=game.spoiled(name);
    dialog('inspect',`${productArt(i.name)} ${esc(name)}`,`<div class="cr-stat-row"><span>Ready to use<b>${game.stock(name)}</b></span><span>Expired items<b>${expired}</b></span><span>On the way<b>${game.incoming(name)}</b></span></div>
      <div class="cr-lots">${lots.length?lots.map(l=>`<div class="${l.expires<=game.day?'expired':''}"><span>${productArt(i.name)}</span><div><b>${l.qty} ${l.frozen?'frozen':'units'}</b><small>${l.expires<=game.day?'EXPIRED — cannot be served':i.group==='supplies'?'Shelf-stable · no food expiry':freshness(l)}</small></div>${btn('discard-lot',uiIcon('bin'),'',`data-name="${esc(name)}" data-lot="${l.id}" aria-label="Discard ${l.qty} ${esc(name)}${l.expires<=game.day?' expired':' usable'} units"`)}</div>`).join(''):'<p>This shelf is empty. Check your menu before ordering.</p>'}</div><p class="cr-note">Expired products are always blocked from sales. Throwing out usable food adds to waste.</p>`,
      (expired?btn('trash-selected','Move expired stock to bin','cr-primary'):btn('order-selected','Order this product','cr-primary'))+btn('rotate','Older stock to front')+btn('close','Done'));
    save();
  }
  function trashProduct(name) {
    if(!item(name))return;
    const count=game.discard(name);
    if(count)toast(` ${count} expired ${name} cleared. Safe shelves!`);
    else toast('That shelf has no expired stock. Keep the usable products.',false);
    drawTab();updateHUD();save();
  }
  function supplierCards() {
    return SUPPLIERS.filter(s=>s.unlock<=game.day).map(s=>{
      const offer=game.offer(selected,s.id,qty,frozen,express);
      return `<button class="cr-supplier ${supplier===s.id?'selected':''}" data-action="supplier" data-supplier="${s.id}" style="--company:${s.color}" aria-pressed="${supplier===s.id}">
        <span class="cr-company-icon">${uiIcon(s.icon)}</span><b>${s.name}</b><strong>${money(offer.unit)}<small> / unit</small></strong>
        <div class="cr-supplier-facts"><span> ${arrivalText(offer)}</span><span> ${(offer.reliability*100).toFixed(offer.reliability<1&&offer.reliability>.99?1:0)}% reliable</span><span>${s.quality>=.99?'Excellent':s.quality>.9?'High':'Basic'} quality</span><span>◷ ${item(selected).group==='supplies'?'Shelf-stable':`${offer.life} days shelf life`}</span></div>
        <small>${Math.round(s.discount*100)}% off at ${s.bulk}+ units${offer.bulk?' · APPLIED':''}</small></button>`;
    }).join('');
  }
  function supplies() {
    if(!item(selected))selected='Whole Milk';
    const i=item(selected),quote=game.quote(cart),pending=game.incoming(selected);
    return `<div class="cr-work-title"><div><span class="cr-kicker">BUY WHAT YOUR MENU NEEDS</span><h1>Order supplies</h1></div><span class="cr-health" id="cr-spendable">${money(game.spendable)} available</span></div>
      <div class="cr-order-layout"><div class="cr-shopping"><div class="cr-draft">${btn('recipe-picker','Plan a menu item')}${btn('draft-small','Small batch · 8 drinks')}${btn('draft-buffer','Buffer · 12 drinks')}</div>
      <label class="cr-select">Product<select id="cr-product">${Object.entries(INVENTORY_GROUPS).map(([group,names])=>`<optgroup label="${labels[group]}">${names.map(n=>`<option ${n===selected?'selected':''}>${esc(n)}</option>`).join('')}</optgroup>`).join('')}</select></label>
      <div class="cr-shopping-meta"><span id="cr-shopping-stock">${productArt(i.name)} ${game.stock(selected)} fresh · ${pending} incoming</span><span id="cr-spaces">${game.capacity(selected)-game.occupied(selected)-pending} shelf spaces</span></div>
      <div class="cr-suppliers">${supplierCards()}</div>
      <div class="cr-pack-row">${i.group==='bakery'?btn('pack','Ready-made','',`data-frozen="false" aria-pressed="${!frozen}"`)+btn('pack','Frozen · bake first','',`data-frozen="true" aria-pressed="${frozen}"`):'<span>Coffee first. Bakery can stay small.</span>'}<label><input type="checkbox" id="cr-express" ${express?'checked':''}> Express shipping (+fee)</label></div>
      <div class="cr-add-row">${btn('qty-down','−','',`aria-label="Decrease quantity"`)}<label>Quantity<input id="cr-qty" type="number" min="1" max="100" value="${qty}" inputmode="numeric"></label>${btn('qty-up','+','',`aria-label="Increase quantity"`)}${btn('add-cart','Add to cart','cr-primary')}</div>
      <p class="cr-work-note">Cart drafts are batch sizes you choose, not a prediction of customers. Adjust before checkout.</p></div>
      <aside class="cr-cart"><div class="cr-cart-title"><h2>Your cart</h2>${btn('clear-cart','Clear','cr-text')}</div><div class="cr-cart-lines">${cart.length?cart.map((l,index)=>`<div><span>${productArt(l.name)}</span><div><b>${esc(l.name)}${l.frozen?' · frozen':''}</b><small>${SUPPLIERS.find(s=>s.id===l.supplier).name} ${l.express?'Express':'Standard'}</small></div>${btn('edit-line',`×${l.qty}`,'cr-cart-edit',`data-index="${index}" aria-label="Edit ${esc(l.name)} quantity and supplier"`)}${btn('remove-line','×','cr-text',`data-index="${index}" aria-label="Remove ${esc(l.name)} from cart"`)}</div>`).join(''):'<div class="cr-empty-cart"><b>A small, smart start</b><p>Add products or draft a cart for your current menu.</p></div>'}</div>
      <div class="cr-cart-total">${quote?`<span>Stock <b>${money(quote.goods)}</b></span><span>Delivery <b>${money(quote.shipping)}</b></span><strong>Total <b>${money(quote.total)}</b></strong>`:'<strong>Total <b>$0.00</b></strong>'}${btn('review-cart','Review & place order →','cr-primary',cart.length?'':'disabled')}</div></aside></div>`;
  }
  function addToCart(lines,replace=false) {
    if(replace){cart=[];recipeTargets={};}
    for(const l of lines) {
      const existing=cart.find(c=>c.name===l.name&&!!c.frozen===!!l.frozen);
      if(existing)existing.qty+=l.qty;else cart.push({...l});
      game.tutorial.cartAdded=true;
    }
    drawTab();save();
  }
  function checkout() {
    const q=game.quote(cart);if(!q){toast('Your cart is empty.',false);return;}
    game.tutorial.reviewed=true;
    dialog('checkout','Ready to place the order?',`<div class="cr-review-cart">${cart.map(l=>`<span><span>${productArt(l.name)} ${esc(l.name)}${l.frozen?' (frozen)':''}<small>${SUPPLIERS.find(s=>s.id===l.supplier).name} · ${l.express?'express':'standard'}</small></span><b>×${l.qty}</b></span>`).join('')}</div>${cart.some(l=>game.offer(l.name,l.supplier,l.qty,l.frozen,l.express).dayOffset)?'<p class="cr-note"><b>Budget standard goods arrive tomorrow.</b> Choose QuickShip or express shipping for supplies needed to open today.</p>':''}<div class="cr-stat-row"><span>Inventory<b>${money(q.goods)}</b></span><span>Shipping<b>${money(q.shipping)}</b></span><span>Total<b>${money(q.total)}</b></span></div><p class="cr-note">${money(game.spendable)} available now. ${money(game.spendable-q.total)} after this order. Keep money for operating costs and surprises.</p>`,btn('place-order','Place order','cr-primary')+btn('close','Edit cart'));
  }

  function deliveries() {
    const arrived=game.deliveries.find(d=>d.arrived&&!d.shelved);
    if(arrived) {
      if(!arrived.lines.length) {
        dialog('delivery','Your order could not be filled',`<div class="cr-delivery-art">${uiIcon('truck')}</div><p><b>${esc(arrived.name)}</b></p><p>${esc(arrived.problem||'No goods arrived.')}</p><p class="cr-note">The missing goods were refunded. Shipping was already paid. Choose another supplier or express delivery to replace this order.</p>`,btn('unpack','Close & reorder','cr-primary',`data-delivery="${arrived.id}"`));
        return;
      }
      const contents=arrived.lines.map(l=>`${l.qty} ${l.name}`).join(', ');
      dialog('delivery','Supplies have arrived!',`<div class="cr-delivery-art">${uiIcon('truck')}<span>${uiIcon('box')}</span></div><p><b>${esc(arrived.name)}</b></p><p class="cr-note">Your delivery is here: ${esc(contents)}.</p>${arrived.problem||arrived.delayed?`<p class="cr-error">${arrived.problem?esc(arrived.problem):'This delivery arrived '+Math.ceil(arrived.eta-arrived.expected)+' seconds late.'} ${arrived.problem?'Missing goods were refunded. ':''}Unpack what arrived, or return the remaining goods for a refund.</p>`:''}<div class="cr-review-cart">${arrived.lines.map(l=>`<span><span class="cr-line-art">${productArt(l.name)}</span><span>${esc(l.name)}<small>${freshness(l)}</small></span><b>+${l.qty}</b></span>`).join('')}</div>`,btn('unpack','Unpack Delivery','cr-primary',`data-delivery="${arrived.id}"`)+((arrived.problem||arrived.delayed)&&!arrived.resolved?btn('delivery-refund','Return remaining goods','',`data-delivery="${arrived.id}"`):''));
      return;
    }
    const pending=game.deliveries.filter(d=>!d.arrived&&!d.cancelled);
    dialog('dock','Delivery dock',pending.length?`<div class="cr-delivery-list">${pending.map(d=>`<div>${uiIcon('truck')}<b>${esc(d.name)}</b><span>${d.delayNotified?'Late: extra '+Math.ceil(d.eta-d.expected)+'s':arrivalText(d)}</span>${(d.delayNotified||d.dueDay>game.day)&&!d.resolved?btn('delivery-wait','Keep order','',`data-delivery="${d.id}"`)+btn('delivery-refund','Refund goods','',`data-delivery="${d.id}"`):''}</div>`).join('')}</div><p class="cr-note">${pending.some(d=>d.delayNotified)?'A late order can use up your buffer. Keep it, or refund the goods and choose a faster supplier. Delivery fees are already spent.':'Today’s orders can be collected during preparation. Budget standard orders arrive next morning.'}</p>`:`<div class="cr-empty-cart">${uiIcon('box')}<p>No supplies in transit.</p></div>`,
      (game.phase==='planning'&&pending.some(d=>d.dueDay<=game.day)?btn('advance','Receive today’s delivery','cr-primary'):'')+btn('close','Back to café'));
  }
  function unpackDelivery(id) {
    const d=game.deliveries.find(d=>d.id===id&&d.arrived&&!d.shelved);if(!d)return;
    if(!d.lines.length){game.shelve(id,false);tab='supply';closeDialog();toast('Goods refunded. Your shelves and budget are ready for a replacement order.');return;}
    const groups=[...new Set(d.lines.map(l=>(['milk','bakery'].includes(item(l.name).group)||['Whipped Cream','Cold Foam'].includes(l.name))?'cold':'dry'))];
    unpacking={id,done:[],groups};drawUnpack();
  }
  function drawUnpack() {
    const d=game.deliveries.find(d=>d.id===unpacking?.id);if(!d)return;
    const group=unpacking.groups.find(g=>!unpacking.done.includes(g));
    const samples=d.lines.filter(l=>((['milk','bakery'].includes(item(l.name).group)||['Whipped Cream','Cold Foam'].includes(l.name))?'cold':'dry')===group).slice(0,3);
    dialog('unpack','Unpack & rotate',`<p>Place this bundle in ${group==='cold'?'cold storage':'the dry shelf'}. Older stock will stay at the front.</p><div class="cr-unpack-bundle" draggable="true" data-bundle="${group}">${samples.map(l=>`<span>${productArt(l.name)}<b>${l.name}</b><small>+${l.qty}</small></span>`).join('')}</div><div class="cr-storage-targets">${['dry','cold'].map(g=>btn('store-bundle',uiIcon(g==='cold'?'fridge':'shelf')+`<b>${g==='cold'?'Cold storage':'Dry shelf'}</b>`,'',`data-storage="${g}"`)).join('')}</div><p class="cr-note">Drag the bundle, or click the correct storage. One quick placement per storage area, even for a large delivery.</p>`,'');
    const overlay=$('#cr-modal');
    overlay.ondragstart=e=>{if(e.target.closest('[data-bundle]'))e.dataTransfer.setData('text/plain',group);};
    overlay.ondragover=e=>{if(e.target.closest('[data-storage]'))e.preventDefault();};
    overlay.ondrop=e=>{const target=e.target.closest('[data-storage]');if(target){e.preventDefault();storeBundle(target.dataset.storage);}};
  }
  function storeBundle(group) {
    if(!unpacking)return;
    const next=unpacking.groups.find(g=>!unpacking.done.includes(g));
    if(group!==next){error('Milk and pastries go in cold storage. Coffee and supplies go on the dry shelf.');sound(false);return;}
    unpacking.done.push(group);sound();
    if(unpacking.done.length===unpacking.groups.length) {
      const id=unpacking.id;unpacking=null;
      if(game.learning.legacyFIFO||game.learning.events.some(e=>e.kind==='fifo'))finishDelivery(id);
      else dialog('fifo','Which stock goes in front?',`<p>Keep older usable stock accessible as you add the new delivery. Choose the rotation that helps prevent waste.</p>`,btn('fifo-old','Older usable stock in front','cr-primary',`data-delivery="${id}"`)+btn('fifo-new','New delivery in front','',`data-delivery="${id}"`));
    } else drawUnpack();
  }
  function finishDelivery(id) {
    if(game.shelve(id,true)){tab='stock';category='coffee';closeDialog();drawTab();toast('Shelves restocked. Older stock is used first: FIFO.');checkEvents();}
  }
  function menuView() {
    const unlocked=MENU.filter(p=>p.day<=game.day&&p.kind===(menuSection==='drinks'?'drink':'bakery'));
    const pages=Math.ceil(unlocked.length/4);menuPage=Math.min(menuPage,Math.max(0,pages-1));
    const shown=unlocked.slice(menuPage*4,menuPage*4+4);
    return `<div class="cr-work-title"><div><span class="cr-kicker">A SMALL MENU CAN BE A SMART MENU</span><h1>Menu & bakery</h1></div>${btn('strategy',' Bakery strategy','',`id="cr-strategy"`)}</div>
      <div class="cr-menu-toolbar"><div>${btn('menu-section','Drinks','',`data-section="drinks" aria-pressed="${menuSection==='drinks'}"`)}${btn('menu-section','Bakery','',`data-section="bakery" aria-pressed="${menuSection==='bakery'}"`)}</div><span>${game.day<5?'Price lab unlocks on Day 5':'Price lab open · test, observe, adjust'}</span>${game.day>=4?btn('helper',game.helper?' Helper hired':'Hire shift helper · $22','',game.helper||game.phase!=='planning'?'disabled':''):''}</div>
      <div class="cr-menu-cards">${shown.map(p=>{
        const cost=game.unitCost(p.id),price=game.menu[p.id].price;
        return `<article class="cr-menu-card ${game.menu[p.id].enabled?'':'off'}"><div class="cr-drink-art">${drinkArt(p)}</div><div class="cr-menu-name"><h2>${p.name}</h2><span>${game.servings(p.id)} can be made now</span></div>
          <div class="cr-menu-cost"><span>Unit cost<b>${money(cost)}</b></span><span>Margin / sale<b>${money(price-cost)}</b></span></div>
          <div class="cr-price">${btn('price-down','−','',`data-id="${p.id}" aria-label="Lower ${p.name} price" ${game.day<5?'disabled':''}`)}<strong>${money(price)}</strong>${btn('price-up','+','',`data-id="${p.id}" aria-label="Raise ${p.name} price" ${game.day<5?'disabled':''}`)}</div>
          <small>${price>p.price*1.15?'↓ Higher price may deter customers':price<p.price?'↑ Value price · smaller margin':'→ Familiar price'}</small>
          <div class="cr-menu-actions">${btn('toggle-menu',game.menu[p.id].enabled?' On menu':'Add to menu','',`data-id="${p.id}" aria-pressed="${game.menu[p.id].enabled}"`)}${btn('recipe','Recipe','cr-text',`data-id="${p.id}"`)}</div>
          ${p.kind==='bakery'?`<div class="cr-bake-actions"><span> ${game.frozen(p.name)} frozen · ${game.stock(p.name)} ready</span>${btn('bake','Bake 4','',`data-name="${p.name}"`)}${btn('buy-bakery','Buy stock','',`data-name="${p.name}"`)}</div>`:''}</article>`;
      }).join('')}</div><div class="cr-menu-bottom"><span>${menuSection==='bakery'?`${game.strategy==='inhouse'?'In-house':game.strategy==='outsource'?'Outsource':'Hybrid'} · ${game.batches.length?game.batches.map(b=>`${b.name} ready in ${time(b.ready-game.clock)}`).join(' · '):'Oven idle'}`:`${MENU.filter(p=>p.day>game.day).length} more products unlock during the week`}</span>${pages>1?btn('menu-prev','←','',menuPage===0?'disabled':'')+`<b>${menuPage+1}/${pages}</b>`+btn('menu-next','→','',menuPage===pages-1?'disabled':''):''}${game.phase==='planning'&&game.batches.length?btn('advance','Finish batch '):''}</div>`;
  }
  function strategyDialog() {
    dialog('strategy','Bake here, buy in, or both?',`<p>Frozen portions are an inventory asset. Baking adds labor and energy to their cost, takes oven time, and slows drink preparation while staff are busy.</p>
      <div class="cr-strategies">${[
        ['inhouse','','In-house',`Lower purchase cost. Bake four at a time; pay ${money(CONFIG.bakeConversion)} per batch for labor and energy.`,'Frozen stock only'],
        ['outsource','','Local bakery','Ready to sell on delivery. Higher purchase cost; depends on supplier timing.','Ready-made stock only'],
        ['hybrid','','Hybrid','Mix fresh and frozen stock. More flexibility, but you must manage both types and storage.','Both packs available']
      ].map(([id,icon,title,text,note])=>btn('choose-strategy',`<span>${uiIcon(id==='inhouse'?'oven':id==='outsource'?'truck':'box')}</span><b>${title}</b><p>${text}</p><small>${note}</small>`,'',`data-strategy="${id}" aria-pressed="${game.strategy===id}"`)).join('')}</div><p class="cr-note">Your current usable stock stays available. You can reconsider the strategy later. ${game.upgrades.includes('energy')?`Efficient equipment lowers each batch to ${money(CONFIG.bakeConversion-.8)}.`:''}</p>`,btn('close','Back to café'));
  }
  function recipePicker() {
    dialog('recipe-picker','What would you like to stock?',`<div class="cr-recipe-picker">${MENU.filter(p=>p.day<=game.day).map(p=>btn('recipe',`${drinkArt(p)}<b>${p.name}</b>`,'',`data-id="${p.id}"`)).join('')}</div><p class="cr-note">Choose a menu item, set a serving target, then review the supplies you need.</p>`,btn('close','Back'));
  }
  function recipeDialog(id,servings=recipeTargets[id]||5) {
    const p=MENU.find(p=>p.id===id&&p.day<=game.day);if(!p)return;
    recipeItem=id;
    if(id==='latte'&&game.tutorial.menuSeen)game.tutorial.recipeSeen=true;
    const targets={...recipeTargets,[id]:servings},plan=game.recipePlan(targets,cart,supplier,express);
    if(!plan)return;
    const others=Object.entries(targets).filter(([key])=>key!==id).map(([key,n])=>`${n} ${MENU.find(p=>p.id===key).name}`);
    dialog('recipe',p.name,`<div class="cr-serving-plan"><label for="cr-servings">How many ${p.name} servings do you want to prepare?</label><div>${[5,10,15].map(n=>btn('serving-preset',String(n),'',`data-servings="${n}" aria-pressed="${n===servings}"`)).join('')}<label>Custom <input id="cr-servings" type="number" min="1" max="100" step="1" value="${servings}" inputmode="numeric"></label></div></div>
      <div class="cr-plan-rows">${p.recipe.map(name=>{const r=plan.rows.find(r=>r.name===name);return `<div>${productArt(name)}<span><b>${esc(name)}</b><small>Need ${r.required} · stock ${r.stock} · incoming ${r.incoming}${r.baking||r.frozenCoverage?` · bake ${r.baking+r.frozenCoverage}`:''} · cart ${r.inCart}</small></span><strong class="${r.unfilled?'cr-error':''}">${r.qty?`+${r.qty}`:'Covered'}${r.unfilled?`<small>${r.unfilled} won't fit</small>`:''}</strong></div>`;}).join('')}</div>
      <p class="cr-note">${others.length?`Also planned: ${esc(others.join(', '))}. Shared ingredients are counted together. `:''}Only missing supplies are added. Incoming stock counts when due today and still usable; frozen pastries need baking. Targets are your plan, not a customer forecast.</p>
      <p class="cr-plan-company">New items: ${esc(SUPPLIERS.find(s=>s.id===supplier).name)} · ${express?'express':'standard'}. Existing cart lines keep their company. ${plan.blocked|| (plan.unfilled?'Shelf space limits this plan. Reduce servings or free space.':'')}</p>`,
      btn('recipe-cart','Add All Ingredients to Cart','cr-primary',plan.blocked?'disabled':'')+btn('close','Back'));
  }
  function editCartLine(index) {
    const l=cart[index];if(!l)return;
    dialog('cart-edit',`${productArt(l.name)} ${esc(l.name)}`,`<div class="cr-cart-form"><label>Quantity<input id="cr-line-qty" type="number" min="1" max="200" step="1" value="${l.qty}"></label><label>Supplier<select id="cr-line-supplier">${SUPPLIERS.filter(s=>s.unlock<=game.day).map(s=>`<option value="${s.id}" ${s.id===l.supplier?'selected':''}>${s.name}</option>`).join('')}</select></label><label><input type="checkbox" id="cr-line-express" ${l.express?'checked':''}> Express shipping (+fee)</label></div><p class="cr-note">Changes update the cart total. You still review and confirm before spending anything.</p>`,btn('save-line','Update cart','cr-primary',`data-index="${index}"`)+btn('close','Cancel'));
  }
  function drawFeedback() {
    if(!game||!$('#cr-feedback'))return;
    const loss=game.lossNotice(),expiry=game.expiryNotice();
    let html;
    if(loss&&!game.tutorial.active&&game.phase==='shift') {
      const products=loss.products.map(id=>MENU.find(p=>p.id===id).name),missing=loss.missing;
      html=`<div class="cr-notice cr-loss-notice">${uiIcon('warning')}<div><div role="status"><b>${loss.count===1?'Lost sale!':`${loss.count} sales lost!`}</b><p>Wanted: ${esc(products.slice(0,2).join(' + '))}${products.length>2?' + more':''}. Missing: ${esc(missing.slice(0,2).join(', '))}${missing.length>2?' + more':''}.</p><small>Potential revenue lost: <strong>${money(loss.revenue)}</strong> · Fewer customers served hurts your rating.</small></div><div class="cr-notice-actions">${btn('restock-loss','Restock Missing Ingredient','',`data-name="${esc(missing[0])}"`)}${btn('dismiss-loss','Dismiss','cr-text')}</div></div></div>`;
    } else if(expiry&&!game.tutorial.active&&['planning','shift'].includes(game.phase)) {
      html=`<div class="cr-notice cr-expiry-notice">${uiIcon('warning')}<div><div role="status"><b>Inventory alert — expiring soon</b><p>${esc(expiry.name)} expires in ${expiry.days} day! Use the older ${expiry.qty} units first.</p></div><div class="cr-notice-actions">${btn('view-expiry','View Inventory','',`data-name="${esc(expiry.name)}"`)}${btn('menu-expiry','Review Menu','',`data-name="${esc(expiry.name)}"`)}${btn('dismiss-expiry','Dismiss','cr-text',`data-name="${esc(expiry.name)}"`)}</div></div></div>`;
    } else if(feedbackMessage&&Date.now()<feedbackMessage.until) {
      html=`<span>${uiIcon(feedbackMessage.success?'check':'warning')}</span><div class="cr-feedback-message" role="status">${esc(feedbackMessage.text)}</div>`;
    } else {
      const reaction=game.reactions[0],blocked=game.orders.find(o=>o.status==='waiting'&&game.missing(o).length);
      const low=game.upgrades.includes('tracker')?game.activeIngredients().find(n=>game.stock(n)<=Math.max(game.reorderPoint,Math.ceil(game.rate(n)*40))&&!game.incoming(n)):null;
      html=`<span>${blocked?uiIcon('warning'):game.expiredCount()?uiIcon('bin'):reaction?customerArt(reaction.face):uiIcon('shop')}</span><div><b>${blocked?`Waiting on ${esc(game.missing(blocked)[0])}`:game.expiredCount()?'Expired items need removal':low?`Tracker: reorder ${esc(low)}`:reaction?esc(reaction.name):'Your café, your decisions'}</b><small>${blocked?'Order supplies, check recipes, or change the menu.':game.expiredCount()?'Clear it from the stockroom. It cannot be sold.':reaction?esc(reaction.text):game.phase==='planning'?'Small batches. Safe stock. One smart decision at a time.':'Customers are served automatically. Watch what they need.'}</small></div>`;
    }
    patch('#cr-feedback',html);
  }
  function trends() {
    const observed=game.day===1?['Original Blend','Whole Milk','Cup','Lid','Vanilla','Cookie']:['Oat Milk','Cold Brew','Whole Milk','Croissant','Cookie','Decaf'];
    const reports=game.reports, last=reports.at(-1);
    return `<div class="cr-work-title"><div><span class="cr-kicker">READ THE ROOM, THEN ADJUST</span><h1>Sales & trends</h1></div>${game.upgrades.includes('tracker')?btn('reorder-cart',' Draft reorder cart','cr-primary'):btn('upgrades','Improve tracking')}</div>
      <div class="cr-trend-summary"><span>Served<b>${game.metrics.served}</b></span><span>Lost sales<b>${game.metrics.lost}</b></span><span>Today’s profit<b>${money(game.profit)}</b></span><span>New waste<b>${money(game.metrics.waste)}</b></span></div>
      <div class="cr-trend-layout"><div class="cr-trend-list"><h2>Demand signals</h2>${observed.map(n=>{const t=game.trend(n);return `<div><span>${productArt(n)}</span><b>${n}</b><strong class="${t.level}">${t.arrow}</strong><small>${t.label}</small></div>`;}).join('')}<p>Requests, past days & neighborhood news. Clues, not guaranteed orders.</p></div>
      <div class="cr-chart-card"><h2>The comeback so far</h2><div class="cr-bars">${DAYS.map((d,i)=>{const r=reports.find(r=>r.day===i+1)||(i+1===game.day&&game.elapsed>0?game.metrics:null);return `<div><b>${r?r.served:'?'}</b><i style="--bar:${r?Math.max(5,Math.min(100,r.served/40*100)):3}%;--bar-color:${r?'#36846b':'#cbb99e'}"></i><small>D${i+1}</small></div>`;}).join('')}</div><p>Customers actually served · future days are unknown</p><div class="cr-compare"><span>Previous day profit<b>${last?money(last.profit):'No previous day'}</b></span><span>Customer Rating<b>${rating()}</b></span></div>${btn('performance','Money & supplier details')}</div></div>
      <div class="cr-insight"><b>Your next improvement</b><span>${esc(game.biggestProblem())}</span></div>`;
  }
  function performance() {
    const m=game.metrics;
    dialog('performance','Follow the system',`<div class="cr-ledger"><span>Sales revenue<b>${money(m.revenue)}</b></span><span>Ingredients actually sold<b>−${money(m.cogs)}</b></span><span>Waste & write-offs<b>−${money(m.waste)}</b></span><span>Operations, shipping & improvements<b>−${money(m.operating)}</b></span><strong>Profit / loss<b>${money(game.profit)}</b></strong><span>Inventory purchased (asset)<b>${money(m.purchases)}</b></span><span>Stock still owned, including transit<b>${money(game.inventoryValue())}</b></span></div>
      <p class="cr-note">Buying stock reduces your bank balance. Its cost becomes an expense when sold or written off. Shipping, staffing and upgrades are expenses immediately. Baking labor is included in finished pastry cost.</p>
      <div class="cr-result-facts"><span>Stockout incidents <b>${m.stockouts}</b></span><span>Missed sales opportunity <b>${money(m.lostSales)}</b></span><span>Average inventory value <b>${money(m.stockSamples?m.stockValueSum/m.stockSamples:game.inventoryValue())}</b></span><span>Customer satisfaction <b>${game.satisfaction}/100</b></span></div>
      <h3>Observed supplier performance</h3><div class="cr-ledger">${Object.entries(game.supplierStats).map(([id,s])=>`<span>${SUPPLIERS.find(v=>v.id===id)?.name||id}<b>${s.onTime}/${s.orders} on time · ${s.correct}/${s.orders} correct</b></span>`).join('')||'<p>No deliveries yet.</p>'}</div>`,btn('close','Got it','cr-primary'));
  }
  function report() {
    const r=game.reports.find(r=>r.day===game.day);if(!r)return;
    game.reviewSeen=true;save();
    dialog('report',`Day ${game.day} complete · ${r.profit>=0?'a step forward':'a tough lesson'}`,`<div class="cr-character">${customerArt(r.served/Math.max(1,r.arrived)>.75?0:1)}<p><b>${r.served} of ${r.arrived} customers served</b>${game.day===1?'“We’re still in debt, but the doors are open again. Tomorrow we improve the system.”':r.profit>0?'“The café earned more than it used today. Let’s build on that.”':'“We found the weak spot. Let’s change the plan tomorrow.”'}</p></div>
      <div class="cr-stat-row"><span>Revenue<b>${money(r.revenue)}</b></span><span>Costs<b>${money(r.cogs+r.waste+r.operating)}</b></span><span>Profit / loss<b>${money(r.profit)}</b></span></div>
      <div class="cr-result-facts"><span>Lost sales <b>${r.lost}</b></span><span>Potential revenue lost <b>${money(r.lostSales)}</b></span><span>From missing stock <b>${r.stockLost||0} orders · ${money(r.stockLostRevenue||0)}</b></span><span>Expired / discarded <b>${r.wasteUnits} units</b></span><span>Customer Rating ${rating(Math.round(r.reputation/2)/10)}</span><span>Satisfaction <b>${r.satisfaction}/100</b></span><span>Remaining fresh stock <b>${r.remaining}</b></span></div>
      ${game.day===1?'<p class="cr-note">Freshness drops by one day overnight. Check dates before reopening.</p>':''}<div class="cr-insight"><b>${game.day===7?'Your next improvement':'Improve this tomorrow'}</b><span>${esc(r.problem)}</span></div>${game.day===5?'<p class="cr-festival"> Big event tomorrow! Prepare a buffer, extra capacity, or a focused menu.</p>':''}
      ${[2,4].includes(game.day)&&!game.quizAnswered?`<div class="cr-reflection"><b>A quick engineer’s reflection</b><p>${r.stockouts?'You saw customers waiting for supplies. What could reduce that risk?':'A delivery can arrive late even when the price looks good. What could protect service?'}</p>${btn('quiz','Keep a small buffer','',`data-answer="buffer"`)}${btn('quiz','Fill every shelf to the maximum','',`data-answer="maximum"`)}</div>`:''}`,
      btn(game.lesson.review?(game.day===7?'ending':'next-day'):'engineer-review',game.lesson.review?(game.day===7?'See the café’s future →':'Next morning →'):'Review evidence & choose an improvement','cr-primary')+(game.day<7?btn('upgrades','Choose an improvement'):'')+btn('performance','View finances'));
  }
  function upgrades() {
    const choices=UPGRADES.filter(u=>u.day<=game.day);
    const pages=Math.ceil(choices.length/3);upgradePage=Math.min(upgradePage,Math.max(0,pages-1));
    dialog('upgrades','Make tomorrow run better',`<p>Choose a lasting improvement. Each cost comes out of your available cash or credit.</p><div class="cr-upgrades">${choices.slice(upgradePage*3,upgradePage*3+3).map(u=>`<article><span>${uiIcon(u.icon)}</span><h3>${u.name}</h3><p>${u.effect}</p>${btn('buy-upgrade',game.upgrades.includes(u.id)?' Installed':`${money(u.cost)} · Install`,'cr-primary',`data-upgrade="${u.id}" ${game.upgrades.includes(u.id)||game.spendable<u.cost||game.phase==='shift'?'disabled':''}`)}</article>`).join('')||'<p>Permanent improvements unlock from Day 2. Today, start with safe stock and a small menu.</p>'}</div><p class="cr-note">Available: ${money(game.spendable)}. Improvements are charged as operating expenses in this simplified game model.</p>`,
      (pages>1?btn('upgrade-prev','←','',upgradePage===0?'disabled':'')+`<span>${upgradePage+1}/${pages}</span>`+btn('upgrade-next','→','',upgradePage===pages-1?'disabled':''):'')+btn(game.phase==='review'?'report':'close',game.phase==='review'?'Back to results':'Back to café'));
  }
  function ending() {
    const result=game.ending();if(!result)return;
    game.phase='complete';game.running=false;save();
    const stats=Object.values(game.supplierStats),deliveriesCount=stats.reduce((s,v)=>s+v.orders,0);
    const reliability=deliveriesCount?Math.round(100*stats.reduce((s,v)=>s+v.onTime+v.correct-v.orders,0)/deliveriesCount):0;
    const first=game.reports[0],last=game.reports.at(-1);
    dialog('ending',result.title,`<div class="cr-transformation"><div class="cr-before"><span>THEN</span><b>rISE Café</b><p>${uiIcon("shop")}</p><small>Debt · spoiled stock · empty shelves</small></div><div class="cr-after level-${game.visualLevel}"><span>NOW</span><b>rISE Café</b><p>${uiIcon(result.tier==='failure'?'shop':'leaf')}</p><small>${result.tier==='failure'?'A new plan could change the outcome':'Your decisions changed this place'}</small></div></div>
      <div class="cr-end-metrics"><span>Recovery balance<b>${money(CONFIG.openingCash+game.openingValue)} → ${money(result.balance)}</b></span><span>Customer Rating<b>1.0 → ${game.rating.toFixed(1)}/5</b>${rating()}</span><span>Daily profit<b>${money(first.profit)} → ${money(last.profit)}</b></span><span>Satisfaction<b>${first.satisfaction} → ${last.satisfaction}/100</b></span><span>Daily new waste<b>${money(first.waste)} → ${money(last.waste)}</b></span><span>Daily lost sales<b>${first.lost} → ${last.lost}</b></span><span>Supplier performance<b>${reliability}% on time / correct</b></span><span>Business efficiency<b>${result.efficiency}% served · ${result.turnover.toFixed(1)}× turnover</b></span></div>
      <p class="cr-note">${result.tier==='gold'?'Debt cleared, customers returning, and a system that works.':result.tier==='silver'?'You covered the café’s losses and earned another chance.':result.tier==='bronze'?'The café gets a short extension, but still needs to repay its debt.':'The café could not recover enough money and customer trust in time. Replay with a different purchasing, menu or capacity plan.'} Recovery balance = bank balance + inventory still owned.</p><div class="cr-end-score"><b>${result.score}/100</b> Operations score <span> ${game.xp} IE XP</span></div>`,
      btn('restart-confirm','Try a different strategy','cr-primary')+btn('export-learning','Download decision record')+btn('exit-now','Back to modes'));
  }
  function help() {
    dialog('help','You run the system. Staff serve the coffee.',`<div class="cr-help-steps"><span>① <b>Prepare</b>Clear expired stock. Order for the menu you choose.</span><span>② <b>Open</b>Watch customers react and respond to short events.</span><span>③ <b>Improve</b>Use the results to change one thing tomorrow.</span></div><p class="cr-note">1× takes about 4 minutes per day. At 2× or 3×, sales and delivery times speed up. Freshness changes only overnight. Pause whenever you need to plan. Pop-ups pause automatically.</p><p>The game saves in this browser. Tab switching pauses the shift. Closing the café screen keeps your campaign.</p>`,
      btn('sound',game.sound?' Sound on · mute':' Sound off · enable')+btn('operations-plan','Required operations plan')+btn('export-learning','Download decision record')+btn('close','Back to café','cr-primary'));
  }
  function resumeSave() {
    const step=game.tutorialStep();
    if(step){tab=['suppliers','compare','cart','review','order','delivery'].includes(step)?'supply':['menu','recipe','trends','restock'].includes(step)?'menu':step==='ready'?'trends':'stock';category=step==='inspect'?'milk':step==='missing'?'supplies':'rescue';}
    closeDialog(false);
    if(step==='order'&&cart.length){checkout();return;}
    if(game.phase==='complete')ending();
    else if(game.phase==='review')report();
    else if(!game.introSeen)intro(0);
    else if(!game.briefed)briefing();
    else checkEvents();
  }
  function startShift() {
    if(game.phase==='complete'){ending();return;}
    if(game.phase==='review'){report();return;}
    if(game.phase==='planning') {
      if(game.tutorial.active){toast('Finish the highlighted tutorial steps, or choose Skip tutorial.',false);return;}
      if(!game.lesson.plan){operationsPlan();return;}
      const message=game.open();if(message){dialog('opening-check','Before you open',`<p>${esc(message)}</p>`,btn('fix-opening','Show me where','cr-primary')+btn('close','Back to preparation'));return;}
      closeDialog(false);game.running=true;toast('Doors open! Keep the café stocked.');drawTab();
    } else {game.running=!game.running;}
    save();updateHUD();
  }
  function checkEvents() {
    if(!game||dialogState)return;
    if(game.phase==='review'&&!game.reviewSeen){report();return;}
    if(game.phase==='complete')return;
    if(game.pendingEvent){showStoryEvent();return;}
    if(game.deliveries.some(d=>d.arrived&&!d.shelved)){deliveries();return;}
  }
  function showStoryEvent() {
    if(game.pendingEvent) {
      const e=game.pendingEvent;
      dialog('event',e.title,`<div class="cr-character"><span>${uiIcon(game.info.face)}</span><p>${esc(e.text)}</p></div><div class="cr-event-choices">${e.choices.map(([id,title,note])=>btn('event-choice',`<b>${title}</b><small>${note}</small>`,'',`data-choice="${id}"`)).join('')}</div><p class="cr-note">Clock paused. Choose the tradeoff that fits your café.</p>`,'');
    }
  }
  function handleClick(e) {
    const target=e.target.closest('[data-action]');if(!target||target.disabled||!game)return;
    const a=target.dataset.action,d=target.dataset;
    if(a==='intro-next')intro(1);
    else if(a==='intro-done'){game.introSeen=true;game.briefed=true;tourIntro();}
    else if(a==='tour-begin'){closeDialog(false);drawTab();}
    else if(a==='skip-tour-intro'){game.skipTutorial();closeDialog(false);briefing();}
    else if(a==='finish-tour'){if(game.completeTutorial())dialog('tutorial-complete',"Tutorial Complete! You're ready to save rISE Café.",'<p>Your opening preparation is ready. Customers order automatically; watch coffee, milk and cup levels during the shift.</p>',btn('begin-day','Start Day 1','cr-primary')+btn('close','Keep preparing'));}
    else if(a==='begin-day'){closeDialog(false);startShift();}
    else if(a==='briefing-done'){closeDialog(false);drawTab();}
    else if(a==='resume-save')resumeSave();
    else if(a==='close')closeDialog();
    else if(a==='tab'){tab=d.tab;game.observe('tab',tab);const step=game.tutorialStep();if(tab==='stock'&&step==='stock')game.tutorial.stockOpened=true;if(tab==='supply'&&step==='suppliers')game.tutorial.suppliersOpened=true;if(tab==='menu'&&step==='menu')game.tutorial.menuSeen=true;if(tab==='trends'&&step==='trends')game.tutorial.trendsSeen=true;drawTab();}
    else if(a==='category'){category=d.category;drawTab();}
    else if(a==='inspect')inspect(d.product);
    else if(a==='skip-guide'){game.skipTutorial();drawTab();}
    else if(a==='trash-selected'){const n=inspected;closeDialog();trashProduct(n);}
    else if(a==='discard-lot') {
      const lot=game.lots[d.name].find(l=>l.id===Number(d.lot));
      if(lot?.expires>game.day) dialog('discard','Discard usable stock?',`<p>${lot.qty} ${esc(d.name)} are still usable. Discarding them creates ${money(lot.qty*lot.cost)} of waste.</p>`,btn('confirm-discard','Discard usable stock','',`data-name="${esc(d.name)}" data-lot="${lot.id}"`)+btn('close','Keep it','cr-primary'));
      else {game.discard(d.name,Number(d.lot));toast('Expired stock removed.');inspect(d.name);}
    }
    else if(a==='confirm-discard'){game.discard(d.name,Number(d.lot));closeDialog();toast('Usable stock discarded and recorded as waste.',false);}
    else if(a==='rotate'){game.rotate(inspected);closeDialog();toast(game.lastExplanation);}
    else if(a==='bin'){category='rescue';drawTab();toast('Drag an expired product here, or select it and use the bin button.');}
    else if(a==='order-selected'){selected=inspected;tab='supply';frozen=false;closeDialog();}
    else if(a==='supplier'){supplier=d.supplier;game.observe('supplier',supplier);if(!game.tutorial.compared.includes(supplier))game.tutorial.compared.push(supplier);drawTab();}
    else if(a==='qty-down'||a==='qty-up'){qty=Math.max(1,Math.min(100,qty+(a==='qty-up'?1:-1)));drawTab();}
    else if(a==='pack'){frozen=d.frozen==='true';drawTab();}
    else if(a==='add-cart'){
      const amount=Number($('#cr-qty').value);
      if(!Number.isInteger(amount)||amount<1||amount>100){toast('Choose a whole quantity from 1 to 100.',false);return;}
      qty=amount;addToCart([{name:selected,qty,supplier,frozen,express}]);toast('Added to your cart. Review before ordering.');
    }
    else if(a==='draft-small'||a==='draft-buffer'){tab='supply';if(game.tutorial.active&&supplier==='budget'){supplier='quick';toast('QuickShip selected for today’s opening. Budget standard orders arrive tomorrow.');}addToCart(game.restockPlan(a==='draft-small'?8:12,supplier),true);toast('Cart drafted for your active menu. Adjust products or suppliers before checkout.');}
    else if(a==='remove-line'){cart.splice(Number(d.index),1);drawTab();}
    else if(a==='clear-cart'){cart=[];recipeTargets={};drawTab();}
    else if(a==='edit-line')editCartLine(Number(d.index));
    else if(a==='save-line') {
      const l=cart[Number(d.index)],amount=Number($('#cr-line-qty').value),company=$('#cr-line-supplier').value,fast=$('#cr-line-express').checked;
      if(!l||!game.offer(l.name,company,amount,l.frozen,fast)){error('Enter a whole quantity from 1 to 200.');return;}
      Object.assign(l,{qty:amount,supplier:company,express:fast});closeDialog();toast('Cart updated. Review the new total before ordering.');
    }
    else if(a==='review-cart')checkout();
    else if(a==='place-order'){const problem=game.placeOrder(cart);if(problem)error(problem);else{cart=[];recipeTargets={};closeDialog();toast('Order placed! Delivery takes café time.');}}
    else if(a==='deliveries')deliveries();
    else if(a==='unpack')unpackDelivery(Number(d.delivery));
    else if(a==='store-bundle')storeBundle(d.storage);
    else if(a==='delivery-refund'||a==='delivery-wait'){const problem=game.deliveryDecision(Number(d.delivery),a==='delivery-refund'?'refund':'wait');if(problem)error(problem);else{closeDialog();toast(a==='delivery-refund'?'Goods refunded. Choose another supplier when ready.':'Order kept. Check your buffer while you wait.');}}
    else if(a==='advance') {
      closeDialog(false);
      if(game.phase==='planning'){if(!game.advancePlanning())toast('No delivery or bakery batch is pending.',false);checkEvents();drawTab();}
    }
    else if(a==='menu-section'){menuSection=d.section;menuPage=0;drawTab();}
    else if(a==='menu-prev'||a==='menu-next'){menuPage+=a==='menu-prev'?-1:1;drawTab();}
    else if(a==='price-down'||a==='price-up'){if(!game.setPrice(d.id,game.menu[d.id].price+(a==='price-up'?.25:-.25)))toast('Price is at its allowed limit.',false);drawTab();}
    else if(a==='toggle-menu'){if(!game.toggleMenu(d.id))toast('Keep at least one drink on the menu.',false);drawTab();}
    else if(a==='recipe')recipeDialog(d.id);
    else if(a==='recipe-picker')recipePicker();
    else if(a==='serving-preset')recipeDialog(recipeItem,Number(d.servings));
    else if(a==='recipe-cart') {
      const servings=Number($('#cr-servings').value),targets={...recipeTargets,[recipeItem]:servings},plan=game.recipePlan(targets,cart,supplier,express);
      if(!plan){error('Choose a whole serving target from 1 to 100.');return;}
      if(plan.blocked){error(plan.blocked);return;}
      recipeTargets=targets;tab='supply';closeDialog();addToCart(plan.lines);
      toast(plan.unfilled?'Added what fits. Your serving plan still needs more shelf space.':plan.lines.length?'Missing recipe supplies added. Edit quantities or companies in the cart.':'This plan is already covered by usable stock, deliveries and your cart.',!plan.unfilled);
    }
    else if(a==='dismiss-loss'){game.dismissLosses();drawFeedback();}
    else if(a==='restock-loss'){game.dismissLosses();selected=d.name;frozen=game.strategy==='inhouse'&&item(selected).group==='bakery';qty=Math.max(1,game.suggested(selected)||6);tab='supply';drawTab();drawFeedback();}
    else if(['dismiss-expiry','view-expiry','menu-expiry'].includes(a)) {
      game.dismissExpiry(d.name);
      if(a==='view-expiry'){tab='stock';category=item(d.name).group;drawTab();inspect(d.name);}
      if(a==='menu-expiry'){tab='menu';const p=MENU.find(p=>p.day<=game.day&&p.recipe.includes(d.name));menuSection=p?.kind==='bakery'?'bakery':'drinks';menuPage=p?Math.floor(MENU.filter(v=>v.day<=game.day&&v.kind===p.kind).findIndex(v=>v.id===p.id)/4):0;drawTab();}
      drawFeedback();
    }
    else if(a==='strategy')strategyDialog();
    else if(a==='choose-strategy'){game.setStrategy(d.strategy);closeDialog();menuSection='bakery';tab='menu';drawTab();toast('Strategy selected. Stock and capacity will show the tradeoff.');}
    else if(a==='buy-bakery'){selected=d.name;frozen=game.strategy==='inhouse';qty=frozen?4:6;tab='supply';drawTab();}
    else if(a==='bake'){const problem=game.bake(d.name);toast(problem||'Oven on! Labor and energy are included in this batch.',!problem);drawTab();}
    else if(a==='helper'){toast(game.hireHelper()?'Helper hired for today. Two customers can be prepared at once.':'Helper unavailable or not enough credit.',game.helper);drawTab();}
    else if(a==='reorder-cart'){tab='supply';addToCart(game.reorderPlan(supplier),true);}
    else if(a==='play')startShift();
    else if(a==='operations-plan'){if(game.phase==='planning')operationsPlan();else toast('Planning is complete for this shift. Review the outcomes after closing.');}
    else if(a==='fix-opening'){
      closeDialog(false);
      if(game.expiredCount()){tab='stock';category='rescue';}
      else if(game.day===1&&!game.learning.events.some(e=>e.kind==='fifo')&&game.deliveries.some(d=>d.arrived&&!d.shelved)){deliveries();return;}
      else if([3,4,5].includes(game.day)){tab='menu';menuSection=game.day===4?'bakery':'drinks';}
      else {tab='supply';if(game.lesson.plan?.supplier)supplier=game.lesson.plan.supplier;}
      drawTab();
    }
    else if(a==='save-plan')saveOperationsPlan();
    else if(a==='plan-compare'){game.observe('supplier',d.supplier);operationsPlan();}
    else if(a==='plan-trends'){tab='trends';game.observe('tab','trends');closeDialog();drawTab();toast('Inspect actual demand, then return to Required operations plan.');}
    else if(a==='fifo-new'){game.learning.events.push({kind:'fifo-attempt',day:game.day,correct:false});error('New stock in front leaves older goods behind to expire. Choose older usable stock first.');}
    else if(a==='fifo-old')finishDelivery(Number(d.delivery));
    else if(a==='engineer-review')engineerReview();
    else if(a==='save-review'){const problem=game.reflect($('#cr-review-answer').value,$('#cr-review-action').value);if(problem)error(problem);else report();}
    else if(a==='export-learning'){const url=URL.createObjectURL(new Blob([JSON.stringify(game.learningRecord(),null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='cafe-rescue-decisions.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    else if(a==='speed'){speed=Number(d.speed);updateHUD();toast(`${speed}× speed: sales and deliveries move ${speed===1?'at normal speed':`${speed} times faster`}.`);}
    else if(a==='brief')briefing();
    else if(a==='event-choice'){const problem=game.chooseEvent(d.choice);if(problem)error(problem);else{closeDialog();toast(game.lastExplanation);}}
    else if(a==='report')report();
    else if(a==='next-day'){if(game.nextDay()){cart=[];recipeTargets={};category='rescue';tab='stock';closeDialog(false);briefing();drawTab();}}
    else if(a==='ending')ending();
    else if(a==='upgrades'){upgradePage=0;upgrades();}
    else if(a==='upgrade-prev'||a==='upgrade-next'){upgradePage+=a==='upgrade-prev'?-1:1;upgrades();}
    else if(a==='buy-upgrade'){if(game.buyUpgrade(d.upgrade)){upgrades();toast('Installed! This improvement changes how the café operates.');}else error('This improvement is unavailable or exceeds your credit.');}
    else if(a==='performance')performance();
    else if(a==='quiz'){const correct=game.quiz(d.answer);report();toast(correct?'Yes! Safety stock covers uncertainty without filling every shelf.':'A small buffer is safer. Filling every shelf ties up cash and can create waste.',correct);}
    else if(a==='money')dialog('money','Debt is not the same as spending power',`<div class="cr-stat-row"><span>Bank balance<b>${money(game.cash)}</b></span><span>Available cash + credit<b>${money(game.spendable)}</b></span></div><p>The café inherited $500 of debt. The credit limit is $750. You can buy supplies using the remaining room; sales repay what you owe.</p><p class="cr-note">Recovery balance: <b>${money(game.balance)}</b> = bank balance + inventory still owned. You must improve money and service to save the café.</p>`,btn('close','Back to work','cr-primary'));
    else if(a==='help')help();
    else if(a==='sound'){game.sound=!game.sound;help();}
    else if(a==='exit')dialog('exit','Save your spot?',`<p>Your campaign stays in this browser. You can resume from the mode menu.</p>${saveError?'<p class="cr-error">Browser storage is unavailable. Progress cannot be saved on this device.</p>':''}`,btn('exit-now','Save & exit','cr-primary')+btn('close','Keep playing'));
    else if(a==='exit-now'){save();closeDialog(false);roles();return;}
    else if(a==='restart-confirm')dialog('restart','Start a fresh seven-day rescue?',`<p>This replaces this browser’s Café Rescue save. Try another strategy and see how it changes the outcome.</p>`,btn('restart','Start new campaign','cr-primary')+btn('close','Keep this campaign'));
    else if(a==='restart'){game=new InventorySim();window.inventoryGame=game;tab='stock';category='rescue';cart=[];recipeTargets={};feedbackMessage=null;dialogState=null;render();intro(0);}
    updateHUD();save();
  }
  function handleChange(e) {
    if(e.target.id.startsWith('cr-plan-price-')) {
      const id=e.target.id.replace('cr-plan-price-',''),node=$(`#cr-plan-margin-${id}`),value=Number(e.target.value);
      if(node)node.textContent=Number.isFinite(value)?`Estimated profit per sale: ${money(value-game.unitCost(id))} before overhead`:'Enter a valid selling price.';
    }
    if(e.target.id==='cr-servings') {
      const amount=Number(e.target.value);
      if(!Number.isInteger(amount)||amount<1||amount>100){error('Choose a whole serving target from 1 to 100.');return;}
      recipeDialog(recipeItem,amount);
    }
    if(e.target.id==='cr-product'){selected=e.target.value;frozen=item(selected).group==='bakery'&&game.strategy==='inhouse';drawTab();}
    if(e.target.id==='cr-qty'){qty=Math.max(1,Math.min(100,Math.round(Number(e.target.value)||1)));drawTab();}
    if(e.target.id==='cr-express'){express=e.target.checked;drawTab();}
  }
  function updateHUD() {
    if(!game||!$('.cr-game'))return;
    patch('#cr-bank',`<small>Bank balance</small><b>${money(game.cash)}</b>`);
    patch('#cr-reputation',`<small>Customer Rating</small>${rating()}`);
    document.querySelectorAll('[data-day]').forEach(n=>{n.classList.toggle('done',Number(n.dataset.day)<game.day);n.classList.toggle('current',Number(n.dataset.day)===game.day);});
    $('#cr-phase').textContent=`Day ${game.day} · ${game.phase==='planning'?'Prepare the café':game.phase==='shift'?(game.running?'Café open':'Paused'):game.phase==='review'?'Review & improve':'Campaign complete'}`;
    $('#cr-clock').textContent=time(CONFIG.shiftSeconds-game.elapsed);$('#cr-progress').value=game.elapsed;
    $('#cr-save').textContent=saveError?'Save unavailable in this browser':game.phase==='planning'?'Planning time is yours · auto-save on':'All systems share the same clock · auto-save on';
    $('#cr-play').disabled=game.tutorial.active&&game.day===1;
    $('#cr-play').textContent=game.phase==='planning'?'Open café →':game.phase==='review'?'Day results →':game.phase==='complete'?'Your ending →':game.running?'Ⅱ Pause':'Resume';
    document.querySelectorAll('[data-speed]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.speed)===speed));
    $('#cr-xp').textContent=` ${game.xp} IE XP · ${game.badges.length} milestones`;
    const pending=game.deliveries.filter(d=>!d.shelved),ready=pending.filter(d=>d.arrived).length,late=pending.some(d=>d.delayNotified&&!d.arrived);
    patch('#cr-dock',`${uiIcon('box')} <b>${ready?'Supplies arrived!':late?'Delivery delayed':pending.length?`${pending.length} delivery pending`:'Delivery dock'}</b><small>${ready?'Click to shelve':late?'Check your safety stock':pending.length?'Click for timing':'No orders in transit'}</small>`);
    drawFeedback();
    patch('#cr-live-stats',`<span><b>${game.metrics.served}</b> served</span><span><b>${game.metrics.lost}</b> lost</span>`);
    if($('#cr-spendable'))$('#cr-spendable').textContent=`${money(game.spendable)} available`;
    if($('#cr-shopping-stock'))$('#cr-shopping-stock').innerHTML=`${productArt(selected)} ${game.stock(selected)} fresh · ${game.incoming(selected)} incoming`;
    if($('#cr-spaces'))$('#cr-spaces').textContent=`${game.capacity(selected)-game.occupied(selected)-game.incoming(selected)} shelf spaces`;
    if(game.xp>lastXP){const gained=game.xp-lastXP;lastXP=game.xp;toast(` +${gained} IE XP · ${game.badges.at(-1)}`);}
    if(!dialogState){
      if(tab==='stock'||tab==='trends'||tab==='menu')drawTab();
      checkEvents();
    }
  }
  requestAnimationFrame(function loop(now){
    const dt=lastFrame?Math.min((now-lastFrame)/1000,.2):0;lastFrame=now;
    if(game&&!dialogState)game.tick(dt*speed);
    if(game&&now-lastPaint>500){updateHUD();lastPaint=now;}
    if(game&&now-lastSave>5000){save();lastSave=now;}
    requestAnimationFrame(loop);
  });
  document.addEventListener('visibilitychange',()=>{if(game&&document.hidden){game.running=false;save();}});
  window.addEventListener('pagehide',save);
  roles();
})();
