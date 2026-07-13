// population.js
// La popolazione: frequenze alleliche + individui reali che nascono, si
// accoppiano e muoiono.
//
// Modello a DUE LIVELLI (un solo gene, piu' alleli possibili):
//   1. FREQUENZE ALLELICHE autoritative (this.freq): sono lo stato genetico della
//      popolazione ed evolvono per effetto delle forze (deriva, selezione,
//      migrazione, mutazione). Con tutte le forze a 0 restano COSTANTI: e'
//      l'equilibrio di Hardy-Weinberg (nessun allele si perde).
//   2. INDIVIDUI reali: hanno eta' in ANNI, una genealogia (per il coefficiente F
//      di consanguineita', da IBD), una posizione e un genotipo pescato in modo
//      coerente con le frequenze correnti.
//
// Ogni ANNO (un tick): le forze aggiornano le frequenze; tutti invecchiano; gli
// adulti in eta' riproduttiva si accoppiano a coppie e generano prole (tanto
// meno quanto piu' sono consanguinei); poi avvengono le morti. Le posizioni non
// sono casuali: ciascuno e' isolato oppure accanto al partner, con la prole vicina.
//
// Questa classe NON disegna nulla: espone stato, statistiche e snapshot.

import { RNG } from './rng.js';
import { createIndividual } from './individual.js';
import { KinshipTracker } from './kinship.js';
import * as G from './genetics.js';
import { WORLD, SCALES, LIFE, LIMITS, MAX_ALLELES, FAVORED_ALLELE } from '../config.js';

export class Population {
  constructor(config) {
    this.config = config;
    this.rng = new RNG(config.seed);
    this.world = { width: WORLD.width, height: WORLD.height };

    this.size0 = config.size;         // popolazione iniziale (riferimento)
    this.meanLife = config.meanLife;  // vita media in anni (n)
    this.alleleCount = config.nAlleles; // alleli distinti esistenti (cresce con la mutazione, max 9)
    this.knobs = { ...config.knobs };

    this.year = 0;
    this.nextId = 1;
    this.kin = new KinshipTracker();

    // Frequenze alleliche autoritative (lunghezza fissa 9, attivi i primi
    // alleleCount). Inizializzate dalle frequenze scelte dall'utente.
    this.freq = new Array(MAX_ALLELES).fill(0);
    const init = G.normalize(config.initFreq.slice(0, this.alleleCount));
    for (let i = 0; i < this.alleleCount; i++) this.freq[i] = init[i];

    // Sorgente dei migranti: distribuzione uniforme sugli alleli presenti.
    this._migrantSource = () => {
      const s = new Array(MAX_ALLELES).fill(0);
      for (let i = 0; i < this.alleleCount; i++) s[i] = 1 / this.alleleCount;
      return s;
    };

    // Coppie formate quest'anno (per il layout spaziale e la scheda info).
    this.pairs = [];   // [{ a: idMaschio, b: idFemmina, child: idFiglio|null }]

    // Popolazione iniziale: individui fondatori, con eta' varia (struttura d'eta'
    // gia' "a regime") e genotipo coerente con le frequenze iniziali.
    this.individuals = [];
    for (let i = 0; i < this.size0; i++) this.individuals.push(this._makeFounder());
    this._layout();
  }

  // Numero massimo di riproduzioni per individuo: negli anni di vita da 2 a n-1.
  get maxRepro() { return Math.max(0, this.meanLife - 2); }

  setKnob(name, value) { this.knobs[name] = value; }

  // Durata della vita di un individuo: attorno alla vita media, con variabilita'.
  _drawLifespan() {
    const n = this.meanLife;
    const v = Math.round(this.rng.gaussian(n, Math.max(1, n * LIFE.lifeVariation)));
    return Math.max(3, Math.min(n * 2, v));
  }

  // Pesca un allele secondo le frequenze correnti (gli alleli assenti hanno 0).
  _sampleAllele() { return this.rng.weighted(this.freq); }

  // Crea un fondatore: non imparentato, genotipo pescato dalle frequenze iniziali.
  _makeFounder() {
    const lifespan = this._drawLifespan();
    const ind = createIndividual({
      id: this.nextId++,
      sex: this.rng.bool(0.5) ? 'F' : 'M',
      age: this.rng.int(lifespan),
      genotype: [this._sampleAllele(), this._sampleAllele()],
      lifespan,
      F: 0, mother: 0, father: 0,
    });
    this.kin.addFounder(ind.id, 0);
    return ind;
  }

  // Applica le forze che agiscono sulle FREQUENZE alleliche (livello 1).
  _applyForces() {
    const twoN = 2 * Math.max(1, this.individuals.length);
    let p = this.freq.slice(0, this.alleleCount);
    p = G.applySelection(p, this.knobs.selection * SCALES.selectionMax, FAVORED_ALLELE);
    const src = this._migrantSource().slice(0, this.alleleCount);
    p = G.applyMigration(p, this.knobs.migration * SCALES.migrationMax, src);
    p = G.applyDrift(p, this.knobs.drift, twoN, this.rng);
    for (let i = 0; i < this.alleleCount; i++) this.freq[i] = p[i];

    // MUTAZIONE: comparsa occasionale di un NUOVO allele (fino al tetto di 9).
    const mu = this.knobs.mutation * SCALES.mutationNewAllele;
    if (mu > 0 && this.alleleCount < MAX_ALLELES && this.rng.next() < mu) {
      const idx = this.alleleCount;
      const initFreq = Math.max(0.02, twoN > 0 ? 1 / twoN : 0.02);
      for (let i = 0; i < idx; i++) this.freq[i] *= (1 - initFreq);
      this.freq[idx] = initFreq;
      this.alleleCount++;
    }
  }

  // Genera il genotipo di un nuovo nato, coerente con le frequenze correnti.
  // L'accoppiamento non casuale (mating) alza la probabilita' di omozigosi.
  _childGenotype() {
    const a = this._sampleAllele();
    const b = this.rng.bool(this.knobs.mating) ? a : this._sampleAllele();
    return [a, b];
  }

  // Avanza la simulazione di UN ANNO.
  step() {
    this.year++;

    // (1) Forze sulle frequenze alleliche.
    this._applyForces();

    // (2) Invecchiamento.
    for (const ind of this.individuals) ind.age++;

    // (3) Accoppiamento. Gli adulti in eta' riproduttiva (2..n-1) che non hanno
    //     esaurito le riproduzioni si accoppiano a coppie maschio-femmina e
    //     generano prole.
    this.pairs = [];
    const eligM = [];
    const eligF = [];
    for (const ind of this.individuals) {
      if (ind.age >= 2 && ind.age <= this.meanLife - 1 && ind.repro < this.maxRepro) {
        (ind.sex === 'M' ? eligM : eligF).push(ind);
      }
    }
    this.rng.shuffle(eligM);
    this.rng.shuffle(eligF);
    const nPairs = Math.min(eligM.length, eligF.length);
    const newborns = [];
    const mMig = this.knobs.migration * SCALES.migrationMax;
    for (let i = 0; i < nPairs; i++) {
      const male = eligM[i];
      const female = eligF[i];
      const pair = { a: male.id, b: female.id, child: null };
      this.pairs.push(pair);

      male.repro++;
      female.repro++;
      const isMigrant = mMig > 0 && this.rng.next() < mMig;
      const child = createIndividual({
        id: this.nextId++,
        sex: this.rng.bool(0.5) ? 'F' : 'M',
        age: 0,
        genotype: this._childGenotype(),
        lifespan: this._drawLifespan(),
        mother: isMigrant ? 0 : female.id,
        father: isMigrant ? 0 : male.id,
      });
      if (isMigrant) {
        this.kin.addFounder(child.id, 0);
        child.F = 0;
      } else {
        child.F = this.kin.addChild(child.id, female.id, male.id);
        pair.child = child.id; // i figli "propri" nascono accanto ai genitori
      }
      newborns.push(child);
    }
    const births = newborns.length;

    // (4) Morti: prima per vecchiaia, poi si porta il totale a births * mortalita'.
    const dead = [];
    const rest = [];
    for (const ind of this.individuals) {
      if (ind.age > ind.lifespan) dead.push(ind);
      else rest.push(ind);
    }
    const target = Math.round(births * this.knobs.mortality);
    const extra = target - dead.length;
    let survivors;
    if (extra > 0 && rest.length > 0) {
      survivors = this._weightedKill(rest, Math.min(extra, rest.length), dead);
    } else {
      survivors = rest;
    }
    for (const d of dead) this.kin.remove(d.id);

    // Tetto di sicurezza (capacita' portante): evita che la crescita esponenziale
    // (mortalita' < 1) faccia esplodere la popolazione e blocchi il browser.
    let excess = survivors.length + newborns.length - LIMITS.maxSize;
    while (excess > 0 && newborns.length > 0) {
      const drop = newborns.pop();
      this.kin.remove(drop.id);
      // se era il figlio di una coppia, scollega il riferimento
      for (const p of this.pairs) if (p.child === drop.id) p.child = null;
      excess--;
    }

    // (5) Nuova popolazione e disposizione spaziale.
    this.individuals = survivors.concat(newborns);
    this._layout();
  }

  // Uccide `k` individui scelti tra `rest`, con probabilita' crescente con l'eta'.
  // (La selezione agisce sulle frequenze, non qui.)
  _weightedKill(rest, k, deadOut) {
    const items = rest.map((ind) => ({ ind, w: 1 + ind.age, killed: false }));
    for (let picked = 0; picked < k; picked++) {
      let total = 0;
      for (const it of items) if (!it.killed) total += it.w;
      if (total <= 0) break;
      let r = this.rng.next() * total;
      for (const it of items) {
        if (it.killed) continue;
        r -= it.w;
        if (r <= 0) { it.killed = true; deadOut.push(it.ind); break; }
      }
    }
    const survivors = [];
    for (const it of items) if (!it.killed) survivors.push(it.ind);
    return survivors;
  }

  // Dispone gli individui nello spazio: gruppi separati in una griglia. Ogni
  // gruppo e' o una coppia con la sua prole (membri vicini) o un singolo isolato.
  _layout() {
    const W = this.world.width;
    const H = this.world.height;
    const byId = new Map(this.individuals.map((i) => [i.id, i]));
    const used = new Set();
    const groups = [];

    for (const p of this.pairs) {
      const members = [];
      const male = byId.get(p.a);
      const female = byId.get(p.b);
      const child = p.child != null ? byId.get(p.child) : null;
      if (male) { members.push(male); used.add(male.id); }
      if (female) { members.push(female); used.add(female.id); }
      if (child) { members.push(child); used.add(child.id); }
      if (members.length) groups.push({ kind: 'pair', members });
    }
    for (const ind of this.individuals) {
      if (!used.has(ind.id)) groups.push({ kind: 'solo', members: [ind] });
    }

    const G_ = Math.max(1, groups.length);
    const cols = Math.max(1, Math.ceil(Math.sqrt((G_ * W) / H)));
    const rows = Math.max(1, Math.ceil(G_ / cols));
    const cw = W / cols;
    const ch = H / rows;
    const cell = Math.min(cw, ch);
    this.rng.shuffle(groups);

    for (let gi = 0; gi < groups.length; gi++) {
      const col = gi % cols;
      const row = Math.floor(gi / cols);
      const cx = col * cw + cw / 2;
      const cy = row * ch + ch / 2;
      const g = groups[gi];

      if (g.kind === 'solo') {
        const jit = cell * 0.12;
        g.members[0].x = cx + this.rng.range(-jit, jit);
        g.members[0].y = cy + this.rng.range(-jit, jit);
      } else {
        const male = g.members[0];
        const female = g.members[1] || null;
        const kids = g.members.slice(2);
        const dx = cell * 0.12;
        male.x = cx - dx; male.y = cy - cell * 0.06;
        if (female) { female.x = cx + dx; female.y = cy - cell * 0.06; }
        let ki = 0;
        for (const kid of kids) {
          kid.x = cx + (ki % 2 === 0 ? -1 : 1) * cell * 0.18;
          kid.y = cy + cell * 0.22;
          ki++;
        }
      }
    }
  }

  // Statistiche dell'anno corrente, per il grafico, il pannello HW e le info.
  stats() {
    // Frequenze alleliche AUTORITATIVE (per il grafico): con le forze a 0 restano
    // costanti, cosi' l'andamento nel tempo mostra linee piatte (HW).
    const freq = this.freq.slice(0, MAX_ALLELES);

    // Consanguineita' media (media degli F individuali, da IBD).
    let sumF = 0;
    for (const ind of this.individuals) sumF += ind.F;
    const F = this.individuals.length ? sumF / this.individuals.length : 0;

    let males = 0;
    for (const ind of this.individuals) if (ind.sex === 'M') males++;

    // Misure OSSERVATE sul campione di individui (per il test HW).
    const hw = G.hwComparison(this.individuals, this.alleleCount);
    const Ho = G.observedHeterozygosity(this.individuals);
    const He = G.expectedHeterozygosity(hw.p);

    return {
      year: this.year,
      size: this.individuals.length,
      males,
      females: this.individuals.length - males,
      births: this.pairs.length,
      alleleCount: this.alleleCount,
      freq,
      He,
      Ho,
      F,
      hw,
    };
  }

  // Snapshot compatto (array tipizzati) per registrare lo stato di ogni anno.
  snapshot() {
    const n = this.individuals.length;
    const x = new Float32Array(n);
    const y = new Float32Array(n);
    const age = new Uint16Array(n);
    const sex = new Uint8Array(n);      // 1 = F, 0 = M
    const id = new Uint32Array(n);
    const a = new Uint8Array(n);
    const b = new Uint8Array(n);
    const F = new Float32Array(n);
    const mother = new Uint32Array(n);
    const father = new Uint32Array(n);
    const repro = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
      const ind = this.individuals[i];
      x[i] = ind.x;
      y[i] = ind.y;
      age[i] = ind.age;
      sex[i] = ind.sex === 'F' ? 1 : 0;
      id[i] = ind.id;
      a[i] = ind.genotype[0];
      b[i] = ind.genotype[1];
      F[i] = ind.F;
      mother[i] = ind.mother;
      father[i] = ind.father;
      repro[i] = Math.min(255, ind.repro);
    }
    return { year: this.year, n, x, y, age, sex, id, a, b, F, mother, father, repro };
  }
}
