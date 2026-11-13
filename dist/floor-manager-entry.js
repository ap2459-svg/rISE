// Keep the existing Barista and Inventory Manager launch handlers on the illustrated menu.
(() => {
  const previousRoles = roles;
  roles = function () {
    previousRoles();
    const barista = app.querySelector('#start');
    const inventory = app.querySelector('#inventory-start');
    const resume = app.querySelector('#inventory-continue');
    if (!barista || !inventory) return;

    app.innerHTML = `
      <main class="role-menu" aria-label="rISE Café — Choose your role">
        <div class="role-menu-art">
          <img src="assets/choose-your-role.png" width="1672" height="941" alt="">
          <nav class="role-menu-buttons" aria-label="Game roles">
            <a id="floor-manager-start" class="role-menu-button" href="floor-manager/">
              <span>Floor Manager</span>
            </a>
          </nav>
        </div>
      </main>`;

    for (const [button, label] of [[barista, 'Barista'], [inventory, 'Inventory Manager']]) {
      button.className = 'role-menu-button';
      button.type = 'button';
      const text = document.createElement('span');
      text.textContent = label;
      button.replaceChildren(text);
    }
    app.querySelector('.role-menu-buttons').prepend(barista, inventory);
    if (resume) {
      // Keep Continue visible on the illustrated homepage, outside its image hotspots.
      const actions = document.createElement('section');
      actions.className = 'role-resume';
      actions.setAttribute('aria-label', 'Saved Inventory Manager game');
      const label = document.createElement('strong');
      label.textContent = 'Inventory Manager';
      const newGame = document.createElement('button');
      newGame.className = 'big-btn gold';
      newGame.textContent = 'New game';
      newGame.onclick = inventory.onclick;
      inventory.onclick = () => resume.click();
      actions.append(label, resume, newGame);
      app.querySelector('.role-menu').append(actions);
    }
  };
  roles();
})();
