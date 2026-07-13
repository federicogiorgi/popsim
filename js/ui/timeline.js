// ui/timeline.js
// Barra di avanzamento temporale in stile lettore video: pulsante play/pausa,
// cursore trascinabile per saltare a un tempo preciso, indicatore del tempo.
// La barra spaziatrice mette in pausa / riprende (gestita qui a livello globale).
//
// Questo modulo NON decide come avanza la simulazione: espone callback e viene
// aggiornato da main.js, che resta l'unico "direttore d'orchestra".

export class Timeline {
  constructor(refs, callbacks) {
    this.playBtn = refs.playBtn;   // <button>
    this.slider = refs.slider;     // <input type="range">
    this.timeLabel = refs.timeLabel; // <span>
    this.cb = callbacks;           // { onPlayPause, onSeek(cursor) }

    this.playBtn.addEventListener('click', () => this.cb.onPlayPause());

    // Trascinamento / clic sul cursore: salta al tempo scelto.
    this.slider.addEventListener('input', () => {
      this.cb.onSeek(parseInt(this.slider.value, 10));
    });

    // Barra spaziatrice = pausa/ripresa, purche' il focus non sia in un campo
    // di testo (per non interferire con la digitazione).
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'Space') return;
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      this.cb.onPlayPause();
    });
  }

  // Aggiorna lo stato visivo della barra.
  //   cursor  : anno corrente
  //   live    : ultimo anno simulato (massimo del cursore)
  //   playing : true se in riproduzione
  //   size    : numero di individui vivi nell'anno corrente
  update(cursor, live, playing, size) {
    this.slider.max = String(Math.max(0, live));
    // Aggiorna il valore solo se diverso, per non "combattere" col trascinamento.
    if (document.activeElement !== this.slider) {
      this.slider.value = String(cursor);
    }
    this.playBtn.textContent = playing ? '⏸ Pausa' : '▶ Play';
    this.playBtn.setAttribute('aria-label', playing ? 'Pausa' : 'Play');
    let txt = 'Anno ' + cursor + ' / ' + live;
    if (size != null) txt += '   ·   ' + size + ' individui';
    this.timeLabel.textContent = txt;
  }
}
