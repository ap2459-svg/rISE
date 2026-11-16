// Floor Manager lives on its own page so its styles, globals and save data stay isolated.
(() => {
  const previousRoles = roles;
  roles = function () {
    previousRoles();
    const card = [...document.querySelectorAll('.role-choice')]
      .find(el => el.querySelector('h2')?.textContent.trim() === 'Floor Manager');
    if (!card) return;
    card.classList.remove('locked');
    card.classList.add('play');
    card.querySelector('small')?.remove();
    const button = document.createElement('button');
    button.className = 'big-btn';
    button.id = 'floor-manager-start';
    button.textContent = 'Play Floor Manager →';
    button.onclick = () => { window.location.href = 'floor-manager/'; };
    card.append(button);
  };
  roles();
})();
