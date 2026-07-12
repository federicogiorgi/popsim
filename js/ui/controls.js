// ui/controls.js
// Costruisce e gestisce i controlli dell'interfaccia:
//   - le cinque "manopole" (forze evolutive)
//   - i parametri strutturali di setup (n. individui, generazioni, geni, alleli, seme)
//   - il menu a tendina per scegliere il gene e il controllo di velocita'.
//
// Gli stessi controlli fungono da schermata iniziale e, dopo l'avvio, da
// pannello parametri in fondo alla pagina (con il tasto "Riavvia"). I valori
// vengono letti al momento di generare la simulazione (readConfig).

import { KNOB_LABELS, KNOB_HINTS, DEFAULTS, LIMITS } from '../config.js';

// Ordine di visualizzazione delle cinque forze.
const KNOB_ORDER = ['drift', 'mutation', 'migration', 'selection', 'mating'];

export class Controls {
  constructor(refs, callbacks) {
    this.refs = refs;
    this.cb = callbacks;
    this.knobInputs = {};
    this.knobValueEls = {};

    this._buildKnobs();
    this._wireSetup();
  }

  // Crea le cinque manopole nel contenitore dedicato.
  _buildKnobs() {
    const container = this.refs.knobsContainer;
    container.innerHTML = '';
    for (const name of KNOB_ORDER) {
      const wrap = document.createElement('div');
      wrap.className = 'knob';

      const label = document.createElement('label');
      label.className = 'knob-label';
      label.textContent = KNOB_LABELS[name];
      const val = document.createElement('span');
      val.className = 'knob-value';
      val.textContent = DEFAULTS.knobs[name].toFixed(2);
      label.appendChild(val);

      const input = document.createElement('input');
      input.type = 'range';
      input.min = '0';
      input.max = '1';
      input.step = '0.01';
      input.value = String(DEFAULTS.knobs[name]);
      input.setAttribute('aria-label', KNOB_LABELS[name]);
      input.addEventListener('input', () => {
        val.textContent = parseFloat(input.value).toFixed(2);
      });

      const hint = document.createElement('p');
      hint.className = 'knob-hint';
      hint.textContent = KNOB_HINTS[name];

      wrap.appendChild(label);
      wrap.appendChild(input);
      wrap.appendChild(hint);
      container.appendChild(wrap);

      this.knobInputs[name] = input;
      this.knobValueEls[name] = val;
    }
  }

  // Collega i campi di setup, la scelta del gene e la velocita'.
  _wireSetup() {
    const r = this.refs;

    r.sizeInput.value = String(DEFAULTS.size);
    r.generationsInput.value = String(DEFAULTS.generations);
    r.genesInput.value = String(DEFAULTS.nGenes);
    r.allelesInput.value = String(DEFAULTS.nAlleles);
    r.seedInput.value = String(DEFAULTS.seed);

    r.geneSelect.addEventListener('change', () => {
      this.cb.onGeneChange(parseInt(r.geneSelect.value, 10));
    });

    r.speedInput.addEventListener('input', () => {
      const v = parseInt(r.speedInput.value, 10);
      if (r.speedLabel) r.speedLabel.textContent = v + '×';
      this.cb.onSpeed(v);
    });
  }

  // Legge e valida i parametri correnti.
  readConfig() {
    const clampInt = (v, lo, hi, def) => {
      let n = parseInt(v, 10);
      if (!Number.isFinite(n)) n = def;
      return Math.max(lo, Math.min(hi, n));
    };
    const size = clampInt(this.refs.sizeInput.value, 2, LIMITS.maxSize, DEFAULTS.size);
    const generations = clampInt(this.refs.generationsInput.value, 1, LIMITS.maxGenerations, DEFAULTS.generations);
    const nGenes = clampInt(this.refs.genesInput.value, 1, LIMITS.maxGenes, DEFAULTS.nGenes);
    const nAlleles = clampInt(this.refs.allelesInput.value, 2, LIMITS.maxAlleles, DEFAULTS.nAlleles);
    let seed = parseInt(this.refs.seedInput.value, 10);
    if (!Number.isFinite(seed)) seed = DEFAULTS.seed;

    // Riscrive i valori validati nei campi (feedback all'utente).
    this.refs.sizeInput.value = String(size);
    this.refs.generationsInput.value = String(generations);
    this.refs.genesInput.value = String(nGenes);
    this.refs.allelesInput.value = String(nAlleles);
    this.refs.seedInput.value = String(seed);

    const knobs = {};
    for (const name of KNOB_ORDER) knobs[name] = parseFloat(this.knobInputs[name].value);

    return { size, generations, nGenes, nAlleles, seed, knobs };
  }

  // Popola il menu dei geni (in base al numero di geni scelto).
  populateGenes(nGenes, selected = 0) {
    const sel = this.refs.geneSelect;
    sel.innerHTML = '';
    for (let g = 0; g < nGenes; g++) {
      const opt = document.createElement('option');
      opt.value = String(g);
      opt.textContent = 'Gene ' + (g + 1);
      sel.appendChild(opt);
    }
    sel.value = String(selected);
  }
}
