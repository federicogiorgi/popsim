// kinship.js
// Consanguineita' (inbreeding) calcolata dal PEDIGREE, tramite alleli IBD
// (Identical By Descent), non dal semplice essere omozigoti.
//
// Idea (metodo tabulare / conteggio dei cammini di Wright):
//   - Il coefficiente di parentela (coancestry) f(X, Y) e' la probabilita' che
//     un allele preso a caso in X e uno preso a caso in Y siano IBD.
//   - Il coefficiente di consanguineita' F di un individuo e' la parentela dei
//     suoi due genitori: F_X = f(padre, madre). Deriva dalla formula sui cammini
//     F = Σ (1/2)^n · (1 + F_A), ma si calcola in modo ricorsivo ed efficiente:
//         f(X, X) = (1 + F_X) / 2
//         f(X, Y) = ( f(genitore1 di X, Y) + f(genitore2 di X, Y) ) / 2   (X piu' giovane)
//   - I fondatori si assumono non imparentati e non consanguinei: F = 0,
//     f(i, i) = 1/2, f(i, j) = 0 per i != j.
//
// Poiche' la parentela di due individui, una volta calcolata, riassume tutta la
// loro ascendenza comune, basta mantenere la matrice di parentela tra i VIVI:
// quando nasce un figlio la sua riga si ricava da quelle dei genitori (vivi);
// quando un individuo muore la sua riga si puo' scartare. Cosi' la memoria
// resta proporzionale alla popolazione viva, non a tutta la storia.
//
// Valori garantiti: F in [0, 1] (0.25 gia' per figli di fratelli), mai negativo.

export class KinshipTracker {
  constructor() {
    this.f = new Map();  // id -> Map(id -> coancestry f(id, altro)), simmetrica
    this.F = new Map();  // id -> coefficiente di consanguineita' dell'individuo
  }

  // Registra un fondatore (o un immigrato): non imparentato, non consanguineo.
  addFounder(id, Fval = 0) {
    this.F.set(id, Fval);
    this.f.set(id, new Map());
  }

  // Coefficiente di consanguineita' di un individuo.
  getF(id) {
    return this.F.get(id) || 0;
  }

  // Auto-parentela f(id, id) = (1 + F_id) / 2.
  _self(id) {
    return (1 + (this.F.get(id) || 0)) / 2;
  }

  // Parentela (coancestry) tra due individui.
  coancestry(a, b) {
    if (a === b) return this._self(a);
    const m = this.f.get(a);
    if (!m) return 0;
    return m.get(b) || 0;
  }

  // Imposta simmetricamente f(a, b) (evita di memorizzare gli zeri).
  _set(a, b, v) {
    if (v === 0) return;
    this.f.get(a).set(b, v);
    this.f.get(b).set(a, v);
  }

  // Aggiunge un nuovo nato dai due genitori (entrambi vivi). Restituisce il suo F.
  addChild(id, mother, father) {
    const Fc = this.coancestry(mother, father); // F del figlio = parentela dei genitori
    this.F.set(id, Fc);
    this.f.set(id, new Map());
    // Parentela del nuovo nato con tutti gli altri gia' presenti (genitori inclusi).
    for (const z of this.f.keys()) {
      if (z === id) continue;
      const v = (this.coancestry(mother, z) + this.coancestry(father, z)) / 2;
      this._set(id, z, v);
    }
    return Fc;
  }

  // Rimuove un individuo morto: elimina la sua riga e i riferimenti incrociati.
  remove(id) {
    const m = this.f.get(id);
    if (m) {
      for (const z of m.keys()) {
        const mz = this.f.get(z);
        if (mz) mz.delete(id);
      }
    }
    this.f.delete(id);
    this.F.delete(id);
  }
}
