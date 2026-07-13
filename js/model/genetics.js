// genetics.js
// Funzioni PURE di genetica di popolazione, che lavorano sugli individui reali.
//
// Modello a DUE LIVELLI:
//   1. FREQUENZE ALLELICHE autoritative -> evolvono per effetto delle forze
//      (deriva, selezione, migrazione, mutazione). Con tutte le forze a 0 restano
//      costanti: e' l'equilibrio di Hardy-Weinberg, il caso di riferimento.
//   2. INDIVIDUI reali (con genealogia, per il coefficiente F di consanguineita') ->
//      il loro genotipo e' una realizzazione campionaria coerente con le frequenze.
//
// Qui stanno le forze che agiscono sulle FREQUENZE e le MISURE sulla popolazione
// (frequenze osservate, eterozigosita', test di Hardy-Weinberg). La simulazione
// si basa su un solo gene, quindi ogni individuo ha un genotipo [a, b].
//
// Convenzione: una "frequenza allelica" e' un array p con p[i] = frequenza
// dell'allele i e somma(p) = 1.

import { FAVORED_ALLELE } from '../config.js';

// Riporta un vettore a somma 1 (valori non negativi). Se la somma e' nulla,
// ritorna una distribuzione uniforme.
export function normalize(p) {
  let s = 0;
  for (const v of p) s += Math.max(0, v);
  if (s <= 0) return p.map(() => 1 / p.length);
  return p.map((v) => Math.max(0, v) / s);
}

// ---------------------------------------------------------------------------
// Le forze evolutive che agiscono sulle FREQUENZE alleliche
// ---------------------------------------------------------------------------

// SELEZIONE direzionale: l'allele favorito guadagna un vantaggio relativo s
// (fitness w = 1 + s contro 1 per gli altri).
export function applySelection(p, s, favored = FAVORED_ALLELE) {
  if (s <= 0) return p.slice();
  const out = p.map((pi, i) => pi * (i === favored ? 1 + s : 1));
  return normalize(out);
}

// MIGRAZIONE: una frazione m delle frequenze viene sostituita da una sorgente
// esterna con frequenze note (qui uniforme): avvicina p verso l'uniforme.
export function applyMigration(p, m, source) {
  if (m <= 0) return p.slice();
  return p.map((pi, i) => (1 - m) * pi + m * source[i]);
}

// DERIVA GENETICA: campionamento casuale di 2N gameti (modello di Wright-Fisher).
// L'intensita' d (0..1) miscela tra "nessuna deriva" (d = 0, frequenze invariate)
// e "deriva piena per la dimensione N" (d = 1). N piccolo => deriva forte.
export function applyDrift(p, d, twoN, rng) {
  if (d <= 0) return p.slice();
  const counts = multinomial(twoN, p, rng);
  const wf = counts.map((c) => c / twoN);
  const out = p.map((pi, i) => pi + d * (wf[i] - pi));
  return normalize(out);
}

// Estrae un numero da una binomiale B(n, p). Per n grande usa l'approssimazione
// normale; per n piccolo conta i successi uno a uno.
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

// Estrae i conteggi da una multinomiale con n prove e probabilita' probs.
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
// Misure sulla popolazione (calcolate dagli individui reali)
// ---------------------------------------------------------------------------

// Frequenze alleliche OSSERVATE, contate dagli individui (array di lunghezza k).
export function observedAlleleFreq(individuals, k) {
  const counts = new Array(k).fill(0);
  for (const ind of individuals) {
    counts[ind.genotype[0]]++;
    counts[ind.genotype[1]]++;
  }
  const tot = individuals.length * 2 || 1;
  return counts.map((c) => c / tot);
}

// Eterozigosita' ATTESA He = 1 - Σ p_i². Probabilita' che due alleli presi a
// caso siano diversi. Massima quando le frequenze sono uniformi.
export function expectedHeterozygosity(p) {
  let sum = 0;
  for (const pi of p) sum += pi * pi;
  return 1 - sum;
}

// Eterozigosita' OSSERVATA Ho = frazione di individui eterozigoti.
export function observedHeterozygosity(individuals) {
  if (individuals.length === 0) return 0;
  let het = 0;
  for (const ind of individuals) {
    if (ind.genotype[0] !== ind.genotype[1]) het++;
  }
  return het / individuals.length;
}

// ---------------------------------------------------------------------------
// Confronto con Hardy-Weinberg
// ---------------------------------------------------------------------------
//
// Confronta le frequenze genotipiche OSSERVATE con quelle ATTESE sotto HW,
// calcolate dalle frequenze alleliche osservate nel campione:
//     p² + 2pq + q² = 1   (due alleli)
// e, in generale, omozigote A_iA_i atteso p_i² ed eterozigote A_iA_j atteso
// 2·p_i·p_j. I gradi di liberta' del test si riducono di (k-1) perche' si
// stimano k-1 frequenze alleliche dai dati.
export function hwComparison(individuals, k) {
  const n = individuals.length;

  const obs = new Map();
  const alleleCounts = new Array(k).fill(0);
  for (const ind of individuals) {
    let a = ind.genotype[0];
    let b = ind.genotype[1];
    alleleCounts[a]++;
    alleleCounts[b]++;
    if (a > b) { const t = a; a = b; b = t; }
    const key = a + '-' + b;
    obs.set(key, (obs.get(key) || 0) + 1);
  }
  const tot = n * 2 || 1;
  const p = alleleCounts.map((c) => c / tot); // frequenze alleliche OSSERVATE

  const classes = [];
  for (let i = 0; i < k; i++) {
    const key = i + '-' + i;
    classes.push({ i, j: i, homozygous: true, obs: obs.get(key) || 0, expFreq: p[i] * p[i] });
  }
  for (let i = 0; i < k; i++) {
    for (let j = i + 1; j < k; j++) {
      const key = i + '-' + j;
      classes.push({ i, j, homozygous: false, obs: obs.get(key) || 0, expFreq: 2 * p[i] * p[j] });
    }
  }

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
  // Numero di alleli effettivamente presenti (per gradi di liberta' realistici).
  let present = 0;
  for (const pi of p) if (pi > 0) present++;
  const df = Math.max(1, categories - 1 - Math.max(0, present - 1));
  const pValue = chiSquarePValue(chi2, df);

  return { n, p: p.slice(), classes, chi2, df, pValue };
}

// ---------------------------------------------------------------------------
// Valore-p del test chi-quadro (funzione gamma incompleta regolarizzata)
// ---------------------------------------------------------------------------

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
