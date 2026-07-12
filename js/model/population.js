// population.js
// La popolazione: stato genetico + ciclo vitale + statistiche.
//
// Architettura (importante): questa classe NON disegna nulla. Espone lo stato e
// un metodo step() che fa avanzare la simulazione di una generazione. Il
// renderer (Canvas 2D) e l'interfaccia leggono soltanto snapshot e statistiche.
//
// Modello a due livelli (vedi genetics.js):
//   1. FREQUENZE ALLELICHE autoritative -> evolvono per effetto delle 5 forze.
//   2. INDIVIDUI -> realizzazione campionaria coerente con quelle frequenze,
//      usata per la grafica, i clic e il calcolo dello scostamento da HW.

import { RNG } from './rng.js';
import { createIndividual } from './individual.js';
import * as G from './genetics.js';
import { WORLD, SCALES, LIFE } from '../config.js';

export class Population {
  constructor(config) {
    this.config = config;
    this.rng = new RNG(config.seed);
    this.world = { width: WORLD.width, height: WORLD.height };

    this.nGenes = config.nGenes;
    this.nAlleles = config.nAlleles;
    this.size = config.size;
    this.tick = 0;
    this.nextId = 1;

    // Le manopole sono modificabili in tempo reale durante la simulazione.
    this.knobs = { ...config.knobs };

    // Frequenze alleliche autoritative: inizialmente uniformi (1/k per allele),
    // condizione di massima eterozigosita' e HW pulito.
    this.freq = [];
    for (let g = 0; g < this.nGenes; g++) {
      this.freq.push(new Array(this.nAlleles).fill(1 / this.nAlleles));
    }

    // Sorgente dei migranti: distribuzione uniforme fissa. La migrazione tende
    // quindi a riportare le frequenze verso 1/k. Scelta documentata e semplice.
    this.migrantSource = this.freq.map((p) => p.map(() => 1 / this.nAlleles));

    // Popolazione iniziale: individui con eta' casuale (struttura d'eta' gia'
    // "a regime", cosi' non muoiono tutti insieme all'inizio).
    this.individuals = [];
    for (let i = 0; i < this.size; i++) {
      this.individuals.push(this._birth(this.rng.int(LIFE.maxAge)));
    }
  }

  // Aggiorna una manopola (chiamato dall'interfaccia mentre la sim gira).
  setKnob(name, value) {
    this.knobs[name] = value;
  }

  // Pesca un allele del gene g secondo le frequenze autoritative correnti.
  _sampleAllele(g) {
    return this.rng.weighted(this.freq[g]);
  }

  // Crea un nuovo individuo (un "nato"). Il genotipo e' pescato dalle frequenze
  // alleliche; l'accoppiamento non casuale introduce un eccesso di omozigoti.
  _birth(age = 0) {
    const genotype = new Array(this.nGenes);
    const alpha = this.knobs.mating; // 0 = casuale, 1 = massima omozigosita'
    for (let g = 0; g < this.nGenes; g++) {
      const a = this._sampleAllele(g);
      // Con probabilita' alpha il secondo allele e' uguale al primo (omozigote):
      // e' il meccanismo dell'accoppiamento assortativo/inbreeding, che alza F
      // senza modificare le frequenze alleliche.
      const b = this.rng.bool(alpha) ? a : this._sampleAllele(g);
      genotype[g] = [a, b];
    }
    return createIndividual({
      id: this.nextId++,
      species: 'sapiens',
      sex: this.rng.bool(0.5) ? 'F' : 'M',
      age,
      genotype,
      x: this.rng.range(0, this.world.width),
      y: this.rng.range(0, this.world.height),
      vx: this.rng.range(-1, 1),
      vy: this.rng.range(-1, 1),
    });
  }

  // Avanza la simulazione di UNA generazione (un tick).
  step() {
    // (1) Applica le cinque forze alle frequenze alleliche autoritative.
    const twoN = 2 * this.size;
    for (let g = 0; g < this.nGenes; g++) {
      let p = this.freq[g];
      p = G.applySelection(p, this.knobs.selection * SCALES.selectionMax);
      p = G.applyMutation(p, this.knobs.mutation * SCALES.mutationMax);
      p = G.applyMigration(p, this.knobs.migration * SCALES.migrationMax, this.migrantSource[g]);
      p = G.applyDrift(p, this.knobs.drift, twoN, this.rng);
      this.freq[g] = p;
    }

    // (2) Ciclo vitale: invecchiamento e morte.
    const survivors = [];
    for (const ind of this.individuals) {
      ind.age++;
      if (this.rng.next() < G.mortality(ind.age)) continue; // muore
      survivors.push(ind);
    }
    // (3) Nascite: reintegra la popolazione fino a mantenere N costante.
    //     I nati ricevono un genotipo coerente con le frequenze aggiornate.
    while (survivors.length < this.size) survivors.push(this._birth(0));
    if (survivors.length > this.size) survivors.length = this.size;
    this.individuals = survivors;

    this.tick++;
  }

  // Aggiorna solo le posizioni (animazione). Separato da step() perche' e'
  // puramente decorativo e viene chiamato a ogni frame di rendering, mentre la
  // genetica avanza al ritmo (piu' lento) scelto dall'utente.
  animate() {
    const W = this.world.width;
    const H = this.world.height;
    for (const ind of this.individuals) {
      ind.vx += this.rng.range(-0.3, 0.3);
      ind.vy += this.rng.range(-0.3, 0.3);
      const sp = Math.hypot(ind.vx, ind.vy);
      const max = 1.6;
      if (sp > max) { ind.vx *= max / sp; ind.vy *= max / sp; }
      ind.x += ind.vx;
      ind.y += ind.vy;
      if (ind.x < 0) { ind.x = 0; ind.vx *= -1; }
      else if (ind.x > W) { ind.x = W; ind.vx *= -1; }
      if (ind.y < 0) { ind.y = 0; ind.vy *= -1; }
      else if (ind.y > H) { ind.y = H; ind.vy *= -1; }
    }
  }

  // Statistiche del tick corrente, per il grafico, il pannello HW e le info.
  stats() {
    const perGene = [];
    for (let g = 0; g < this.nGenes; g++) {
      // Frequenze osservate nel campione: base del test HW e del coefficiente F.
      const obsFreq = G.observedAlleleFreq(this.individuals, g, this.nAlleles);
      const He = G.expectedHeterozygosity(obsFreq);
      const Ho = G.observedHeterozygosity(this.individuals, g);
      perGene.push({
        freq: this.freq[g].slice(),   // frequenze ALLELICHE del modello (per il grafico)
        obsFreq,                       // frequenze osservate nel campione
        He,
        Ho,
        F: G.inbreedingF(Ho, He),
        hw: G.hwComparison(this.individuals, g, this.nAlleles), // test HW (osservate)
      });
    }
    // Conteggio maschi/femmine (informativo).
    let males = 0;
    for (const ind of this.individuals) if (ind.sex === 'M') males++;
    return {
      tick: this.tick,
      size: this.individuals.length,
      males,
      females: this.individuals.length - males,
      perGene,
    };
  }

  // Snapshot compatto (array tipizzati) per registrare lo stato ad ogni tick e
  // poterlo rivedere scorrendo la barra temporale. Compatto = poca memoria anche
  // con molti individui e molte generazioni.
  snapshot() {
    const n = this.individuals.length;
    const ng = this.nGenes;
    const x = new Float32Array(n);
    const y = new Float32Array(n);
    const age = new Uint16Array(n);
    const sex = new Uint8Array(n);      // 1 = F, 0 = M
    const id = new Uint32Array(n);
    const geno = new Int16Array(n * ng * 2);
    for (let i = 0; i < n; i++) {
      const ind = this.individuals[i];
      x[i] = ind.x;
      y[i] = ind.y;
      age[i] = ind.age;
      sex[i] = ind.sex === 'F' ? 1 : 0;
      id[i] = ind.id;
      for (let g = 0; g < ng; g++) {
        geno[(i * ng + g) * 2] = ind.genotype[g][0];
        geno[(i * ng + g) * 2 + 1] = ind.genotype[g][1];
      }
    }
    return { tick: this.tick, n, ng, x, y, age, sex, id, geno };
  }
}
