// recorder.js
// Registra la storia della simulazione, un fotogramma per generazione, cosi' da
// poter tornare indietro nel tempo (barra in stile lettore video).
//
// Ogni fotogramma contiene:
//   - stats: statistiche leggere (frequenze, HW, F...). SEMPRE conservate: il
//     grafico dell'andamento deve poter mostrare l'intera storia.
//   - snap: lo snapshot completo degli individui (posizioni, genotipi, eta').
//     Pesante: viene conservato solo entro un "budget" di memoria. Se la
//     simulazione diventa molto lunga con tanti individui, gli snapshot piu'
//     vecchi vengono scartati (le statistiche restano). Scorrendo in una zona
//     senza snapshot, la sandbox mostra il fotogramma valido piu' vicino.

export class Recorder {
  // cellBudget = numero massimo di "record-individuo" da tenere in memoria per
  // gli snapshot. Con ~100 individui copre decine di migliaia di generazioni;
  // con 10000 individui copre alcune centinaia di generazioni.
  constructor(cellBudget = 6_000_000) {
    this.frames = [];
    this.cellBudget = cellBudget;
    this._retainedCells = 0;
    this._oldestSnap = 0; // indice del piu' vecchio fotogramma con snapshot
  }

  get length() {
    return this.frames.length;
  }

  // Registra un nuovo fotogramma (statistiche + snapshot).
  record(stats, snapshot) {
    this.frames.push({ stats, snap: snapshot });
    this._retainedCells += snapshot.n;
    // Scarta gli snapshot piu' vecchi finche' si rientra nel budget.
    while (this._retainedCells > this.cellBudget && this._oldestSnap < this.frames.length - 1) {
      const f = this.frames[this._oldestSnap];
      if (f.snap) {
        this._retainedCells -= f.snap.n;
        f.snap = null;
      }
      this._oldestSnap++;
    }
  }

  // Fotogramma all'indice i (clampato ai limiti validi).
  at(i) {
    const idx = Math.max(0, Math.min(this.frames.length - 1, i));
    return this.frames[idx];
  }

  // Statistiche all'indice i.
  statsAt(i) {
    return this.at(i).stats;
  }

  // Snapshot valido piu' vicino all'indice i (cercando all'indietro, poi in
  // avanti). Ritorna { snap, exact } dove exact indica se e' proprio quello di i.
  snapAt(i) {
    const idx = Math.max(0, Math.min(this.frames.length - 1, i));
    if (this.frames[idx].snap) return { snap: this.frames[idx].snap, exact: true };
    for (let j = idx - 1; j >= 0; j--) {
      if (this.frames[j].snap) return { snap: this.frames[j].snap, exact: false };
    }
    for (let j = idx + 1; j < this.frames.length; j++) {
      if (this.frames[j].snap) return { snap: this.frames[j].snap, exact: false };
    }
    return { snap: null, exact: false };
  }

  clear() {
    this.frames = [];
    this._retainedCells = 0;
    this._oldestSnap = 0;
  }
}
