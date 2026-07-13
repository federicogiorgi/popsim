// population.js
// La popolazione: individui reali che nascono, si riproducono e muoiono.
//
// Modello INDIVIDUO-CENTRICO (un solo gene, piu' alleli possibili):
//   - Ogni individuo ha eta' in ANNI, un genotipo [a, b], una durata di vita e
//     una posizione nello spazio.
//   - Ogni ANNO (un tick): tutti invecchiano; gli adulti in eta' riproduttiva si
//     accoppiano a coppie e generano prole; poi avvengono le morti (per vecchiaia
//     e in numero legato alla mortalita' impostata). La deriva genetica emerge da
//     sola perche' la popolazione e' finita.
//   - Le posizioni non sono casuali: in ogni anno ciascun individuo e' ISOLATO
//     oppure ACCANTO al partner con cui si accoppia; la prole nasce vicino ai
//     genitori (ma non a diretto contatto).
//   - La consanguineita' F si calcola dal pedigree (alleli IBD), vedi kinship.js.
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
    this.nAllelesInit = config.nAlleles;
    this.alleleCount = config.nAlleles; // alleli distinti esistenti (cresce con la mutazione, max 9)
    this.knobs = { ...config.knobs };

    this.year = 0;
    this.nextId = 1;
    this.kin = new KinshipTracker();

    // Coppie formate quest'anno (per il layout spaziale e la scheda info).
    this.pairs = [];          // [{ a: idMaschio, b: idFemmina, child: idFiglio }]

    // Popolazione iniziale: individui fondatori, con eta' varia (struttura d'eta'
    // gia' "a regime", cosi' non muoiono e non si riproducono tutti insieme).
    this.individuals = [];
    for (let i = 0; i < this.size0; i++) {
      this.individuals.push(this._makeFounder());
    }
    this._layout();
  }

  // Numero massimo di riproduzioni per individuo: negli anni di vita da 2 a n-1.
  get maxRepro() { return Math.max(0, this.meanLife - 2); }

  // Aggiorna una manopola (chiamato dall'interfaccia mentre la simulazione gira).
  setKnob(name, value) { this.knobs[name] = value; }

  // Durata della vita di un individuo: attorno alla vita media, con variabilita'.
  _drawLifespan() {
    const n = this.meanLife;
    const v = Math.round(this.rng.gaussian(n, Math.max(1, n * LIFE.lifeVariation)));
    return Math.max(3, Math.min(n * 2, v)); // almeno 3 anni, non oltre il doppio della media
  }

  // Crea un fondatore: genotipo pescato dagli alleli iniziali, non imparentato.
  _makeFounder() {
    const lifespan = this._drawLifespan();
    const ind = createIndividual({
      id: this.nextId++,
      sex: this.rng.bool(0.5) ? 'F' : 'M',
      age: this.rng.int(lifespan),          // eta' iniziale varia
      genotype: [this.rng.int(this.nAllelesInit), this.rng.int(this.nAllelesInit)],
      lifespan,
      F: 0, mother: 0, father: 0,
    });
    this.kin.addFounder(ind.id, 0);
    return ind;
  }

  // Trasmissione di un allele da un genitore, con possibile mutazione in un
  // NUOVO allele. Sopra il tetto di 9 alleli, nessun nuovo allele viene creato.
  _transmit(allele) {
    const mu = this.knobs.mutation * SCALES.mutationMax;
    if (mu > 0 && this.alleleCount < MAX_ALLELES && this.rng.next() < mu) {
      return this.alleleCount++; // nuovo allele: indice successivo
    }
    return allele;
  }

  // Genera la prole di una coppia (madre = femmina, padre = maschio).
  _mate(mother, father) {
    // Segregazione mendeliana: un allele a caso da ciascun genitore, con mutazione.
    let a = this._transmit(mother.genotype[this.rng.int(2)]);
    let b = this._transmit(father.genotype[this.rng.int(2)]);

    // Migrazione: una frazione dei nuovi nati e' in realta' un immigrato non
    // imparentato, con alleli casuali pescati dal pool esistente.
    const m = this.knobs.migration * SCALES.migrationMax;
    const isMigrant = m > 0 && this.rng.next() < m;
    if (isMigrant) {
      a = this.rng.int(this.alleleCount);
      b = this.rng.int(this.alleleCount);
    }

    const child = createIndividual({
      id: this.nextId++,
      sex: this.rng.bool(0.5) ? 'F' : 'M',
      age: 0,
      genotype: [a, b],
      lifespan: this._drawLifespan(),
      mother: isMigrant ? 0 : mother.id,
      father: isMigrant ? 0 : father.id,
    });

    if (isMigrant) {
      this.kin.addFounder(child.id, 0);
      child.F = 0;
    } else {
      child.F = this.kin.addChild(child.id, mother.id, father.id);
    }
    return child;
  }

  // Avanza la simulazione di UN ANNO.
  step() {
    this.year++;

    // (1) Invecchiamento.
    for (const ind of this.individuals) ind.age++;

    // (2) Accoppiamento: gli adulti in eta' riproduttiva (2..n-1) che non hanno
    //     esaurito le riproduzioni si accoppiano a coppie maschio-femmina.
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
    for (let i = 0; i < nPairs; i++) {
      const male = eligM[i];
      const female = eligF[i];
      const child = this._mate(female, male);
      male.repro++;
      female.repro++;
      this.pairs.push({ a: male.id, b: female.id, child: child.id });
      newborns.push(child);
    }
    const births = newborns.length;

    // (3) Morti. Prima quelle per vecchiaia (eta' oltre la propria durata di
    //     vita). Poi si porta il totale a births * mortalita': cosi' mortalita' = 1
    //     mantiene la popolazione costante, < 1 la fa crescere, > 1 la fa calare.
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

    // La consanguineita' dei morti non serve piu': libera la loro riga.
    for (const d of dead) this.kin.remove(d.id);

    // Tetto di sicurezza (capacita' portante): con mortalita' < 1 la crescita e'
    // esponenziale; senza un limite la popolazione esploderebbe e bloccherebbe il
    // browser (il pedigree ha costo ~N²). I nati in eccesso non sopravvivono.
    let excess = survivors.length + newborns.length - LIMITS.maxSize;
    while (excess > 0 && newborns.length > 0) {
      const drop = newborns.pop();
      this.kin.remove(drop.id);
      excess--;
    }

    // (4) Nuova popolazione e disposizione spaziale.
    this.individuals = survivors.concat(newborns);
    this._layout();
  }

  // Uccide `k` individui scelti tra `rest`, con probabilita' crescente con l'eta'
  // e, se la selezione e' attiva, sfavorevole a chi non porta l'allele A1.
  // Sposta gli uccisi in `deadOut` e restituisce i sopravvissuti.
  _weightedKill(rest, k, deadOut) {
    const s = this.knobs.selection * SCALES.selectionMax;
    const items = rest.map((ind) => {
      let a1 = 0;
      if (ind.genotype[0] === FAVORED_ALLELE) a1++;
      if (ind.genotype[1] === FAVORED_ALLELE) a1++;
      // Piu' vecchio e/o meno alleli A1 => peso di morte piu' alto.
      const w = (1 + ind.age) * (1 + s * (2 - a1));
      return { ind, w, killed: false };
    });
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

    // Coppie di quest'anno: genitori vicini + prole accanto (non a contatto).
    for (const p of this.pairs) {
      const members = [];
      const male = byId.get(p.a);
      const female = byId.get(p.b);
      const child = byId.get(p.child);
      if (male) { members.push(male); used.add(male.id); }
      if (female) { members.push(female); used.add(female.id); }
      if (child) { members.push(child); used.add(child.id); }
      if (members.length) groups.push({ kind: 'pair', members });
    }
    // Tutti gli altri: isolati.
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
        // Genitori affiancati; prole poco sotto, a distanza (nessun contatto).
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
    // Frequenze alleliche osservate su tutti i 9 slot (gli alleli non ancora
    // esistenti restano a 0): cosi' il grafico ha righe di lunghezza costante.
    const freq = G.observedAlleleFreq(this.individuals, MAX_ALLELES);
    const He = G.expectedHeterozygosity(freq);
    const Ho = G.observedHeterozygosity(this.individuals);

    // Consanguineita' media della popolazione (media degli F individuali, IBD).
    let sumF = 0;
    for (const ind of this.individuals) sumF += ind.F;
    const F = this.individuals.length ? sumF / this.individuals.length : 0;

    let males = 0;
    for (const ind of this.individuals) if (ind.sex === 'M') males++;

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
      hw: G.hwComparison(this.individuals, this.alleleCount),
    };
  }

  // Snapshot compatto (array tipizzati) per registrare lo stato di ogni anno e
  // poterlo rivedere scorrendo la barra temporale.
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
