/* Inventory Manager owns all rescue-story UI and state. Barista gameplay is unchanged. */
(() => {
  let game=null,workspace='shelves',category='milk',selected='Oat Milk',pack='fresh',speed=1;
  let tutorial=false,modalResume=false,reportShown=false,missionSeen=false,lastFrame=0,lastPaint=0,lastXP=0,toastTimer;
  const $=selector=>document.querySelector(selector);
  const money=value=>`${value<0?'−':''}$${Math.abs(value).toFixed(2)}`;
  const time=value=>{const seconds=Math.ceil(Math.max(0,value));return `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;};
  const labels={coffee:'Coffee',milk:'Milk',syrup:'Syrups',topping:'Toppings',bakery:'Bakery',supplies:'Supplies'};
  const symbols={coffee:'☕',milk:'🥛',syrup:'◒',topping:'☁',bakery:'🥐',supplies:'▣'};
  const product=name=>INVENTORY_ITEMS.find(item=>item.name===name);
  const incoming=name=>game.deliveries.filter(delivery=>!delivery.received).reduce((sum,delivery)=>sum+(delivery.cart[name]||0),0);
  const profit=()=>game.metrics.revenue-game.metrics.cogs-game.metrics.waste-game.metrics.fees;
  const state=name=>game.spoiled(name)?'expired':game.stock(name)===0?'empty':game.stock(name)<=Math.ceil(game.rate(name)*(product(name).lead+25))+1?'low':'good';
  const allSpoiled=()=>INVENTORY_ITEMS.reduce((sum,item)=>sum+game.spoiled(item.name),0);
  const freshBakery=()=>INVENTORY_ITEMS.filter(item=>item.group==='bakery').reduce((sum,item)=>sum+game.stock(item.name),0);
  const close=()=>{$('#inventory-modal')?.remove();$('#im-start')?.focus();};

  function dialog(title,body,buttons){
    $('#inventory-modal')?.remove();const node=document.createElement('div');node.id='inventory-modal';node.className='im-overlay';
    node.innerHTML=`<section role="dialog" aria-modal="true" aria-label="${title}" tabindex="-1"><span class="im-eyebrow">rISE · Café Rescue</span><h2>${title}</h2>${body}<footer>${buttons}</footer></section>`;app.append(node);node.querySelector('section').focus();
    node.onclick=event=>{const action=event.target.closest('[data-action]')?.dataset.action;if(action)act(action);};
    node.onkeydown=event=>{if(event.key!=='Tab')return;const controls=[...node.querySelectorAll('button,input,select,a[href]')].filter(control=>!control.disabled);const first=controls[0],last=controls.at(-1);if(event.shiftKey&&(document.activeElement===first||document.activeElement===node.querySelector('section'))){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}};
  }
  function start(){
    sim=null;paused=false;modalKind=null;document.body.classList.remove('playing');document.querySelectorAll('.modal-backdrop,.station-overlay').forEach(node=>node.remove());
    game=new InventorySim();window.inventoryGame=game;workspace='shelves';category='milk';selected='Oat Milk';pack='fresh';speed=1;tutorial=false;reportShown=false;missionSeen=false;lastXP=0;
    render();
    dialog('Can you save rISE Café?',`<div class="im-character">🧑🏽‍🍳 <span><b>Jules · your café teammate</b>“The fridge failed overnight. Our shelves are empty, the old food is spoiled, and we’re $35 in the hole. The school fundraiser is today. You’re our rescue engineer.”</span></div><div class="im-three"><span>🗑 Clear spoiled stock</span><span>📦 Choose your supplies</span><span>🥐 Plan the bakery</span></div><p>You have <b>$90 in rescue cash</b>. Earn back the café’s losses through smart decisions. Nobody knows who will walk through the door.</p>`, '<button data-action="tutorial" class="im-primary">Let’s rescue it · show me how →</button><button data-action="mission">I know the basics</button>');
  }
  const originalRoles=roles;
  roles=function(){game=null;window.inventoryGame=null;document.body.classList.remove('inventory-playing');originalRoles();const card=document.querySelector('.role-choice');if(!card)return;card.classList.remove('locked');card.classList.add('play');card.querySelector('small')?.remove();card.insertAdjacentHTML('beforeend','<button id="inventory-start" class="big-btn">Play Inventory →</button>');$('#inventory-start').onclick=start;};

  function mission(){
    missionSeen=true;
    modalResume=game.running;game.running=false;
    const text=['Clear the spoiled food, reopen with a small supply kit, and choose a bakery strategy before the first rush.','Students are talking about the café. Use the orders you observe to decide what to reorder.','Your last chance to bring rISE back. Protect the recovery balance and avoid end-of-day waste.'][game.daypart];
    dialog(`${game.label}: your mission`,`<p>${text}</p><div class="im-three"><span><b>Rescue</b>improve the balance</span><span><b>Serve</b>80% of actual arrivals</span><span><b>Waste less</b>under $5 of new waste</span></div><p><b>Demand is unknown.</b> Sales & trends shows what customers actually request. A short-date deal is cheaper, but it can expire before you sell it.</p><p class="im-muted">Your engineering tools: expiration control, safety stock, supplier lead time, make-or-buy, and continuous improvement.</p>`,'<button data-action="resume" class="im-primary">Back to the rescue →</button>');
  }
  function render(){
    document.body.classList.add('inventory-playing');
    app.innerHTML=`<main class="im-game" data-workspace="${workspace}"><header class="im-header"><div class="im-brand"><b>rISE Café</b><span>CAFE RESCUE · Inventory Manager</span></div><div class="im-hud"><span id="im-clock"></span><span>Rescue cash<b id="im-cash"></b></span><span>Recovery balance<b id="im-balance"></b></span><span>Served / arrived<b id="im-served"></b></span></div><button id="im-help">Help</button><button id="im-exit">Exit</button></header>
      <section id="im-guide" class="im-guide" aria-live="polite" hidden></section>
      <section class="im-controls"><div><b id="im-phase"></b><small id="im-notice"></small></div><div class="im-time"><button id="im-start" class="im-primary">Reopen café</button><div class="im-speeds" role="group" aria-label="Simulation speed">${[1,3,6].map(value=>`<button data-speed="${value}" aria-label="${value} times speed">${value}×</button>`).join('')}</div><button id="im-jump">Next delivery ⏩</button><button id="im-dock-open">🚚 Dock</button></div></section>
      <div class="im-layout"><nav class="im-sidebar" aria-label="Inventory navigation"><span class="im-eyebrow">Your engineering desk</span><button data-workspace="shelves">▤ Inventory shelves</button><button data-workspace="orders">▣ Order supplies</button><button data-workspace="trends">▥ Sales & trends</button><button data-workspace="bakery">🥐 Bakery strategy</button><div class="im-story"><span>🧑🏽‍🍳</span><b>Jules’ rescue checklist</b><div id="im-checklist"></div><button id="im-mission">View mission</button></div><div class="im-xp"><b id="im-xp"></b><span id="im-badges"></span></div></nav>
      <section class="im-stock"><div class="im-title"><h1>Inventory shelves</h1><button id="im-clear">🗑 Clear expired</button></div><nav class="im-categories" aria-label="Product categories">${Object.entries(labels).map(([key,label])=>`<button data-category="${key}">${symbols[key]} ${label}</button>`).join('')}</nav><div id="im-products" class="im-products"></div><div class="im-stock-note">Fresh stock only is usable. Red expiry tags mean clear it before ordering more.</div></section>
      <aside class="im-order"><div class="im-title"><h2>Choose your supplies</h2></div><label class="im-product-picker" for="im-product-select">Product <select id="im-product-select">${INVENTORY_ITEMS.map(item=>`<option ${item.name===selected?'selected':''}>${item.name}</option>`).join('')}</select></label><div id="im-order-card"></div></aside>
      <aside class="im-dock"><div class="im-title"><h2>Delivery dock</h2><span id="im-pending"></span></div><div id="im-deliveries"></div><div class="im-objectives"><h3>📦 Reopening kit</h3><p>Core drink ingredients & serving supplies. Choose bakery stock yourself.</p><button id="im-kit" class="im-primary">Order reopening kit</button><p id="im-kit-note" role="status"></p></div><button id="im-results" hidden>Chapter results →</button></aside>
      <section class="im-trends"><div class="im-title"><h1>Sales & trends</h1><span>Observed orders · no crystal ball</span></div><div id="im-charts"></div></section>
      <section class="im-bakery"><div class="im-title"><h1>Bakery strategy</h1><span>Make or buy?</span></div><p class="im-bakery-intro">First order becomes the featured pastry. Buy ready-made or bake frozen stock. Later chapters expand the menu.</p><div id="im-bakery-cards"></div><div id="im-oven"></div></section></div>
      <footer class="im-footer"><span id="im-speed-note"></span><span>Industrial engineering = making a messy system work better.</span></footer><div id="im-reward" class="im-reward" role="status" hidden></div></main>`;
    app.querySelectorAll('.im-sidebar [data-workspace]').forEach(button=>button.onclick=()=>setWorkspace(button.dataset.workspace));
    app.querySelectorAll('[data-category]').forEach(button=>button.onclick=()=>{category=button.dataset.category;drawProducts();});
    app.querySelectorAll('[data-speed]').forEach(button=>button.onclick=()=>{speed=Number(button.dataset.speed);update();});
    $('#im-start').onclick=()=>{if(game.ended)return;if(!missionSeen){mission();return;}if(game.running)game.running=false;else{const error=game.open();if(error){game.notice(error);dialog('One thing before we reopen',`<p>${error}</p>`,'<button data-action="review" class="im-primary">I’ll fix it</button>');}else tutorial=false;}update();};
    $('#im-clear').onclick=()=>{const qty=game.clearExpired();game.notice(qty?`🗑 Cleared ${qty} expired units. No unsafe food will be served.`:'No expired stock. Nice work.');update();};
    $('#im-kit').onclick=()=>{const error=game.starter();$('#im-kit-note').textContent=error||'Kit on the way! Use Next delivery while planning.';update();};
    $('#im-product-select').onchange=event=>{selected=event.target.value;pack='fresh';drawOrder();update();};
    $('#im-jump').onclick=advance;
    $('#im-help').onclick=()=>{modalResume=game.running;game.running=false;dialog('You are the rescue engineer', '<div class="im-three"><span>🗑 Remove expired stock</span><span>📦 Compare supply packs</span><span>📈 Watch actual demand</span></div><p>Start with the reopening kit and a bakery plan. Choose Fresh for shelf life, or Short-date for a cheaper but risky box. Frozen pastries need a batch in the oven. Use pause to think, and speed up when you are ready.</p><p>Recovery balance includes the inherited $35 loss. Working cash pays for supplies. Buying stock affects cash now; profit counts it when used or expired.</p>','<button data-action="resume" class="im-primary">Back to my rescue</button>');};
    $('#im-mission').onclick=mission;$('#im-results').onclick=report;
    $('#im-dock-open').onclick=()=>{modalResume=game.running;game.running=false;dialog('Your deliveries',`${deliveryMarkup()}<p>Deliveries and batches pause here. Use Next delivery to advance.</p>`,`${!game.starterUsed?'<button data-action="kit" class="im-primary">Order reopening kit</button>':''}<button data-action="resume">Back</button>`);};
    $('#im-exit').onclick=()=>{modalResume=game.running;game.running=false;dialog('Leave the café rescue?','<p>Your current rescue will reset.</p>','<button data-action="resume">Stay</button><button data-action="home">Choose role</button>');};
    drawProducts();drawOrder();update();
  }
  function setWorkspace(next){workspace=next;$('.im-game').dataset.workspace=workspace;app.querySelectorAll('.im-sidebar [data-workspace]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.workspace===workspace));if(next==='trends')drawTrends();if(next==='bakery')drawBakery();}
  function drawProducts(){
    if(!$('#im-products'))return;
    app.querySelectorAll('[data-category]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.category===category));
    $('#im-products').innerHTML=INVENTORY_ITEMS.filter(item=>item.group===category).map(item=>{
      const expired=game.spoiled(item.name),lots=game.lots[item.name].filter(lot=>lot.expires>game.clock&&!lot.frozen),freshness=lots.length?time(Math.min(...lots.map(lot=>lot.expires))-game.clock):'—';
      return `<article class="im-stock-card ${state(item.name)}"><button class="im-product ${state(item.name)}" data-product="${item.name}" aria-label="${item.name}, ${game.stock(item.name)} fresh, ${expired} expired"><span class="im-product-icon">${item.icon}</span><strong>${item.name}</strong><b>${game.stock(item.name)}<small> fresh</small></b><span class="im-stock-label">${expired?'⚠ '+expired+' EXPIRED':game.stock(item.name)?'⏳ '+freshness+' until expiry':'Empty shelf'}${incoming(item.name)?' · +'+incoming(item.name)+' coming':''}</span></button>${expired?`<button class="im-discard" data-discard="${item.name}">🗑 Discard ${expired}</button>`:''}</article>`;
    }).join('');
    app.querySelectorAll('[data-product]').forEach(button=>button.onclick=()=>{selected=button.dataset.product;pack='fresh';setWorkspace('orders');$('#im-product-select').value=selected;drawOrder();});
    app.querySelectorAll('[data-discard]').forEach(button=>button.onclick=()=>{game.discard(button.dataset.discard);update();});
  }
  function drawOrder(){
    if(!$('#im-order-card'))return;const item=product(selected);if(!game.offer(selected,pack))pack='fresh';const offer=game.offer(selected,pack);
    const free=Math.max(0,item.cap-game.occupied(selected)-incoming(selected));
    $('#im-order-card').innerHTML=`<div class="im-company" style="--company:${item.color}"><span>${item.icon}</span><div><small>Your ${item.name} supplier</small><h3>${item.company}</h3><b>Choose the right box, not just the lowest price.</b></div></div><div class="im-pack-choices" role="group" aria-label="Supply pack">${['fresh',...(item.group!=='supplies'?['value']:[]),...(item.group==='bakery'?['frozen']:[])].map(kind=>{const choice=game.offer(selected,kind);return `<button data-pack="${kind}" aria-pressed="${pack===kind}"><b>${kind==='fresh'?'🌿 Fresh':kind==='value'?'🏷 Short-date':'❄ Frozen'}</b><span>${money(choice.unit)} each · ${choice.lead}s delivery</span><small>${kind==='value'?'Expires in 75s after arrival':kind==='frozen'?'Bake before selling · 800s frozen life':'Usable for '+time(choice.life)+' after arrival'}</small></button>`;}).join('')}</div><div class="im-facts"><span><b id="im-order-stock">${game.stock(selected)}</b> fresh</span><span><b id="im-incoming">${incoming(selected)}</b> on the way</span><span><b>${game.frozen(selected)}</b> frozen</span></div><form id="im-buy-form"><label for="im-qty">How many?</label><div class="im-quantity"><button type="button" id="im-less" aria-label="Decrease quantity">−</button><input id="im-qty" type="number" min="1" max="${Math.max(1,free)}" step="1" required value="${Math.min(Math.max(1,pack==='frozen'?3:item.group==='bakery'?3:game.suggested(selected)),Math.max(1,free))}"><button type="button" id="im-more" aria-label="Increase quantity">+</button></div><div class="im-picks">${[3,6,9].map(qty=>`<button type="button" data-quantity="${qty}">${qty}</button>`).join('')}</div><div id="im-quote" class="im-quote"></div><button class="im-primary" id="im-buy">Place order →</button><p id="im-error" role="status"></p></form>`;
    app.querySelectorAll('[data-pack]').forEach(button=>button.onclick=()=>{pack=button.dataset.pack;drawOrder();});
    $('#im-less').onclick=()=>quantity(-1);$('#im-more').onclick=()=>quantity(1);
    app.querySelectorAll('[data-quantity]').forEach(button=>button.onclick=()=>{$('#im-qty').value=Math.min(Number(button.dataset.quantity),Math.max(1,free));quote();});
    $('#im-qty').oninput=quote;
    $('#im-buy-form').onsubmit=event=>{event.preventDefault();const error=game.purchase({[selected]:Number($('#im-qty').value)},item.company,pack);$('#im-error').textContent=error||'✓ On the way. Watch the dock.';if(!error&&item.group==='bakery')game.earn('bakeryplan','Make-or-buy: bakery plan chosen');update();};quote();
  }
  function quantity(delta){const input=$('#im-qty');input.value=Math.max(1,Math.min(Number(input.max),Number(input.value)+delta));quote();}
  function quote(){if(!$('#im-qty'))return;const qty=Number($('#im-qty').value);$('#im-quote').textContent=`${money(game.quote({[selected]:Number.isFinite(qty)?qty:0},product(selected).company,pack))} total · ${game.offer(selected,pack).lead}s delivery`;}

  function drawTrends(){
    const requests=game.metrics.arrived;const start=game.clock-game.elapsed;
    const bins=Array.from({length:5},(_,index)=>game.orders.filter(order=>order.arrival-start>=index*60&&order.arrival-start<(index+1)*60).length),max=Math.max(1,...bins);
    const top=Object.entries(game.metrics.demand).filter(([name])=>product(name).group!=='supplies').sort((a,b)=>b[1]-a[1]).slice(0,6);
    $('#im-charts').innerHTML=`<div class="im-trend-stats"><span><b>${requests}</b>orders observed</span><span><b>${game.metrics.served}</b>served</span><span><b>${game.metrics.lost}</b>lost</span><span><b>${money(game.metrics.waste)}</b>new waste</span></div><section class="im-chart"><h3>What happened each minute?</h3><div class="im-demand-bars">${bins.map((count,index)=>`<div><b>${game.elapsed<index*60?"?":count}</b><i style="height:${Math.max(3,count/max*90)}px"></i><small>${index+1} min</small></div>`).join('')}</div><p>These bars show real arrivals so far. Question marks mean the future is unknown, not zero demand.</p></section><section class="im-chart"><h3>What are people asking for?</h3>${top.length?top.map(([name,count])=>`<div class="im-demand-row"><span>${name}</span><b>${count} requested</b><small>≈ ${(game.rate(name)*60).toFixed(1)}/min observed</small></div>`).join(''):'<p>No customer data yet. Start small and adjust after observing demand.</p>'}</section><div class="im-ie-note"><b>IE skill: demand forecasting</b><p>Use recent requests—including lost sales—to estimate demand. Keep enough safety stock for the time your next delivery takes.</p></div>`;
  }
  function drawBakery(){
    $('#im-bakery-cards').innerHTML=INVENTORY_ITEMS.filter(item=>item.group==='bakery').map(item=>`<article><span>${item.icon}</span><h3>${item.name}</h3><p>${game.stock(item.name)} fresh · ${game.frozen(item.name)} frozen</p><button data-bakery-buy="${item.name}">Buy ready-made</button><button data-bakery-frozen="${item.name}">Order frozen · bake later</button><button data-bake="${item.name}" ${game.frozen(item.name)<3||game.oven?'disabled':''}>Bake 3 · 25s · $0.40</button></article>`).join('');
    $('#im-oven').innerHTML=`<div class="im-oven"><span>${game.oven?'🔥':'♨'}</span><div><b>${game.oven?'Batch in progress':'One oven. Choose your batch.'}</b><p>${game.oven?game.oven.name+' · '+time(game.oven.ready-game.clock)+' remaining':'Frozen stock is unusable until baked. Small batches reduce waste.'}</p></div></div><div class="im-ie-note"><b>IE skill: process & capacity planning</b><p>Ready-made saves time. Frozen saves ingredient cost, but the oven becomes a bottleneck. What fits today’s demand?</p></div>`;
    app.querySelectorAll('[data-bakery-buy],[data-bakery-frozen]').forEach(button=>button.onclick=()=>{selected=button.dataset.bakeryBuy||button.dataset.bakeryFrozen;pack=button.dataset.bakeryFrozen?'frozen':'fresh';setWorkspace('orders');$('#im-product-select').value=selected;drawOrder();});
    app.querySelectorAll('[data-bake]').forEach(button=>button.onclick=()=>{const error=game.bake(button.dataset.bake);if(error)game.notice(error);update();});
  }
  function deliveryMarkup(){const pending=game.deliveries.filter(delivery=>!delivery.received);return pending.length?pending.slice(0,4).map(delivery=>{const name=Object.keys(delivery.cart)[0],item=product(name);return `<div class="im-delivery"><span>${delivery.kit?'📦':item.icon}</span><div><b>${delivery.kit?'Core reopening kit':delivery.cart[name]+' '+name}</b><small>${delivery.supplier} · ${time(delivery.eta-game.clock)}</small><progress max="${delivery.lead}" value="${Math.max(0,delivery.lead-(delivery.eta-game.clock))}"></progress></div></div>`;}).join('')+(pending.length>4?`<p>+${pending.length-4} more tracked</p>`:''):'<div class="im-empty-dock"><span>🚚</span><b>No deliveries pending</b><p>Order only what your café needs.</p></div>';}

  function drawGuide(){
    const guide=$('#im-guide');guide.hidden=!tutorial;if(!tutorial)return;
    let text,button;
    if(allSpoiled()){text='First, make it safe: clear the expired stock. Spoiled food takes up shelf space and cannot be served.';button='<button data-guide="clear" class="im-primary">🗑 Clear expired stock</button>';}
    else if(!game.starterUsed){text='Now rebuild the basics: order one reopening kit. It covers the small first-shift drink menu; bakery is your decision.';button='<button data-guide="kit" class="im-primary">📦 Order reopening kit</button>';}
    else if(!game.quests.bakeryplan){text='Choose your bakery plan before opening. Your first pastry order sets the menu. Ready-made is faster; frozen needs oven time.';button='<button data-guide="bakery" class="im-primary">🥐 Try bakery strategy</button>';}
    else if(game.deliveries.some(delivery=>!delivery.received)){text='Supplies need delivery time. While the café is closed, receive them without admitting customers yet.';button='<button data-guide="wait" class="im-primary">🚚 Receive supplies</button>';}
    else if(game.oven){text='Your frozen pastry batch is warming. The oven is a limited resource: only one batch fits.';button='<button data-guide="wait" class="im-primary">🔥 Finish batch</button>';}
    else if(!freshBakery()&&INVENTORY_ITEMS.some(item=>game.frozen(item.name)>=3)){text='Frozen pastries cannot be sold yet. Open Bakery strategy and bake a small batch.';button='<button data-guide="bakery" class="im-primary">🥐 Bake my batch</button>';}
    else{text='Ready to reopen! Watch real requests in Sales & trends. Your decisions now count toward the rescue.';button='<button data-guide="ready" class="im-primary">Show mission →</button>';}
    const markup=`<div><small>JULES’ RESCUE TUTORIAL · DO ONE THING AT A TIME</small><b>${text}</b></div>${button}`;
    if(guide.dataset.checkpoint===text)return;
    guide.dataset.checkpoint=text;
    guide.innerHTML=markup;
    guide.querySelector('[data-guide]').onclick=event=>{const action=event.currentTarget.dataset.guide;if(action==='clear')game.clearExpired();if(action==='kit'){const error=game.starter();if(error)game.notice(error);}if(action==='bakery')setWorkspace('bakery');if(action==='wait')advance();if(action==='ready'){tutorial=false;mission();}update();};
  }
  function update(){
    if(!game||!$('.im-game'))return;
    $('#im-clock').textContent=`${game.label} · ${time(300-game.elapsed)}`;$('#im-cash').textContent=money(game.cash);$('#im-balance').textContent=money(game.balance);$('#im-balance').classList.toggle('im-negative',game.balance<0);$('#im-served').textContent=`${game.metrics.served} / ${game.metrics.arrived}`;
    $('#im-start').textContent=game.ended?'Chapter complete':game.running?'Pause':game.elapsed?'Resume':'Reopen café';$('#im-start').disabled=game.ended;
    const blocked=game.orders.find(order=>order.status==='waiting'&&game.missing(order).length);
    $('#im-phase').textContent=game.ended?'Chapter finished':game.running?(blocked?'⚠ Missing '+game.missing(blocked)[0]+' · restock now!':allSpoiled()?'⚠ Expired stock · clear the shelves':'Café open · watch actual demand'):game.elapsed?'Paused · time to rethink':'Planning · customers wait outside';$('#im-notice').textContent=game.messages[0];
    app.querySelectorAll('[data-speed]').forEach(button=>{button.setAttribute('aria-pressed',Number(button.dataset.speed)===speed);button.disabled=game.ended;});
    $('#im-speed-note').textContent=`${speed}× · ${game.running?'customers, expiry, and deliveries all advance':'time paused for decisions'}`;
    $('#im-jump').disabled=game.ended||(!game.oven&&!game.deliveries.some(delivery=>!delivery.received));
    $('#im-jump').textContent=game.oven&&!game.deliveries.some(delivery=>!delivery.received)?'Finish batch ⏩':'Next delivery ⏩';
    $('#im-clear').disabled=!allSpoiled();$('#im-kit').disabled=game.starterUsed;$('#im-kit').textContent=game.starterUsed?'✓ Kit ordered':'Order reopening kit';
    $('#im-pending').textContent=game.deliveries.filter(delivery=>!delivery.received).length+' pending';$('#im-deliveries').innerHTML=deliveryMarkup();
    $('#im-checklist').innerHTML=[['cleanup','Clear spoiled stock'],['kit','Restock the basics'],['bakeryplan','Choose bakery strategy'],['service','Save five customers']].map(([key,title])=>`<p>${game.quests[key]?'✅':'○'} ${title}</p>`).join('');
    $('#im-xp').textContent=`★ ${game.xp} IE XP`;$('#im-badges').textContent=game.badges.at(-1)||'Turn a broken system into a comeback.';
    $('#im-results').hidden=!game.ended;
    if($('#im-buy')){$('#im-buy').disabled=game.ended;$('#im-order-stock').textContent=game.stock(selected);$('#im-incoming').textContent=incoming(selected);$('#im-qty').max=Math.max(1,product(selected).cap-game.occupied(selected)-incoming(selected));}
    drawProducts();drawGuide();if(workspace==='trends')drawTrends();if(workspace==='bakery')drawBakery();
    setWorkspaceState();
    if(game.xp>lastXP){lastXP=game.xp;const reward=$('#im-reward');reward.hidden=false;reward.textContent=`★ +25 IE XP · ${game.badges.at(-1)}`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{if($('#im-reward'))$('#im-reward').hidden=true;},3000);}
    if(game.ended&&!reportShown&&!$('#inventory-modal')){reportShown=true;report();}
  }
  function setWorkspaceState(){app.querySelectorAll('.im-sidebar [data-workspace]').forEach(button=>button.setAttribute('aria-pressed',button.dataset.workspace===workspace));}

  function checkEvents(){
    if(!game||$('#inventory-modal')||game.ended)return;
    const arrived=game.deliveries.filter(delivery=>!delivery.received&&delivery.eta<=game.clock);
    if(arrived.length){modalResume=game.running;game.running=false;arrived.forEach(delivery=>game.receive(delivery.id));dialog('Supplies arrived!',`<div class="im-delivery-art">🚚 📦</div><p>${arrived.map(delivery=>delivery.kit?'<b>Your reopening kit is here!</b>':Object.entries(delivery.cart).map(([name,qty])=>`<b>+${qty} ${name}</b>${delivery.offer?.frozen?' frozen · bake before serving':''}`).join('<br>')).join('<br>')}</p><p>Check freshness before ordering more. Oldest expiry is used first.</p>`,'<button data-action="delivery" class="im-primary">Let’s keep the rescue moving →</button>');update();return;}
    if(game.pendingEvent){modalResume=game.running;game.running=false;dialog(game.pendingEvent.title,`<div class="im-character">🧑🏽‍🍳<span>${game.pendingEvent.text}</span></div><p>No guaranteed crowd. Do you have the stock and oven capacity for a promotion?</p>`,'<button data-action="promote" class="im-primary">Take the opportunity!</button><button data-action="steady">Keep it steady</button>');}
  }
  function advance(){
    if(game.ended)return;const pending=game.deliveries.filter(delivery=>!delivery.received);const targets=pending.map(delivery=>delivery.eta);if(game.oven)targets.push(game.oven.ready);if(!targets.length)return;const target=Math.min(...targets);
    if(game.elapsed===0&&!game.running){game.clock=target;game.markExpired();if(game.oven&&game.clock>=game.oven.ready){const batch=game.oven;game.add(batch.name,3,batch.cost/3,170);game.oven=null;}checkEvents();update();return;}
    game.running=true;while(game.clock<target&&!game.ended&&!game.pendingEvent)game.tick(Math.min(1,target-game.clock));checkEvents();update();
  }
  function report(){
    const result=game.reports.at(-1);if(!result)return;
    dialog(game.daypart===2?(game.balance>=0?'You brought rISE back!':'A comeback in progress'):`${game.label} · chapter complete`,`<div class="im-three"><span><b>${money(game.balance)}</b>recovery balance</span><span><b>${result.served}/${result.arrived}</b>actual customers served</span><span><b>${money(result.waste)}</b>new expired stock</span></div><p>Jules: “${result.profit>0?'We made money this shift! That’s one step closer to saving our café.':'A rough shift is data, not defeat. Which missing ingredient or expiry caused the biggest problem?'}”</p><p><b>Your IE skills:</b> ${game.badges.join(' · ')||'Keep experimenting with small, early orders.'}</p><details><summary>Follow the money</summary><p>${money(result.revenue)} sales − ${money(result.cogs)} ingredients consumed − ${money(result.waste)} new waste − ${money(result.fees)} fees = ${money(result.profit)} shift profit. Recovery balance starts at −$35. Purchases reduce cash; unused inventory remains an asset.</p></details>${!game.upgrade?'<div class="im-upgrade"><b>Choose a permanent improvement</b><button data-action="fridge">❄ Better fridge · $12 · new perishables last 40% longer</button><button data-action="route">🚲 Supplier route · $8 · deliveries 8s faster</button><p id="im-upgrade-error" role="status"></p></div>':''}`,`<button data-action="review">Review my data</button>${game.daypart<2?'<button data-action="next" class="im-primary">Next story chapter →</button>':'<button data-action="retry" class="im-primary">Try a new rescue</button><button data-action="home">Choose role</button>'}`);
  }
  function act(action){
    if(action==='kit'){const error=game.starter();close();if(error)dialog('Check the stockroom',`<p>${error}</p>`,'<button data-action="review" class="im-primary">Back to shelves</button>');game.running=modalResume;modalResume=false;update();return;}
    if(['fridge','route'].includes(action)){const error=game.buyUpgrade(action==='route'?'delivery':action);if(error){$('#im-upgrade-error').textContent=error;return;}report();update();return;}
    close();
    if(action==='tutorial'){tutorial=true;update();}
    if(action==='mission')mission();
    if(action==='resume'||action==='delivery'){game.running=modalResume;modalResume=false;if(action==='delivery')drawOrder();}
    if(action==='promote'||action==='steady'){game.chooseEvent(action);game.running=modalResume;modalResume=false;}
    if(action==='next'){game.next();reportShown=false;missionSeen=false;tutorial=false;render();mission();}
    if(action==='retry')start();
    if(action==='home'){roles();return;}
    update();
  }
  function loop(now){const dt=lastFrame?Math.min((now-lastFrame)/1000,.1):0;lastFrame=now;if(game&&!$('#inventory-modal')){game.tick(dt*speed);checkEvents();}if(game&&now-lastPaint>500){update();lastPaint=now;}requestAnimationFrame(loop);}
  requestAnimationFrame(loop);roles();
})();
