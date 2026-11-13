/* Inventory Manager presentation. Owns only the Inventory Manager entry and its scoped UI. */
(() => {
  'use strict';
  const {CONFIG,SUPPLIERS,MENU,DAYS,UPGRADES}=RESCUE;
  const SAVE_KEY='rise.cafe-rescue.five-day.v1';
  const $=s=>document.querySelector(s);
  const item=n=>INVENTORY_ITEMS.find(i=>i.name===n);
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=n=>`${n<0?'−':''}$${Math.abs(n).toFixed(2)}`;
  const time=n=>{const v=Math.ceil(Math.max(0,n));return `${Math.floor(v/60)}:${String(v%60).padStart(2,'0')}`;};
  const labels={coffee:'Coffee',milk:'Milk',syrup:'Syrups',topping:'Toppings',bakery:'Bakery',supplies:'Supplies'};
  let game=null,tab='stock',selected='Whole Milk',supplier='quick',qty=6,frozen=false,express=false,cart=[];
  let menuPage=0,menuSection='drinks',speed=1,dialogState=null,lastFrame=0,lastPaint=0,lastSave=0,lastXP=0,saveError=false,audio;
  let inspected=null,upgradePage=0,dragged=null,unpacking=null,recipeTargets={},recipeItem='latte',feedbackMessage=null;
  let cartComparison=null;
  let planningTimeout=null,planningReady=false,planningBlocker='';

  function pausePlanning() {
    clearTimeout(planningTimeout);planningTimeout=null;
    game?.pausePlanningClock();
  }
  function syncPlanning() {
    if(!game||game.phase!=='planning'||!planningReady||!game.briefed||dialogState||document.hidden){pausePlanning();return;}
    game.resumePlanningClock();
    const remaining=game.planningTimeLeft();
    if(remaining===0){startShift(true);return;}
    if(planningTimeout===null){
      const campaign=game,day=game.day;
      planningTimeout=setTimeout(()=>{
        planningTimeout=null;
        if(game===campaign&&game.day===day&&game.phase==='planning')updateHUD();
      },Math.ceil(remaining*1000));
    }
  }

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
  // Stockroom packaging reuses the existing ingredient drawings and café palette.
  // The common baseline keeps each container resting on its shelf.
  function shelfArt(i) {
    const art=productArt(i.name);
    if(i.group==='milk'||i.group==='syrup'||(i.group==='topping'&&i.name.includes('Drizzle')))
      return art.replace('viewBox="0 0 92 84"','viewBox="8 3 76 73" preserveAspectRatio="xMidYMax meet"');
    const inset=(x,y,w,h)=>art.replace('<svg ',`<svg x="${x}" y="${y}" width="${w}" height="${h}" `);
    let container;
    if(i.group==='coffee') {
      const color={'Original Blend':'#b47849','Cold Brew':'#628d87','Decaf':'#8ca86f'}[i.name];
      container=i.name==='Cold Brew'
        ?`<path d="M33 17h26v13l8 9v31q0 4-4 4H29q-4 0-4-4V39l8-9z" fill="${color}"/><rect x="31" y="8" width="30" height="10" rx="3" fill="#574539"/><rect x="29" y="39" width="34" height="28" rx="4" fill="#fff0ce"/>${inset(30,39,32,29)}`
        :`<path d="M23 10h46l-4 15 7 46q0 3-4 3H24q-4 0-4-3l7-46z" fill="${color}"/><path d="M23 10h46l-4 12H27z" fill="#eed5a5"/><path d="M28 16h36M25 69h42" fill="none"/><rect x="29" y="31" width="34" height="31" rx="4" fill="#fff0ce"/>${inset(30,31,32,30)}`;
    } else if(i.group==='topping') {
      container=`<rect x="23" y="26" width="46" height="48" rx="8" fill="${i.name==='Cinnamon'?'#c69a66':'#e8eee0'}"/><path d="M20 22q26-7 52 0v10H20z" fill="${i.name==='Cinnamon'?'#9c6940':'#8bb6a4'}"/><rect x="28" y="38" width="36" height="29" rx="5" fill="#fff4db"/>${inset(29,37,34,30)}`;
    } else {
      const y={Croissant:20,'Breakfast Sandwich':16,Cookie:14,Cup:14,Lid:29,Straw:14,Utensil:12,'Bakery Bag':12,Napkin:14}[i.name];
      container=`<path d="M14 66h64l-5 8H19z" fill="${i.group==='bakery'?'#ba8753':'#c6d5bd'}"/>${inset(16,y,60,60)}`;
    }
    return `<svg viewBox="8 3 76 73" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false"><g stroke="#573421" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${container}</g></svg>`;
  }
  const drinkArt=p=>p.kind==='bakery'?productArt(p.name):'<img class="cr-coffee-image" src="assets/caramel-coffee.png" alt="">';
  // Reuse Barista's illustrated cast and expression overlays without changing its renderer.
  function customerArt(n=0,emotion='happy',slot='feedback') {
    const face=Math.abs(Math.trunc(Number(n)||0))%3;
    const mood=['happy','pleased','neutral','disappointed'].includes(emotion)?emotion:'neutral';
    const art=illustratedCharacter(face).replace(/id="/g,`id="cr-${slot}-`).replace(/url\(#/g,`url(#cr-${slot}-`);
    return `<span class="cr-customer-art" data-emotion="${mood}" aria-hidden="true">${art}</span>`;
  }
  function latestReaction() {
    const reaction=game.reactions[0];if(!reaction)return null;
    const order=game.orders.find(o=>o.id===reaction.id),loss=game.alerts.losses.find(l=>l.id===reaction.id);
    const tone=loss?'unavailable':reaction.emotion==='disappointed'?'disappointed':reaction.emotion==='happy'?'happy':'neutral';
    const label=loss?'Left · missing supplies':order?.status==='lost'?'Left without buying':order?.status==='served'?(reaction.emotion==='happy'?'Satisfied customer':'Served · mixed feedback'):'Customer reaction';
    return {...reaction,tone,label:!order?`Last shift · ${label.toLowerCase()}`:label,missing:loss?.missing||[]};
  }
  function reactionBubble(reaction,slot) {
    return `<div class="cr-reaction cr-reaction--${reaction.tone}" data-reaction-id="${esc(reaction.id)}">
      ${customerArt(reaction.face,reaction.emotion,slot)}<div class="cr-speech"><span class="cr-reaction-label">${esc(reaction.label)}</span><b>${esc(reaction.name)}</b><p>“${esc(reaction.text)}”</p>${reaction.missing.length?`<small>Missing: ${esc(reaction.missing.join(', '))}</small>`:''}</div></div>`;
  }
  function serviceWindow() {
    const reaction=latestReaction();
    return `<aside class="cr-backroom" aria-label="Café service window"><div class="cr-service-window"><div class="cr-service-sign">From the café</div>
      <div class="cr-service-view">${reaction?reactionBubble(reaction,'window'):`<div class="cr-service-empty">${uiIcon('cup')}<b>${game.phase==='planning'?'Preparing to open':'Waiting for feedback'}</b><p>${game.phase==='planning'?'Staff serve automatically when you open.':'Customer reactions appear after actual orders.'}</p></div>`}</div>
      <div class="cr-window-sill">${reaction?'Latest recorded reaction':'Service window'}</div></div><div class="cr-backroom-fixtures" aria-hidden="true"></div></aside>`;
  }
  function rating(value=game.rating) {
    const v=Math.max(0,Math.min(5,value));
    return `<span class="cr-rating" role="img" aria-label="${v.toFixed(1)} out of 5 stars"><span class="cr-stars">${Array.from({length:5},(_,i)=>`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l3 6 7 .9-5 4.9 1.3 7-6.3-3.4-6.3 3.4 1.3-7-5-4.9L9 8z" fill="${i<v-.25?'#ffc53e':'#e4ded3'}" stroke="#785229" stroke-width="1.5"/></svg>`).join('')}</span><b>${v.toFixed(1)}/5</b></span>`;
  }
  const freshness=l=>l.expires<=game.day?'Expired':l.supplierManaged?'Freshness handled by bakery':item(l.name)?.group==='supplies'?'Shelf-stable':`${l.expires-game.day} ${l.expires-game.day===1?'Day':'Days'} Left`;
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
    game.tutorial.selectedSupplier=supplier;
    if(!game.tutorial.ordered&&!cart.length){game.tutorial.cartAdded=false;game.tutorial.reviewed=false;}
    try { localStorage.setItem(SAVE_KEY,game.save()); saveError=false; }
    catch { saveError=true; }
  }
  function savedGame() { try{return InventorySim.restore(localStorage.getItem(SAVE_KEY));}catch{return null;} }
  function legacySave() { try{return localStorage.getItem('rise.cafe-rescue.v2');}catch{return null;} }
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
    pausePlanning();
    const resume=dialogState?dialogState.resume:game?.running;
    dialogState={key,resume,focus:document.activeElement?.id};
    if(game)game.running=false;
    $('#cr-modal')?.remove();
    $('.cr-game')?.setAttribute('inert','');
    const overlay=document.createElement('div');overlay.id='cr-modal';overlay.className='cr-overlay';
    const tutorialStep=game?.tutorial.active?game.tutorialStep():null;
    if(tutorialStep&&!['intro','resume','tour-intro','briefing','tutorial-complete','tutorial-replay'].includes(key))body=`<p id="cr-dialog-guide" class="cr-note" role="status"></p>`+body;
    if(tutorialStep&&!['intro','resume','tutorial-complete','tutorial-replay'].includes(key))footer+=btn('skip-guide','Skip tutorial','cr-text');
    overlay.innerHTML=`<section class="cr-dialog ${key==='intro'?'cr-intro':''}" data-dialog="${key}" role="dialog" aria-modal="true" aria-labelledby="cr-dialog-title" tabindex="-1"><div class="cr-kicker">rISE CAFÉ · INVENTORY MANAGER</div><h2 id="cr-dialog-title">${title}</h2><div class="cr-dialog-body">${body}<p id="cr-dialog-error" class="cr-error" role="status"></p></div><footer>${footer}</footer></section>`;
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
    highlightTour();
  }
  function closeDialog(resume=true) {
    const prior=dialogState;dialogState=null;$('#cr-modal')?.remove();$('.cr-game')?.removeAttribute('inert');
    planningReady=true;
    if(game&&resume&&prior?.resume&&game.phase==='shift'&&!game.pendingEvent)game.running=true;
    const fallback=tab==='stock'?$('.cr-nav [data-tab="stock"]'):$('#cr-play');
    (prior?.focus?$('#'+CSS.escape(prior.focus))||fallback:fallback)?.focus({preventScroll:tab==='stock'});
    drawTab();updateHUD();save();
  }
  function error(message) { const node=$('#cr-dialog-error');if(node)node.textContent=message;else toast(message,false); }
  function start() {
    pausePlanning();planningReady=false;planningBlocker='';
    sim=null;paused=false;modalKind=null;document.body.classList.remove('playing');
    document.querySelectorAll('.modal-backdrop,.station-overlay').forEach(n=>n.remove());
    const previous=savedGame();
    game=previous||new InventorySim();window.inventoryGame=game;
    supplier=previous?.tutorial.selectedSupplier||'quick';
    tab='stock';cart=previous?.tutorial.cart?.map(l=>({...l}))||[];recipeTargets={...(previous?.tutorial.recipeTargets||{})};feedbackMessage=null;speed=1;dialogState=null;
    if(previous&&!game.tutorial.ordered&&!cart.length){game.tutorial.cartAdded=false;game.tutorial.reviewed=false;}
    render();
    if(previous) {
      dialog('resume',`The café is waiting for you`, `<div class="cr-character"><span>${uiIcon(game.info.face)}</span><p><b>Day ${game.day} of 5 · ${esc(game.info.title)}</b>Progress saved; the clock is paused.</p></div><div class="cr-stat-row"><span>Bank balance<b>${money(game.cash)}</b></span><span>Customer Rating<b>${rating()}</b></span></div>`,btn('resume-save','Resume rescue →','cr-primary')+btn('restart-confirm','Start a new rescue'));
    } else intro(0);
  }
  // Preserve the other role cards, routes and original event handlers.
  const originalRoles=roles;
  roles=function() {
    pausePlanning();planningReady=false;planningBlocker='';
    if(game)save(); game=null;window.inventoryGame=null;dialogState=null;
    document.body.classList.remove('inventory-playing');originalRoles();
    const card=[...document.querySelectorAll('.role-choice')].find(n=>n.querySelector('h2')?.textContent==='Inventory Manager');
    if(!card)return;
    card.classList.remove('locked');card.classList.add('play');card.querySelector('small')?.remove();
    card.querySelector('h2').textContent='Inventory Manager';
    card.querySelector('p').textContent='Stock the café through five days.';
    card.insertAdjacentHTML('beforeend','<button id="inventory-start" class="big-btn">Play Inventory Manager →</button>');
    $('#inventory-start').onclick=start;
  };
  function intro() {
    dialog('intro','Help rISE Café recover in five days',`<p>Manage stock and spending; staff serve automatically after you open.</p><p><b>Your goal:</b> stock complete recipes, serve customers and recover the debt.</p><details><summary>Success & loss conditions</summary><p>After Day 5, “Café Saved” requires recovery balance ≥ $0, Customer Rating ≥ 2.5/5 and ≥ 70% of customers served.</p><p>To avoid “Café Closed”, meet those requirements or all four: recovery balance ≥ −$200, Customer Rating ≥ 1.75/5, ≥ 50% served and a profitable final day.</p><p>Recovery balance = bank balance + stock value; a negative bank balance alone does not end the game.</p></details><p class="cr-note">Restock a Vanilla Latte in this tutorial; purchases and cleanup affect your saved campaign.</p>`,btn('intro-done','Start guided tutorial','cr-primary')+btn('skip-tour-intro','Skip tutorial'));
  }
  function briefing() {
    game.briefed=true;save();
    const prior=game.learning.days[game.day-1]?.review?.action;
    const focus={stock:'stock targets and reorder points',supplier:'supplier and delivery timing',price:'prices and margins',capacity:'service capacity',smaller:'smaller batches',maintain:'monitoring the current strategy'};
    dialog('briefing',`Day ${game.day}: ${esc(game.info.title)}`,`<div class="cr-character"><span>${uiIcon(game.info.face)}</span><p>${esc(game.info.text)}</p></div><ol class="cr-goals">${game.info.goals.map(g=>`<li>${esc(g)}</li>`).join('')}</ol>${prior?`<p class="cr-note">Focus: ${focus[prior]}. Test it today.</p>`:''}<div class="cr-note">Complete Required operations plan before opening a 75-second shift at 1×.</div>${game.day===4?'<p>Pricing is now unlocked in Menu & bakery.</p>':''}`,btn('briefing-done',game.day===1?'Enter the stockroom →':'Prepare the café →','cr-primary'));
  }
  function operationsPlan() {
    if(game.lesson.plan){toast('Plan saved; adjust suppliers, prices or stock settings in their tabs.');return;}
    const day=game.day,draft=game.lesson.draft||{};
    const number=(id,label,min,max,value)=>`<label>${label}<input id="cr-plan-${id}" type="number" min="${min}" max="${max}" step="1" value="${draft[id]??value}"></label>`;
    const select=(id,label,options,value='')=>`<fieldset class="cr-plan-choice"><legend>${label}</legend><input type="hidden" id="cr-plan-${id}" value="${esc(draft[id]??value)}"><div class="cr-plan-choice-buttons">${options.map(([v,t,note])=>btn('plan-choice',`<b>${esc(t)}</b>${note?`<small>${esc(note)}</small>`:''}`,'',`data-field="${id}" data-value="${v}" aria-pressed="${(draft[id]??value)===v}"`)).join('')}</div></fieldset>`;
    const buffer=number('buffer','Safety stock: extra units',0,12,game.safetyStock)+number('reorder','Reorder at this quantity',1,12,game.reorderPoint);
    const capacity=select('capacity','Plan for the rush',[['helper','Hire help · $22 · prepare two customers at once'],['focus','Focus on the best-stocked drink'],['buffer','Keep capacity; use your stock buffer']]);
    const investment=select('investment','Invest or preserve cash?',[['hold','Keep cash available','Keep money for supplies and surprises.'],...UPGRADES.filter(u=>['fridge','storage','energy'].includes(u.id)&&u.day<=day&&!game.upgrades.includes(u.id)).map(u=>[u.id,u.name+' · '+money(u.cost),u.effect])])+select('reason','What matters most?',[['waste','Freshness and waste'],['capacity','Space and service capacity'],['cash','Cash and operating costs']]);
    let content='';
    if(day===1)content=`<p>Compare two suppliers, then choose one and a serving target.</p><div class="cr-plan-offers">${SUPPLIERS.filter(s=>s.unlock<=day).map(s=>{const o=game.offer('Whole Milk',s.id,8);return btn('plan-compare',`<b>${s.name}${game.lesson.compared.includes(s.id)?' · inspected':''}</b><small>8 milk: ${money(o.unit*8)} + shipping · ${o.dayOffset?'tomorrow':o.lead+'s today'} · ${Math.round(o.reliability*100)}% reliable · ${o.life} days fresh · ${Math.round(o.quality*100)}% quality</small>`,'',`data-supplier="${s.id}"`);}).join('')}</div>${select('supplier','Supplier for your opening order',SUPPLIERS.filter(s=>s.unlock<=day).map(s=>[s.id,s.name]),supplier)}${number('servings','Vanilla Latte serving target',1,40,recipeTargets.latte||12)}<p class="cr-note">Discard expired stock; unpack with older usable stock in front (FIFO).</p>`;
    if(day===2||day===5)content=`<p>${day===2?'Cold brew is trending.':'The festival is your final test.'} Use demand trends to set a serving target and extra stock; sales are uncertain.</p>${btn('plan-trends','Inspect Sales & trends')}${number('servings',day===2?'Cold brew serving estimate':'Vanilla Latte serving estimate',1,40,day===2?12:18)}${buffer}${day===5?capacity:''}`;
    if(day===3)content=`<p>Baking uses staff and oven time; ready-made pastries cost more and need delivery.</p>${select('strategy','Make, buy or combine?',[['inhouse','In-house',`Frozen portions + ${money(CONFIG.bakeConversion)} labor/energy per batch. ${CONFIG.bakeSeconds}s oven time; shares staff with drinks.`],['outsource','Outsource','Ready-made with managed freshness; higher cost and delivery risk.'],['hybrid','Hybrid','Mix frozen and ready-made stock within storage limits.']])}${capacity}${investment}<p class="cr-note">Stock one bakery item; extra-stock and reorder settings carry forward.</p>`;
    if(day===4)content=`<p>Confirm two prices, balancing profit per sale with customer demand.</p>${['latte','oat'].map(id=>{const p=MENU.find(p=>p.id===id);return `<label>${p.name} · cost ${money(game.unitCost(id))}<input id="cr-plan-price-${id}" type="number" min="${p.price*.5}" max="${p.price*1.8}" step="0.25" value="${draft['price-'+id]??game.menu[id].price}"><small id="cr-plan-margin-${id}">Profit per sale before overhead: ${money(game.menu[id].price-game.unitCost(id))}</small></label>`;}).join('')}`;
    if(day===1&&!game.upgrades.includes('tracker'))content+=`<p class="cr-note">Optional: ${money(assistantCost())} once unlocks urgent express purchasing for empty menu supplies.</p>${assistantButton()}`;
    dialog('operations-plan',`Day ${day} · Your operations plan`,`<div class="cr-plan-form">${content}</div><p class="cr-note">${money(game.spendable)} available. Plans carry forward. No automatic cart purchases.</p>`,btn('save-plan','Apply my plan','cr-primary')+btn('close','Prepare first'));
  }
  function saveOperationsPlan() {
    const n=id=>Number($(`#cr-plan-${id}`)?.value),v=id=>$(`#cr-plan-${id}`)?.value;
    const p={};
    if([1,2,5].includes(game.day))p.servings=n('servings');
    if([2,5].includes(game.day)){p.buffer=v('buffer')===''?NaN:n('buffer');p.reorder=n('reorder');}if(game.day===3){p.buffer=game.safetyStock;p.reorder=game.reorderPoint;}
    if(game.day===1)p.supplier=v('supplier');
    if(game.day===3)p.strategy=v('strategy');
    if(game.day===4)p.prices={latte:n('price-latte'),oat:n('price-oat')};
    if([3,5].includes(game.day))p.capacity=v('capacity');
    if(game.day===3){p.investment=v('investment');p.reason=v('reason');}if(game.day===5){p.investment='hold';p.reason='cash';}
    const problem=game.commitPlan(p);if(problem){error(problem);return;}
    if(p.supplier)supplier=p.supplier;
    if(p.servings){const id=game.day===2?'oat':'latte';recipeTargets={...recipeTargets,[id]:Math.min(100,p.servings+(p.buffer||0))};const plan=game.recipePlan(recipeTargets,cart,supplier,express);if(plan)addToCart(plan.lines);tab='supply';}
    closeDialog();drawTab();toast('Plan saved; restock before opening.');
  }
  function engineerReview() {
    const q=game.reviewOptions();if(!q)return;
    const done=game.lesson.review;
    dialog('engineer-review',done?'Reflection complete':'Your shift, your engineering connection',`<p class="cr-note">${esc(q.topic)} · One short reflection</p><p>${esc(q.prompt)}</p>${done?`<div class="cr-insight"><b>Correct.</b><span>${esc(q.explanation)}</span></div>`:`<div class="cr-event-choices">${q.options.map(([id,text])=>btn('answer-reflection',esc(text),'',`data-answer="${id}"`)).join('')}</div>`}<p class="cr-note">Answers and retries are saved; mistakes cost no money or Customer Rating.</p>`,done?btn(game.day===CONFIG.days?'ending':'next-day',game.day===CONFIG.days?'See the café’s future →':'Next morning →','cr-primary'):btn('report','Back to results'));
  }
  function render() {
    lastXP=game.xp;
    document.body.classList.add('inventory-playing');
    app.innerHTML=`<main class="cr-game" data-level="${game.visualLevel}">
      <header class="cr-header"><div class="cr-brand">rISE Café<small>INVENTORY MANAGER</small></div><div class="cr-week" aria-label="Five day campaign">${DAYS.map((d,i)=>`<span data-day="${i+1}" title="${d.title}">${i+1}</span>`).join('')}</div>
      <button data-action="money" class="cr-bank" id="cr-bank"></button><div class="cr-reputation" id="cr-reputation"></div>${btn('help','?','cr-icon','aria-label="How to play"')}${btn('exit','Exit')}</header>
      <div class="cr-guide" id="cr-guide" aria-live="polite"></div>
      <div class="cr-work"><nav class="cr-nav" aria-label="Inventory Manager sections">
        ${[['stock','shelf','Stockroom'],['supply','truck','Suppliers'],['menu','menu','Menu'],['trends','trend','Sales & trends']].map(([id,icon,label])=>btn('tab',`<span>${uiIcon(icon)}</span>${label}`,'',`data-tab="${id}"`)).join('')}
        <div class="cr-nav-bottom"><div class="cr-team">${uiIcon("shop")}<b>Your five-day comeback</b></div>${btn('operations-plan','Required operations plan')}${btn('brief','Today’s mission')}${btn('upgrades',' Improve café')}<small id="cr-xp"></small></div>
      </nav><section class="cr-workspace" id="cr-workspace" aria-label="Game workspace"></section></div>
      <section class="cr-live"><div id="cr-feedback"></div><button data-action="deliveries" id="cr-dock"></button><div id="cr-live-stats"></div></section>
      <section class="cr-planning" id="cr-planning" aria-label="Preparation countdown">
        <div class="cr-planning-clock"><span id="cr-planning-label">Planning time remaining</span><b id="cr-planning-time" role="timer" aria-labelledby="cr-planning-label">1:30</b><span id="cr-planning-paused"></span></div>
        <p id="cr-planning-note" role="status"></p>
      </section>
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
    stock:['Select Stockroom.','Check shelf quantities before buying.','.cr-nav [data-tab="stock"]'],
    inspect:['Select Whole Milk.','Check quantity and freshness; EXPIRED stock cannot be served.','[data-action="inspect"][data-product="Whole Milk"]'],
    clean:['Select an EXPIRED product.','Discard expired stock before opening; discarding usable stock creates waste.','.cr-stock-item.expired'],
    missing:['Select Cup on the Supplies shelf.','OUT OF STOCK: no cups are usable, so lattes cannot sell.','[data-action="inspect"][data-product="Cup"]'],
    menu:['Select Menu.','“Can be made now” counts complete recipes, not individual ingredients.','.cr-nav [data-tab="menu"]'],
    recipe:['Select Recipe on Vanilla Latte.','Plan five servings for this example; the target does not predict sales.','[data-action="recipe"][data-id="latte"]'],
    cart:['Select Add All Ingredients to Cart.','Need is the target; only quantities missing from stock, usable deliveries today and your cart are added, without spending money.','[data-action="recipe-cart"]'],
    suppliers:['Select Suppliers.','Choose a supplier for your cart.','.cr-nav [data-tab="supply"]'],
    compare:['Select a supplier to inspect its offer.','Cards change the whole cart’s supplier: Budget standard arrives tomorrow; QuickShip and Neighborhood Supply arrive today.','[data-action="supplier"]'],
    plan:['Select Required operations plan.','Save your supplier and serving target; Apply my plan adds missing supplies without purchasing them.','[data-action="operations-plan"]'],
    review:['Select Review & place order.','Check stock + delivery costs; keep $14 of your available money for opening.','[data-action="review-cart"]'],
    order:['Select Place order.','Pay the total now; supplies become usable after delivery and storage.','[data-action="place-order"]'],
    delivery:['Select Delivery dock.','Deliveries travel during preparation; the dock skips waiting for today’s delivery, while pop-ups pause time.','#cr-dock'],
    restock:['Complete a drink recipe before opening.','Use Show next action to resolve missing stock, an off-menu drink or a tomorrow-only delivery.','[data-action="recipe"][data-id="latte"]'],
    trends:['Select Sales & trends.','Use requests and lost sales to plan restocking; history starts with your first shift.','.cr-nav [data-tab="trends"]'],
    ready:['Select Finish tutorial.','Open café → starts 75 seconds of automatic service at 1×; watch stock and events, then complete the results reflection before Next morning.','[data-action="finish-tour"]']
  };
  function tourIntro() { closeDialog(false);showTourAction(); }
  function tourHint() {
    const step=game.tutorialStep();if(!step)return null;
    let [action,why,selector]=tourSteps[step];
    if(dialogState?.key==='inspect') {
      action=game.spoiled(inspected)?'Select Move expired stock to bin.':'Select Done.';
      selector=game.spoiled(inspected)?'[data-action="trash-selected"]':'[data-action="close"]';
      why=game.spoiled(inspected)?'Only expired stock is removed, freeing shelf space.':'Ready to use is usable stock; On the way has not reached the shelf.';
    } else if(step==='compare') {
      const next=SUPPLIERS.find(s=>!game.tutorial.compared.includes(s.id));
      action=`Select ${next.name}.`;selector=`[data-action="supplier"][data-supplier="${next.id}"]`;
    } else if(step==='plan'&&supplier==='budget'&&dialogState?.key!=='operations-plan') {
      action='Select QuickShip Co-op.';selector='[data-action="supplier"][data-supplier="quick"]';why='QuickShip arrives today; Budget standard arrives tomorrow.';
    } else if(dialogState?.key==='operations-plan') {
      const next=SUPPLIERS.find(s=>!game.lesson.compared.includes(s.id));
      if(game.lesson.compared.length<2){action=`Inspect ${next.name}.`;selector=`[data-action="plan-compare"][data-supplier="${next.id}"]`;}
      else {action='Select Apply my plan.';selector='[data-action="save-plan"]';}
      why='Use QuickShip Co-op and five Vanilla Latte servings; no purchase yet.';
    } else if(dialogState?.key==='checkout') {
      action='Select Place order.';selector='[data-action="place-order"]';why=tourSteps.order[1];
    } else if(dialogState?.key==='dock') {
      const today=game.deliveries.some(d=>!d.cancelled&&!d.arrived&&d.dueDay<=game.day);
      action=today?'Select Receive today’s delivery.':'Select Back to café.';selector=today?'[data-action="advance"]':'[data-action="close"]';
      why=today?'Advance to the next delivery without opening the café.':'Order same-day supplies to open today.';
    } else if(dialogState?.key==='delivery') {
      action='Select '+(game.deliveries.find(d=>d.arrived&&!d.shelved)?.lines.length?'Unpack Delivery.':'Close & reorder.');selector='[data-action="unpack"]';why='Missing goods are refunded; shipping is not.';
    } else if(dialogState?.key==='unpack') {
      const group=unpacking.groups.find(g=>!unpacking.done.includes(g));
      action=`Select ${group==='cold'?'Cold storage':'Dry shelf'}.`;selector=`[data-storage="${group}"]`;why='Tap the matching storage area or drag the bundle there.';
    } else if(dialogState?.key==='fifo') {
      action='Select Older usable stock in front.';selector='[data-action="fifo-old"]';why='Use older stock first; after this lesson, later problem-free deliveries are stored automatically.';
    } else if(dialogState?.key==='recipe') {
      action='Select Add All Ingredients to Cart.';selector='[data-action="recipe-cart"]';why=tourSteps.cart[1];
    }
    return {step,action,why,selector};
  }
  function guide() {
    const h=tourHint();if(!h)return '';
    const steps=Object.keys(tourSteps).filter(k=>k!=='restock'),index=steps.indexOf(h.step)+1;
    return `<div class="cr-guide-face">${uiIcon('menu')}</div><div><small>${h.step==='restock'?'CHECK BEFORE OPENING':`GUIDED PREPARATION · ${index} / ${steps.length}`}</small><b>${esc(h.action)}</b><p class="cr-guide-description">${esc(h.why)}</p></div><div class="cr-guide-actions">${h.step==='ready'?btn('finish-tour','Finish tutorial','cr-primary'):h.step==='plan'&&supplier!=='budget'?btn('operations-plan','Required operations plan'):btn('tour-locate','Show next action')}${btn('skip-guide','Skip tutorial','cr-text')}</div>`;
  }
  function highlightTour() {
    document.querySelectorAll('.cr-tour-target').forEach(n=>{n.classList.remove('cr-tour-target');n.removeAttribute('aria-describedby');});
    const h=tourHint();if(!h)return;
    const root=dialogState?$('#cr-modal'):document;
    if($('#cr-dialog-guide'))$('#cr-dialog-guide').textContent=h.action+' '+h.why;
    root?.querySelectorAll(h.selector).forEach(n=>{n.classList.add('cr-tour-target');n.setAttribute('aria-describedby',dialogState?'cr-dialog-guide':'cr-guide');});
    $('#cr-play').disabled=true;
  }
  function showTourAction() {
    const step=game.tutorialStep();if(!step)return;
    if(dialogState){closeDialog(false);}
    if(['stock','inspect','clean','missing'].includes(step))tab='stock';
    else if(['menu','recipe','cart'].includes(step)){tab='menu';menuSection='drinks';menuPage=0;}
    else if(step==='trends'||step==='ready')tab='trends';
    else tab='supply';
    drawTab();
    if(step==='cart')recipeDialog('latte');
    else if(step==='plan'&&supplier!=='budget')operationsPlan();
    else if(step==='order')checkout();
    else if(step==='delivery')deliveries();
    else if(step==='restock') {
      if(!game.menu.latte.enabled){tab='menu';menuSection='drinks';menuPage=0;drawTab();toast('Select Add to menu on Vanilla Latte.');return;}
      if(cart.length){tab='supply';drawTab();checkout();return;}
      supplier=game.lesson.plan?.supplier||'quick';express=supplier==='budget';recipeDialog('latte');
    }
    const target=(dialogState?$('#cr-modal'):document).querySelector(tourHint().selector);
    target?.scrollIntoView({block:'nearest'});target?.focus({preventScroll:true});
  }
  const replaySteps=[
    ['Your goal','Stock complete recipes over five days; staff serve automatically. Your ending depends on recovery balance, Customer Rating and customers served.'],
    ['Check Stockroom','Select a product to check stock and deliveries. OUT OF STOCK means none are usable; remove expired goods with Move expired stock to bin.'],
    ['Plan one drink','In Menu → Recipe on Vanilla Latte, plan five servings. Add All Ingredients to Cart adds only what stock, usable deliveries today and the cart do not cover, without spending money.'],
    ['Choose delivery and save your plan','In Suppliers, compare two offers; cards reprice the whole cart. QuickShip and Neighborhood Supply arrive today; Budget standard arrives tomorrow. Save Required operations plan; Apply my plan adds missing quantities without buying them.'],
    ['Pay for the order','Review & place order shows quantities and costs; Place order pays. Available money includes credit; reserve $14 to open ($9 with Efficient equipment).'],
    ['Receive and store','Deliveries travel during preparation and shifts; pop-ups pause time. Receive today’s delivery skips waiting. Use Unpack Delivery, the indicated storage, then Older usable stock in front; later problem-free deliveries are stored automatically.'],
    ['Open, watch, improve','Complete the plan and stock an enabled drink, then Open café →. Staff serve for 75 seconds at 1×; 2× and 3× run faster. Pause or restock as needed. Review results and complete the reflection before Next morning; freshness falls overnight.']
  ];
  function replayTutorial(index=0) {
    const [title,text]=replaySteps[index];
    dialog('tutorial-replay',title,`<p class="cr-note">TUTORIAL REPLAY · ${index+1} / ${replaySteps.length} · Read-only; progress kept.</p><p>${esc(text)}</p>`,btn('replay-page','Back','',`data-page="${index-1}" ${index===0?'disabled':''}`)+(index<replaySteps.length-1?btn('replay-page','Next','cr-primary',`data-page="${index+1}"`):btn('close','Finish replay','cr-primary'))+btn('close','Close replay','cr-text'));
  }
  function drawTab() {
    if(!game||!$('#cr-workspace'))return;
    if(game.strategy==='outsource'){frozen=false;cart=cart.filter(l=>!(l.frozen&&item(l.name).group==='bakery'));}
    $('.cr-game').dataset.level=game.visualLevel;
    document.querySelectorAll('.cr-nav [data-tab]').forEach(b=>b.setAttribute('aria-current',b.dataset.tab===tab?'page':'false'));
    patch('#cr-guide',guide());$('#cr-guide').hidden=!guide();
    const previousStock=new Map([...document.querySelectorAll('.cr-stock-item[data-stock-count]')].map(n=>[n.dataset.product,Number(n.dataset.stockCount)]));
    const html=tab==='stock'?stockroom():tab==='supply'?supplies():tab==='menu'?menuView():trends();
    patch('#cr-workspace',html);
    document.querySelectorAll('.cr-stock-item[data-stock-count]').forEach(n=>{
      const before=previousStock.get(n.dataset.product),after=Number(n.dataset.stockCount);
      if(before!==undefined&&before!==after)n.classList.add(after>before?'cr-stock-increased':'cr-stock-decreased');
    });
    highlightTour();
  }
  function stockroom() {
    const expiring=game.expiringItems();
    const groups=Object.keys(INVENTORY_GROUPS),rows=[];
    for(let n=0;n<groups.length;n+=2)rows.push(groups.slice(n,n+2));
    const shelf=group=>{
      const products=INVENTORY_ITEMS.filter(i=>i.group===group);
      return `<section class="cr-shelf-group" data-shelf="${group}" style="--slots:${products.length}" aria-labelledby="cr-shelf-${group}"><h2 id="cr-shelf-${group}">${labels[group]}</h2><div class="cr-shelf-items">${products.map(i=>{
        const fresh=game.stock(i.name),expired=game.spoiled(i.name),ice=game.frozen(i.name),low=fresh<=Math.max(game.reorderPoint,Math.ceil(game.rate(i.name)*12));
        const soon=expiring.find(e=>e.name===i.name),incoming=game.incoming(i.name),status=expired?'expired':fresh===0?'empty':fresh===1?'critical':low?'low':'healthy';
        const tag=expired?`${expired} EXPIRED`:fresh?`${fresh}${fresh===1?' · CRITICAL':low?' · LOW':' ready'}`:ice?`${ice} frozen`:'OUT OF STOCK';
        const note=soon?`${soon.qty} expire in 1 day`:expired&&fresh?`${fresh} ready`:incoming?`${incoming} on the way`:fresh&&ice?`${ice} frozen`:'';
        return `<button type="button" id="cr-stock-${INVENTORY_ITEMS.indexOf(i)}" class="cr-stock-item ${status} ${soon?'expiring-soon':''}" data-action="inspect" data-product="${esc(i.name)}" data-stock-count="${fresh+ice+expired}" draggable="true" aria-label="${esc(i.name)}. ${fresh} ready to use, ${ice} frozen, ${expired} expired. ${esc(tag)}.${note?' '+esc(note)+'.':''}"><span class="cr-product-art">${shelfArt(i)}</span><b>${esc(i.name)}</b><span class="cr-stock-tag">${tag}</span><small class="cr-shelf-note ${soon?'cr-expiry-tag':''}">${note}</small></button>`;
      }).join('')}</div></section>`;
    };
    return `<div class="cr-work-title cr-stock-heading"><div><h1>Your stockroom</h1><span>${INVENTORY_ITEMS.length} items · select to inspect or reorder</span></div><div class="cr-stock-tools"><span class="cr-health">${game.health}% stock health</span>${btn('bin',uiIcon('bin')+'<small>Expired goods bin</small>','cr-bin','title="Drag expired stock here, or select an item to discard."')}</div></div>
      <div class="cr-stock-scene cr-unified-stock"><div class="cr-stock-main"><div class="cr-shelf-wall">${rows.map(row=>`<div class="cr-shelf-row" style="--shelf-columns:${row.map(group=>`${INVENTORY_ITEMS.filter(i=>i.group===group).length}fr`).join(' ')}">${row.map(shelf).join('')}</div>`).join('')}</div>
      </div>${serviceWindow()}</div>`;
  }
  function inspect(name) {
    selected=name;inspected=name;if(name==='Whole Milk'&&game.tutorial.stockOpened)game.tutorial.inspected=true;if(name==='Cup'&&!game.expiredCount())game.tutorial.missing=true;
    const i=item(name),lots=game.lots[name],expired=game.spoiled(name);
    dialog('inspect',`${productArt(i.name)} ${esc(name)}`,`<div class="cr-stat-row"><span>Ready to use<b>${game.stock(name)}</b></span><span>Expired items<b>${expired}</b></span><span>On the way<b>${game.incoming(name)}</b></span></div>
      <div class="cr-lots">${lots.length?lots.map(l=>`<div class="${l.expires<=game.day?'expired':''}"><span>${productArt(i.name)}</span><div><b>${l.qty} ${l.frozen?'frozen':'units'}</b><small>${l.expires<=game.day?'EXPIRED — cannot be served':i.group==='supplies'?'Shelf-stable · no food expiry':freshness(l)}</small></div>${btn('discard-lot',uiIcon('bin'),'',`data-name="${esc(name)}" data-lot="${l.id}" aria-label="Discard ${l.qty} ${esc(name)}${l.expires<=game.day?' expired':' usable'} units"`)}</div>`).join(''):'<p>Empty shelf: check Menu before ordering.</p>'}</div><p class="cr-note">Expired stock cannot sell; discarding usable stock adds waste.</p>`,
      (expired?btn('trash-selected','Move expired stock to bin','cr-primary'):btn('order-selected','Order this product','cr-primary'))+btn('rotate','Older stock to front')+btn('close','Done'));
    save();
  }
  function trashProduct(name) {
    if(!item(name))return;
    const count=game.discard(name);
    if(count)toast(` ${count} expired ${name} cleared.`);
    else toast('No expired stock on this shelf.',false);
    drawTab();updateHUD();save();
  }
  function supplierCards() {
    return SUPPLIERS.filter(s=>s.unlock<=game.day).map(s=>{
      const offer=game.offer(selected,s.id,qty,frozen,express);
      return `<button class="cr-supplier ${supplier===s.id?'selected':''}" data-action="supplier" data-supplier="${s.id}" style="--company:${s.color}" aria-pressed="${supplier===s.id}">
        <span class="cr-company-icon">${uiIcon(s.icon)}</span><b>${s.name}</b><strong>${money(offer.unit)}<small> / unit</small></strong>
        <div class="cr-supplier-facts"><span> ${arrivalText(offer)}</span><span> ${(offer.reliability*100).toFixed(offer.reliability<1&&offer.reliability>.99?1:0)}% reliable</span><span>${s.quality>=.99?'Excellent':s.quality>.9?'High':s.quality>=.85?'Good':'Basic'} quality</span><span>◷ ${game.strategy==='outsource'&&item(selected).group==='bakery'?'Bakery-managed freshness':item(selected).group==='supplies'?'Shelf-stable':`${offer.life} days shelf life`}</span></div>
        <small>${Math.round(s.discount*100)}% off at ${s.bulk}+ units${offer.bulk?' · APPLIED':''}</small></button>`;
    }).join('');
  }
  function supplies() {
    if(!item(selected))selected='Whole Milk';
    const i=item(selected),quote=game.quote(cart),pending=game.incoming(selected);
    const comparison=cartComparison&&cartComparison.day===game.day&&cartComparison.signature===JSON.stringify(cart)&&quote?.total===cartComparison.after.total?cartComparison:null;
    const comparisonHtml=comparison?`<p class="cr-cart-comparison" role="status">Supplier change: ${money(comparison.before.total)} → ${money(comparison.after.total)}<b>${comparison.difference<-.005?`Save ${money(-comparison.difference)}`:comparison.difference>.005?`${money(comparison.difference)} more`:'Same total price'}</b></p>`:'';
    return `<div class="cr-work-title"><div><span class="cr-kicker">BUY WHAT YOUR MENU NEEDS</span><h1>Order supplies</h1></div><span class="cr-health" id="cr-spendable">${money(game.spendable)} available</span></div>
      <div class="cr-order-layout"><div class="cr-shopping"><div class="cr-draft">${btn('recipe-picker','Plan a menu item')}${assistantButton()}${btn('draft-small','Small batch · 8 drinks')}${btn('draft-buffer','Buffer · 12 drinks')}</div>
      <label class="cr-select">Product<select id="cr-product">${Object.entries(INVENTORY_GROUPS).map(([group,names])=>`<optgroup label="${labels[group]}">${names.map(n=>`<option ${n===selected?'selected':''}>${esc(n)}</option>`).join('')}</optgroup>`).join('')}</select></label>
      <div class="cr-shopping-meta"><span id="cr-shopping-stock">${productArt(i.name)} ${game.stock(selected)} fresh · ${pending} incoming</span><span id="cr-spaces">${game.capacity(selected)-game.occupied(selected)-pending} shelf spaces</span></div>
      <div class="cr-suppliers">${supplierCards()}</div>
      <div class="cr-pack-row">${i.group==='bakery'?(game.strategy==='outsource'?'<span>Ready to sell · bakery handles baking and freshness</span>':btn('pack','Ready-made','',`data-frozen="false" aria-pressed="${!frozen}"`)+btn('pack','Frozen · bake first','',`data-frozen="true" aria-pressed="${frozen}"`)):'<span>Coffee first. Bakery can stay small.</span>'}<label><input type="checkbox" id="cr-express" ${express?'checked':''}> Express shipping (+fee)</label></div>
      <div class="cr-add-row">${btn('qty-down','−','',`aria-label="Decrease quantity"`)}<label>Quantity<input id="cr-qty" type="number" min="1" max="100" value="${qty}" inputmode="numeric"></label>${btn('qty-up','+','',`aria-label="Increase quantity"`)}${btn('add-cart','Add to cart','cr-primary')}</div>
      <p class="cr-work-note">Select a supplier to reprice the whole cart; quantities and shipping choices stay unchanged.</p></div>
      <aside class="cr-cart"><div class="cr-cart-title"><h2>Your cart</h2>${btn('clear-cart','Clear','cr-text')}</div><div class="cr-cart-lines">${cart.length?cart.map((l,index)=>`<div><span>${productArt(l.name)}</span><div><b>${esc(l.name)}${l.frozen?' · frozen':''}</b><small>${SUPPLIERS.find(s=>s.id===l.supplier).name} ${l.express?'Express':'Standard'}</small></div>${btn('edit-line',`×${l.qty}`,'cr-cart-edit',`data-index="${index}" aria-label="Edit ${esc(l.name)} quantity and supplier"`)}${btn('remove-line','×','cr-text',`data-index="${index}" aria-label="Remove ${esc(l.name)} from cart"`)}</div>`).join(''):'<div class="cr-empty-cart"><b>Your cart is empty</b><p>Add products or draft a cart for your menu.</p></div>'}</div>
      <div class="cr-cart-total">${comparisonHtml}${quote?`<span>Stock <b>${money(quote.goods)}</b></span><span>Delivery <b>${money(quote.shipping)}</b></span><strong>Total <b>${money(quote.total)}</b></strong>`:'<strong>Total <b>$0.00</b></strong>'}${btn('review-cart','Review & place order →','cr-primary',cart.length?'':'disabled')}</div></aside></div>`;
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
    dialog('checkout','Ready to place the order?',`<div class="cr-review-cart">${cart.map(l=>`<span><span>${productArt(l.name)} ${esc(l.name)}${l.frozen?' (frozen)':''}<small>${SUPPLIERS.find(s=>s.id===l.supplier).name} · ${l.express?'express':'standard'}</small></span><b>×${l.qty}</b></span>`).join('')}</div>${cart.some(l=>game.offer(l.name,l.supplier,l.qty,l.frozen,l.express).dayOffset)?'<p class="cr-note"><b>Budget standard goods arrive tomorrow.</b> Choose QuickShip or express shipping for supplies needed to open today.</p>':''}<div class="cr-stat-row"><span>Inventory<b>${money(q.goods)}</b></span><span>Shipping<b>${money(q.shipping)}</b></span><span>Total<b>${money(q.total)}</b></span></div><p class="cr-note">${money(game.spendable)} available now. ${money(game.spendable-q.total)} after this order. Keep money for operating costs.</p>`,btn('place-order','Place order','cr-primary')+btn('close','Edit cart'));
  }

  function deliveries() {
    const arrived=game.deliveries.find(d=>d.arrived&&!d.shelved);
    if(arrived) {
      if(!arrived.lines.length) {
        dialog('delivery','Your order could not be filled',`<div class="cr-delivery-art">${uiIcon('truck')}</div><p><b>${esc(arrived.name)}</b></p><p>${esc(arrived.problem||'No goods arrived.')}</p><p class="cr-note">Goods refunded; shipping is not refundable. Reorder with another supplier or express shipping.</p>`,btn('unpack','Close & reorder','cr-primary',`data-delivery="${arrived.id}"`));
        return;
      }
      const contents=arrived.lines.map(l=>`${l.qty} ${l.name}`).join(', ');
      dialog('delivery','Delivery arrived',`<div class="cr-delivery-art">${uiIcon('truck')}<span>${uiIcon('box')}</span></div><p><b>${esc(arrived.name)}</b></p><p class="cr-note">Delivered: ${esc(contents)}.</p>${arrived.problem||arrived.delayed?`<p class="cr-error">${arrived.problem?esc(arrived.problem):'This delivery arrived '+Math.ceil(arrived.eta-arrived.expected)+' seconds late.'} ${arrived.problem?'Missing goods were refunded. ':''}Unpack or return the remaining goods for a refund.</p>`:''}<div class="cr-review-cart">${arrived.lines.map(l=>`<span><span class="cr-line-art">${productArt(l.name)}</span><span>${esc(l.name)}<small>${freshness(l)}</small></span><b>+${l.qty}</b></span>`).join('')}</div>`,btn('unpack','Unpack Delivery','cr-primary',`data-delivery="${arrived.id}"`)+((arrived.problem||arrived.delayed)&&!arrived.resolved?btn('delivery-refund','Return remaining goods','',`data-delivery="${arrived.id}"`):''));
      return;
    }
    const pending=game.deliveries.filter(d=>!d.arrived&&!d.cancelled);
    dialog('dock','Delivery dock',pending.length?`<div class="cr-delivery-list">${pending.map(d=>`<div>${uiIcon('truck')}<b>${esc(d.name)}</b><span>${d.delayNotified?'Late: extra '+Math.ceil(d.eta-d.expected)+'s':arrivalText(d)}</span>${(d.delayNotified||d.dueDay>game.day)&&!d.resolved?btn('delivery-wait','Keep order','',`data-delivery="${d.id}"`)+btn('delivery-refund','Refund goods','',`data-delivery="${d.id}"`):''}</div>`).join('')}</div><p class="cr-note">${pending.some(d=>d.delayNotified)?'Keep the late order or refund goods and reorder; delivery fees are not refundable.':'Receive today’s orders during preparation; Budget standard arrives tomorrow.'}</p>`:`<div class="cr-empty-cart">${uiIcon('box')}<p>No supplies in transit.</p></div>`,
      (game.phase==='planning'&&pending.some(d=>d.dueDay<=game.day)?btn('advance','Receive today’s delivery','cr-primary'):'')+btn('close','Back to café'));
  }
  function unpackDelivery(id) {
    const d=game.deliveries.find(d=>d.id===id&&d.arrived&&!d.shelved);if(!d)return;
    if(!d.lines.length){game.shelve(id,false);tab='supply';closeDialog();toast('Goods refunded; you can reorder.');return;}
    const groups=[...new Set(d.lines.map(l=>(['milk','bakery'].includes(item(l.name).group)||['Whipped Cream','Cold Foam'].includes(l.name))?'cold':'dry'))];
    unpacking={id,done:[],groups};drawUnpack();
  }
  function drawUnpack() {
    const d=game.deliveries.find(d=>d.id===unpacking?.id);if(!d)return;
    const group=unpacking.groups.find(g=>!unpacking.done.includes(g));
    const samples=d.lines.filter(l=>((['milk','bakery'].includes(item(l.name).group)||['Whipped Cream','Cold Foam'].includes(l.name))?'cold':'dry')===group).slice(0,3);
    dialog('unpack','Unpack & rotate',`<p>Place this bundle in ${group==='cold'?'cold storage':'the dry shelf'}. Older stock will stay at the front.</p><div class="cr-unpack-bundle" draggable="true" data-bundle="${group}">${samples.map(l=>`<span>${productArt(l.name)}<b>${l.name}</b><small>+${l.qty}</small></span>`).join('')}</div><div class="cr-storage-targets">${['dry','cold'].map(g=>btn('store-bundle',uiIcon(g==='cold'?'fridge':'shelf')+`<b>${g==='cold'?'Cold storage':'Dry shelf'}</b>`,'',`data-storage="${g}"`)).join('')}</div><p class="cr-note">Tap the matching storage area or drag the bundle there.</p>`,'');
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
      else dialog('fifo','Which stock goes in front?',`<p>Put older usable stock in front to reduce waste.</p>`,btn('fifo-old','Older usable stock in front','cr-primary',`data-delivery="${id}"`)+btn('fifo-new','New delivery in front','',`data-delivery="${id}"`));
    } else drawUnpack();
  }
  function finishDelivery(id) {
    if(game.shelve(id,true)){tab='stock';closeDialog();drawTab();toast('Stock stored; older stock is used first (FIFO).');checkEvents();}
  }
  function menuView() {
    const unlocked=MENU.filter(p=>p.day<=game.day&&p.kind===(menuSection==='drinks'?'drink':'bakery'));
    const pages=Math.ceil(unlocked.length/4);menuPage=Math.min(menuPage,Math.max(0,pages-1));
    const shown=unlocked.slice(menuPage*4,menuPage*4+4);
    return `<div class="cr-work-title"><div><span class="cr-kicker">CHOOSE YOUR MENU</span><h1>Menu & bakery</h1></div>${btn('strategy',' Bakery strategy','',`id="cr-strategy"`)}</div>
      <div class="cr-menu-toolbar"><div>${btn('menu-section','Drinks','',`data-section="drinks" aria-pressed="${menuSection==='drinks'}"`)}${btn('menu-section','Bakery','',`data-section="bakery" aria-pressed="${menuSection==='bakery'}"`)}</div><span>${game.day<4?'Price lab unlocks on Day 4':'Price lab open'}</span>${game.day>=3?btn('helper',game.helper?' Helper hired':'Hire shift helper · $22','',game.helper||game.phase!=='planning'?'disabled':''):''}</div>
      <div class="cr-menu-cards">${shown.map(p=>{
        const cost=game.unitCost(p.id),price=game.menu[p.id].price;
        return `<article class="cr-menu-card ${game.menu[p.id].enabled?'':'off'}"><div class="cr-drink-art">${drinkArt(p)}</div><div class="cr-menu-name"><h2>${p.name}</h2><span>${game.servings(p.id)} can be made now</span></div>
          <div class="cr-menu-cost"><span>Unit cost<b>${money(cost)}</b></span><span>Margin / sale<b>${money(price-cost)}</b></span></div>
          <div class="cr-price">${btn('price-down','−','',`data-id="${p.id}" aria-label="Lower ${p.name} price" ${game.day<4?'disabled':''}`)}<strong>${money(price)}</strong>${btn('price-up','+','',`data-id="${p.id}" aria-label="Raise ${p.name} price" ${game.day<4?'disabled':''}`)}</div>
          <small>${price>p.price*1.15?'↓ Higher price may deter customers':price<p.price?'↑ Value price · smaller margin':'→ Familiar price'}</small>
          <div class="cr-menu-actions">${btn('toggle-menu',game.menu[p.id].enabled?' On menu':'Add to menu','',`data-id="${p.id}" aria-pressed="${game.menu[p.id].enabled}"`)}${btn('recipe','Recipe','cr-text',`data-id="${p.id}"`)}</div>
          ${p.kind==='bakery'?`<div class="cr-bake-actions"><span>${game.strategy==='outsource'?`${game.stock(p.name)} ready · bakery manages freshness`:`${game.frozen(p.name)} frozen · ${game.stock(p.name)} ready`}</span>${game.strategy==='outsource'?'':btn('bake','Bake 4','',`data-name="${p.name}"`)}${btn('buy-bakery','Buy stock','',`data-name="${p.name}"`)}</div>`:''}</article>`;
      }).join('')}</div><div class="cr-menu-bottom"><span>${menuSection==='bakery'?`${game.strategy==='inhouse'?'In-house':game.strategy==='outsource'?'Outsource':'Hybrid'} · ${game.batches.length?game.batches.map(b=>`${b.name} ready in ${time(b.ready-game.clock)}`).join(' · '):(game.strategy==='outsource'?'Bakery handles production and freshness':'Oven idle')}`:`${MENU.filter(p=>p.day>game.day).length} more products unlock during the week`}</span>${pages>1?btn('menu-prev','←','',menuPage===0?'disabled':'')+`<b>${menuPage+1}/${pages}</b>`+btn('menu-next','→','',menuPage===pages-1?'disabled':''):''}${game.strategy!=='outsource'&&game.phase==='planning'&&game.batches.length?btn('advance','Finish batch '):''}</div>`;
  }
  function strategyDialog() {
    dialog('strategy','Bake here, buy in, or both?',`<p>Baking adds labor and energy costs and shares staff time with drinks.</p>
      <div class="cr-strategies">${[
        ['inhouse','','In-house',`Lower purchase cost. Bake four at a time; pay ${money(CONFIG.bakeConversion)} per batch for labor and energy.`,'Frozen stock only'],
        ['outsource','','Local bakery','Ready-made with managed freshness; costs more and still needs delivery.','No baking or expiry work'],
        ['hybrid','','Hybrid','Manage both fresh and frozen stock within storage limits.','Both packs available']
      ].map(([id,icon,title,text,note])=>btn('choose-strategy',`<span>${uiIcon(id==='inhouse'?'oven':id==='outsource'?'truck':'box')}</span><b>${title}</b><p>${text}</p><small>${note}</small>`,'',`data-strategy="${id}" aria-pressed="${game.strategy===id}"`)).join('')}</div><p class="cr-note">You can change strategy later; usable stock is retained or refunded. ${game.upgrades.includes('energy')?`Efficient equipment lowers each batch to ${money(CONFIG.bakeConversion-.8)}.`:''}</p>`,btn('close','Back to café'));
  }
  function recipePicker() {
    dialog('recipe-picker','What would you like to stock?',`<div class="cr-recipe-picker">${MENU.filter(p=>p.day<=game.day).map(p=>btn('recipe',`${drinkArt(p)}<b>${p.name}</b>`,'',`data-id="${p.id}"`)).join('')}</div><p class="cr-note">Choose an item to plan its supplies.</p>`,btn('close','Back'));
  }
  function recipeDialog(id,servings=recipeTargets[id]||5) {
    const p=MENU.find(p=>p.id===id&&p.day<=game.day);if(!p)return;
    recipeItem=id;
    if(id==='latte'&&game.tutorial.menuSeen)game.tutorial.recipeSeen=true;
    const targets={...recipeTargets,[id]:servings},plan=game.recipePlan(targets,cart,supplier,express);
    if(!plan)return;
    const others=Object.entries(targets).filter(([key])=>key!==id).map(([key,n])=>`${n} ${MENU.find(p=>p.id===key).name}`);
    dialog('recipe',p.name,`<div class="cr-serving-plan"><label for="cr-servings">${p.name} serving target</label><div>${[5,10,15].map(n=>btn('serving-preset',String(n),'',`data-servings="${n}" aria-pressed="${n===servings}"`)).join('')}<label>Custom <input id="cr-servings" type="number" min="1" max="100" step="1" value="${servings}" inputmode="numeric"></label></div></div>
      <div class="cr-plan-rows">${p.recipe.map(name=>{const r=plan.rows.find(r=>r.name===name);return `<div>${productArt(name)}<span><b>${esc(name)}</b><small>Need&nbsp;${r.required} · stock&nbsp;${r.stock} · incoming&nbsp;${r.incoming}${r.baking||r.frozenCoverage?` · bake&nbsp;${r.baking+r.frozenCoverage}`:''} · cart&nbsp;${r.inCart}</small></span><strong class="${r.unfilled?'cr-error':''}">${r.qty?`+${r.qty}`:'Covered'}${r.unfilled?`<small>${r.unfilled} won't fit</small>`:''}</strong></div>`;}).join('')}</div>
      <p class="cr-note">${others.length?`Also planned: ${esc(others.join(', '))}. Shared ingredients are combined. `:''}Only missing supplies are added, counting usable deliveries today; frozen pastries need baking. Targets do not predict sales.</p>
      <p class="cr-plan-company">New items: ${esc(SUPPLIERS.find(s=>s.id===supplier).name)} · ${express?'express':'standard'}. Existing cart items keep their supplier. ${plan.blocked|| (plan.unfilled?'Reduce servings or free shelf space.':'')}</p>`,
      btn('recipe-cart','Add All Ingredients to Cart','cr-primary',plan.blocked?'disabled':'')+btn('close','Back'));
  }
  function editCartLine(index) {
    const l=cart[index];if(!l)return;
    dialog('cart-edit',`${productArt(l.name)} ${esc(l.name)}`,`<div class="cr-cart-form"><label>Quantity<input id="cr-line-qty" type="number" min="1" max="200" step="1" value="${l.qty}"></label><label>Supplier<select id="cr-line-supplier">${SUPPLIERS.filter(s=>s.unlock<=game.day).map(s=>`<option value="${s.id}" ${s.id===l.supplier?'selected':''}>${s.name}</option>`).join('')}</select></label><label><input type="checkbox" id="cr-line-express" ${l.express?'checked':''}> Express shipping (+fee)</label></div><p class="cr-note">Update cart changes the total; only Place order spends money.</p>`,btn('save-line','Update cart','cr-primary',`data-index="${index}"`)+btn('close','Cancel'));
  }
  const assistantCost=()=>UPGRADES.find(u=>u.id==='tracker').cost;
  const assistantButton=()=>btn(game.upgrades.includes('tracker')?'bulk-restock':'assistant-offer',game.upgrades.includes('tracker')?'Restock empty supplies now':`Unlock urgent restock · ${money(assistantCost())}`);
  function assistantOffer() {
    if(game.upgrades.includes('tracker')){bulkRestock();return;}
    dialog('assistant-offer','Stockroom Assistant',`<div class="cr-character"><span>${uiIcon('trend')}</span><p><b>${money(assistantCost())} once · stays unlocked all five days</b>Restock empty menu supplies with the fastest express service.</p></div><p>Goods and express fees cost extra: confirm the first purchase; later clicks buy automatically within money and storage limits.</p><div class="cr-stat-row"><span>Available<b>${money(game.spendable)}</b></span><span>After unlock<b>${money(game.spendable-assistantCost())}</b></span></div>`,btn('buy-assistant',`Unlock · ${money(assistantCost())}`,'cr-primary',game.spendable<assistantCost()?'disabled':'')+btn('close','Keep ordering manually'));
  }
  function bulkRestock(size=8) {
    if(!game.upgrades.includes('tracker')){assistantOffer();return;}
    const plan=game.urgentStockoutPlan(size);
    if(!plan){toast('Bulk restocking is available during preparation or the shift.',false);return;}
    if(!plan.lines.length||plan.blocked||plan.unfilled){dialog('urgent-info','Urgent restock',`<p>${esc(plan.blocked|| (plan.unfilled?'Free shelf space or order smaller quantities manually.':'Usable stock and incoming deliveries cover empty menu supplies.'))}</p>`,btn('close','Back to café','cr-primary'));return;}
    if(game.tutorial.urgentRestockExplained){purchaseUrgent(size);return;}
    dialog('urgent-restock','Urgent orders cost more',`<p>This order uses the fastest express service, which costs more than standard delivery.</p><p><b>${esc(plan.supplier.name)} · about ${plan.lead} simulated seconds</b></p><div class="cr-stat-row"><span>Supplies<b>${money(plan.quote.goods)}</b></span><span>Express delivery<b>${money(plan.quote.shipping)}</b></span><span>Total now<b>${money(plan.quote.total)}</b></span></div><p class="cr-note">Express adds ${money(plan.extraShipping)} compared with standard shipping from this supplier. Later clicks buy automatically, targeting ${size} servings per active drink and smaller bakery batches, less usable incoming stock.</p><p>Expired stock becomes waste; purchased quantities are removed from your cart, leaving other items.</p>`,btn('confirm-urgent',`Order now · ${money(plan.quote.total)}`,'cr-primary',`data-size="${size}" ${plan.quote.total>game.spendable?'disabled':''}`)+btn('close','Keep ordering manually'));
  }
  function purchaseUrgent(size=8,acknowledge=false) {
    const result=game.urgentRestock(cart,acknowledge,size);
    if(result.error){dialog('urgent-error','Restock needs attention',`<p>${esc(result.error)}</p>`,btn('close','Back to café','cr-primary'));return;}
    cart=result.cart;recipeTargets={};closeDialog();drawTab();
    toast(`Urgent order placed · ${money(result.plan.quote.total)} · ${result.plan.supplier.name} express.`);
  }
  function lossDetails() {
    const loss=game.lossNotice();if(!loss)return;
    dialog('loss-details','What stopped these sales?',`<p><b>${loss.count} lost ${loss.count===1?'sale':'sales'} · ${money(loss.revenue)} potential revenue</b></p><p>Customers wanted ${esc(loss.products.map(id=>MENU.find(p=>p.id===id).name).join(', '))}.</p><div class="cr-shortage-lines">${loss.missing.map(n=>`<div>${productArt(n)}<span><b>${esc(n)}</b><small>${game.stock(n)===0?'OUT OF STOCK':`${game.stock(n)} available now · insufficient when ordered`}${game.usableIncoming(n)?` · ${game.usableIncoming(n)} arriving today`:''}</small></span>${btn('restock-loss','Order','',`data-name="${esc(n)}"`)}</div>`).join('')}</div><p class="cr-note">Lost sales use no stock and charge no cash, but hurt Customer Rating.</p>`,assistantButton()+btn('close','Back to café'));
  }
  function drawFeedback() {
    if(!game||!$('#cr-feedback'))return;
    const loss=game.lossNotice(),expiry=game.expiryNotice();
    let html;
    if(loss&&!game.tutorial.active&&game.phase==='shift') {
      const products=loss.products.map(id=>MENU.find(p=>p.id===id).name),missing=loss.missing;
      const empty=missing.filter(n=>game.stock(n)===0),short=empty.length?empty:missing;
      html=`<div class="cr-notice cr-loss-notice">${uiIcon('warning')}<div><div role="status"><b>${loss.count===1?'SALE LOST':'SALES LOST · '+loss.count} — STOCK SHORTAGE</b><p class="cr-missing-stock"><strong>${empty.length?'OUT OF STOCK':'MISSING AT TIME OF SALE'}: ${esc(short.slice(0,3).join(' · '))}${short.length>3?` (+${short.length-3} more)`:''}</strong></p><small>Wanted ${esc(products.slice(0,2).join(' + '))}. Revenue missed: <strong>${money(loss.revenue)}</strong>. Lost sales affect your rating.</small></div><div class="cr-notice-actions">${btn('loss-details','View shortages')}${assistantButton()}${btn('dismiss-loss','Dismiss','cr-text')}</div></div></div>`;
    } else if(expiry&&!game.tutorial.active&&['planning','shift'].includes(game.phase)) {
      html=`<div class="cr-notice cr-expiry-notice">${uiIcon('warning')}<div><div role="status"><b>Inventory alert — expiring soon</b><p>${esc(expiry.name)} expires in ${expiry.days} day! Use the older ${expiry.qty} units first.</p></div><div class="cr-notice-actions">${btn('view-expiry','View Inventory','',`data-name="${esc(expiry.name)}"`)}${btn('menu-expiry','Review Menu','',`data-name="${esc(expiry.name)}"`)}${btn('dismiss-expiry','Dismiss','cr-text',`data-name="${esc(expiry.name)}"`)}</div></div></div>`;
    } else if(feedbackMessage&&Date.now()<feedbackMessage.until) {
      html=`<span>${uiIcon(feedbackMessage.success?'check':'warning')}</span><div class="cr-feedback-message" role="status">${esc(feedbackMessage.text)}</div>`;
    } else {
      const reaction=game.reactions[0],blocked=game.orders.find(o=>o.status==='waiting'&&game.missing(o).length);
      const low=game.upgrades.includes('tracker')?game.activeIngredients().find(n=>game.stock(n)<=Math.max(game.reorderPoint,Math.ceil(game.rate(n)*12))&&!game.incoming(n)):null;
      html=!blocked&&!game.expiredCount()&&!low&&reaction?reactionBubble(latestReaction(),'feedback'):`<span>${blocked?uiIcon('warning'):game.expiredCount()?uiIcon('bin'):uiIcon('shop')}</span><div><b>${blocked?`Waiting on ${esc(game.missing(blocked)[0])}`:game.expiredCount()?'Expired items need removal':low?`Tracker: reorder ${esc(low)}`:'Your café, your decisions'}</b><small>${blocked?'Order supplies, check recipes, or change the menu.':game.expiredCount()?'Clear it from the stockroom. It cannot be sold.':game.phase==='planning'?'Check stock before opening.':'Staff serve automatically; watch stock.'}</small></div>`;
    }
    patch('#cr-feedback',html);
  }
  function trends() {
    const observed=game.day===1?['Original Blend','Whole Milk','Cup','Lid','Vanilla','Cookie']:['Oat Milk','Cold Brew','Whole Milk','Croissant','Cookie','Decaf'];
    const reports=game.reports, last=reports.at(-1);
    return `<div class="cr-work-title"><div><span class="cr-kicker">PLAN YOUR NEXT ORDER</span><h1>Sales & trends</h1></div>${game.upgrades.includes('tracker')?btn('reorder-cart',' Draft reorder cart','cr-primary'):btn('upgrades','Improve tracking')}</div>
      <div class="cr-trend-summary"><span>Served<b>${game.metrics.served}</b></span><span>Lost sales<b>${game.metrics.lost}</b></span><span>Today’s profit<b>${money(game.profit)}</b></span><span>New waste<b>${money(game.metrics.waste)}</b></span></div>
      <div class="cr-trend-layout"><div class="cr-trend-list"><h2>Demand signals</h2>${observed.map(n=>{const t=game.trend(n);return `<div><span>${productArt(n)}</span><b>${n}</b><strong class="${t.level}">${t.arrow}</strong><small>${t.label}</small></div>`;}).join('')}<p>Requests, past days & neighborhood news. Clues, not guaranteed orders.</p></div>
      <div class="cr-chart-card"><h2>The comeback so far</h2><div class="cr-bars">${DAYS.map((d,i)=>{const r=reports.find(r=>r.day===i+1)||(i+1===game.day&&game.elapsed>0?game.metrics:null);return `<div><b>${r?r.served:'?'}</b><i style="--bar:${r?Math.max(5,Math.min(100,r.served/40*100)):3}%;--bar-color:${r?'#36846b':'#cbb99e'}"></i><small>D${i+1}</small></div>`;}).join('')}</div><p>Customers actually served · future days are unknown</p><div class="cr-compare"><span>Previous day profit<b>${last?money(last.profit):'No previous day'}</b></span><span>Customer Rating<b>${rating()}</b></span></div>${btn('performance','Money & supplier details')}</div></div>
      <div class="cr-insight"><b>Your next improvement</b><span>${esc(game.biggestProblem())}</span></div>`;
  }
  function performance() {
    const m=game.metrics;
    dialog('performance','Follow the system',`<div class="cr-ledger"><span>Sales revenue<b>${money(m.revenue)}</b></span><span>Ingredients actually sold<b>−${money(m.cogs)}</b></span><span>Waste & write-offs<b>−${money(m.waste)}</b></span><span>Operations, shipping & improvements<b>−${money(m.operating)}</b></span><strong>Profit / loss<b>${money(game.profit)}</b></strong><span>Inventory purchased (asset)<b>${money(m.purchases)}</b></span><span>Stock still owned, including transit<b>${money(game.inventoryValue())}</b></span></div>
      <p class="cr-note">Stock reduces cash now and counts as an expense when sold or wasted. Shipping, staffing and upgrades are immediate expenses; baking labor is part of pastry cost.</p>
      <div class="cr-result-facts"><span>Stock shortages <b>${m.stockouts}</b></span><span>Missed revenue <b>${money(m.lostSales)}</b></span><span>Average stock value <b>${money(m.stockSamples?m.stockValueSum/m.stockSamples:game.inventoryValue())}</b></span><span>Customer satisfaction <b>${game.satisfaction}/100</b></span></div>
      <h3>Observed supplier performance</h3><div class="cr-ledger">${Object.entries(game.supplierStats).map(([id,s])=>`<span>${SUPPLIERS.find(v=>v.id===id)?.name||id}<b>${s.onTime}/${s.orders} on time · ${s.correct}/${s.orders} correct</b></span>`).join('')||'<p>No deliveries yet.</p>'}</div>`,btn('close','Got it','cr-primary'));
  }
  function report() {
    const r=game.reports.find(r=>r.day===game.day);if(!r)return;
    game.reviewSeen=true;save();
    dialog('report',`Day ${game.day} complete · ${r.profit>=0?'costs covered':'loss'}`,`<div class="cr-character">${customerArt(r.served/Math.max(1,r.arrived)>.75?0:1,r.served/Math.max(1,r.arrived)>.75?'happy':'neutral','report')}<p><b>${r.served} of ${r.arrived} customers served</b>${game.day===1?'Review these results before planning Day 2.':r.profit>0?'Today’s sales covered costs.':'Review stock, prices and costs.'}</p></div>
      <div class="cr-stat-row"><span>Revenue<b>${money(r.revenue)}</b></span><span>Costs<b>${money(r.cogs+r.waste+r.operating)}</b></span><span>Profit / loss<b>${money(r.profit)}</b></span></div>
      <div class="cr-result-facts"><span>Lost sales <b>${r.lost}</b></span><span>Missed revenue <b>${money(r.lostSales)}</b></span><span>Stock shortages <b>${r.stockLost||0} orders · ${money(r.stockLostRevenue||0)}</b></span><span>Expired / discarded <b>${r.wasteUnits} units</b></span><span>Customer Rating ${rating(Math.round(r.reputation/2)/10)}</span><span>Satisfaction <b>${r.satisfaction}/100</b></span><span>Fresh stock <b>${r.remaining}</b></span></div>
      ${game.day===1?'<p class="cr-note">Freshness drops one day overnight; check dates before reopening.</p>':''}<div class="cr-insight"><b>${game.day===5?'Your next improvement':'Improve this tomorrow'}</b><span>${esc(r.problem)}</span></div>${game.day===4?'<p class="cr-festival"> Festival tomorrow: prepare extra stock, staff or a smaller menu.</p>':''}
      `,
      btn(game.lesson.review?(game.day===5?'ending':'next-day'):'engineer-review',game.lesson.review?(game.day===5?'See the café’s future →':'Next morning →'):'Make the ISE connection','cr-primary')+(game.day<5?btn('upgrades','Choose an improvement'):'')+btn('performance','View finances'));
  }
  function upgrades() {
    const choices=UPGRADES.filter(u=>u.day<=game.day);
    const pages=Math.ceil(choices.length/3);upgradePage=Math.min(upgradePage,Math.max(0,pages-1));
    dialog('upgrades','Make tomorrow run better',`<p>Upgrades last all five days and use available cash or credit.</p><div class="cr-upgrades">${choices.slice(upgradePage*3,upgradePage*3+3).map(u=>`<article><span>${uiIcon(u.icon)}</span><h3>${u.name}</h3><p>${u.effect}</p>${btn('buy-upgrade',game.upgrades.includes(u.id)?' Installed':`${money(u.cost)} · Install`,'cr-primary',`data-upgrade="${u.id}" ${game.upgrades.includes(u.id)||game.spendable<u.cost||game.phase==='shift'?'disabled':''}`)}</article>`).join('')||'<p>Permanent improvements unlock from Day 2. Today, start with safe stock and a small menu.</p>'}</div><p class="cr-note">Available: ${money(game.spendable)}. Upgrades count as operating expenses.</p>`,
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
      <p class="cr-note">${result.tier==='gold'?'Debt cleared, customers returning, and a system that works.':result.tier==='silver'?'You covered the café’s losses and earned another chance.':result.tier==='bronze'?'The café gets a short extension, but still needs to repay its debt.':'Try a different stock, menu or staffing plan.'} Recovery balance = bank balance + inventory still owned.</p><div class="cr-end-score"><b>${result.score}/100</b> Operations score <span> ${game.xp} IE XP</span></div>`,
      btn('restart-confirm','Try a different strategy','cr-primary')+btn('export-learning','Download decision record')+btn('exit-now','Back to modes'));
    window.RisePostSurvey?.offer('inventory',document.querySelector('[data-dialog="ending"] footer'));
  }
  function help() {
    dialog('help','How to play',`<div class="cr-help-steps"><span>① <b>Prepare</b>Clear expired stock. Order for the menu you choose.</span><span>② <b>Open</b>Watch customers react and respond to short events.</span><span>③ <b>Improve</b>Use the results to change one thing tomorrow.</span></div><p class="cr-note">Shifts last 75 seconds at 1×; 2× and 3× speed up sales and deliveries. Freshness falls overnight. Use Pause to plan; pop-ups pause automatically.</p><p>Progress saves in this browser; switching browser tabs pauses the shift.</p>`,
      btn('replay-tutorial','Replay tutorial')+(legacySave()?btn('export-legacy','Download previous campaign save'):'')+btn('sound',game.sound?' Sound on · mute':' Sound off · enable')+btn('operations-plan','Required operations plan')+btn('export-learning','Download decision record')+btn('close','Back to café','cr-primary'));
  }
  function resumeSave() {
    const step=game.tutorialStep();
    if(step){closeDialog(false);showTourAction();return;}
    closeDialog(false);
    if(step==='order'&&cart.length){checkout();return;}
    if(game.phase==='complete')ending();
    else if(game.phase==='review')report();
    else if(!game.introSeen)intro(0);
    else if(!game.briefed)briefing();
    else checkEvents();
  }
  function startShift(automatic=false) {
    // An expired callback must never toggle an already-open shift's Pause control.
    if(!game||automatic&&(game.phase!=='planning'||dialogState||document.hidden||!planningReady))return;
    if(game.phase==='complete'){ending();return;}
    if(game.phase==='review'){report();return;}
    if(game.phase==='planning') {
      if(automatic){
        planningBlocker=game.tutorial.active?'Finish the highlighted steps or select Skip tutorial.':game.open()||'';
        if(planningBlocker)return;
      }else{
        if(game.tutorial.active){toast('Finish the highlighted tutorial steps, or choose Skip tutorial.',false);return;}
        if(!game.lesson.plan){operationsPlan();return;}
        const message=game.open();if(message){dialog('opening-check','Before you open',`<p>${esc(message)}</p>`,btn('fix-opening','Show me where','cr-primary')+btn('close','Back to preparation'));return;}
      }
      pausePlanning();planningReady=false;planningBlocker='';
      closeDialog(false);game.running=true;toast('Café open; keep recipes stocked.');drawTab();
    }
    save();updateHUD();
  }
  function checkEvents() {
    if(!game||dialogState)return;
    game.collectRoutineDeliveries();
    const arrival=game.deliveries.find(d=>d.arrived&&d.shelved&&!d.notified);
    if(arrival){arrival.notified=true;toast(`Supplies arrived: ${arrival.lines.slice(0,3).map(l=>`${l.qty} ${l.name}`).join(', ')}. Stored using FIFO · ${arrival.name}.`);}
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
    if(a==='replay-tutorial')replayTutorial();
    else if(a==='replay-page')replayTutorial(Number(d.page));
    else if(a==='tour-locate')showTourAction();
    else if(a==='intro-next')intro();
    else if(a==='intro-done'){game.introSeen=true;game.briefed=true;tourIntro();}
    else if(a==='tour-begin'){closeDialog(false);drawTab();}
    else if(a==='skip-tour-intro'){game.introSeen=true;game.skipTutorial();closeDialog(false);briefing();}
    else if(a==='finish-tour'){if(game.completeTutorial())dialog('tutorial-complete',"Tutorial Complete! You're ready to save rISE Café.",'<p>Select Open café →; staff serve automatically while you watch stock and events. Replay the guide with ? → Replay tutorial.</p>',btn('begin-day','Open café →','cr-primary')+btn('close','Keep preparing'));}
    else if(a==='begin-day'){closeDialog(false);startShift();}
    else if(a==='briefing-done'){closeDialog(false);drawTab();}
    else if(a==='resume-save')resumeSave();
    else if(a==='close')closeDialog();
    else if(a==='tab'){tab=d.tab;game.observe('tab',tab);const step=game.tutorialStep();if(tab==='stock'&&step==='stock')game.tutorial.stockOpened=true;if(tab==='supply'&&step==='suppliers')game.tutorial.suppliersOpened=true;if(tab==='menu'&&step==='menu')game.tutorial.menuSeen=true;if(tab==='trends'&&step==='trends')game.tutorial.trendsSeen=true;drawTab();}
    else if(a==='inspect')inspect(d.product);
    else if(a==='skip-guide'){game.skipTutorial();closeDialog(false);drawTab();}
    else if(a==='trash-selected'){const n=inspected;closeDialog();trashProduct(n);}
    else if(a==='discard-lot') {
      const lot=game.lots[d.name].find(l=>l.id===Number(d.lot));
      if(lot?.expires>game.day) dialog('discard','Discard usable stock?',`<p>${lot.qty} ${esc(d.name)} are still usable. Discarding them creates ${money(lot.qty*lot.cost)} of waste.</p>`,btn('confirm-discard','Discard usable stock','',`data-name="${esc(d.name)}" data-lot="${lot.id}"`)+btn('close','Keep it','cr-primary'));
      else {game.discard(d.name,Number(d.lot));toast('Expired stock removed.');inspect(d.name);}
    }
    else if(a==='confirm-discard'){game.discard(d.name,Number(d.lot));closeDialog();toast('Usable stock discarded and recorded as waste.',false);}
    else if(a==='rotate'){game.rotate(inspected);closeDialog();toast(game.lastExplanation);}
    else if(a==='bin'){toast('Drag expired stock here or discard it from its product view.');}
    else if(a==='order-selected'){selected=inspected;tab='supply';frozen=false;closeDialog();}
    else if(a==='supplier'){
      if(cart.length){
        const repriced=game.repriceCart(cart,d.supplier);
        if(!repriced){toast('This cart could not be priced with that supplier.',false);return;}
        cart=repriced.lines;cartComparison={...repriced,day:game.day,signature:JSON.stringify(cart)};
        if(!game.tutorial.ordered)game.tutorial.reviewed=false;
      }else cartComparison=null;
      supplier=d.supplier;game.observe('supplier',supplier);
      if(!game.tutorial.compared.includes(supplier))game.tutorial.compared.push(supplier);
      drawTab();
    }
    else if(a==='qty-down'||a==='qty-up'){qty=Math.max(1,Math.min(100,qty+(a==='qty-up'?1:-1)));drawTab();}
    else if(a==='pack'){frozen=d.frozen==='true';drawTab();}
    else if(a==='add-cart'){
      const amount=Number($('#cr-qty').value);
      if(!Number.isInteger(amount)||amount<1||amount>100){toast('Enter a whole quantity from 1 to 100.',false);return;}
      qty=amount;addToCart([{name:selected,qty,supplier,frozen,express}]);toast('Added to your cart. Review before ordering.');
    }
    else if(a==='draft-small'||a==='draft-buffer'){tab='supply';if(game.tutorial.active&&supplier==='budget'){supplier='quick';toast('QuickShip selected for today’s opening. Budget standard orders arrive tomorrow.');}addToCart(game.restockPlan(a==='draft-small'?8:12,supplier),true);toast('Cart drafted; review quantities and suppliers.');}
    else if(a==='remove-line'){cart.splice(Number(d.index),1);drawTab();}
    else if(a==='clear-cart'){cart=[];recipeTargets={};drawTab();}
    else if(a==='edit-line')editCartLine(Number(d.index));
    else if(a==='save-line') {
      const l=cart[Number(d.index)],amount=Number($('#cr-line-qty').value),company=$('#cr-line-supplier').value,fast=$('#cr-line-express').checked;
      if(!l||!game.offer(l.name,company,amount,l.frozen,fast)){error('Enter a whole quantity from 1 to 200.');return;}
      Object.assign(l,{qty:amount,supplier:company,express:fast});closeDialog();toast('Cart updated. Review the new total before ordering.');
    }
    else if(a==='review-cart')checkout();
    else if(a==='place-order'){const problem=game.placeOrder(cart);if(problem)error(problem);else{cart=[];recipeTargets={};closeDialog();toast('Order placed; same-day deliveries travel during preparation.');}}
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
      toast(plan.unfilled?'Added what fits; free shelf space for the rest.':plan.lines.length?'Missing supplies added; edit quantities or suppliers in the cart.':'Stock, deliveries and cart already cover this plan.',!plan.unfilled);
    }
    else if(a==='dismiss-loss'){game.dismissLosses();drawFeedback();}
    else if(a==='restock-loss'){game.dismissLosses();selected=d.name;frozen=game.strategy==='inhouse'&&item(selected).group==='bakery';qty=Math.max(1,game.suggested(selected)||6);tab='supply';closeDialog();drawTab();drawFeedback();}
    else if(a==='loss-details')lossDetails();
    else if(a==='assistant-offer')assistantOffer();
    else if(a==='buy-assistant'){if(game.buyUpgrade('tracker')){bulkRestock();toast('Stockroom Assistant unlocked; goods and shipping cost extra.');}else error('Not enough available cash and credit, or the assistant is already unlocked.');}
    else if(a==='bulk-restock')bulkRestock();
    else if(a==='confirm-urgent')purchaseUrgent(Number(d.size),true);
    else if(['dismiss-expiry','view-expiry','menu-expiry'].includes(a)) {
      game.dismissExpiry(d.name);
      if(a==='view-expiry'){tab='stock';drawTab();inspect(d.name);}
      if(a==='menu-expiry'){tab='menu';const p=MENU.find(p=>p.day<=game.day&&p.recipe.includes(d.name));menuSection=p?.kind==='bakery'?'bakery':'drinks';menuPage=p?Math.floor(MENU.filter(v=>v.day<=game.day&&v.kind===p.kind).findIndex(v=>v.id===p.id)/4):0;drawTab();}
      drawFeedback();
    }
    else if(a==='strategy')strategyDialog();
    else if(a==='choose-strategy'){game.setStrategy(d.strategy);closeDialog();menuSection='bakery';tab='menu';drawTab();toast(game.strategy==='outsource'?'Bakery handles baking and freshness. Unused frozen portions are returned at inventory value.':'Bakery strategy updated.');}
    else if(a==='buy-bakery'){selected=d.name;frozen=game.strategy==='inhouse';qty=frozen?4:6;tab='supply';drawTab();}
    else if(a==='bake'){const problem=game.bake(d.name);toast(problem||'Baking started; labor and energy costs are included.',!problem);drawTab();}
    else if(a==='helper'){toast(game.hireHelper()?'Helper hired today: prepare two orders at once.':'Helper unavailable or not enough credit.',game.helper);drawTab();}
    else if(a==='reorder-cart'){tab='supply';addToCart(game.reorderPlan(supplier),true);}
    else if(a==='play')startShift();
    else if(a==='toggle-shift'){if(game.phase==='shift')game.running=!game.running;}
    else if(a==='operations-plan'){if(game.phase==='planning')operationsPlan();else toast('Planning is complete for this shift. Review the outcomes after closing.');}
    else if(a==='fix-opening'){
      closeDialog(false);
      if(game.expiredCount())tab='stock';
      else if(game.day===1&&!game.learning.events.some(e=>e.kind==='fifo')&&game.deliveries.some(d=>d.arrived&&!d.shelved)){deliveries();return;}
      else if([2,3,4].includes(game.day)){tab='menu';menuSection=game.day===3?'bakery':'drinks';}
      else {tab='supply';if(game.lesson.plan?.supplier)supplier=game.lesson.plan.supplier;}
      drawTab();
    }
    else if(a==='save-plan')saveOperationsPlan();
    else if(a==='plan-choice'){
      const group=target.closest('.cr-plan-choice'),input=group?.querySelector('input[type="hidden"]');
      if(!input)return;
      input.value=d.value;(game.lesson.draft||={})[d.field]=d.value;
      group.querySelectorAll('[data-action="plan-choice"]').forEach(button=>button.setAttribute('aria-pressed',String(button===target)));
    }
    else if(a==='plan-compare'){game.observe('supplier',d.supplier);operationsPlan();}
    else if(a==='plan-trends'){tab='trends';game.observe('tab','trends');closeDialog();drawTab();toast('Inspect actual demand, then return to Required operations plan.');}
    else if(a==='fifo-new'){game.learning.events.push({kind:'fifo-attempt',day:game.day,correct:false});error('Choose Older usable stock in front to reduce waste.');}
    else if(a==='fifo-old')finishDelivery(Number(d.delivery));
    else if(a==='engineer-review')engineerReview();
    else if(a==='answer-reflection'){const problem=game.reflect(d.answer);if(problem){error(problem);sound(false);}else{engineerReview();sound();}}
    else if(a==='export-legacy'){const url=URL.createObjectURL(new Blob([legacySave()],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='cafe-rescue-previous-seven-day-save.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    else if(a==='export-learning'){const url=URL.createObjectURL(new Blob([JSON.stringify(game.learningRecord(),null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='cafe-rescue-decisions.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
    else if(a==='speed'){speed=Number(d.speed);updateHUD();toast(`${speed}× speed: sales and deliveries move ${speed===1?'at normal speed':`${speed} times faster`}.`);}
    else if(a==='brief')briefing();
    else if(a==='event-choice'){const problem=game.chooseEvent(d.choice);if(problem)error(problem);else{closeDialog();toast(game.lastExplanation);}}
    else if(a==='report')report();
    else if(a==='next-day'){if(game.nextDay()){cart=[];recipeTargets={};tab='stock';closeDialog(false);briefing();drawTab();}}
    else if(a==='ending')ending();
    else if(a==='upgrades'){upgradePage=0;upgrades();}
    else if(a==='upgrade-prev'||a==='upgrade-next'){upgradePage+=a==='upgrade-prev'?-1:1;upgrades();}
    else if(a==='buy-upgrade'){if(game.buyUpgrade(d.upgrade)){upgrades();toast('Upgrade installed.');}else error('This improvement is unavailable or exceeds your credit.');}
    else if(a==='performance')performance();
    else if(a==='quiz'){const correct=game.quiz(d.answer);report();toast(correct?'Yes! Extra stock covers unexpected demand.':'Keep a small buffer; excess stock ties up cash and can expire.',correct);}
    else if(a==='money')dialog('money','Debt is not the same as spending power',`<div class="cr-stat-row"><span>Bank balance<b>${money(game.cash)}</b></span><span>Available cash + credit<b>${money(game.spendable)}</b></span></div><p>Starting debt is $500 against a $750 credit limit, leaving $250 to spend; sales repay debt.</p><p class="cr-note">Recovery balance: <b>${money(game.balance)}</b> = bank balance + inventory still owned. Improve balance and service to save the café.</p>`,btn('close','Back to work','cr-primary'));
    else if(a==='help')help();
    else if(a==='sound'){game.sound=!game.sound;help();}
    else if(a==='exit')dialog('exit','Save your spot?',`<p>Resume this saved campaign from the mode menu.</p>${saveError?'<p class="cr-error">Browser storage is unavailable. Progress cannot be saved on this device.</p>':''}`,btn('exit-now','Save & exit','cr-primary')+btn('close','Keep playing'));
    else if(a==='exit-now'){pausePlanning();save();$('#cr-modal')?.remove();roles();return;}
    else if(a==='restart-confirm')dialog('restart','Start a fresh five-day rescue?',`<p>This replaces your Inventory Manager save in this browser.</p>`,btn('restart','Start new campaign','cr-primary')+btn('close','Keep this campaign'));
    else if(a==='restart'){pausePlanning();planningReady=false;planningBlocker='';game=new InventorySim();window.inventoryGame=game;tab='stock';cart=[];recipeTargets={};feedbackMessage=null;dialogState=null;render();intro(0);}
    updateHUD();save();
  }
  function handleChange(e) {
    if(e.target.id.startsWith('cr-plan-')){(game.lesson.draft||={})[e.target.id.replace('cr-plan-','')]=e.target.value;save();}
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
    syncPlanning();
    patch('#cr-bank',`<small>Bank balance</small><b>${money(game.cash)}</b>`);
    patch('#cr-reputation',`<small>Customer Rating</small>${rating()}`);
    document.querySelectorAll('[data-day]').forEach(n=>{n.classList.toggle('done',Number(n.dataset.day)<game.day);n.classList.toggle('current',Number(n.dataset.day)===game.day);});
    $('#cr-phase').textContent=`Day ${game.day} · ${game.phase==='planning'?'Prepare the café':game.phase==='shift'?(game.running?'Café open':'Paused'):game.phase==='review'?'Review & improve':'Campaign complete'}`;
    $('#cr-clock').textContent=time(CONFIG.shiftSeconds-game.elapsed);$('#cr-progress').value=game.elapsed;
    const planning=game.phase==='planning',remaining=game.planningTimeLeft();
    $('#cr-planning').hidden=!planning;$('.cr-clock').hidden=planning;
    $('#cr-planning-time').textContent=time(remaining);
    $('#cr-planning-paused').textContent=planning&&remaining>0&&(dialogState||document.hidden||!planningReady)?'Paused':'';
    $('#cr-planning').classList.toggle('cr-planning-expired',planning&&remaining===0);
    const note=remaining===0?`Time is up. ${planningBlocker||'Complete the opening requirements.'} The café opens automatically when ready.`:'You have 90 seconds to prepare. The café opens when time runs out if opening requirements are met.';
    if($('#cr-planning-note').textContent!==note)$('#cr-planning-note').textContent=note;
    $('#cr-save').textContent=saveError?'Save unavailable in this browser':planning?'Dialogs and hidden tabs pause the clock · auto-save on':'All systems share the same clock · auto-save on';
    // Replace the button when its action changes so a queued Open click cannot pause the shift.
    let play=$('#cr-play');const action=game.phase==='shift'?'toggle-shift':'play';
    if(play.dataset.action!==action){const focused=document.activeElement===play,next=play.cloneNode(true);next.dataset.action=action;play.replaceWith(next);play=next;if(focused)play.focus({preventScroll:true});}
    play.disabled=game.tutorial.active&&game.day===1;
    play.textContent=planning?'Open café →':game.phase==='review'?'Day results →':game.phase==='complete'?'Your ending →':game.running?'Ⅱ Pause':'Resume';
    document.querySelectorAll('[data-speed]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.speed)===speed));
    $('#cr-xp').textContent=` ${game.xp} IE XP · ${game.badges.length} milestones`;
    const pending=game.deliveries.filter(d=>!d.shelved&&!d.cancelled),ready=pending.filter(d=>d.arrived).length,late=pending.some(d=>d.delayNotified&&!d.arrived);
    const nextDelivery=pending.filter(d=>d.dueDay<=game.day&&!d.arrived).sort((a,b)=>a.expected-b.expected)[0]||pending[0];
    patch('#cr-dock',`${uiIcon('box')} <b>${ready?'Supplies arrived!':late?'Delivery delayed':pending.length?`${pending.length} delivery pending`:'Delivery dock'}</b><small>${ready?'Click to shelve':late?'Check your safety stock':pending.length?arrivalText(nextDelivery):'No orders in transit'}</small>`);
    $('#cr-dock').dataset.deliveryState=ready?'arrived':late?'delayed':pending.length?'transit':'idle';
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
    if(game&&!dialogState&&!document.hidden){
      if(game.phase==='planning')game.tickPlanning(dt*speed);
      else game.tick(dt*speed);
    }
    if(game&&now-lastPaint>500){updateHUD();lastPaint=now;}
    if(game&&now-lastSave>5000){save();lastSave=now;}
    requestAnimationFrame(loop);
  });
  document.addEventListener('visibilitychange',()=>{if(game){if(document.hidden){game.running=false;pausePlanning();save();}else updateHUD();}});
  window.addEventListener('pagehide',()=>{planningReady=false;pausePlanning();save();});
  window.addEventListener('pageshow',e=>{if(e.persisted&&game){planningReady=true;updateHUD();}});
  roles();
})();
