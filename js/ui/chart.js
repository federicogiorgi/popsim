// ui/chart.js
// Grafico dell'andamento delle frequenze alleliche nel tempo, disegnato a mano
// su Canvas 2D (nessuna libreria esterna: funziona anche offline in aula).
//
// Mostra una linea per ogni allele presente (stesso colore usato nella sandbox).
// L'asse x e' il tempo in ANNI, l'asse y la frequenza da 0 a 1. Una barra
// verticale segna l'anno corrente, allineata con cio' che si vede nella sandbox.

import { ALLELE_COLORS, alleleLabel } from '../config.js';

export class FrequencyChart {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = 1;
    this.padding = { left: 40, right: 12, top: 12, bottom: 24 };
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.round(rect.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * this.dpr));
    this.cssWidth = rect.width;
    this.cssHeight = rect.height;
  }

  // frames : array di fotogrammi del recorder (leggiamo frame.stats)
  // cursor : indice temporale corrente (anno), per la barra verticale
  draw(frames, cursor) {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);

    const P = this.padding;
    const plotW = this.cssWidth - P.left - P.right;
    const plotH = this.cssHeight - P.top - P.bottom;
    const n = frames.length;

    const isDark = document.documentElement.dataset.theme === 'dark'
      || (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
          && document.documentElement.dataset.theme !== 'light');
    const axisColor = isDark ? '#888' : '#999';
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
    const textColor = isDark ? '#bbb' : '#555';

    ctx.strokeStyle = axisColor;
    ctx.fillStyle = textColor;
    ctx.lineWidth = 1;
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let k = 0; k <= 4; k++) {
      const val = k / 4;
      const y = P.top + plotH * (1 - val);
      ctx.strokeStyle = k === 0 || k === 4 ? axisColor : gridColor;
      ctx.beginPath();
      ctx.moveTo(P.left, y);
      ctx.lineTo(P.left + plotW, y);
      ctx.stroke();
      ctx.fillText(val.toFixed(2), P.left - 6, y);
    }

    if (n < 1) return;

    // Numero di alleli mai comparsi (per decidere quante righe tracciare).
    let maxA = 1;
    for (const fr of frames) maxA = Math.max(maxA, fr.stats.alleleCount);

    const maxT = Math.max(1, n - 1);
    const xOf = (t) => P.left + (t / maxT) * plotW;
    const yOf = (f) => P.top + plotH * (1 - f);

    for (let a = 0; a < maxA; a++) {
      ctx.strokeStyle = ALLELE_COLORS[a % ALLELE_COLORS.length];
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let t = 0; t < n; t++) {
        const f = frames[t].stats.freq[a];
        const x = xOf(t);
        const y = yOf(f);
        if (t === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Etichette dell'asse x (anni): inizio e fine.
    ctx.fillStyle = textColor;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText('0', P.left, P.top + plotH + 4);
    ctx.textAlign = 'right';
    ctx.fillText(maxT + ' anni', P.left + plotW, P.top + plotH + 4);

    // Barra verticale del tempo corrente.
    const cx = xOf(Math.max(0, Math.min(maxT, cursor)));
    ctx.strokeStyle = isDark ? '#e6e6e6' : '#222';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(cx, P.top);
    ctx.lineTo(cx, P.top + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    // Legenda in alto: pallini colorati con l'etichetta dell'allele.
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    let lx = P.left + 6;
    const ly = P.top + 8;
    for (let a = 0; a < maxA; a++) {
      ctx.fillStyle = ALLELE_COLORS[a % ALLELE_COLORS.length];
      ctx.beginPath();
      ctx.arc(lx + 4, ly, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = textColor;
      const label = alleleLabel(a);
      ctx.fillText(label, lx + 12, ly);
      lx += 12 + ctx.measureText(label).width + 12;
    }
  }
}
