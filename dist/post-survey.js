// Shared by all three modes. Results and game saves stay owned by each game.
(() => {
  'use strict';
  const modes = { barista: 'Barista', inventory: 'Inventory Manager', floor: 'Floor Manager' };
  const shown = new Set();
  const key = mode => `rise.post-survey.1EeHGDjEtEVT9bdF6.${mode}.seen`;
  let activeMode = null;
  const survey = document.createElement('dialog');
  survey.id = 'rise-post-survey';
  survey.setAttribute('aria-labelledby', 'rise-post-title');
  survey.setAttribute('aria-describedby', 'rise-post-description');
  survey.innerHTML = `
    <div class="rise-post-content">
      <svg class="rise-post-icon" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <rect x="14" y="12" width="36" height="44" rx="6" fill="#fff5e3"/>
        <rect x="23" y="7" width="18" height="10" rx="3" fill="#f5ce79"/>
        <path d="m22 29 3 3 5-6m-8 17 3 3 5-6M35 30h7M35 44h7"/>
      </svg>
      <p class="rise-post-eyebrow" id="rise-post-mode"></p>
      <h2 id="rise-post-title">Thanks for playing!</h2>
      <p id="rise-post-description">Please take our <strong>post-survey</strong> to share your experience and what you learned about Industrial and Systems Engineering through rISE Café.</p>
      <a class="rise-post-primary" href="https://forms.gle/1EeHGDjEtEVT9bdF6" target="_blank" rel="noopener noreferrer" aria-describedby="rise-post-new-tab" autofocus>Open post-survey <span aria-hidden="true">↗</span></a>
      <p id="rise-post-new-tab">Opens in a new tab. Your results will stay here.</p>
      <button type="button" class="rise-post-back">Back to results</button>
    </div>`;
  document.body.append(survey);

  function open(mode) {
    if (survey.open) return;
    activeMode = mode;
    survey.querySelector('#rise-post-mode').textContent = `${modes[mode]} · COMPLETE`;
    survey.showModal();
    shown.add(mode);
    document.body.classList.add('rise-post-open');
  }
  survey.querySelector('.rise-post-back').addEventListener('click', () => survey.close());
  // Keep underlying game keyboard shortcuts and focus traps out of this dialog.
  survey.addEventListener('keydown', event => event.stopPropagation());
  survey.addEventListener('close', () => {
    try { sessionStorage.setItem(key(activeMode), 'yes'); } catch { /* In-memory fallback. */ }
    document.body.classList.remove('rise-post-open');
    document.querySelector(`[data-post-survey="${activeMode}"]`)?.focus();
  });

  window.RisePostSurvey = Object.freeze({
    offer(mode, actions) {
      if (!Object.hasOwn(modes, mode) || !actions) return;
      if (!actions.querySelector('[data-post-survey]')) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'rise-post-launcher';
        button.dataset.postSurvey = mode;
        button.textContent = 'Post-survey';
        button.addEventListener('click', () => open(mode));
        actions.append(button);
      }
      let seen = shown.has(mode);
      try { seen ||= sessionStorage.getItem(key(mode)) === 'yes'; } catch { /* Storage may be disabled. */ }
      if (seen) return;
      // Let the entire final result finish rendering before moving focus.
      requestAnimationFrame(() => {
        if (actions.isConnected && !shown.has(mode)) open(mode);
      });
    }
  });
})();
