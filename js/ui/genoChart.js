// ui/genoChart.js
// Grafico dell'andamento delle FREQUENZE GENOTIPICHE nel tempo, su Canvas 2D
// (stesso stile del grafico delle frequenze alleliche).
//
// Per ogni genotipo presente disegna DUE linee:
//   - spessa: frequenza OSSERVATA negli individui della sandbox;
//   - sottile e trasparente: frequenza ATTESA sotto Hardy-Weinberg (p_i² per
//     l'omozigote A_iA_i, 2·p_i·p_j per l'eterozigote A_iA_j), calcolata dalle
//     frequenze alleliche osservate nello stesso anno.
// Se le due linee si sovrappongono le proporzioni sono quelle di HW; se si
// separano (es. accoppiamento non casuale) lo scostamento si vede nel tempo.
//
// Colori coerenti con la sandbox: un omozigote ha il colore del suo allele; un
// eterozigote ha una linea a due colori alternati (allele minore e maggiore).
// La legenda e' in HTML sopra il grafico, cosi' va a capo da sola.

import { ALLELE_COLORS, alleleLabel, remPx } from '../config.js';
import { t, getLang } from '../i18n.js';

// Genotipi mai arrivati a questa frequenza (osservata o attesa) non vengono
// disegnati: con tanti alleli eviterebbero un groviglio di linee a zero.
const MIN_SHOWN = 0.01;

export class GenotypeChart {
  constructor(canvas, legendEl) {
    this.canvas = canvas;
    this.legendEl = legendEl;
    this.ctx = canvas.getContext('2d');
    this.dpr = 1;
    this._cache = null;
    this._legendKey = '';
    this.resize();
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.round(rect.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * this.dpr));
    this.cssWidth = rect.width;
    this.cssHeight = rect.height;
    // Caratteri e margini in proporzione al testo della pagina (rem). I rientri
    // orizzontali combaciano con --plot-left / --plot-right in css/styles.css.
    this.rem = remPx();
    this.padding = { left: 2.6 * this.rem, right: 0.75 * this.rem, top: 0.75 * this.rem, bottom: 1.5 * this.rem };
  }

  _color(i) { return ALLELE_COLORS[i % ALLELE_COLORS.length]; }

  // Serie temporali per genotipo, ricavate da frame.stats.hw.classes. Calcolate
  // una volta per simulazione (la cronologia non cambia durante la navigazione).
  _series(frames) {
    const n = frames.length;
    if (this._cache && this._cache.frames === frames && this._cache.n === n) return this._cache.list;
    const byKey = new Map();
    for (let t = 0; t < n; t++) {
      for (const c of frames[t].stats.hw.classes) {
        const key = c.i * 16 + c.j;
        let s = byKey.get(key);
        if (!s) {
          // Un genotipo "nasce" quando compare il suo allele (mutazione): prima vale 0.
          s = { i: c.i, j: c.j, homo: c.homozygous, obs: new Float32Array(n), exp: new Float32Array(n), max: 0 };
          byKey.set(key, s);
        }
        s.obs[t] = c.obsFreq;
        s.exp[t] = c.expFreq;
        if (c.obsFreq > s.max) s.max = c.obsFreq;
        if (c.expFreq > s.max) s.max = c.expFreq;
      }
    }
    // Ordine della tabella HW: prima gli omozigoti, poi gli eterozigoti.
    const list = [...byKey.values()]
      .filter((s) => s.max >= MIN_SHOWN)
      .sort((a, b) => (a.homo !== b.homo ? (a.homo ? -1 : 1) : a.i - b.i || a.j - b.j));
    this._cache = { frames, n, list };
    return list;
  }

  // Legenda HTML: un quadratino per genotipo (tinta unita o tagliato in diagonale
  // come nella sandbox) e la spiegazione linea spessa / sottile.
  _legend(list) {
    if (!this.legendEl) return;
    const key = getLang() + ':' + list.map((s) => s.i + '-' + s.j).join(',');
    if (key === this._legendKey) return;
    this._legendKey = key;
    let html = '';
    for (const s of list) {
      const c1 = this._color(s.i);
      const c2 = this._color(s.j);
      const bg = s.homo ? c1 : 'linear-gradient(to bottom right, ' + c1 + ' 50%, ' + c2 + ' 50%)';
      html += '<span class="lg"><span class="lg-shape" style="background:' + bg + '"></span>' +
        alleleLabel(s.i) + alleleLabel(s.j) + '</span>';
    }
    html += '<span class="lg muted"><span class="lg-line"></span> ' + t('chart.observed') + '</span>' +
      '<span class="lg muted"><span class="lg-line thin"></span> ' + t('chart.expected') + '</span>';
    this.legendEl.innerHTML = html;
  }

  // frames : array di fotogrammi del recorder (leggiamo frame.stats.hw)
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

    ctx.fillStyle = textColor;
    ctx.lineWidth = 1;
    ctx.font = Math.round(0.8 * this.rem) + 'px system-ui, sans-serif';
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

    const list = this._series(frames);
    this._legend(list);

    const maxT = Math.max(1, n - 1);
    const xOf = (t) => P.left + (t / maxT) * plotW;
    const yOf = (f) => P.top + plotH * (1 - f);

    // Prima le attese (sottili, dietro), poi le osservate (spesse, davanti).
    ctx.globalAlpha = 0.5;
    for (const s of list) this._line(s, s.exp, n, xOf, yOf, 1.2);
    ctx.globalAlpha = 1;
    for (const s of list) this._line(s, s.obs, n, xOf, yOf, 1.8);

    // Etichette dell'asse x (anni): inizio e fine.
    ctx.fillStyle = textColor;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText('0', P.left, P.top + plotH + 4);
    ctx.textAlign = 'right';
    ctx.fillText(t('chart.years', maxT), P.left + plotW, P.top + plotH + 4);

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
  }

  // Traccia una serie. Omozigote: tinta unita. Eterozigote: lo stesso tracciato
  // ripassato a trattini con il secondo colore, cosi' la linea alterna i due.
  _line(s, values, n, xOf, yOf, width) {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let t = 0; t < n; t++) {
      const x = xOf(t);
      const y = yOf(values[t]);
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.lineWidth = width;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = this._color(s.i);
    ctx.stroke();
    if (!s.homo) {
      ctx.strokeStyle = this._color(s.j);
      ctx.setLineDash([6, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
}
