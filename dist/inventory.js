/* Inventory Manager owns its UI and simulation; Barista Mode is not modified. */
(() => {
  let game = null, category = 'milk', selected = 'Oat Milk', speed = 1;
  let tutorial = null, lastFrame = 0, lastPaint = 0, reportShown = false, modalResume = false;
  let mobileView = 'stock';
  const $ = selector => document.querySelector(selector);
  const money = value => '$' + value.toFixed(2);
  const time = value => `${Math.floor(Math.max(0, value) / 60)}:${String(Math.ceil(Math.max(0, value) % 60)).padStart(2, '0')}`;
  const labels = {coffee:'Coffee', milk:'Milk', syrup:'Syrups', topping:'Toppings', bakery:'Bakery', supplies:'Supplies'};
  const symbols = {coffee:'☕', milk:'🥛', syrup:'◒', topping:'☁', bakery:'🥐', supplies:'▣'};
  const item = name => INVENTORY_ITEMS.find(product => product.name === name);
  const incoming = name => game.deliveries.filter(delivery => !delivery.received).reduce((sum, delivery) => sum + (delivery.cart[name] || 0), 0);
  const profit = () => game.metrics.revenue - game.metrics.cogs - game.metrics.waste - game.metrics.fees;
  const required = name => Math.max(1, Math.ceil((game.forecast()[name] || 0) * item(name).lead / 300) + 1);
  const status = name => game.stock(name) === 0 ? 'empty' : game.stock(name) <= required(name) ? 'low' : 'good';

  function dialog(title, body, buttons) {
    $('#inventory-modal')?.remove();
    const backdrop = document.createElement('div');
    backdrop.className = 'im-overlay';
    backdrop.id = 'inventory-modal';
    backdrop.innerHTML = `<section role="dialog" aria-modal="true" aria-label="${title}" tabindex="-1"><span class="im-eyebrow">rISE · Inventory Manager</span><h2>${title}</h2>${body}<footer>${buttons}</footer></section>`;
    app.append(backdrop);
    backdrop.querySelector('section').focus();
    // Keep keyboard focus inside the active dialog.
    backdrop.onkeydown = event => {
      if (event.key !== 'Tab') return;
      const controls = [...backdrop.querySelectorAll('button, input, select, a[href]')].filter(node => !node.disabled);
      const first = controls[0], last = controls.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === backdrop.querySelector('section'))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    backdrop.onclick = event => {
      const action = event.target.closest('[data-action]')?.dataset.action;
      if (action) handleAction(action);
    };
  }
  const closeDialog = () => { $('#inventory-modal')?.remove(); $('#im-start')?.focus(); };

  function startInventory() {
    sim = null;
    paused = false;
    modalKind = null;
    document.querySelectorAll('.modal-backdrop,.station-overlay').forEach(node => node.remove());
    document.body.classList.remove('playing');
    game = new InventorySim();
    window.inventoryGame = game;
    category = 'milk'; selected = 'Oat Milk'; speed = 1; mobileView = 'stock';
    tutorial = null; reportShown = false;
    render();
    dialog('Your stockroom. Your call.', '<p>Keep the café supplied. Spot low stock, order what you need, and receive deliveries before you run out.</p><div class="im-three"><span>① Check stock</span><span>② Order</span><span>③ Receive</span></div><p class="im-muted">Start with one practice order. Your real cash and stock reset afterward.</p>', '<button data-action="tutorial" class="im-primary">Teach me how to play →</button><button data-action="skip">I know how · show mission</button>');
  }

  // Extend the role chooser only while preserving its existing barista handler.
  const originalRoles = roles;
  roles = function() {
    game = null; window.inventoryGame = null;
    document.body.classList.remove('inventory-playing');
    originalRoles();
    const card = document.querySelector('.role-choice');
    if (!card) return;
    card.classList.remove('locked'); card.classList.add('play'); card.querySelector('small')?.remove();
    card.insertAdjacentHTML('beforeend', '<button id="inventory-start" class="big-btn">Play Inventory →</button>');
    $('#inventory-start').onclick = startInventory;
  };

  function mission() {
    game.running = false;
    const objectives = ['Oat Milk is low. Reorder before the first rush.', 'Cold Brew demand rises. Check coffee and straws.', 'A quieter shift. Buy small amounts to limit waste.'];
    dialog(`${game.label} mission`, `<p>${objectives[game.daypart]}</p><div class="im-three"><span><b>90%</b> customers served</span><span><b>Under $5</b> wasted stock</span><span><b>Positive</b> shift profit</span></div><p>You have <b>${money(game.cash)}</b> and <b>${game.schedule.length} customers</b> expected. Orders take 20–35 café seconds to arrive. Plan while paused, then press <b>Start shift</b>.</p>`, '<button data-action="plan" class="im-primary">Let me check my stock →</button>');
  }

  function render() {
    document.body.classList.add('inventory-playing');
    app.innerHTML = `<main class="im-game" data-view="${mobileView}">
      <header class="im-header"><div class="im-brand"><b>rISE Café</b><span>Inventory Manager</span></div><div class="im-hud"><span id="im-clock"></span><span>Cash <b id="im-cash"></b></span><span>Served <b id="im-served"></b></span><span>Profit <b id="im-profit"></b></span></div><button id="im-help">Help</button><button id="im-exit">Exit</button></header>
      <section id="im-guide" class="im-guide" aria-live="polite" hidden></section>
      <section class="im-controls"><div><b id="im-phase"></b><small id="im-notice"></small></div><div class="im-time"><button id="im-start" class="im-primary">Start shift</button><div class="im-speeds" role="group" aria-label="Simulation speed">${[1,3,6].map(value => `<button data-speed="${value}" aria-label="${value} times speed">${value}×</button>`).join('')}</div><button id="im-jump">To next delivery ⏩</button></div></section>
      <nav class="im-mobile" aria-label="Workspace"><button data-view="stock">Stock</button><button data-view="order">Order</button><button data-view="dock">Deliveries</button></nav>
      <div class="im-layout"><section class="im-stock"><div class="im-title"><h1>Stockroom</h1><span class="im-legend">● Healthy <i>● Low</i> <em>● Empty</em></span></div><nav class="im-categories" aria-label="Product categories">${Object.entries(labels).map(([key,label]) => `<button data-category="${key}">${symbols[key]} ${label}</button>`).join('')}</nav><div id="im-products" class="im-products"></div><div class="im-stock-note">One unit = one serving or supply item. Customers use stock automatically.</div></section>
      <aside class="im-order"><h2>Order one product</h2><div id="im-order-card"></div></aside>
      <aside class="im-dock"><div class="im-title"><h2>Delivery dock</h2><span id="im-pending"></span></div><div id="im-deliveries"></div><div class="im-objectives"><h3>Shift goals</h3><p>Serve 90% · Waste &lt; $5 · Make a profit</p><button id="im-mission">View mission</button></div><button id="im-results" hidden>Shift results →</button></aside></div>
      <footer class="im-footer"><span id="im-speed-note">1× · one café second per real second</span><span>Small orders. Early deliveries. Happy café.</span></footer></main>`;
    app.querySelectorAll('[data-category]').forEach(button => button.onclick = () => {
      category = button.dataset.category;
      if (tutorial === 0 && category === 'milk') tutorial = 1;
      drawProducts(); drawGuide();
    });
    app.querySelectorAll('[data-view]').forEach(button => button.onclick = () => setView(button.dataset.view));
    app.querySelectorAll('[data-speed]').forEach(button => button.onclick = () => { speed = Number(button.dataset.speed); update(); });
    $('#im-start').onclick = () => { if (tutorial !== null || game.ended) return; game.running = !game.running; update(); };
    $('#im-jump').onclick = advanceToDelivery;
    $('#im-help').onclick = () => {
      modalResume = game.running; game.running = false;
      dialog('Three things to do', '<div class="im-three"><span>① Click a low product</span><span>② Choose quantity & order</span><span>③ Receive it at the dock</span></div><p>Each product has its own supplier. Use 1× for careful decisions or 3× / 6× to move faster. <b>To next delivery</b> advances the café too: customers keep using stock.</p><p>Yellow means order soon. Red means empty. Keep bakery orders small so they don’t expire.</p>', '<button data-action="resume" class="im-primary">Got it</button>');
    };
    $('#im-mission').onclick = () => { modalResume = game.running; mission(); };
    $('#im-results').onclick = report;
    $('#im-exit').onclick = () => { modalResume = game.running; game.running = false; dialog('Leave this day?', '<p>Leaving clears your inventory progress.</p>', '<button data-action="resume">Stay here</button><button data-action="home">Choose role</button>'); };
    drawProducts(); drawOrder(); update();
  }

  function setView(view) {
    mobileView = view; $('.im-game').dataset.view = view;
    app.querySelectorAll('.im-mobile button').forEach(button => button.setAttribute('aria-pressed', button.dataset.view === view));
  }
  function drawProducts() {
    app.querySelectorAll('[data-category]').forEach(button => button.setAttribute('aria-pressed', category === button.dataset.category));
    $('#im-products').innerHTML = INVENTORY_ITEMS.filter(product => product.group === category).map(product => `<button class="im-product ${status(product.name)} ${selected === product.name ? 'selected' : ''}" data-product="${product.name}" aria-label="${product.name}, ${game.stock(product.name)} in stock" ${tutorial !== null && (tutorial !== 1 || product.name !== 'Oat Milk') ? 'disabled' : ''}><span class="im-product-icon">${product.group === 'supplies' ? ({Cup:'☕',Lid:'◎',Straw:'╱',Utensil:'🍴','Bakery Bag':'▣',Napkin:'▧'}[product.name]) : symbols[product.group]}</span><strong>${product.name}</strong><b>${game.stock(product.name)}<small> left</small></b><span class="im-stock-label">${status(product.name) === 'good' ? 'Healthy' : status(product.name) === 'low' ? 'Order soon' : 'Out of stock'}${incoming(product.name) ? ' · +' + incoming(product.name) + ' coming' : ''}</span></button>`).join('');
    app.querySelectorAll('[data-product]').forEach(button => button.onclick = () => {
      selected = button.dataset.product;
      if (tutorial === 1 && selected === 'Oat Milk') tutorial = 2;
      drawProducts(); drawOrder(); drawGuide(); setView('order');
    });
  }
  function drawOrder() {
    const product = item(selected);
    const free = Math.max(0, product.cap - game.stock(selected) - incoming(selected));
    $('#im-order-card').innerHTML = `<div class="im-company" style="--company:${product.color}"><span>${product.icon}</span><div><small>Your ${product.name} supplier</small><h3>${product.company}</h3><b>🚚 ${product.lead} café seconds</b></div></div><h3 class="im-chosen">${product.name}</h3><div class="im-facts"><span><b id="im-order-stock">${game.stock(selected)}</b> on shelf</span><span><b id="im-incoming">${incoming(selected)}</b> on the way</span><span><b>${money(product.cost)}</b> each</span></div><form id="im-buy-form"><label for="im-qty">How many?</label><div class="im-quantity"><button type="button" id="im-less" aria-label="Decrease quantity">−</button><input id="im-qty" type="number" min="1" max="${Math.max(1,free)}" step="1" required value="${tutorial === 2 ? 4 : Math.min(Math.max(1,game.suggested(selected)),Math.max(1,free))}"><button type="button" id="im-more" aria-label="Increase quantity">+</button></div><div class="im-picks">${[2,4,8].map(quantity => `<button type="button" data-quantity="${quantity}">${quantity}</button>`).join('')}</div><div id="im-quote" class="im-quote"></div><button class="im-primary" id="im-buy" type="submit">Place order →</button><p id="im-error" role="status"></p></form><details><summary>Stock & freshness</summary><p>${product.cap} maximum on shelf. ${product.group === 'bakery' ? 'Bakery expires after about one shift.' : product.group === 'milk' ? 'Milk stays fresh for about two shifts.' : 'Check stock before placing another order.'} A small delivery fee of $0.25 applies.</p></details>`;
    $('#im-less').onclick = () => changeQuantity(-1);
    $('#im-more').onclick = () => changeQuantity(1);
    app.querySelectorAll('[data-quantity]').forEach(button => button.onclick = () => { $('#im-qty').value = Math.min(Number(button.dataset.quantity),Math.max(1,free)); quote(); });
    $('#im-qty').oninput = quote;
    $('#im-buy-form').onsubmit = event => {
      event.preventDefault();
      if (tutorial !== null && tutorial !== 2) return;
      if (tutorial === 2 && Number($('#im-qty').value) !== 4) { $('#im-error').textContent = 'For practice, order 4 Oat Milk.'; return; }
      const error = game.purchase({[selected]:Number($('#im-qty').value)},product.company);
      if (error) { $('#im-error').textContent = error; return; }
      $('#im-error').textContent = '✓ Ordered! Watch the delivery dock.';
      if (tutorial === 2) tutorial = 3;
      update();
    };
    quote();
  }
  function changeQuantity(delta) { const input = $('#im-qty'); input.value = Math.max(1,Math.min(Number(input.max),Number(input.value) + delta)); quote(); }
  function quote() {
    if (!$('#im-qty')) return;
    const quantity = Number($('#im-qty').value), product = item(selected);
    $('#im-quote').textContent = `${money(game.quote({[selected]:Number.isFinite(quantity) ? quantity : 0},product.company))} total · ${product.lead}s delivery`;
  }

  function drawGuide() {
    const guide = $('#im-guide'); guide.hidden = tutorial === null;
    app.querySelectorAll('.im-highlight').forEach(node => node.classList.remove('im-highlight'));
    if (tutorial === null) return;
    const steps = [
      ['Find the right shelf','Click Milk. Yellow and red items need your attention.','[data-category="milk"]'],
      ['Pick low stock','Oat Milk has only 2 left. Click its card.','[data-product="Oat Milk"]'],
      ['Order from its company','Oatfield supplies Oat Milk. Buy 4 portions for $1.45. Click Place order.','.im-order'],
      ['Deliveries take time','The order takes 25 café seconds. Click Receive practice delivery to move time forward.','.im-dock'],
      ['You did it!','Oat Milk is restocked. Your real shift starts with fresh stock and cash.','.im-stock']
    ];
    const [title,text,target] = steps[tutorial];
    guide.innerHTML = `<div><small>GUIDED PRACTICE · ${tutorial + 1} / 5</small><b>${title}</b><p>${text}</p></div>${tutorial === 3 ? '<button data-practice="receive" class="im-primary">Receive practice delivery →</button>' : tutorial === 4 ? '<button data-practice="finish" class="im-primary">See my mission →</button>' : '<span>Clock paused · practice cash only</span>'}`;
    $(target)?.classList.add('im-highlight');
    guide.querySelector('[data-practice="receive"]')?.addEventListener('click', () => {
      // No practice customers: teach delivery timing without costing the player a sale.
      game.clock = game.deliveries[0].eta; game.receive(game.deliveries[0].id); tutorial = 4;
      drawOrder(); update();
      dialog('Supplies arrived!', '<div class="im-delivery-art">🚚 → 🥛</div><p><b>+4 Oat Milk</b> from Oatfield is on your shelf. You now have 6 portions.</p>', '<button data-action="practice-close" class="im-primary">Great! →</button>');
    });
    guide.querySelector('[data-practice="finish"]')?.addEventListener('click', () => {
      game = new InventorySim(); window.inventoryGame = game; tutorial = null; modalResume = false;
      render(); mission();
    });
  }

  function update() {
    if (!game || !$('.im-game')) return;
    $('#im-clock').textContent = tutorial !== null ? 'Practice' : `${game.label} · ${time(300 - game.elapsed)}`;
    $('#im-cash').textContent = money(game.cash);
    $('#im-served').textContent = `${game.metrics.served}/${game.schedule.length}`;
    $('#im-profit').textContent = money(profit());
    $('#im-start').textContent = game.ended ? 'Shift complete' : game.running ? 'Pause' : game.elapsed ? 'Resume' : 'Start shift';
    $('#im-start').disabled = tutorial !== null || game.ended;
    $('#im-phase').textContent = tutorial !== null ? 'Practice order · no real spending' : game.ended ? 'Shift finished' : !game.running ? 'Planning · time is paused' : game.elapsed >= 95 && game.elapsed <= 180 ? 'Rush time · watch your supplies!' : 'Café open · stock is being used';
    $('#im-notice').textContent = tutorial !== null ? '' : game.messages[0];
    app.querySelectorAll('[data-speed]').forEach(button => { button.setAttribute('aria-pressed',Number(button.dataset.speed) === speed); button.disabled = tutorial !== null || game.ended; });
    $('#im-speed-note').textContent = `${speed}× · ${speed === 1 ? 'Time to plan each decision' : speed === 3 ? 'Steady pace: 3 café seconds per second' : 'Fast pace: stock and deliveries move 6× faster'}`;
    const pending = game.deliveries.filter(delivery => !delivery.received);
    $('#im-jump').disabled = !pending.length || tutorial !== null || game.ended;
    $('#im-pending').textContent = `${pending.length} pending`;
    $('#im-deliveries').innerHTML = pending.length ? pending.slice(0,4).map(delivery => {
      const name = Object.keys(delivery.cart)[0], product = item(name);
      return `<div class="im-delivery"><span style="color:${product.color}">${product.icon}</span><div><b>${delivery.cart[name]} ${name}</b><small>${delivery.supplier} · ${time(delivery.eta - game.clock)}</small><progress max="${delivery.lead}" value="${Math.max(0,delivery.lead - (delivery.eta - game.clock))}"></progress></div></div>`;
    }).join('') + (pending.length > 4 ? `<p>+${pending.length - 4} more deliveries tracked</p>` : '') : '<div class="im-empty-dock"><span>🚚</span><b>Nothing on the way</b><p>Click a product to place an order.</p></div>';
    $('#im-buy').disabled = game.ended || (tutorial !== null && tutorial !== 2);
    $('#im-order-stock').textContent = game.stock(selected); $('#im-incoming').textContent = incoming(selected);
    $('#im-qty').max = Math.max(1,item(selected).cap - game.stock(selected) - incoming(selected));
    $('#im-results').hidden = !game.ended;
    drawProducts(); drawGuide();
    if (game.ended && !reportShown && !$('#inventory-modal')) { reportShown = true; report(); }
  }

  function checkDeliveries() {
    if (!game || tutorial !== null || $('#inventory-modal') || game.ended) return;
    const arrived = game.deliveries.filter(delivery => !delivery.received && delivery.eta <= game.clock);
    if (!arrived.length) return;
    modalResume = game.running; game.running = false;
    arrived.forEach(delivery => game.receive(delivery.id));
    dialog('Supplies arrived!', `<div class="im-delivery-art">🚚 📦</div><p>${arrived.map(delivery => Object.entries(delivery.cart).map(([name,qty]) => `<b>+${qty} ${name}</b> from ${delivery.supplier}`).join('<br>')).join('<br>')}</p><p>Your stock is shelved and ready. The clock is paused so you can review it.</p>`, '<button data-action="delivery-close" class="im-primary">Back to my shift →</button>');
    update();
  }
  function advanceToDelivery() {
    if (tutorial !== null || game.ended) return;
    const pending = game.deliveries.filter(delivery => !delivery.received);
    if (!pending.length) return;
    const target = Math.min(...pending.map(delivery => delivery.eta));
    game.running = true;
    // Advance the actual simulation, including customers, stock use, and spoilage.
    while (game.clock < target && !game.ended) game.tick(Math.min(1,target - game.clock));
    checkDeliveries(); update();
  }
  function report() {
    const result = game.reports.at(-1); if (!result) return;
    const points = [result.served / result.arrived >= .9,result.waste < 5,result.profit > 0].filter(Boolean).length * 5;
    dialog(`${result.label} complete · ${points}/15`, `<div class="im-three"><span><b>${result.served}/${result.arrived}</b> served</span><span><b>${money(result.profit)}</b> profit</span><span><b>${money(result.waste)}</b> wasted</span></div><p>${result.stockouts ? 'Next shift: order the low-stock items earlier. Stock must last until delivery arrives.' : 'Your stock kept up with demand. Keep watching freshness next shift.'}</p><details><summary>Full report</summary><p>${result.lost} lost sales · ${money(result.lostSales)} potential revenue lost · ${money(result.purchases)} spent · ${money(result.revenue)} sales. Profit subtracts used ingredients, waste, and delivery fees. Unused stock remains an asset.</p></details>`, `<button data-action="review">Review stock</button>${game.daypart < 2 ? '<button data-action="next" class="im-primary">Next shift mission →</button>' : '<button data-action="retry" class="im-primary">Play again</button><button data-action="home">Choose role</button>'}`);
  }
  function handleAction(action) {
    closeDialog();
    if (action === 'tutorial') { game = new InventorySim(); window.inventoryGame = game; category = 'coffee'; tutorial = 0; drawProducts(); drawGuide(); update(); }
    if (action === 'skip') { modalResume = false; mission(); }
    if (action === 'plan') { game.running = modalResume; modalResume = false; }
    if (action === 'resume' || action === 'delivery-close') { game.running = modalResume; modalResume = false; }
    if (action === 'delivery-close') drawOrder();
    if (action === 'next') { game.next(); reportShown = false; modalResume = false; render(); mission(); }
    if (action === 'retry') startInventory();
    if (action === 'home') { roles(); return; }
    update();
  }
  function loop(now) {
    const dt = lastFrame ? Math.min((now - lastFrame) / 1000,.1) : 0; lastFrame = now;
    if (game && tutorial === null && !$('#inventory-modal')) { game.tick(dt * speed); checkDeliveries(); }
    if (game && now - lastPaint > 500) { update(); lastPaint = now; }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  roles();
})();
