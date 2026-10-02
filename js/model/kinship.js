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
// Implementazione: la matrice e' DENSA, in un unico Float64Array (C x C), e ogni
// individuo vivo occupa uno "slot" (riga/colonna). Gli slot dei morti vengono
// riutilizzati dai nuovi nati. Rispetto a una mappa di mappe e' molto piu'
// veloce (niente hash, memoria contigua): e' il calcolo piu' costoso della
// simulazione, ~N operazioni per ogni nascita.
//
// Valori garantiti: F in [0, 1] (0.25 gia' per figli di fratelli), mai negativo.

export class KinshipTracker {
  constructor(capacity = 64) {
    this.cap = capacity;                       // lato della matrice (slot disponibili)
    this.m = new Float64Array(capacity * capacity); // m[i*cap + j] = f(slot i, slot j)
    this.Fs = new Float64Array(capacity);      // F dell'individuo in ogni slot
    this.slotOf = new Map();                   // id -> slot
    this.free = [];                            // slot liberati dai morti, da riusare
    this.hi = 0;                               // slot mai usati: [0, hi)
  }

  // Assegna uno slot libero (riusandone uno se possibile, altrimenti ne apre
  // uno nuovo, allargando la matrice se serve).
  _alloc(id) {
    let s;
    if (this.free.length) s = this.free.pop();
    else {
      if (this.hi === this.cap) this._grow();
      s = this.hi++;
    }
    this.slotOf.set(id, s);
    return s;
  }

  // Raddoppia il lato della matrice, copiando le righe esistenti.
  _grow() {
    const old = this.m;
    const oc = this.cap;
    const nc = oc * 2;
    const m = new Float64Array(nc * nc);
    for (let i = 0; i < oc; i++) m.set(old.subarray(i * oc, i * oc + oc), i * nc);
    const Fs = new Float64Array(nc);
    Fs.set(this.Fs);
    this.m = m;
    this.Fs = Fs;
    this.cap = nc;
  }

  // Registra un fondatore (o un immigrato): non imparentato, non consanguineo.
  addFounder(id, Fval = 0) {
    const s = this._alloc(id);
    const { m, cap, hi } = this;
    // Lo slot puo' contenere i valori di un individuo morto: si azzera.
    for (let j = 0; j < hi; j++) { m[s * cap + j] = 0; m[j * cap + s] = 0; }
    m[s * cap + s] = (1 + Fval) / 2; // auto-parentela f(X, X) = (1 + F_X) / 2
    this.Fs[s] = Fval;
  }

  // Coefficiente di consanguineita' di un individuo.
  getF(id) {
    const s = this.slotOf.get(id);
    return s === undefined ? 0 : this.Fs[s];
  }

  // Parentela (coancestry) tra due individui.
  coancestry(a, b) {
    const sa = this.slotOf.get(a);
    const sb = this.slotOf.get(b);
    if (sa === undefined || sb === undefined) return 0;
    return this.m[sa * this.cap + sb];
  }

  // Aggiunge un nuovo nato dai due genitori (entrambi vivi). Restituisce il suo F.
  addChild(id, mother, father) {
    const sm = this.slotOf.get(mother);
    const sf = this.slotOf.get(father);
    const s = this._alloc(id); // dopo _alloc: la matrice puo' essere stata allargata
    const { m, cap, hi } = this;
    const Fc = m[sm * cap + sf]; // F del figlio = parentela dei genitori
    // Parentela del nuovo nato con tutti gli altri (genitori inclusi): media
    // delle parentele dei due genitori. Le righe degli slot liberi contengono
    // valori senza significato, ma vengono riscritte quando lo slot si riusa.
    const rm = sm * cap;
    const rf = sf * cap;
    const rs = s * cap;
    for (let j = 0; j < hi; j++) {
      const v = (m[rm + j] + m[rf + j]) / 2;
      m[rs + j] = v;
      m[j * cap + s] = v;
    }
    m[rs + s] = (1 + Fc) / 2;
    this.Fs[s] = Fc;
    return Fc;
  }

  // Rimuove un individuo morto: il suo slot torna disponibile.
  remove(id) {
    const s = this.slotOf.get(id);
    if (s === undefined) return;
    this.slotOf.delete(id);
    this.free.push(s);
  }
}
