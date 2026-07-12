// genetics.js
// Il cuore "genetico" del simulatore: funzioni PURE di genetica di popolazione.
//
// Questo modulo non conosce ne' il canvas ne' l'interfaccia: lavora solo su
// numeri (vettori di frequenze) e su array di individui. Cosi' il renderer
// resta sostituibile e la logica resta testabile in isolamento.
//
// Convenzione: una "frequenza allelica" di un gene e' un array p di lunghezza
// k (numero di alleli), con p[i] = frequenza dell'allele i, e somma(p) = 1.

import { LIFE, FAVORED_ALLELE } from '../config.js';

// ---------------------------------------------------------------------------
// Utilita' di base
// ---------------------------------------------------------------------------

// Riporta un vettore a somma 1 (e a valori non negativi). Se la somma e' nulla
// ritorna una distribuzione uniforme, per non dividere per zero.
export function normalize(p) {
  let s = 0;
  for (const v of p) s += Math.max(0, v);
  if (s <= 0) return p.map(() => 1 / p.length);
  return p.map((v) => Math.max(0, v) / s);
}

// ---------------------------------------------------------------------------
// Le cinque forze evolutive, espresse come trasformazioni del vettore p.
//
// Nota di modello: le forze agiscono sulle FREQUENZE ALLELICHE (lo stato
// genetico autoritativo della popolazione). Gli individui della sandbox sono
// poi una "realizzazione" campionaria coerente con queste frequenze.
// Questo garantisce che, con tutte le forze a 0, le frequenze restino costanti
// e la popolazione rimanga all'equilibrio di Hardy-Weinberg.
// ---------------------------------------------------------------------------

// SELEZIONE direzionale: l'allele favorito guadagna un vantaggio relativo s.
// Modello a fitness relative: w_favorito = 1 + s, gli altri = 1.
export function applySelection(p, s, favored = FAVORED_ALLELE) {
  if (s <= 0) return p.slice();
  const out = p.map((pi, i) => pi * (i === favored ? 1 + s : 1));
  return normalize(out);
}

// MUTAZIONE simmetrica: ogni copia allelica muta con probabilita' mu verso uno
// degli altri alleli scelto a caso. All'equilibrio spinge verso frequenze
// uniformi (1/k per ogni allele).
export function applyMutation(p, mu) {
  if (mu <= 0) return p.slice();
  const k = p.length;
  if (k < 2) return p.slice();
  return p.map((pi) => pi * (1 - mu) + (mu * (1 - pi)) / (k - 1));
}

// MIGRAZIONE: una frazione m della popolazione viene rimpiazzata da migranti
// provenienti da una sorgente esterna con frequenze note (source).
export function applyMigration(p, m, source) {
  if (m <= 0) return p.slice();
  return p.map((pi, i) => (1 - m) * pi + m * source[i]);
}

// DERIVA GENETICA: campionamento casuale di 2N gameti (modello di Wright-Fisher).
// L'intensita' d (0..1) miscela tra "nessuna deriva" (d=0, frequenze invariate)
// e "deriva piena per la dimensione N" (d=1). Con d>0 le frequenze compiono una
// passeggiata aleatoria e possono fissarsi (0 o 1). N piccolo => deriva forte.
export function applyDrift(p, d, twoN, rng) {
  if (d <= 0) return p.slice();
  const counts = multinomial(twoN, p, rng);
  const wf = counts.map((c) => c / twoN);
  const out = p.map((pi, i) => pi + d * (wf[i] - pi));
  return normalize(out);
}

// ---------------------------------------------------------------------------
// Campionamento (binomiale / multinomiale) per la deriva
// ---------------------------------------------------------------------------

// Estrae un numero da una binomiale B(n, p). Per n grande usa l'approssimazione
// normale (veloce e sufficiente in ambito didattico); per n piccolo conta i
// successi uno a uno (esatto).
export function binomial(n, p, rng) {
  if (p <= 0) return 0;
  if (p >= 1) return n;
  if (n > 50) {
    const x = Math.round(rng.gaussian(n * p, Math.sqrt(n * p * (1 - p))));
    return Math.max(0, Math.min(n, x));
  }
  let c = 0;
  for (let i = 0; i < n; i++) if (rng.next() < p) c++;
  return c;
}

// Estrae i conteggi da una multinomiale con n prove e probabilita' probs,
// come sequenza di binomiali condizionate.
export function multinomial(n, probs, rng) {
  const k = probs.length;
  const out = new Array(k).fill(0);
  let remaining = n;
  let pRemaining = 1;
  for (let i = 0; i < k - 1; i++) {
    if (remaining <= 0) break;
    const pi = pRemaining > 0 ? probs[i] / pRemaining : 0;
    const xi = binomial(remaining, Math.max(0, Math.min(1, pi)), rng);
    out[i] = xi;
    remaining -= xi;
    pRemaining -= probs[i];
  }
  out[k - 1] = Math.max(0, remaining);
  return out;
}

// ---------------------------------------------------------------------------
// Ciclo vitale
// ---------------------------------------------------------------------------

// Probabilita' di morte in funzione dell'eta'. Cresce con l'eta' (curva cubica)
// e diventa certa raggiunta l'eta' massima.
export function mortality(age) {
  if (age >= LIFE.maxAge) return 1;
  const t = age / LIFE.maxAge;
  return Math.min(1, LIFE.baseMortality + (1 - LIFE.baseMortality) * t * t * t);
}

// ---------------------------------------------------------------------------
// Misure sulla popolazione (osservate = calcolate dagli individui reali)
// ---------------------------------------------------------------------------

// Frequenze alleliche OSSERVATE di un gene, contate dagli individui.
export function observedAlleleFreq(individuals, gene, k) {
  const counts = new Array(k).fill(0);
  for (const ind of individuals) {
    counts[ind.genotype[gene][0]]++;
    counts[ind.genotype[gene][1]]++;
  }
  const tot = individuals.length * 2 || 1;
  return counts.map((c) => c / tot);
}

// Eterozigosita' ATTESA He = 1 - somma(p_i^2). E' la probabilita' che, pescando
// due alleli a caso, siano diversi. Massima quando le frequenze sono uniformi.
export function expectedHeterozygosity(p) {
  let sum = 0;
  for (const pi of p) sum += pi * pi;
  return 1 - sum;
}

// Eterozigosita' OSSERVATA Ho = frazione di individui eterozigoti a quel gene.
export function observedHeterozygosity(individuals, gene) {
  if (individuals.length === 0) return 0;
  let het = 0;
  for (const ind of individuals) {
    if (ind.genotype[gene][0] !== ind.genotype[gene][1]) het++;
  }
  return het / individuals.length;
}

// Coefficiente di inbreeding F = 1 - Ho/He.
// F ~ 0: accoppiamento casuale (Hardy-Weinberg). F > 0: eccesso di omozigoti.
export function inbreedingF(Ho, He) {
  return He > 0 ? 1 - Ho / He : 0;
}

// ---------------------------------------------------------------------------
// Confronto con Hardy-Weinberg
// ---------------------------------------------------------------------------
//
// Per il caso a due alleli usiamo la relazione di riferimento richiesta:
//     p^2 + 2pq + q^2 = 1
// dove p e q sono le frequenze dei due alleli. Confrontiamo le frequenze
// genotipiche OSSERVATE (dagli individui) con quelle ATTESE sotto HW.
//
// IMPORTANTE: le frequenze attese si calcolano dalle frequenze alleliche
// OSSERVATE nel campione (non da quelle "teoriche" del modello). E' il test HW
// standard: cosi' si verifica se i GENOTIPI sono in proporzioni di HW date le
// frequenze alleliche realmente presenti, senza confondere il risultato con la
// naturale fluttuazione campionaria delle frequenze alleliche. Per questo i
// gradi di liberta' vengono ridotti di (k-1): abbiamo stimato k-1 frequenze.
//
// Per k > 2 alleli la relazione si generalizza: ogni omozigote A_iA_i ha
// frequenza attesa p_i^2 e ogni eterozigote A_iA_j (i != j) ha frequenza 2*p_i*p_j.
export function hwComparison(individuals, gene, k) {
  const n = individuals.length;

  // Conta i genotipi osservati (coppia di alleli ordinata: i <= j) e, insieme,
  // i conteggi allelici per stimare le frequenze alleliche osservate.
  const obs = new Map();
  const alleleCounts = new Array(k).fill(0);
  for (const ind of individuals) {
    let a = ind.genotype[gene][0];
    let b = ind.genotype[gene][1];
    alleleCounts[a]++;
    alleleCounts[b]++;
    if (a > b) { const t = a; a = b; b = t; }
    const key = a + '-' + b;
    obs.set(key, (obs.get(key) || 0) + 1);
  }
  const tot = n * 2 || 1;
  const p = alleleCounts.map((c) => c / tot); // frequenze alleliche OSSERVATE

  // Costruisce le classi genotipiche: prima gli omozigoti, poi gli eterozigoti.
  const classes = [];
  for (let i = 0; i < k; i++) {
    const key = i + '-' + i;
    classes.push({
      i, j: i, homozygous: true,
      obs: obs.get(key) || 0,
      expFreq: p[i] * p[i], // p^2
    });
  }
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const key = i + '-' + j;
      classes.push({
        i, j, homozygous: false,
        obs: obs.get(key) || 0,
        expFreq: 2 * p[i] * p[j], // 2pq
      });
    }
  }

  // Conteggi attesi e statistica chi-quadro di bonta' di adattamento.
  let chi2 = 0;
  let categories = 0;
  for (const c of classes) {
    c.exp = n * c.expFreq;
    c.obsFreq = n > 0 ? c.obs / n : 0;
    if (c.exp > 0) {
      chi2 += ((c.obs - c.exp) * (c.obs - c.exp)) / c.exp;
      categories++;
    }
  }
  // Gradi di liberta': (num. classi - 1) - (num. alleli stimati). Approssimato,
  // sufficiente per un indicatore didattico di scostamento.
  const df = Math.max(1, categories - 1 - (k - 1));

  // Valore-p del test chi-quadro di bonta' di adattamento a HW. E' l'indicatore
  // piu' robusto: a differenza di F, non "sfarfalla" per solo rumore campionario
  // quando la popolazione e' davvero in equilibrio (p alto = nessuno scostamento
  // significativo), qualunque sia la dimensione della popolazione.
  const pValue = chiSquarePValue(chi2, df);

  return { n, p: p.slice(), classes, chi2, df, pValue };
}

// ---------------------------------------------------------------------------
// Valore-p del test chi-quadro
// ---------------------------------------------------------------------------
//
// p = P(X > chi2) con X ~ chi-quadro a df gradi di liberta'. Si calcola tramite
// la funzione gamma incompleta regolarizzata. Implementazione classica (serie +
// frazione continua), sufficientemente accurata per uso didattico.

export function chiSquarePValue(chi2, df) {
  if (!(chi2 > 0) || df < 1) return 1;
  return 1 - regularizedLowerGamma(df / 2, chi2 / 2);
}

// Logaritmo della funzione gamma (approssimazione di Lanczos).
function gammaln(x) {
  const c = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5,
  ];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) { y++; ser += c[j] / y; }
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

// Funzione gamma incompleta inferiore regolarizzata P(a, x).
function regularizedLowerGamma(a, x) {
  if (x <= 0) return 0;
  const gln = gammaln(a);
  if (x < a + 1) {
    // Sviluppo in serie per P(a, x).
    let ap = a;
    let sum = 1 / a;
    let del = sum;
    for (let n = 0; n < 300; n++) {
      ap++;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-13) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - gln);
  }
  // Frazione continua per Q(a, x) = 1 - P(a, x).
  let b = x + 1 - a;
  let c = 1e30;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i <= 300; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = b + an / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-13) break;
  }
  const q = Math.exp(-x + a * Math.log(x) - gln) * h;
  return 1 - q;
}
