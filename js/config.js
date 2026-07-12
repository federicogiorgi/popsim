// config.js
// Costanti e valori di default condivisi da tutta l'applicazione.
// Tenere qui i "numeri magici" rende semplice la messa a punto didattica.

// Dimensioni logiche del "mondo" (la sandbox). Il canvas viene scalato
// per adattarsi allo schermo, ma la simulazione ragiona in queste coordinate.
export const WORLD = { width: 1000, height: 600 };

// Limiti massimi accettati dai controlli di setup.
export const LIMITS = {
  maxSize: 10000,   // numero massimo di individui richiesto dalla specifica
  maxGenes: 6,      // numero massimo di geni
  maxAlleles: 6,    // numero massimo di alleli per gene
};

// Parametri iniziali di default. Le cinque manopole partono da 0 così che,
// senza forze attive, la popolazione resti all'equilibrio di Hardy-Weinberg.
export const DEFAULTS = {
  size: 100,
  nGenes: 2,
  nAlleles: 2,
  seed: 12345,
  knobs: {
    drift: 0,      // deriva genetica
    mutation: 0,   // mutazione
    migration: 0,  // migrazione
    selection: 0,  // selezione
    mating: 0,     // accoppiamento non casuale
  },
};

// Le manopole nell'interfaccia vanno da 0 a 1 (adimensionali, facili da capire).
// Qui definiamo come 1 viene tradotto nel parametro biologico corrispondente.
// I valori sono volutamente "esagerati" rispetto alla realtà per rendere gli
// effetti visibili nell'arco di poche generazioni, come serve in aula.
export const SCALES = {
  mutationMax: 0.05,   // tasso di mutazione massimo per allele per generazione
  migrationMax: 0.5,   // frazione massima di rimpiazzo per migrazione
  selectionMax: 0.6,   // coefficiente di selezione massimo a favore dell'allele 1
};

// Ciclo vitale degli individui (in "tick" = generazioni).
export const LIFE = {
  maxAge: 60,          // età oltre la quale la morte è certa
  baseMortality: 0.01, // mortalità di base anche da giovani
};

// Allele favorito dalla selezione direzionale (indice 0 = "A1").
export const FAVORED_ALLELE = 0;

// Etichette italiane delle cinque manopole (usate nell'interfaccia).
export const KNOB_LABELS = {
  drift: 'Deriva genetica',
  mutation: 'Mutazione',
  migration: 'Migrazione',
  selection: 'Selezione',
  mating: 'Accoppiamento non casuale',
};

// Breve descrizione di ogni forza, mostrata come suggerimento nell'interfaccia.
export const KNOB_HINTS = {
  drift: 'Fluttuazione casuale delle frequenze: piu forte nelle popolazioni piccole.',
  mutation: 'Converte alleli in altri alleli, spingendo verso frequenze uniformi.',
  migration: 'Ingresso di alleli da una popolazione esterna (sorgente uniforme).',
  selection: 'Vantaggio riproduttivo a favore dell\'allele A1.',
  mating: 'Accoppiamento tra simili: produce eccesso di omozigoti (F > 0).',
};

// Tavolozza di colori per gli alleli (fino a 6). Scelti per essere distinguibili.
// Lo stesso colore identifica un allele sia nella sandbox sia nel grafico.
export const ALLELE_COLORS = [
  '#4e79a7', // A1 blu
  '#f28e2b', // A2 arancio
  '#59a14f', // A3 verde
  '#e15759', // A4 rosso
  '#b07aa1', // A5 viola
  '#edc948', // A6 giallo
];

// Etichetta leggibile per un allele (A1, A2, ...).
export function alleleLabel(i) { return 'A' + (i + 1); }
