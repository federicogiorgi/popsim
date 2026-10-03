// i18n.js
// Traduzioni dell'interfaccia: italiano (default) e inglese.
//
// - t(key, ...args): testo nella lingua corrente. Le voci possono essere
//   stringhe o funzioni (per i testi con numeri dentro).
// - Gli elementi statici di index.html portano attributi data-i18n (testo),
//   data-i18n-html (HTML) e data-i18n-attr="attr:chiave;attr:chiave".
//   applyStatic() li aggiorna.
// - La lingua scelta e' salvata nel browser (localStorage), come il tema.
//
// La simulazione non dipende dalla lingua: cambia solo cio' che si legge.

const KEY = 'popsim-lang';
export const LANGS = ['it', 'en'];

const DICT = {
  it: {
    'page.title': 'PopSim - Genetica di Popolazione',
    'page.description': 'Simulatore didattico di genetica di popolazione: individui che nascono, si accoppiano e muoiono, deriva, mutazione, migrazione, selezione, consanguineità ed equilibrio di Hardy-Weinberg.',
    'home.title': 'Torna alla schermata iniziale (reimposta i parametri)',
    'subtitle': 'Simulatore di genetica di popolazione',
    'sandbox.aria': 'Sandbox',
    'gen.running': 'Simulazione evolutiva in corso…',
    'info.aria': 'Individuo selezionato',
    'info.close': 'Chiudi',
    'legend.female': 'femmina',
    'legend.male': 'maschio',
    'legend.color': 'colore = alleli (metà per allele negli eterozigoti) · clicca un individuo',
    'transport.aria': 'Controllo del tempo',
    'speed': 'Velocità',
    'slider.aria': 'Linea temporale',
    'params.aria': 'Parametri della simulazione',
    'setup.title': 'Imposta la simulazione',
    'setup.hint': 'La simulazione si basa su un solo gene (con più alleli possibili). Gli individui nascono, si accoppiano e muoiono, anno dopo anno. Regola i parametri iniziali e le forze, poi premi «Avvia». Con tutte le forze a 0 (e la sola mortalità = 1) le frequenze restano costanti: è l’equilibrio di Hardy-Weinberg.',
    'btn.start': '▶ Avvia simulazione',
    'btn.restart': '↻ Riavvia simulazione',
    'group.forces': 'Forze evolutive',
    'group.settings': 'Impostazioni iniziali',
    'group.freqs': 'Frequenze alleliche iniziali',
    'cfg.size': 'N. individui',
    'cfg.years': 'Durata (anni)',
    'cfg.life': 'Vita media (anni)',
    'cfg.alleles': 'Alleli iniziali',
    'cfg.seed': 'Seme casuale',
    'freqs.hint': 'La somma viene riportata a 1 all’avvio.',
    'freq.label': (a) => 'Freq. ' + a,
    'chart.freq.title': 'Frequenze alleliche nel tempo',
    'chart.freq.aria': 'Andamento delle frequenze alleliche',
    'chart.geno.title': 'Frequenze genotipiche nel tempo',
    'chart.geno.aria': 'Andamento delle frequenze genotipiche',
    'chart.pop.title': 'Numero di individui nel tempo',
    'chart.pop.aria': 'Andamento del numero di individui',
    'chart.years': (n) => n + ' anni',
    'chart.observed': 'osservate',
    'chart.expected': 'attese (HW)',
    'hw.title': 'Equilibrio di Hardy-Weinberg',
    'hw.placeholder': 'Le statistiche di Hardy-Weinberg compariranno qui.',
    'footer': 'PopSim - strumento didattico di genetica di popolazione. Sviluppato da Federico M. Giorgi.',

    'knob.mortality': 'Mortalità',
    'knob.mortality.hint': 'Morti per ogni nato: 1 mantiene la popolazione costante, sotto 1 la fa crescere, sopra 1 la fa diminuire.',
    'knob.drift': 'Deriva genetica',
    'knob.drift.hint': 'Fluttuazione casuale delle frequenze alleliche: più forte nelle popolazioni piccole. A 0 le frequenze restano costanti.',
    'knob.mutation': 'Mutazione',
    'knob.mutation.hint': 'Probabilità di comparsa di nuovi alleli nel tempo (fino a un massimo di 9 alleli).',
    'knob.migration': 'Migrazione (Flusso genico)',
    'knob.migration.hint': 'Ingresso/uscita di migranti non imparentati: avvicina le frequenze e abbassa la consanguineità.',
    'knob.selection': 'Selezione',
    'knob.selection.hint': 'Vantaggio direzionale a favore dell’allele A1.',
    'knob.mating': 'Accoppiamento non casuale',
    'knob.mating.hint': 'Accoppiamento tra simili: eccesso di omozigoti (F genotipico > 0), senza cambiare le frequenze alleliche.',

    'time.play': '▶ Play',
    'time.pause': '⏸ Pausa',
    'time.playAria': 'Play',
    'time.pauseAria': 'Pausa',
    'time.label': (c, last) => 'Anno ' + c + ' / ' + last,
    'time.size': (n) => n + ' individui',

    'theme.title': 'Tema chiaro / scuro',
    'theme.dark': 'Tema scuro (attiva il chiaro)',
    'theme.light': 'Tema chiaro (attiva lo scuro)',
    'lang.title': 'Lingua: italiano / inglese',
    'lang.aria': 'Lingua italiana (passa all’inglese)',

    'info.hint': 'Clicca un individuo nella sandbox per vederne i dettagli.',
    'info.absent': 'L’individuo selezionato non è presente in questo istante (nato dopo, oppure già morto).',
    'info.female': 'Femmina (F)',
    'info.male': 'Maschio (M)',
    'info.founder': 'fondatore / immigrato',
    'info.parents': (m, f) => '#' + m + ' (madre) × #' + f + ' (padre)',
    'info.individual': (id) => 'Individuo #' + id,
    'info.sex': 'Sesso',
    'info.age': 'Età',
    'info.ageVal': (a) => a + (a === 1 ? ' anno' : ' anni'),
    'info.genotype': 'Genotipo',
    'info.homo': 'omozigote',
    'info.hetero': 'eterozigote',
    'info.inbreeding': 'Consanguineità',
    'info.fromIBD': '(da IBD)',
    'info.parentsLabel': 'Genitori',
    'info.children': 'Figli',

    'hw.refYear0': 'dell’anno 0',
    'hw.refAgo': (n) => 'di ' + n + ' anni fa',
    'hw.c1': '① Frequenze alleliche stabili nel tempo',
    'hw.c1.no': 'no: stanno cambiando',
    'hw.yes': 'sì',
    'hw.c1.detail': (d, w) => 'variazione max ' + d + ' negli ultimi ' + w + ' anni',
    'hw.c1.first': 'primo anno: nessuna variazione ancora osservabile',
    'hw.c2': '② Genotipi come previsti da Hardy-Weinberg (test χ²)',
    'hw.c2.newAllele': 'no: è comparso un allele nuovo',
    'hw.c2.newAlleleDetail': (y) => 'genotipi impossibili per HW: l’allele non esisteva nell’anno ' + y + ' (mutazione)',
    'hw.c2.notSig': 'non significativo',
    'hw.c2.sig': 'significativo',
    'hw.c2.no': 'no: i genotipi si sono allontanati dalla previsione',
    'hw.c2.probably': 'sì, probabilmente',
    'hw.c2.falsePos': 'significativo, ma nessuna forza è attiva, quindi è una fluttuazione campionaria (falso positivo atteso nel ~5% dei casi)',
    'hw.inEq': 'In equilibrio di Hardy-Weinberg (① e ② soddisfatte)',
    'hw.notEq': (f) => 'NON in equilibrio di Hardy-Weinberg (non soddisfatta: ' + f + ')',
    'hw.and': ' e ',
    'hw.refFreqs': (ref, y) => 'Frequenze alleliche ' + ref + ' (anno ' + y + '): ',
    'hw.base': '→ base della previsione',
    'hw.nowFreqs': 'Frequenze alleliche oggi negli individui: ',
    'hw.homoRule': 'omozigote',
    'hw.heteroRule': 'eterozigote',
    'hw.genotype': 'Genotipo',
    'hw.observed': 'Osservati (oggi)',
    'hw.expected': (y) => 'Attesi HW (dalle frequenze dell’anno ' + y + ')',
    'hw.F': 'Coefficiente F (consanguineità, IBD)',
  },

  en: {
    'page.title': 'PopSim - Population Genetics',
    'page.description': 'Educational population genetics simulator: individuals that are born, mate and die; drift, mutation, migration, selection, inbreeding and Hardy-Weinberg equilibrium.',
    'home.title': 'Back to the start screen (resets the parameters)',
    'subtitle': 'Population genetics simulator',
    'sandbox.aria': 'Sandbox',
    'gen.running': 'Running the evolutionary simulation…',
    'info.aria': 'Selected individual',
    'info.close': 'Close',
    'legend.female': 'female',
    'legend.male': 'male',
    'legend.color': 'colour = alleles (half per allele in heterozygotes) · click an individual',
    'transport.aria': 'Time control',
    'speed': 'Speed',
    'slider.aria': 'Timeline',
    'params.aria': 'Simulation parameters',
    'setup.title': 'Set up the simulation',
    'setup.hint': 'The simulation follows a single gene (with possibly several alleles). Individuals are born, mate and die, year after year. Adjust the starting parameters and the forces, then press «Start». With all forces at 0 (and mortality = 1) the frequencies stay constant: this is Hardy-Weinberg equilibrium.',
    'btn.start': '▶ Start simulation',
    'btn.restart': '↻ Restart simulation',
    'group.forces': 'Evolutionary forces',
    'group.settings': 'Starting settings',
    'group.freqs': 'Starting allele frequencies',
    'cfg.size': 'No. of individuals',
    'cfg.years': 'Duration (years)',
    'cfg.life': 'Mean lifespan (years)',
    'cfg.alleles': 'Starting alleles',
    'cfg.seed': 'Random seed',
    'freqs.hint': 'The sum is rescaled to 1 at start.',
    'freq.label': (a) => 'Freq. ' + a,
    'chart.freq.title': 'Allele frequencies over time',
    'chart.freq.aria': 'Allele frequencies over time',
    'chart.geno.title': 'Genotype frequencies over time',
    'chart.geno.aria': 'Genotype frequencies over time',
    'chart.pop.title': 'Number of individuals over time',
    'chart.pop.aria': 'Number of individuals over time',
    'chart.years': (n) => n + ' years',
    'chart.observed': 'observed',
    'chart.expected': 'expected (HW)',
    'hw.title': 'Hardy-Weinberg equilibrium',
    'hw.placeholder': 'Hardy-Weinberg statistics will appear here.',
    'footer': 'PopSim - an educational population genetics tool. Developed by Federico M. Giorgi.',

    'knob.mortality': 'Mortality',
    'knob.mortality.hint': 'Deaths per birth: 1 keeps the population constant, below 1 it grows, above 1 it shrinks.',
    'knob.drift': 'Genetic drift',
    'knob.drift.hint': 'Random fluctuation of allele frequencies: stronger in small populations. At 0 the frequencies stay constant.',
    'knob.mutation': 'Mutation',
    'knob.mutation.hint': 'Probability that new alleles appear over time (up to a maximum of 9 alleles).',
    'knob.migration': 'Migration (Gene flow)',
    'knob.migration.hint': 'Unrelated migrants moving in/out: pulls the frequencies together and lowers inbreeding.',
    'knob.selection': 'Selection',
    'knob.selection.hint': 'Directional advantage for allele A1.',
    'knob.mating': 'Non-random mating',
    'knob.mating.hint': 'Like mates with like: excess of homozygotes (genotypic F > 0), without changing the allele frequencies.',

    'time.play': '▶ Play',
    'time.pause': '⏸ Pause',
    'time.playAria': 'Play',
    'time.pauseAria': 'Pause',
    'time.label': (c, last) => 'Year ' + c + ' / ' + last,
    'time.size': (n) => n + ' individuals',

    'theme.title': 'Light / dark theme',
    'theme.dark': 'Dark theme (switch to light)',
    'theme.light': 'Light theme (switch to dark)',
    'lang.title': 'Language: Italian / English',
    'lang.aria': 'English language (switch to Italian)',

    'info.hint': 'Click an individual in the sandbox to see its details.',
    'info.absent': 'The selected individual is not present at this time (born later, or already dead).',
    'info.female': 'Female (F)',
    'info.male': 'Male (M)',
    'info.founder': 'founder / immigrant',
    'info.parents': (m, f) => '#' + m + ' (mother) × #' + f + ' (father)',
    'info.individual': (id) => 'Individual #' + id,
    'info.sex': 'Sex',
    'info.age': 'Age',
    'info.ageVal': (a) => a + (a === 1 ? ' year' : ' years'),
    'info.genotype': 'Genotype',
    'info.homo': 'homozygous',
    'info.hetero': 'heterozygous',
    'info.inbreeding': 'Inbreeding',
    'info.fromIBD': '(from IBD)',
    'info.parentsLabel': 'Parents',
    'info.children': 'Offspring',

    'hw.refYear0': 'in year 0',
    'hw.refAgo': (n) => n + ' years ago',
    'hw.c1': '① Allele frequencies stable over time',
    'hw.c1.no': 'no: they are changing',
    'hw.yes': 'yes',
    'hw.c1.detail': (d, w) => 'max change ' + d + ' over the last ' + w + ' years',
    'hw.c1.first': 'first year: no change observable yet',
    'hw.c2': '② Genotypes as predicted by Hardy-Weinberg (χ² test)',
    'hw.c2.newAllele': 'no: a new allele has appeared',
    'hw.c2.newAlleleDetail': (y) => 'genotypes impossible under HW: the allele did not exist in year ' + y + ' (mutation)',
    'hw.c2.notSig': 'not significant',
    'hw.c2.sig': 'significant',
    'hw.c2.no': 'no: the genotypes have moved away from the prediction',
    'hw.c2.probably': 'yes, probably',
    'hw.c2.falsePos': 'significant, but no force is active, so it is a sampling fluctuation (false positive expected in ~5% of cases)',
    'hw.inEq': 'In Hardy-Weinberg equilibrium (① and ② satisfied)',
    'hw.notEq': (f) => 'NOT in Hardy-Weinberg equilibrium (not satisfied: ' + f + ')',
    'hw.and': ' and ',
    'hw.refFreqs': (ref, y) => 'Allele frequencies ' + ref + ' (year ' + y + '): ',
    'hw.base': '→ basis of the prediction',
    'hw.nowFreqs': 'Allele frequencies today in the individuals: ',
    'hw.homoRule': 'homozygote',
    'hw.heteroRule': 'heterozygote',
    'hw.genotype': 'Genotype',
    'hw.observed': 'Observed (today)',
    'hw.expected': (y) => 'Expected HW (from the frequencies of year ' + y + ')',
    'hw.F': 'Inbreeding coefficient F (IBD)',
  },
};

function initialLang() {
  try {
    const s = localStorage.getItem(KEY);
    if (LANGS.includes(s)) return s;
  } catch (e) { /* storage non disponibile */ }
  return 'it';
}

let lang = initialLang();
const listeners = [];

export function getLang() { return lang; }

export function t(key, ...args) {
  const v = DICT[lang][key] ?? DICT.it[key] ?? key;
  return typeof v === 'function' ? v(...args) : v;
}

// Applica la lingua corrente agli elementi statici marcati in `root`.
export function applyStatic(root = document) {
  document.documentElement.lang = lang;
  document.title = t('page.title');
  const meta = document.querySelector('meta[name="description"]');
  if (meta) meta.setAttribute('content', t('page.description'));
  for (const el of root.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll('[data-i18n-attr]')) {
    for (const pair of el.dataset.i18nAttr.split(';')) {
      const [attr, key] = pair.split(':');
      if (attr && key) el.setAttribute(attr.trim(), t(key.trim()));
    }
  }
}

// Cambia lingua, la ricorda e avvisa chi deve ridisegnarsi.
export function setLang(l) {
  if (!LANGS.includes(l) || l === lang) return;
  lang = l;
  try { localStorage.setItem(KEY, l); } catch (e) { /* non ricordata */ }
  applyStatic();
  for (const fn of listeners) fn(l);
}

export function onLangChange(fn) { listeners.push(fn); }
