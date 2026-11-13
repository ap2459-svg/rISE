// The pre-survey belongs to the shared home screen, outside each game mode.
(() => {
  'use strict';
  const seenKey = 'rise.pre-survey.6Wcy1Vtr1EciL6f1A.seen';
  let seen = false;
  try { seen = sessionStorage.getItem(seenKey) === 'yes'; } catch { /* Still works without storage. */ }

  const survey = document.createElement('dialog');
  survey.id = 'rise-pre-survey';
  survey.setAttribute('aria-labelledby', 'rise-survey-title');
  survey.setAttribute('aria-describedby', 'rise-survey-description');
  survey.innerHTML = `
    <div class="rise-survey-content">
      <svg class="rise-survey-icon" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
        <rect x="14" y="12" width="36" height="44" rx="6" fill="#fff5e3"/>
        <rect x="23" y="7" width="18" height="10" rx="3" fill="#f5ce79"/>
        <path d="m22 29 3 3 5-6m-8 17 3 3 5-6M35 30h7M35 44h7"/>
      </svg>
      <p class="rise-survey-eyebrow">WELCOME TO rISE CAFÉ</p>
      <h2 id="rise-survey-title">Before you play…</h2>
      <p id="rise-survey-description">Please take our <strong>pre-survey</strong> before choosing a mode. Help us understand what you know about Industrial and Systems Engineering before playing.</p>
      <a class="rise-survey-primary" href="https://docs.google.com/forms/d/e/1FAIpQLSeI_Ux7K6IJD_AkeLoIDVBUaJ-Iv3lhqelqapH6d7uvwxbm7w/viewform?usp=header" target="_blank" rel="noopener noreferrer" aria-describedby="rise-survey-new-tab" autofocus>Open pre-survey <span aria-hidden="true">↗</span></a>
      <p id="rise-survey-new-tab" class="rise-survey-note">Opens in a new tab. When you’re done, return here to play.</p>
      <button type="button" class="rise-survey-continue">Continue to game</button>
    </div>`;
  document.body.append(survey);

  function showSurvey() {
    if (survey.open) return;
    survey.showModal();
    document.body.classList.add('rise-survey-open');
  }
  survey.querySelector('.rise-survey-continue').addEventListener('click', () => survey.close());
  survey.addEventListener('close', () => {
    seen = true;
    try { sessionStorage.setItem(seenKey, 'yes'); } catch { /* In-memory dismissal still works. */ }
    document.body.classList.remove('rise-survey-open');
    document.querySelector('.rise-survey-launcher')?.focus();
  });

  function addSurveyLink() {
    const home = document.querySelector('#app .role-menu, #app .role-shell');
    if (!home || home.querySelector('.rise-survey-launcher')) return;
    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'rise-survey-launcher';
    link.textContent = 'Pre-survey';
    link.addEventListener('click', showSurvey);
    home.append(link);
  }

  // Preserve all existing launch handlers when a player returns to the home screen.
  const previousRoles = roles;
  roles = function (...args) {
    const result = previousRoles.apply(this, args);
    addSurveyLink();
    return result;
  };
  addSurveyLink();
  if (!seen && document.querySelector('.rise-survey-launcher')) showSurvey();
})();
