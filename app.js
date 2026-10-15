/**
 * MindSprint Application Bootstrap
 * Dependency wiring, PWA Service Worker registration, and lifecycle orchestration.
 */
(function() {
  'use strict';

  // Instantiate Core Engine
  const storage = window.MindSprintStorage;
  const sound = window.MindSprintSound;
  const generators = window.MindSprintGenerators;
  const engine = new window.MindSprintEngine.GameEngine({
    storage,
    sound,
    generators
  });
  const ui = window.MindSprintUI;

  // Initialize UI Controller
  document.addEventListener('DOMContentLoaded', () => {
    try {
      ui.init(engine, storage, sound);
      console.log('[MindSprint] Core application initialized successfully.');
    } catch (err) {
      console.error('[MindSprint] Initialization error:', err);
    }
  });

  // Progressive Web App: Service Worker Registration
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      // Use relative path for GitHub Pages subfolder compatibility
      navigator.serviceWorker.register('./sw.js')
        .then((registration) => {
          console.log('[MindSprint PWA] Service Worker registered with scope:', registration.scope);

          registration.onupdatefound = () => {
            const installingWorker = registration.installing;
            if (installingWorker) {
              installingWorker.onstatechange = () => {
                if (installingWorker.state === 'installed') {
                  if (navigator.serviceWorker.controller) {
                    console.log('[MindSprint PWA] New update available.');
                  } else {
                    console.log('[MindSprint PWA] Content cached for offline use.');
                  }
                }
              };
            }
          };
        })
        .catch((error) => {
          console.warn('[MindSprint PWA] Service Worker registration failed:', error);
        });
    });
  }

  // Handle PWA installation prompt event
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent standard browser mini-infobar to use custom in-app buttons
    e.preventDefault();
    window.deferredInstallPrompt = e;
    console.log('[MindSprint PWA] App is ready for installation.');
    window.dispatchEvent(new CustomEvent('pwa-prompt-ready'));
  });
})();
