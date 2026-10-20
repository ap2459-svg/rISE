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
  let menuPage=0,menuSection='drinks',speed=1,dialogState=null,lastFrame=0,lastPaint=0,lastSave=0,lastXP=0,saveError=false,toastTimer,audio;
  let inspected=null,upgradePage=0,dragged=null;
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
    const node=$('#cr-toast');if(!node)return;
    node.textContent=text;node.hidden=false;node.classList.toggle('cr-error',!success);
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>{if($('#cr-toast'))$('#cr-toast').hidden=true;},4600);
    sound(success);
  }
  function dialog(key,title,body,footer) {
    const resume=dialogState?dialogState.resume:game?.running;
    dialogState={key,resume,focus:document.activeElement?.id};
    if(game)game.running=false;
    $('#cr-modal')?.remove();
    $('.cr-game')?.setAttribute('inert','');
    const overlay=document.createElement('div');overlay.id='cr-modal';overlay.className='cr-overlay';
    overlay.innerHTML=`<section class="cr-dialog ${key==='intro'?'cr-intro':''}" role="dialog" aria-modal="true" aria-labelledby="cr-dialog-title" tabindex="-1"><div class="cr-kicker">rISE CAFÉ · CAFÉ RESCUE</div><h2 id="cr-dialog-title">${title}</h2>${body}<p id="cr-dialog-error" class="cr-error" role="status"></p><footer>${footer}</footer></section>`;
    app.append(overlay);overlay.querySelector('section').focus();
    overlay.onclick=handleClick;
    overlay.onkeydown=e=>{
      if(e.key==='Escape'&&!['intro','delivery','event','ending','resume'].includes(key)){e.preventDefault();closeDialog();return;}
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
    tab='stock';category='rescue';cart=[];speed=1;dialogState=null;render();
    if(previous) {
      dialog('resume',`The café is waiting for you`, `<div class="cr-character"><span>${game.info.face}</span><p><b>Day ${game.day} of 7 · ${esc(game.info.title)}</b>Your decisions, stock, prices and deliveries are saved. The clock is paused.</p></div><div class="cr-stat-row"><span>Bank balance<b>${money(game.cash)}</b></span><span>Reputation<b>${game.reputation}/100</b></span></div>`,btn('resume-save','Resume rescue →','cr-primary')+btn('restart-confirm','Start a new rescue'));
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
      {title:'rISE Café is going out of business!',emoji:'😰',text:'“The old manager left empty shelves, spoiled milk, and unhappy customers.”',note:'Jules needs a new operations manager. That’s you.',button:'Take the keys →'},
      {title:'Seven days. One big comeback.',emoji:'🗝',text:'“Save our café before it closes permanently. Can we become the neighborhood’s favorite again?”',note:'Fix the system. Win back customers. Make every dollar count.',button:'Show me the stockroom →'}
    ],s=scenes[step];
    dialog('intro',s.title,`<div class="cr-story-art level-0"><div class="cr-shop">rISE Café<span>LAST CHANCE</span></div><div class="cr-story-face">${s.emoji}</div></div><blockquote>${s.text}</blockquote><p>${s.note}</p><div class="cr-stat-row"><span>Inherited debt<b>−$500</b></span><span>Reputation<b>18/100</b></span><span>Deadline<b>7 days</b></span></div>${step?'<p class="cr-note"><b>You can still buy supplies.</b> A $750 credit limit leaves $250 available. Sales repay the debt. This is game money.</p>':''}`,btn(step?'intro-done':'intro-next',s.button,'cr-primary')+`<small>${step+1} / 2</small>`);
  }
  function briefing() {
    game.briefed=true;save();
    dialog('briefing',`Day ${game.day}: ${esc(game.info.title)}`,`<div class="cr-character"><span>${game.info.face}</span><p>${esc(game.info.text)}</p></div><ol class="cr-goals">${game.info.goals.map(g=>`<li>${esc(g)}</li>`).join('')}</ol><div class="cr-note">Plan at your own pace. The shift lasts about 4 minutes at 1× speed.</div>${game.day===5?'<p>Pricing is now unlocked in Menu & bakery.</p>':''}`,btn('briefing-done',game.day===1?'Enter the stockroom →':'Prepare the café →','cr-primary'));
  }
  function render() {
    lastXP=game.xp;
    document.body.classList.add('inventory-playing');
    app.innerHTML=`<main class="cr-game" data-level="${game.visualLevel}">
      <header class="cr-header"><div class="cr-brand">rISE Café<small>CAFÉ RESCUE</small></div><div class="cr-week" aria-label="Seven day campaign">${DAYS.map((d,i)=>`<span data-day="${i+1}" title="${d.title}">${i+1}</span>`).join('')}</div>
      <button data-action="money" class="cr-bank" id="cr-bank"></button><div class="cr-reputation" id="cr-reputation"></div>${btn('help','?','cr-icon','aria-label="How to play"')}${btn('exit','Exit')}</header>
      <div class="cr-guide" id="cr-guide" aria-live="polite"></div>
      <div class="cr-work"><nav class="cr-nav" aria-label="Café Rescue sections">
        ${[['stock','▤','Stockroom'],['supply','📦','Order supplies'],['menu','☕','Menu & bakery'],['trends','↗','Sales & trends']].map(([id,icon,label])=>btn('tab',`<span>${icon}</span>${label}`,'',`data-tab="${id}"`)).join('')}
        <div class="cr-nav-bottom"><div class="cr-jules">🧑🏽‍🍳<b>Jules is on your team</b></div>${btn('brief','Today’s mission')}${btn('upgrades','✦ Improve café')}<small id="cr-xp"></small></div>
      </nav><section class="cr-workspace" id="cr-workspace" aria-label="Game workspace"></section></div>
      <section class="cr-live"><div id="cr-feedback"></div><button data-action="deliveries" id="cr-dock"></button><div id="cr-live-stats"></div></section>
      <footer class="cr-controls"><div><b id="cr-phase"></b><small id="cr-save"></small></div><div class="cr-clock"><span id="cr-clock"></span><progress id="cr-progress" max="${CONFIG.shiftSeconds}" value="0"></progress></div>
      <div class="cr-speeds" role="group" aria-label="Simulation speed">${[1,2,3].map(s=>btn('speed',`${s}×`,'',`data-speed="${s}" aria-label="${s} times speed"`)).join('')}</div>${btn('play','Open café','cr-primary','id="cr-play"')}</footer>
      <div id="cr-toast" class="cr-toast" role="status" hidden></div></main>`;
    $('.cr-game').onclick=handleClick;
    $('.cr-game').onchange=handleChange;
    $('.cr-game').ondragstart=e=>{const n=e.target.closest('[data-product]');if(n){dragged=n.dataset.product;e.dataTransfer.setData('text/plain',dragged);}};
    $('.cr-game').ondragover=e=>{if(e.target.closest('[data-action="bin"]'))e.preventDefault();};
    $('.cr-game').ondrop=e=>{if(e.target.closest('[data-action="bin"]')){e.preventDefault();trashProduct(dragged);dragged=null;}};
    drawTab();updateHUD();
  }
  function guide() {
    if(!game.tutorial.active||game.day!==1) return '';
    const t=game.tutorial;
    let step,title,action,label;
    if(!t.inspected){step=1;title='Click the Whole Milk carton. Check its date before using it.';action='inspect-tutorial';label='Inspect a carton';}
    else if(game.expiredCount()){step=2;title='Clear the red EXPIRED cartons and pastries. Click each one, then move it to the bin.';action='cleanup-view';label='Find spoiled stock';}
    else if(!t.missing){step=3;title='Clean shelves! Check the empty cup shelf. A latte needs a cup and lid, too.';action='missing-tutorial';label='Check the cups';}
    else if(t.compared.length<2){step=4;title='Compare both supplier cards. Low price, fast delivery, and freshness have tradeoffs.';action='suppliers-tutorial';label='Meet the suppliers';}
    else if(!t.ordered){step=5;title='Build a small reopening cart, review its cost, then place the order.';action='draft-small';label='Draft a small cart';}
    else if(!t.shelved){step=6;title='Wait for the delivery, then put older stock in front. The café is still closed.';action='advance';label='Receive first delivery';}
    else {step=7;title='Ready! Open the café. Customers are served automatically; you keep the system stocked.';action='play';label='Open café →';}
    return `<div class="cr-guide-face">🧑🏽‍🍳</div><div><small>JULES’ QUICK START · ${step} / 7</small><b>${title}</b></div>${btn(action,label,'cr-primary')}${btn('skip-guide','Skip','cr-text')}`;
  }
  function drawTab() {
    if(!game||!$('#cr-workspace'))return;
    $('.cr-game').dataset.level=game.visualLevel;
    document.querySelectorAll('.cr-nav [data-tab]').forEach(b=>b.setAttribute('aria-current',b.dataset.tab===tab?'page':'false'));
    patch('#cr-guide',guide());$('#cr-guide').hidden=!guide();
    const html=tab==='stock'?stockroom():tab==='supply'?supplies():tab==='menu'?menuView():trends();
    patch('#cr-workspace',html);
  }
  function stockroom() {
    const care=INVENTORY_ITEMS.filter(i=>game.spoiled(i.name));
    let products=category==='rescue'?(care.length?care:INVENTORY_ITEMS.filter(i=>game.activeIngredients().includes(i.name)&&game.stock(i.name)<=Math.max(2,Math.ceil(game.rate(i.name)*40))).slice(0,6)):INVENTORY_ITEMS.filter(i=>i.group===category);
    if(!products.length)products=INVENTORY_ITEMS.filter(i=>game.activeIngredients().includes(i.name)).slice(0,6);
    return `<div class="cr-work-title"><div><span class="cr-kicker">MAKE ROOM FOR A COMEBACK</span><h1>Your stockroom</h1></div><span class="cr-health">${game.health}% stock health</span></div>
      <div class="cr-category-tabs" role="group" aria-label="Stock categories">${Object.entries(labels).map(([id,label])=>btn('category',label,'',`data-category="${id}" aria-pressed="${category===id}"`)).join('')}</div>
      <div class="cr-stock-scene"><div class="cr-stock-sign">${['A fresh start begins here','Back in business','The neighborhood is noticing','A café worth coming back to'][game.visualLevel]}</div><div class="cr-window"><span>☀</span></div>
      <div class="cr-shelves">${products.map(i=>{
        const fresh=game.stock(i.name),expired=game.spoiled(i.name),ice=game.frozen(i.name),low=fresh<=Math.max(2,Math.ceil(game.rate(i.name)*40));
        const status=expired?'expired':fresh===0?'empty':fresh===1?'critical':low?'low':'healthy';
        return `<button class="cr-stock-item ${status}" data-action="inspect" data-product="${esc(i.name)}" draggable="true"><span class="cr-product-art">${i.icon}</span><b>${esc(i.name)}</b><span class="cr-stock-tag">${expired?`⚠ EXPIRED · ${expired}`:fresh?`${fresh} fresh${fresh===1?' · CRITICAL':low?' · LOW':''}`:ice?`${ice} frozen`:'OUT OF STOCK'}</span>${game.incoming(i.name)?'<small>🚚 On the way</small>':!expired&&low?'<small>Reorder recommended</small>':''}</button>`;
      }).join('')}</div>
      <div class="cr-stock-floor"><span>${game.visualLevel>1?'🪴':'🕸'} <small>Green = healthy · Yellow = low · Red = empty<br>Striped tags = expired & quarantined</small></span>${btn('bin','🗑<small>Expired goods bin</small>','cr-bin')}</div></div>
      <div class="cr-work-note">Select a product to inspect dates or reorder. Drag an expired product to the bin, or use its discard button.</div>`;
  }
  function inspect(name) {
    selected=name;inspected=name;game.tutorial.inspected=true;if(name==='Cup')game.tutorial.missing=true;
    const i=item(name),lots=game.lots[name],expired=game.spoiled(name);
    dialog('inspect',`${i.icon} ${esc(name)}`,`<div class="cr-stat-row"><span>Ready to use<b>${game.stock(name)}</b></span><span>Quarantined<b>${expired}</b></span><span>On the way<b>${game.incoming(name)}</b></span></div>
      <div class="cr-lots">${lots.length?lots.map(l=>`<div class="${l.expires<=game.clock?'expired':''}"><span>${i.icon}</span><div><b>${l.qty} ${l.frozen?'frozen':'units'}</b><small>${l.expires<=game.clock?'EXPIRED — cannot be served':i.group==='supplies'?'Shelf-stable · no food expiry':`Expires in ${time(l.expires-game.clock)} café time`}</small></div>${btn('discard-lot','🗑','',`data-name="${esc(name)}" data-lot="${l.id}" aria-label="Discard ${l.qty} ${esc(name)}${l.expires<=game.clock?' expired':' usable'} units"`)}</div>`).join(''):'<p>This shelf is empty. Check your menu before ordering.</p>'}</div><p class="cr-note">Expired products are always blocked from sales. Throwing out usable food adds to waste.</p>`,
      (expired?btn('trash-selected','Move expired stock to bin','cr-primary'):btn('order-selected','Order this product','cr-primary'))+btn('rotate','Older stock to front')+btn('close','Done'));
    save();
  }
  function trashProduct(name) {
    if(!item(name))return;
    const count=game.discard(name);
    if(count)toast(`✓ ${count} expired ${name} cleared. Safe shelves!`);
    else toast('That shelf has no expired stock. Keep the usable products.',false);
    drawTab();updateHUD();save();
  }
  function supplierCards() {
    return SUPPLIERS.filter(s=>s.unlock<=game.day).map(s=>{
      const offer=game.offer(selected,s.id,qty,frozen,express);
      return `<button class="cr-supplier ${supplier===s.id?'selected':''}" data-action="supplier" data-supplier="${s.id}" style="--company:${s.color}" aria-pressed="${supplier===s.id}">
        <span class="cr-company-icon">${s.icon}</span><b>${s.name}</b><strong>${money(offer.unit)}<small> / unit</small></strong>
        <div class="cr-supplier-facts"><span>🚚 ${offer.lead}s</span><span>✓ ${(offer.reliability*100).toFixed(offer.reliability<1&&offer.reliability>.99?1:0)}% reliable</span><span>${s.quality>=.99?'★★★':s.quality>.9?'★★☆':'★☆☆'} quality</span><span>◷ ${item(selected).group==='supplies'?'Shelf-stable':`${time(offer.life)} freshness`}</span></div>
        <small>${Math.round(s.discount*100)}% off at ${s.bulk}+ units${offer.bulk?' · APPLIED':''}</small></button>`;
    }).join('');
  }
  function supplies() {
    if(!item(selected))selected='Whole Milk';
    const i=item(selected),quote=game.quote(cart),pending=game.incoming(selected);
    return `<div class="cr-work-title"><div><span class="cr-kicker">BUY WHAT YOUR MENU NEEDS</span><h1>Order supplies</h1></div><span class="cr-health" id="cr-spendable">${money(game.spendable)} available</span></div>
      <div class="cr-order-layout"><div class="cr-shopping"><div class="cr-draft"><span>Build a menu-based cart</span>${btn('draft-small','Small batch · 8 drinks')}${btn('draft-buffer','Buffer · 12 drinks')}</div>
      <label class="cr-select">Product<select id="cr-product">${Object.entries(INVENTORY_GROUPS).map(([group,names])=>`<optgroup label="${labels[group]}">${names.map(n=>`<option ${n===selected?'selected':''}>${esc(n)}</option>`).join('')}</optgroup>`).join('')}</select></label>
      <div class="cr-shopping-meta"><span id="cr-shopping-stock">${i.icon} ${game.stock(selected)} fresh · ${pending} incoming</span><span id="cr-spaces">${game.capacity(selected)-game.occupied(selected)-pending} shelf spaces</span></div>
      <div class="cr-suppliers">${supplierCards()}</div>
      <div class="cr-pack-row">${i.group==='bakery'?btn('pack','Ready-made','',`data-frozen="false" aria-pressed="${!frozen}"`)+btn('pack','Frozen · bake first','',`data-frozen="true" aria-pressed="${frozen}"`):'<span>Fresh stock · matched to this product</span>'}<label><input type="checkbox" id="cr-express" ${express?'checked':''}> Express shipping (+fee)</label></div>
      <div class="cr-add-row">${btn('qty-down','−','',`aria-label="Decrease quantity"`)}<label>Quantity<input id="cr-qty" type="number" min="1" max="100" value="${qty}" inputmode="numeric"></label>${btn('qty-up','+','',`aria-label="Increase quantity"`)}${btn('add-cart','Add to cart','cr-primary')}</div>
      <p class="cr-work-note">Cart drafts are batch sizes you choose, not a prediction of customers. Adjust before checkout.</p></div>
      <aside class="cr-cart"><div class="cr-cart-title"><h2>Your cart</h2>${btn('clear-cart','Clear','cr-text')}</div><div class="cr-cart-lines">${cart.length?cart.map((l,index)=>`<div><span>${item(l.name).icon}</span><div><b>${esc(l.name)}${l.frozen?' ❄':''}</b><small>${SUPPLIERS.find(s=>s.id===l.supplier).icon} ${l.express?'Express':'Standard'}</small></div><b>×${l.qty}</b>${btn('remove-line','×','cr-text',`data-index="${index}" aria-label="Remove ${esc(l.name)} from cart"`)}</div>`).join(''):'<div class="cr-empty-cart">🛒<b>A small, smart start</b><p>Add products or draft a cart for your current menu.</p></div>'}</div>
      <div class="cr-cart-total">${quote?`<span>Stock <b>${money(quote.goods)}</b></span><span>Delivery <b>${money(quote.shipping)}</b></span><strong>Total <b>${money(quote.total)}</b></strong>`:'<strong>Total <b>$0.00</b></strong>'}${btn('review-cart','Review & place order →','cr-primary',cart.length?'':'disabled')}</div></aside></div>`;
  }
  function addToCart(lines,replace=false) {
    if(replace)cart=[];
    for(const l of lines) {
      const existing=cart.find(c=>c.name===l.name&&c.supplier===l.supplier&&c.frozen===l.frozen&&c.express===l.express);
      if(existing)existing.qty+=l.qty;else cart.push({...l});
    }
    drawTab();save();
  }
  function checkout() {
    const q=game.quote(cart);if(!q){toast('Your cart is empty.',false);return;}
    dialog('checkout','Ready to place the order?',`<div class="cr-review-cart">${cart.map(l=>`<span><span>${item(l.name).icon} ${esc(l.name)}${l.frozen?' (frozen)':''}<small>${SUPPLIERS.find(s=>s.id===l.supplier).name} · ${l.express?'express':'standard'}</small></span><b>×${l.qty}</b></span>`).join('')}</div><div class="cr-stat-row"><span>Inventory<b>${money(q.goods)}</b></span><span>Shipping<b>${money(q.shipping)}</b></span><span>Total<b>${money(q.total)}</b></span></div><p class="cr-note">${money(game.spendable)} available now. ${money(game.spendable-q.total)} after this order. Keep money for operating costs and surprises.</p>`,btn('place-order','Place order','cr-primary')+btn('close','Edit cart'));
  }
  function deliveries() {
    const arrived=game.deliveries.find(d=>d.arrived&&!d.shelved);
    if(arrived) {
      dialog('delivery','Supplies arrived!',`<div class="cr-delivery-art">🚲 <span>📦</span></div><p><b>${esc(arrived.name)}</b>${arrived.problem?`<br><span class="cr-error">${esc(arrived.problem)}</span>`:''}</p>
        <div class="cr-review-cart">${arrived.lines.map(l=>`<span>${item(l.name).icon} ${esc(l.name)}${l.frozen?' ❄':''}<b>+${l.qty}</b></span>`).join('')}</div>
        <h3>Where should the new stock go?</h3><div class="cr-rotation"><span>OLDER<br>🥛 🥛</span><i>← use first</i><span>NEW<br>🥛 🥛</span></div><p class="cr-note">Put the older products at the front to sell them before they expire.</p>`,
        btn('shelve-fifo','Older in front · shelve delivery','cr-primary',`data-delivery="${arrived.id}"`)+btn('shelve-new','New stock in front','',`data-delivery="${arrived.id}"`));
      return;
    }
    const pending=game.deliveries.filter(d=>!d.arrived);
    dialog('dock','Delivery dock',pending.length?`<div class="cr-delivery-list">${pending.map(d=>`<div>🚚 <b>${esc(d.name)}</b><span>${d.delayNotified?'Delayed · arriving soon':`Expected in ${time(d.expected-game.clock)}`}</span></div>`).join('')}</div>`:'<div class="cr-empty-cart">📦<p>Nothing in transit. Order what your active menu needs.</p></div>',
      (game.phase==='planning'&&pending.length?btn('advance','Advance to next delivery','cr-primary'):'')+btn('close','Back to café'));
  }
  function menuView() {
    const unlocked=MENU.filter(p=>p.day<=game.day&&p.kind===(menuSection==='drinks'?'drink':'bakery'));
    const pages=Math.ceil(unlocked.length/4);menuPage=Math.min(menuPage,Math.max(0,pages-1));
    const shown=unlocked.slice(menuPage*4,menuPage*4+4);
    return `<div class="cr-work-title"><div><span class="cr-kicker">A SMALL MENU CAN BE A SMART MENU</span><h1>Menu & bakery</h1></div>${btn('strategy','🥐 Bakery strategy','',`id="cr-strategy"`)}</div>
      <div class="cr-menu-toolbar"><div>${btn('menu-section','Drinks','',`data-section="drinks" aria-pressed="${menuSection==='drinks'}"`)}${btn('menu-section','Bakery','',`data-section="bakery" aria-pressed="${menuSection==='bakery'}"`)}</div><span>${game.day<5?'Price lab unlocks on Day 5':'Price lab open · test, observe, adjust'}</span>${game.day>=4?btn('helper',game.helper?'✓ Helper hired':'Hire shift helper · $22','',game.helper||game.phase!=='planning'?'disabled':''):''}</div>
      <div class="cr-menu-cards">${shown.map(p=>{
        const cost=game.unitCost(p.id),price=game.menu[p.id].price;
        return `<article class="cr-menu-card ${game.menu[p.id].enabled?'':'off'}"><div class="cr-drink-art">${p.icon}</div><div class="cr-menu-name"><h2>${p.name}</h2><span>${game.servings(p.id)} can be made now</span></div>
          <div class="cr-menu-cost"><span>Unit cost<b>${money(cost)}</b></span><span>Margin / sale<b>${money(price-cost)}</b></span></div>
          <div class="cr-price">${btn('price-down','−','',`data-id="${p.id}" aria-label="Lower ${p.name} price" ${game.day<5?'disabled':''}`)}<strong>${money(price)}</strong>${btn('price-up','+','',`data-id="${p.id}" aria-label="Raise ${p.name} price" ${game.day<5?'disabled':''}`)}</div>
          <small>${price>p.price*1.15?'↘ Higher price may deter customers':price<p.price?'↗ Value price · smaller margin':'→ Familiar price'}</small>
          <div class="cr-menu-actions">${btn('toggle-menu',game.menu[p.id].enabled?'✓ On menu':'Add to menu','',`data-id="${p.id}" aria-pressed="${game.menu[p.id].enabled}"`)}${btn('recipe','Recipe','cr-text',`data-id="${p.id}"`)}</div>
          ${p.kind==='bakery'?`<div class="cr-bake-actions"><span>❄ ${game.frozen(p.name)} frozen · ${game.stock(p.name)} ready</span>${btn('bake','Bake 4','',`data-name="${p.name}"`)}${btn('buy-bakery','Buy stock','',`data-name="${p.name}"`)}</div>`:''}</article>`;
      }).join('')}</div><div class="cr-menu-bottom"><span>${menuSection==='bakery'?`${game.strategy==='inhouse'?'In-house':game.strategy==='outsource'?'Outsource':'Hybrid'} · ${game.batches.length?game.batches.map(b=>`${b.name} ready in ${time(b.ready-game.clock)}`).join(' · '):'Oven idle'}`:`${MENU.filter(p=>p.day>game.day).length} more products unlock during the week`}</span>${pages>1?btn('menu-prev','←','',menuPage===0?'disabled':'')+`<b>${menuPage+1}/${pages}</b>`+btn('menu-next','→','',menuPage===pages-1?'disabled':''):''}${game.phase==='planning'&&game.batches.length?btn('advance','Finish batch ⏩'):''}</div>`;
  }
  function strategyDialog() {
    dialog('strategy','Bake here, buy in, or both?',`<p>Frozen portions are an inventory asset. Baking adds labor and energy to their cost, takes oven time, and slows drink preparation while staff are busy.</p>
      <div class="cr-strategies">${[
        ['inhouse','♨','In-house','Lower purchase cost. Bake four at a time; pay $2.40 per batch for labor and energy.','Frozen stock only'],
        ['outsource','🚲','Local bakery','Ready to sell on delivery. Higher purchase cost; depends on supplier timing.','Ready-made stock only'],
        ['hybrid','⚖','Hybrid','Mix fresh and frozen stock. More flexibility, but you must manage both types and storage.','Both packs available']
      ].map(([id,icon,title,text,note])=>btn('choose-strategy',`<span>${icon}</span><b>${title}</b><p>${text}</p><small>${note}</small>`,'',`data-strategy="${id}" aria-pressed="${game.strategy===id}"`)).join('')}</div><p class="cr-note">Your current usable stock stays available. You can reconsider the strategy later. ${game.upgrades.includes('energy')?'Efficient equipment lowers each batch to $1.60.':''}</p>`,btn('close','Back to café'));
  }
  function recipeDialog(id) {
    const p=MENU.find(p=>p.id===id);
    dialog('recipe',`${p.icon} ${p.name}`,`<div class="cr-recipe">${p.recipe.map(n=>`<span class="${game.stock(n)?'':'missing'}">${item(n).icon} ${n}<b>${game.stock(n)?`${game.stock(n)} available`:'Missing'}</b></span>`).join('')}</div><p class="cr-note">Keep this recipe supplied or pause it on the menu. Customers order from the products you offer.</p>`,btn('recipe-cart','Add missing supplies to cart','cr-primary',`data-id="${id}"`)+btn('close','Back'));
  }
  function trends() {
    const observed=['Oat Milk','Cold Brew','Whole Milk','Croissant','Cookie','Decaf'];
    const reports=game.reports, last=reports.at(-1);
    return `<div class="cr-work-title"><div><span class="cr-kicker">READ THE ROOM, THEN ADJUST</span><h1>Sales & trends</h1></div>${game.upgrades.includes('tracker')?btn('reorder-cart','📡 Draft reorder cart','cr-primary'):btn('upgrades','Improve tracking')}</div>
      <div class="cr-trend-summary"><span>Served<b>${game.metrics.served}</b></span><span>Lost sales<b>${game.metrics.lost}</b></span><span>Today’s profit<b>${money(game.profit)}</b></span><span>New waste<b>${money(game.metrics.waste)}</b></span></div>
      <div class="cr-trend-layout"><div class="cr-trend-list"><h2>Demand signals</h2>${observed.map(n=>{const t=game.trend(n);return `<div><span>${item(n).icon}</span><b>${n}</b><strong class="${t.level}">${t.arrow}</strong><small>${t.label}</small></div>`;}).join('')}<p>Requests, past days & neighborhood news. Clues, not guaranteed orders.</p></div>
      <div class="cr-chart-card"><h2>The comeback so far</h2><div class="cr-bars">${DAYS.map((d,i)=>{const r=reports.find(r=>r.day===i+1)||(i+1===game.day&&game.elapsed>0?game.metrics:null);return `<div><b>${r?r.served:'?'}</b><i style="--bar:${r?Math.max(5,Math.min(100,r.served/40*100)):3}%;--bar-color:${r?'#36846b':'#cbb99e'}"></i><small>D${i+1}</small></div>`;}).join('')}</div><p>Customers actually served · future days are unknown</p><div class="cr-compare"><span>Previous day profit<b>${last?money(last.profit):'No previous day'}</b></span><span>Reputation<b>${game.reputation} / 100</b></span></div>${btn('performance','Money & supplier details')}</div></div>
      <div class="cr-insight"><b>Jules’ observation</b><span>${esc(game.biggestProblem())}</span></div>`;
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
    dialog('report',`Day ${game.day} complete · ${r.profit>=0?'a step forward':'a tough lesson'}`,`<div class="cr-character"><span>${r.served/Math.max(1,r.arrived)>.75?'😊':'😕'}</span><p><b>${r.served} of ${r.arrived} customers served</b>${game.day===1?'Jules: “We’re still in debt, but the doors are open again. Tomorrow we improve the system.”':r.profit>0?'Jules: “The café earned more than it used today. Let’s build on that.”':'Jules: “We found the weak spot. Let’s change the plan tomorrow.”'}</p></div>
      <div class="cr-stat-row"><span>Revenue<b>${money(r.revenue)}</b></span><span>Costs<b>${money(r.cogs+r.waste+r.operating)}</b></span><span>Profit / loss<b>${money(r.profit)}</b></span></div>
      <div class="cr-result-facts"><span>Lost sales <b>${r.lost}</b></span><span>Expired / discarded <b>${r.wasteUnits} units</b></span><span>Satisfaction <b>${r.satisfaction}/100</b></span><span>Remaining fresh stock <b>${r.remaining}</b></span></div>
      <div class="cr-insight"><b>${game.day===7?'Your next improvement':'Improve this tomorrow'}</b><span>${esc(r.problem)}</span></div>${game.day===5?'<p class="cr-festival">🎉 Big event tomorrow! Prepare a buffer, extra capacity, or a focused menu.</p>':''}
      ${[2,4].includes(game.day)&&!game.quizAnswered?`<div class="cr-reflection"><b>A quick engineer’s reflection</b><p>${r.stockouts?'You saw customers waiting for supplies. What could reduce that risk?':'A delivery can arrive late even when the price looks good. What could protect service?'}</p>${btn('quiz','Keep a small buffer','',`data-answer="buffer"`)}${btn('quiz','Fill every shelf to the maximum','',`data-answer="maximum"`)}</div>`:''}`,
      btn(game.day===7?'ending':'next-day',game.day===7?'See the café’s future →':'Next morning →','cr-primary')+(game.day<7?btn('upgrades','Choose an improvement'):'')+btn('performance','View finances'));
  }
  function upgrades() {
    const choices=UPGRADES.filter(u=>u.day<=game.day);
    const pages=Math.ceil(choices.length/3);upgradePage=Math.min(upgradePage,Math.max(0,pages-1));
    dialog('upgrades','Make tomorrow run better',`<p>Choose a lasting improvement. Each cost comes out of your available cash or credit.</p><div class="cr-upgrades">${choices.slice(upgradePage*3,upgradePage*3+3).map(u=>`<article><span>${u.icon}</span><h3>${u.name}</h3><p>${u.effect}</p>${btn('buy-upgrade',game.upgrades.includes(u.id)?'✓ Installed':`${money(u.cost)} · Install`,'cr-primary',`data-upgrade="${u.id}" ${game.upgrades.includes(u.id)||game.spendable<u.cost||game.phase==='shift'?'disabled':''}`)}</article>`).join('')||'<p>Permanent improvements unlock from Day 2. Today, start with safe stock and a small menu.</p>'}</div><p class="cr-note">Available: ${money(game.spendable)}. Improvements are charged as operating expenses in this simplified game model.</p>`,
      (pages>1?btn('upgrade-prev','←','',upgradePage===0?'disabled':'')+`<span>${upgradePage+1}/${pages}</span>`+btn('upgrade-next','→','',upgradePage===pages-1?'disabled':''):'')+btn(game.phase==='review'?'report':'close',game.phase==='review'?'Back to results':'Back to café'));
  }
  function ending() {
    const result=game.ending();if(!result)return;
    game.phase='complete';game.running=false;save();
    const stats=Object.values(game.supplierStats),deliveriesCount=stats.reduce((s,v)=>s+v.orders,0);
    const reliability=deliveriesCount?Math.round(100*stats.reduce((s,v)=>s+v.onTime+v.correct-v.orders,0)/deliveriesCount):0;
    const first=game.reports[0],last=game.reports.at(-1);
    dialog('ending',`${{gold:'🏆',silver:'🌟',bronze:'🌱',failure:'💔'}[result.tier]} ${result.title}`,`<div class="cr-transformation"><div class="cr-before"><span>THEN</span><b>rISE Café</b><p>🕸 😟 🥛</p><small>Debt · spoiled stock · empty shelves</small></div><div class="cr-after level-${game.visualLevel}"><span>NOW</span><b>rISE Café</b><p>${result.tier==='failure'?'🚪 😔':result.tier==='bronze'?'🌱 🙂 ☕':'🪴 😊 🥐'}</p><small>${result.tier==='failure'?'A new plan could change the outcome':'Your decisions changed this place'}</small></div></div>
      <div class="cr-end-metrics"><span>Recovery balance<b>${money(CONFIG.openingCash+game.openingValue)} → ${money(result.balance)}</b></span><span>Reputation<b>18 → ${game.reputation}/100</b></span><span>Daily profit<b>${money(first.profit)} → ${money(last.profit)}</b></span><span>Satisfaction<b>${first.satisfaction} → ${last.satisfaction}/100</b></span><span>Daily new waste<b>${money(first.waste)} → ${money(last.waste)}</b></span><span>Daily lost sales<b>${first.lost} → ${last.lost}</b></span><span>Supplier performance<b>${reliability}% on time / correct</b></span><span>Business efficiency<b>${result.efficiency}% served · ${result.turnover.toFixed(1)}× turnover</b></span></div>
      <p class="cr-note">${result.tier==='gold'?'Debt cleared, customers returning, and a system that works.':result.tier==='silver'?'You covered the café’s losses and earned another chance.':result.tier==='bronze'?'The café gets a short extension, but still needs to repay its debt.':'The café could not recover enough money and customer trust in time. Replay with a different purchasing, menu or capacity plan.'} Recovery balance = bank balance + inventory still owned.</p><div class="cr-end-score"><b>${result.score}/100</b> Operations score <span>★ ${game.xp} IE XP</span></div>`,
      btn('restart-confirm','Try a different strategy','cr-primary')+btn('exit-now','Back to modes'));
  }
  function help() {
    dialog('help','You run the system. Staff serve the coffee.',`<div class="cr-help-steps"><span>① <b>Prepare</b>Clear expired stock. Order for the menu you choose.</span><span>② <b>Open</b>Watch customers react and respond to short events.</span><span>③ <b>Improve</b>Use the results to change one thing tomorrow.</span></div><p class="cr-note">1× takes about 4 minutes per day. At 2× or 3×, sales, expiry and delivery times all speed up. Pause whenever you need to plan. Pop-ups pause automatically.</p><p>The game saves in this browser. Tab switching pauses the shift. Closing the café screen keeps your campaign.</p>`,
      btn('sound',game.sound?'🔊 Sound on · mute':'🔇 Sound off · enable')+btn('brief','Today’s mission')+btn('upgrades','Improve café')+btn('close','Back to café','cr-primary'));
  }
  function resumeSave() {
    closeDialog(false);
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
      const message=game.open();if(message){error(message);return;}
      closeDialog(false);game.running=true;toast('Doors open! Keep the café stocked.');drawTab();
    } else {game.running=!game.running;}
    save();updateHUD();
  }
  function checkEvents() {
    if(!game||dialogState)return;
    if(game.phase==='review'&&!game.reviewSeen){report();return;}
    if(game.phase==='complete')return;
    if(game.deliveries.some(d=>d.arrived&&!d.shelved)){deliveries();return;}
    if(game.pendingEvent) {
      const e=game.pendingEvent;
      dialog('event',e.title,`<div class="cr-character"><span>${game.info.face}</span><p>${esc(e.text)}</p></div><div class="cr-event-choices">${e.choices.map(([id,title,note])=>btn('event-choice',`<b>${title}</b><small>${note}</small>`,'',`data-choice="${id}"`)).join('')}</div><p class="cr-note">Clock paused. Choose the tradeoff that fits your café.</p>`,'');
    }
  }
  function handleClick(e) {
    const target=e.target.closest('[data-action]');if(!target||target.disabled||!game)return;
    const a=target.dataset.action,d=target.dataset;
    if(a==='intro-next')intro(1);
    else if(a==='intro-done'){game.introSeen=true;briefing();}
    else if(a==='briefing-done'){closeDialog(false);drawTab();}
    else if(a==='resume-save')resumeSave();
    else if(a==='close')closeDialog();
    else if(a==='tab'){tab=d.tab;drawTab();}
    else if(a==='category'){category=d.category;drawTab();}
    else if(a==='inspect')inspect(d.product);
    else if(a==='inspect-tutorial')inspect('Whole Milk');
    else if(a==='missing-tutorial'){category='supplies';tab='stock';inspect('Cup');}
    else if(a==='cleanup-view'){tab='stock';category='rescue';drawTab();}
    else if(a==='suppliers-tutorial'){tab='supply';selected='Whole Milk';drawTab();}
    else if(a==='skip-guide'){game.tutorial.active=false;drawTab();}
    else if(a==='trash-selected'){const n=inspected;closeDialog();trashProduct(n);}
    else if(a==='discard-lot') {
      const lot=game.lots[d.name].find(l=>l.id===Number(d.lot));
      if(lot?.expires>game.clock) dialog('discard','Discard usable stock?',`<p>${lot.qty} ${esc(d.name)} are still usable. Discarding them creates ${money(lot.qty*lot.cost)} of waste.</p>`,btn('confirm-discard','Discard usable stock','',`data-name="${esc(d.name)}" data-lot="${lot.id}"`)+btn('close','Keep it','cr-primary'));
      else {game.discard(d.name,Number(d.lot));toast('Expired stock removed.');inspect(d.name);}
    }
    else if(a==='confirm-discard'){game.discard(d.name,Number(d.lot));closeDialog();toast('Usable stock discarded and recorded as waste.',false);}
    else if(a==='rotate'){game.rotate(inspected);closeDialog();toast(game.lastExplanation);}
    else if(a==='bin'){category='rescue';drawTab();toast('Drag an expired product here, or select it and use the bin button.');}
    else if(a==='order-selected'){selected=inspected;tab='supply';frozen=false;closeDialog();}
    else if(a==='supplier'){supplier=d.supplier;if(!game.tutorial.compared.includes(supplier))game.tutorial.compared.push(supplier);drawTab();}
    else if(a==='qty-down'||a==='qty-up'){qty=Math.max(1,Math.min(100,qty+(a==='qty-up'?1:-1)));drawTab();}
    else if(a==='pack'){frozen=d.frozen==='true';drawTab();}
    else if(a==='add-cart'){addToCart([{name:selected,qty,supplier,frozen,express}]);toast('Added to your cart. Review before ordering.');}
    else if(a==='draft-small'||a==='draft-buffer'){tab='supply';addToCart(game.restockPlan(a==='draft-small'?8:12,supplier),true);toast('Cart drafted for your active menu. Adjust products or suppliers before checkout.');}
    else if(a==='remove-line'){cart.splice(Number(d.index),1);drawTab();}
    else if(a==='clear-cart'){cart=[];drawTab();}
    else if(a==='review-cart')checkout();
    else if(a==='place-order'){const problem=game.placeOrder(cart);if(problem)error(problem);else{cart=[];closeDialog();toast('Order placed! Delivery takes café time.');}}
    else if(a==='deliveries')deliveries();
    else if(a==='shelve-fifo'||a==='shelve-new') {
      if(game.shelve(Number(d.delivery),a==='shelve-fifo')){closeDialog();toast(game.lastExplanation);}
      checkEvents();
    }
    else if(a==='advance') {
      closeDialog(false);
      if(game.phase==='planning'){if(!game.advancePlanning())toast('No delivery or bakery batch is pending.',false);checkEvents();drawTab();}
    }
    else if(a==='menu-section'){menuSection=d.section;menuPage=0;drawTab();}
    else if(a==='menu-prev'||a==='menu-next'){menuPage+=a==='menu-prev'?-1:1;drawTab();}
    else if(a==='price-down'||a==='price-up'){if(!game.setPrice(d.id,game.menu[d.id].price+(a==='price-up'?.25:-.25)))toast('Price is at its allowed limit.',false);drawTab();}
    else if(a==='toggle-menu'){if(!game.toggleMenu(d.id))toast('Keep at least one drink on the menu.',false);drawTab();}
    else if(a==='recipe')recipeDialog(d.id);
    else if(a==='recipe-cart') {
      const p=MENU.find(p=>p.id===d.id);
      const lines=p.recipe.filter(n=>game.stock(n)+game.incoming(n)<6).map(name=>({name,qty:6-game.stock(name)-game.incoming(name),supplier,frozen:item(name).group==='bakery'&&game.strategy==='inhouse',express:false}));
      tab='supply';closeDialog();addToCart(lines);toast('Recipe supplies added to the cart.');
    }
    else if(a==='strategy')strategyDialog();
    else if(a==='choose-strategy'){game.setStrategy(d.strategy);closeDialog();menuSection='bakery';tab='menu';drawTab();toast('Strategy selected. Stock and capacity will show the tradeoff.');}
    else if(a==='buy-bakery'){selected=d.name;frozen=game.strategy==='inhouse';qty=frozen?4:6;tab='supply';drawTab();}
    else if(a==='bake'){const problem=game.bake(d.name);toast(problem||'Oven on! Labor and energy are included in this batch.',!problem);drawTab();}
    else if(a==='helper'){toast(game.hireHelper()?'Helper hired for today. Two customers can be prepared at once.':'Helper unavailable or not enough credit.',game.helper);drawTab();}
    else if(a==='reorder-cart'){tab='supply';addToCart(game.reorderPlan(supplier),true);}
    else if(a==='play')startShift();
    else if(a==='speed'){speed=Number(d.speed);updateHUD();toast(`${speed}× speed: sales, expiry and deliveries all move ${speed===1?'at normal speed':`${speed} times faster`}.`);}
    else if(a==='brief')briefing();
    else if(a==='event-choice'){const problem=game.chooseEvent(d.choice);if(problem)error(problem);else{closeDialog();toast(game.lastExplanation);}}
    else if(a==='report')report();
    else if(a==='next-day'){if(game.nextDay()){cart=[];category='rescue';tab='stock';closeDialog(false);briefing();drawTab();}}
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
    else if(a==='restart'){game=new InventorySim();window.inventoryGame=game;tab='stock';category='rescue';cart=[];dialogState=null;render();intro(0);}
    updateHUD();save();
  }
  function handleChange(e) {
    if(e.target.id==='cr-product'){selected=e.target.value;frozen=item(selected).group==='bakery'&&game.strategy==='inhouse';drawTab();}
    if(e.target.id==='cr-qty'){qty=Math.max(1,Math.min(100,Math.round(Number(e.target.value)||1)));drawTab();}
    if(e.target.id==='cr-express'){express=e.target.checked;drawTab();}
  }
  function updateHUD() {
    if(!game||!$('.cr-game'))return;
    patch('#cr-bank',`<small>Bank balance</small><b>${money(game.cash)}</b>`);
    patch('#cr-reputation',`<small>Reputation</small><b>${game.reputation}/100 <span>${game.reputation>=60?'😊':game.reputation>=35?'🙂':'😟'}</span></b>`);
    document.querySelectorAll('[data-day]').forEach(n=>{n.classList.toggle('done',Number(n.dataset.day)<game.day);n.classList.toggle('current',Number(n.dataset.day)===game.day);});
    $('#cr-phase').textContent=`Day ${game.day} · ${game.phase==='planning'?'Prepare the café':game.phase==='shift'?(game.running?'Café open':'Paused'):game.phase==='review'?'Review & improve':'Campaign complete'}`;
    $('#cr-clock').textContent=time(CONFIG.shiftSeconds-game.elapsed);$('#cr-progress').value=game.elapsed;
    $('#cr-save').textContent=saveError?'Save unavailable in this browser':game.phase==='planning'?'Planning time is yours · auto-save on':'All systems share the same clock · auto-save on';
    $('#cr-play').textContent=game.phase==='planning'?'Open café →':game.phase==='review'?'Day results →':game.phase==='complete'?'Your ending →':game.running?'Ⅱ Pause':'▶ Resume';
    document.querySelectorAll('[data-speed]').forEach(b=>b.setAttribute('aria-pressed',Number(b.dataset.speed)===speed));
    $('#cr-xp').textContent=`★ ${game.xp} IE XP · ${game.badges.length} milestones`;
    const pending=game.deliveries.filter(d=>!d.shelved),ready=pending.filter(d=>d.arrived).length,late=pending.some(d=>d.delayNotified&&!d.arrived);
    patch('#cr-dock',`📦 <b>${ready?'Supplies arrived!':late?'Delivery delayed':pending.length?`${pending.length} delivery pending`:'Delivery dock'}</b><small>${ready?'Click to shelve':late?'Check your safety stock':pending.length?'Click for timing':'No orders in transit'}</small>`);
    const reaction=game.reactions[0];
    const blocked=game.orders.find(o=>o.status==='waiting'&&game.missing(o).length);
    const low=game.upgrades.includes('tracker')?game.activeIngredients().find(n=>game.stock(n)<=Math.ceil(game.rate(n)*40)&&!game.incoming(n)):null;
    patch('#cr-feedback',`<span>${blocked?'⚠':game.expiredCount()?'🗑':reaction?.face||'🧑🏽‍🍳'}</span><div><b>${blocked?`Waiting on ${esc(game.missing(blocked)[0])}`:game.expiredCount()?'Expired stock is quarantined':low?`Tracker: reorder ${esc(low)}`:reaction?`${reaction.name} ${reaction.emotion}`:'Jules · your teammate'}</b><small>${blocked?'Order supplies, check recipes, or change the menu.':game.expiredCount()?'Clear it from the stockroom. It cannot be sold.':reaction?esc(reaction.text):game.phase==='planning'?'Small batches. Safe stock. One smart decision at a time.':'Customers are served automatically. Watch what they need.'}</small></div>`);
    patch('#cr-live-stats',`<span><b>${game.metrics.served}</b> served</span><span><b>${game.metrics.lost}</b> lost</span>`);
    if($('#cr-spendable'))$('#cr-spendable').textContent=`${money(game.spendable)} available`;
    if($('#cr-shopping-stock'))$('#cr-shopping-stock').textContent=`${item(selected).icon} ${game.stock(selected)} fresh · ${game.incoming(selected)} incoming`;
    if($('#cr-spaces'))$('#cr-spaces').textContent=`${game.capacity(selected)-game.occupied(selected)-game.incoming(selected)} shelf spaces`;
    if(game.xp>lastXP){const gained=game.xp-lastXP;lastXP=game.xp;toast(`★ +${gained} IE XP · ${game.badges.at(-1)}`);}
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
