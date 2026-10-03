// ui/theme.js
// Interruttore del tema chiaro/scuro della schermata iniziale.
//
// Di default il sito segue il tema del sistema operativo (CSS
// prefers-color-scheme). Se l'utente usa l'interruttore, la scelta diventa
// l'attributo data-theme su <html> e viene salvata nel browser (localStorage):
// alle visite successive la riapplica un piccolo script in <head> di
// index.html, prima che la pagina sia disegnata. Se lo storage non e'
// disponibile (es. navigazione privata) il cambio funziona, ma non e' ricordato.

const KEY = 'popsim-theme';
const systemDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

// Tema effettivo: la scelta esplicita se c'e', altrimenti quello di sistema.
export function currentTheme() {
  const t = document.documentElement.dataset.theme;
  if (t === 'light' || t === 'dark') return t;
  return systemDark && systemDark.matches ? 'dark' : 'light';
}

// Collega l'interruttore (role="switch", acceso = scuro). `onChange` viene
// chiamata dopo ogni cambio di tema (es. per ridisegnare i grafici su canvas),
// anche quando cambia il tema di sistema e l'utente non ha scelto nulla.
export function initThemeSwitch(toggle, onChange) {
  const sync = () => {
    const dark = currentTheme() === 'dark';
    toggle.setAttribute('aria-checked', String(dark));
    toggle.setAttribute('aria-label', dark ? 'Tema scuro (attiva il chiaro)' : 'Tema chiaro (attiva lo scuro)');
  };
  toggle.addEventListener('click', () => {
    const t = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem(KEY, t); } catch (e) { /* non ricordato */ }
    sync();
    if (onChange) onChange(t);
  });
  if (systemDark && systemDark.addEventListener) {
    systemDark.addEventListener('change', () => { sync(); if (onChange) onChange(currentTheme()); });
  }
  sync();
}
