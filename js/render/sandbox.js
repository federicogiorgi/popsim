// render/sandbox.js
// Renderer della sandbox su Canvas 2D. E' l'UNICO modulo che disegna gli
// individui: la logica genetica non sa nulla di pixel. Volendo, in futuro si
// puo' sostituire questo file (es. con WebGL) senza toccare il modello.
//
// Codifica visiva:
//   - COLORE = genotipo al gene attualmente selezionato. Omozigote A_iA_i usa il
//     colore dell'allele i; eterozigote A_iA_j usa la media dei due colori.
//   - FORMA = sesso. Cerchio = femmina, quadrato = maschio.
//   - Un anello evidenzia l'individuo selezionato.

import { ALLELE_COLORS } from '../config.js';

export class SandboxRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.world = { width: 1000, height: 600 };
    this.dpr = 1;
    this._colorCache = new Map(); // cache dei colori dei genotipi (chiave "i-j")
    this.resize();
  }

  // Adegua la risoluzione del canvas alla sua dimensione CSS e al devicePixelRatio,
  // per un disegno nitido su ogni schermo (compresi i telefoni retina).
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    this.dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.round(rect.width * this.dpr));
    this.canvas.height = Math.max(1, Math.round(rect.height * this.dpr));
    this.cssWidth = rect.width;
    this.cssHeight = rect.height;
  }

  // Converte coordinate del mondo -> coordinate CSS del canvas.
  _worldToCss(wx, wy) {
    return [
      (wx / this.world.width) * this.cssWidth,
      (wy / this.world.height) * this.cssHeight,
    ];
  }

  // Converte coordinate CSS (es. da un clic) -> coordinate del mondo.
  cssToWorld(cx, cy) {
    return [
      (cx / this.cssWidth) * this.world.width,
      (cy / this.cssHeight) * this.world.height,
    ];
  }

  // Colore di un genotipo (coppia di alleli) al gene selezionato.
  _genotypeColor(a, b) {
    const key = a < b ? a + '-' + b : b + '-' + a;
    let c = this._colorCache.get(key);
    if (c) return c;
    const ca = ALLELE_COLORS[a % ALLELE_COLORS.length];
    if (a === b) {
      c = ca;
    } else {
      const cb = ALLELE_COLORS[b % ALLELE_COLORS.length];
      c = mixHex(ca, cb); // eterozigote = media dei due colori
    }
    this._colorCache.set(key, c);
    return c;
  }

  // Raggio del simbolo in pixel, adattato al numero di individui: tanti
  // individui => punti piu' piccoli, per non impastare la scena.
  _radiusFor(n) {
    if (n > 4000) return 2;
    if (n > 1500) return 3;
    if (n > 500) return 4;
    if (n > 150) return 5;
    return 7;
  }

  // Disegna una scena a partire da uno SNAPSHOT (usato durante lo scrubbing).
  // gene = indice del gene da usare per il colore. selectedId = individuo evidenziato.
  drawSnapshot(snap, gene, selectedId) {
    this._draw(snap.n, gene, selectedId, (i) => {
      const base = (i * snap.ng + gene) * 2;
      return {
        x: snap.x[i], y: snap.y[i],
        a: snap.geno[base], b: snap.geno[base + 1],
        female: snap.sex[i] === 1, id: snap.id[i],
      };
    });
  }

  // Disegna una scena a partire dagli individui VIVI (usato in tempo reale).
  drawLive(individuals, gene, selectedId) {
    this._draw(individuals.length, gene, selectedId, (i) => {
      const ind = individuals[i];
      return {
        x: ind.x, y: ind.y,
        a: ind.genotype[gene][0], b: ind.genotype[gene][1],
        female: ind.sex === 'F', id: ind.id,
      };
    });
  }

  // Routine di disegno comune. `get(i)` estrae i dati dell'i-esimo individuo
  // dalla sorgente (snapshot o array vivo), cosi' il codice di disegno e' unico.
  _draw(n, gene, selectedId, get) {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); // lavora in unita' CSS
    ctx.clearRect(0, 0, this.cssWidth, this.cssHeight);

    const r = this._radiusFor(n);
    let selected = null;

    for (let i = 0; i < n; i++) {
      const d = get(i);
      const [px, py] = this._worldToCss(d.x, d.y);
      ctx.fillStyle = this._genotypeColor(d.a, d.b);
      if (d.female) {
        // Femmina = cerchio.
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Maschio = quadrato.
        ctx.fillRect(px - r, py - r, r * 2, r * 2);
      }
      if (selectedId != null && d.id === selectedId) selected = { px, py };
    }

    // Evidenzia l'individuo selezionato con un anello ben visibile.
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

  // Trova l'individuo piu' vicino a un punto del mondo, entro una tolleranza.
  // Ritorna l'indice (o -1). Usa distanza in coordinate del mondo.
  pickFromSnapshot(snap, wx, wy) {
    return this._pick(snap.n, wx, wy, (i) => [snap.x[i], snap.y[i]]);
  }
  pickFromLive(individuals, wx, wy) {
    return this._pick(individuals.length, wx, wy, (i) => [individuals[i].x, individuals[i].y]);
  }
  _pick(n, wx, wy, get) {
    // Tolleranza in unita' del mondo, coerente col raggio in pixel.
    const rPx = this._radiusFor(n) + 4;
    const tolX = (rPx / this.cssWidth) * this.world.width;
    const tolY = (rPx / this.cssHeight) * this.world.height;
    const tol = Math.max(tolX, tolY);
    let best = -1;
    let bestD = tol * tol;
    for (let i = 0; i < n; i++) {
      const [x, y] = get(i);
      const dx = x - wx;
      const dy = y - wy;
      const d = dx * dx + dy * dy;
      if (d <= bestD) { bestD = d; best = i; }
    }
    return best;
  }
}

// Media di due colori esadecimali "#rrggbb".
function mixHex(h1, h2) {
  const c1 = hexToRgb(h1);
  const c2 = hexToRgb(h2);
  const r = Math.round((c1[0] + c2[0]) / 2);
  const g = Math.round((c1[1] + c2[1]) / 2);
  const b = Math.round((c1[2] + c2[2]) / 2);
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
}

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
