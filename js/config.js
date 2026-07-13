// config.js
// Costanti e valori di default condivisi da tutta l'applicazione.
// Tenere qui i "numeri magici" rende semplice la messa a punto didattica.

// Dimensioni logiche del "mondo" (la sandbox). Il canvas viene scalato
// per adattarsi allo schermo, ma la simulazione ragiona in queste coordinate.
export const WORLD = { width: 1000, height: 600 };

// Numero massimo di alleli distinti per il gene. Cap fissato a 9 cosi' che le
// etichette (A1..A9) restino a una sola cifra e l'ordinamento alfabetico
// coincida con quello numerico (niente A10/A11/A2...). Sopra 9, le mutazioni
// non generano piu' nuovi alleli.
export const MAX_ALLELES = 9;

// Limiti massimi accettati dai controlli di setup.
export const LIMITS = {
  maxSize: 1000,       // popolazione massima ("piccola popolazione" didattica)
  maxAlleles: MAX_ALLELES,
  maxYears: 10000,     // durata massima della simulazione, in anni (hard cap)
  maxLife: 100,        // vita media massima impostabile, in anni
};

// Parametri iniziali di default. Le forze partono da valori "neutri": con la
// sola mortalita' = 1 (e tutte le altre forze a 0) le frequenze alleliche
// restano COSTANTI e la popolazione rispetta l'equilibrio di Hardy-Weinberg.
export const DEFAULTS = {
  size: 50,            // numero iniziale di individui
  nAlleles: 2,         // alleli presenti all'avvio
  years: 1000,         // durata della simulazione, in anni
  meanLife: 10,        // vita media di un individuo, in anni
  seed: 12345,
  speed: 30,           // anni al secondo in riproduzione (default)
  knobs: {
    mortality: 1,      // morti per ogni nato (1 = popolazione costante)
    drift: 0,          // deriva genetica (0 = frequenze costanti)
    mutation: 0,       // genera nuovi alleli nel tempo
    migration: 0,      // ingresso/uscita di migranti non imparentati
    selection: 0,      // vantaggio a favore dell'allele A1
    mating: 0,         // accoppiamento non casuale (eccesso di omozigoti)
  },
};

// Frequenze alleliche iniziali di default, in funzione del numero di alleli.
// La somma e' sempre 1. Valori "sensati" e decrescenti.
export function defaultFreqs(k) {
  if (k <= 2) return [0.6, 0.4];
  if (k === 3) return [0.5, 0.4, 0.1];
  // k >= 4: pesi lineari decrescenti [k, k-1, ..., 1], normalizzati.
  const w = [];
  let s = 0;
  for (let i = 0; i < k; i++) { w.push(k - i); s += k - i; }
  return w.map((v) => +(v / s).toFixed(3));
}

// Traduzione delle manopole (valore adimensionale) nel parametro biologico.
// I valori sono volutamente "esagerati" per rendere gli effetti visibili in
// pochi anni, come serve in aula.
export const SCALES = {
  selectionMax: 0.1,      // vantaggio massimo di frequenza per l'allele A1, per anno
  migrationMax: 0.1,      // frazione massima di nuovi nati che sono immigranti
  mutationNewAllele: 0.05, // probabilita' massima, per anno, di comparsa di un nuovo allele
};

// Ciclo vitale: variabilita' della durata della vita attorno alla vita media.
export const LIFE = {
  lifeVariation: 0.18, // deviazione standard della vita, come frazione della vita media
};

// Allele favorito dalla selezione direzionale (indice 0 = "A1").
export const FAVORED_ALLELE = 0;

// Definizione delle manopole (le forze evolutive). Ogni manopola porta con se'
// il proprio intervallo, cosi' l'interfaccia si costruisce da questi dati.
export const KNOBS = [
  {
    name: 'mortality',
    label: 'Mortalità',
    hint: 'Morti per ogni nato: 1 mantiene la popolazione costante, sotto 1 la fa crescere, sopra 1 la fa diminuire.',
    min: 0, max: 2, step: 0.05, default: DEFAULTS.knobs.mortality,
  },
  {
    name: 'drift',
    label: 'Deriva genetica',
    hint: 'Fluttuazione casuale delle frequenze alleliche: più forte nelle popolazioni piccole. A 0 le frequenze restano costanti.',
    min: 0, max: 1, step: 0.01, default: DEFAULTS.knobs.drift,
  },
  {
    name: 'mutation',
    label: 'Mutazione',
    hint: 'Probabilità di comparsa di nuovi alleli nel tempo (fino a un massimo di 9 alleli).',
    min: 0, max: 1, step: 0.01, default: DEFAULTS.knobs.mutation,
  },
  {
    name: 'migration',
    label: 'Migrazione',
    hint: 'Ingresso/uscita di migranti non imparentati: avvicina le frequenze e abbassa la consanguineità.',
    min: 0, max: 1, step: 0.01, default: DEFAULTS.knobs.migration,
  },
  {
    name: 'selection',
    label: 'Selezione',
    hint: 'Vantaggio direzionale a favore dell’allele A1.',
    min: 0, max: 1, step: 0.01, default: DEFAULTS.knobs.selection,
  },
  {
    name: 'mating',
    label: 'Accoppiamento non casuale',
    hint: 'Accoppiamento tra simili: eccesso di omozigoti (F genotipico > 0), senza cambiare le frequenze alleliche.',
    min: 0, max: 1, step: 0.01, default: DEFAULTS.knobs.mating,
  },
];

// Tavolozza di colori per gli alleli (fino a 9). Scelti per essere distinguibili.
// Lo stesso colore identifica un allele sia nella sandbox sia nel grafico.
export const ALLELE_COLORS = [
  '#4e79a7', // A1 blu
  '#f28e2b', // A2 arancio
  '#59a14f', // A3 verde
  '#e15759', // A4 rosso
  '#b07aa1', // A5 viola
  '#edc948', // A6 giallo
  '#76b7b2', // A7 turchese
  '#ff9da7', // A8 rosa
  '#9c755f', // A9 marrone
];

// Etichetta leggibile per un allele (A1, A2, ...). Con il cap a 9 resta a una cifra.
export function alleleLabel(i) { return 'A' + (i + 1); }
