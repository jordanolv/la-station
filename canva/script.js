// Point d'entrée - charge le bon script selon la vue sélectionnée

let currentScript = null;
let currentView = 'info';

function loadScript(view) {
  // Remove old script if exists
  if (currentScript) {
    currentScript.remove();
    currentScript = null;
  }

  // Determine which script to load
  const scriptPath = view === 'stats' ? './commands/stats.js' : './commands/me.js';

  // Load new script
  const script = document.createElement('script');
  script.src = scriptPath;
  document.body.appendChild(script);
  currentScript = script;
  currentView = view;
}

// Setup nav buttons
document.addEventListener('DOMContentLoaded', () => {
  const buttons = Array.from(document.querySelectorAll('nav button'));

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.canvas;
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      // Reload page to switch script
      const url = new URL(window.location);
      url.searchParams.set('view', view);
      window.location.href = url.toString();
    });
  });

  // Load correct script based on URL or default
  const urlParams = new URLSearchParams(window.location.search);
  const view = urlParams.get('view') || 'me';

  // Set active button
  buttons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.canvas === view);
  });

  loadScript(view);
});
