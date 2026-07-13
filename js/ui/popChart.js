// ui/popChart.js
// Grafico dell'andamento del NUMERO DI INDIVIDUI nel tempo, su Canvas 2D
// (stesso stile del grafico delle frequenze). L'asse x e' il tempo in ANNI,
// l'asse y il numero di individui (scala automatica). Una barra verticale segna
// l'anno corrente, allineata con gli altri elementi temporali.

export class PopChart {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.dpr = 1;
    this.padding = { left: 48, right: 12, top: 12, bottom: 24 };
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

  // Arrotonda un massimo a un valore "tondo" per l'asse y.
  _niceMax(v) {
    if (v <= 0) return 1;
    const pow = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / pow;
    const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return step * pow;
  }

  // frames : array di fotogrammi del recorder (leggiamo frame.stats.size)
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
    const lineColor = isDark ? '#5a93e6' : '#3b7dd8';

    if (n < 1) return;

    let maxN = 1;
    for (const fr of frames) maxN = Math.max(maxN, fr.stats.size);
    const yMax = this._niceMax(maxN);

    ctx.strokeStyle = axisColor;
    ctx.fillStyle = textColor;
    ctx.lineWidth = 1;
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (let k = 0; k <= 4; k++) {
      const val = (yMax / 4) * k;
      const y = P.top + plotH * (1 - k / 4);
      ctx.strokeStyle = k === 0 ? axisColor : gridColor;
      ctx.beginPath();
      ctx.moveTo(P.left, y);
      ctx.lineTo(P.left + plotW, y);
      ctx.stroke();
      ctx.fillText(String(Math.round(val)), P.left - 6, y);
    }

    const maxT = Math.max(1, n - 1);
    const xOf = (t) => P.left + (t / maxT) * plotW;
    const yOf = (v) => P.top + plotH * (1 - v / yMax);

    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    for (let t = 0; t < n; t++) {
      const x = xOf(t);
      const y = yOf(frames[t].stats.size);
      if (t === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Etichette dell'asse x (anni).
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
  }
}
