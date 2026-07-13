// render/sandbox.js
// Renderer della sandbox su Canvas 2D. E' l'UNICO modulo che disegna gli
// individui: la logica genetica non sa nulla di pixel.
//
// Codifica visiva:
//   - FORMA = sesso. Cerchio = femmina, quadrato = maschio.
//   - COLORE = alleli presenti al gene. Omozigote A_iA_i: un solo colore.
//     Eterozigote: il simbolo e' tagliato in diagonale (dall'angolo in alto a
//     destra a quello in basso a sinistra); la meta' IN ALTO A SINISTRA prende il
//     colore dell'allele "minore" (in ordine alfabetico A1<A2<...<A9), la meta'
//     IN BASSO A DESTRA quello dell'allele "maggiore".
//   - Un anello evidenzia l'individuo selezionato.

import { ALLELE_COLORS } from '../config.js';

export class SandboxRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.world = { width: 1000, height: 600 };
    this.dpr = 1;
    this.resize();
  }

  // Adegua la risoluzione del canvas alla dimensione CSS e al devicePixelRatio.
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.round(rect.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * this.dpr));
    this.cssWidth = rect.width;
    this.cssHeight = rect.height;
  }

  _worldToCss(wx, wy) {
    return [(wx / this.world.width) * this.cssWidth, (wy / this.world.height) * this.cssHeight];
  }

  cssToWorld(cx, cy) {
    return [(cx / this.cssWidth) * this.world.width, (cy / this.cssHeight) * this.world.height];
  }

  _color(i) { return ALLELE_COLORS[i % ALLELE_COLORS.length]; }

  // Raggio del simbolo in pixel, adattato al numero di individui.
  _radiusFor(n) {
    if (n > 700) return 4;
    if (n > 300) return 5;
    if (n > 120) return 7;
    return 9;
  }

  // Disegna una scena a partire da uno SNAPSHOT.
  drawSnapshot(snap, selectedId) {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);

    const r = this._radiusFor(snap.n);
    let selected = null;

    for (let i = 0; i < snap.n; i++) {
      const [px, py] = this._worldToCss(snap.x[i], snap.y[i]);
      const female = snap.sex[i] === 1;
      const a = snap.a[i];
      const b = snap.b[i];
      const lo = Math.min(a, b);
      const hi = Math.max(a, b);
      this._drawSymbol(px, py, r, female, this._color(lo), this._color(hi), lo === hi);
      if (selectedId != null && snap.id[i] === selectedId) selected = { px, py };
    }

    if (selected) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#111';
      ctx.beginPath();
      ctx.arc(selected.px, selected.py, r + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#fff';
      ctx.beginPath();
      ctx.arc(selected.px, selected.py, r + 7, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Traccia il contorno della forma (cerchio o quadrato) attorno a (px, py).
  _shapePath(px, py, r, female) {
    const ctx = this.ctx;
    ctx.beginPath();
    if (female) ctx.arc(px, py, r, 0, Math.PI * 2);
    else ctx.rect(px - r, py - r, r * 2, r * 2);
  }

  // Disegna un individuo. Se omozigote: tinta unita c1. Se eterozigote: due
  // meta' tagliate lungo la diagonale (alto-sinistra = c1, basso-destra = c2).
  _drawSymbol(px, py, r, female, c1, c2, homo) {
    const ctx = this.ctx;
    if (homo) {
      ctx.fillStyle = c1;
      this._shapePath(px, py, r, female);
      ctx.fill();
    } else {
      const l = px - r, rt = px + r, t = py - r, bt = py + r;
      ctx.save();
      this._shapePath(px, py, r, female);
      ctx.clip();
      // Meta' in alto a sinistra della diagonale (alto-destra -> basso-sinistra).
      ctx.fillStyle = c1;
      ctx.beginPath();
      ctx.moveTo(l, t); ctx.lineTo(rt, t); ctx.lineTo(l, bt); ctx.closePath();
      ctx.fill();
      // Meta' in basso a destra.
      ctx.fillStyle = c2;
      ctx.beginPath();
      ctx.moveTo(rt, t); ctx.lineTo(rt, bt); ctx.lineTo(l, bt); ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // Contorno sottile per staccare i simboli dallo sfondo scuro.
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    this._shapePath(px, py, r, female);
    ctx.stroke();
  }

  // Trova l'individuo piu' vicino a un punto del mondo, entro una tolleranza.
  pickFromSnapshot(snap, wx, wy) {
    const rPx = this._radiusFor(snap.n) + 4;
    const tolX = (rPx / this.cssWidth) * this.world.width;
    const tolY = (rPx / this.cssHeight) * this.world.height;
    const tol = Math.max(tolX, tolY);
    let best = -1;
    let bestD = tol * tol;
    for (let i = 0; i < snap.n; i++) {
      const dx = snap.x[i] - wx;
      const dy = snap.y[i] - wy;
      const d = dx * dx + dy * dy;
      if (d <= bestD) { bestD = d; best = i; }
    }
    return best;
  }
}
