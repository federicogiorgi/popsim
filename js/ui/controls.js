// ui/controls.js
// Costruisce e gestisce i controlli dell'interfaccia:
//   - le cinque "manopole" (sempre visibili e regolabili, anche a sim avviata)
//   - i parametri strutturali di setup (n. individui, geni, alleli, seme)
//   - il menu a tendina per scegliere il gene, il controllo di velocita' e i
//     pulsanti Avvia / Reset.
//
// I controlli non contengono logica di simulazione: comunicano con main.js
// tramite callback.

import { KNOB_LABELS, KNOB_HINTS, DEFAULTS, LIMITS } from '../config.js';

// Ordine di visualizzazione delle cinque forze.
const KNOB_ORDER = ['drift', 'mutation', 'migration', 'selection', 'mating'];

export class Controls {
  constructor(refs, callbacks) {
    this.refs = refs;
    this.cb = callbacks;
    this.knobInputs = {};   // name -> <input range>
    this.knobValueEls = {}; // name -> <span> con il valore numerico

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
        const v = parseFloat(input.value);
        val.textContent = v.toFixed(2);
        this.cb.onKnob(name, v);
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

  // Collega i campi di setup, la scelta del gene, la velocita' e i pulsanti.
  _wireSetup() {
    const r = this.refs;

    // Valori di default nei campi.
    r.sizeInput.value = String(DEFAULTS.size);
    r.genesInput.value = String(DEFAULTS.nGenes);
    r.allelesInput.value = String(DEFAULTS.nAlleles);
    r.seedInput.value = String(DEFAULTS.seed);

    r.startBtn.addEventListener('click', () => this.cb.onStart(this.readConfig()));
    r.resetBtn.addEventListener('click', () => this.cb.onReset());

    r.geneSelect.addEventListener('change', () => {
      this.cb.onGeneChange(parseInt(r.geneSelect.value, 10));
    });

    r.speedInput.addEventListener('input', () => {
      const v = parseFloat(r.speedInput.value);
      if (r.speedLabel) r.speedLabel.textContent = v + '×';
      this.cb.onSpeed(v);
    });
  }

  // Legge e valida i parametri di setup correnti.
  readConfig() {
    const clampInt = (v, lo, hi, def) => {
      let n = parseInt(v, 10);
      if (!Number.isFinite(n)) n = def;
      return Math.max(lo, Math.min(hi, n));
    };
    const size = clampInt(this.refs.sizeInput.value, 2, LIMITS.maxSize, DEFAULTS.size);
    const nGenes = clampInt(this.refs.genesInput.value, 1, LIMITS.maxGenes, DEFAULTS.nGenes);
    const nAlleles = clampInt(this.refs.allelesInput.value, 2, LIMITS.maxAlleles, DEFAULTS.nAlleles);
    let seed = parseInt(this.refs.seedInput.value, 10);
    if (!Number.isFinite(seed)) seed = DEFAULTS.seed;

    // Riscrive i valori validati nei campi (feedback all'utente).
    this.refs.sizeInput.value = String(size);
    this.refs.genesInput.value = String(nGenes);
    this.refs.allelesInput.value = String(nAlleles);
    this.refs.seedInput.value = String(seed);

    const knobs = {};
    for (const name of KNOB_ORDER) knobs[name] = parseFloat(this.knobInputs[name].value);

    return { size, nGenes, nAlleles, seed, knobs };
  }

  // Popola il menu dei geni (chiamato all'avvio, in base al numero di geni).
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

  // Abilita/disabilita i campi strutturali (bloccati mentre la sim gira).
  setStructuralEnabled(enabled) {
    this.refs.sizeInput.disabled = !enabled;
    this.refs.genesInput.disabled = !enabled;
    this.refs.allelesInput.disabled = !enabled;
    this.refs.seedInput.disabled = !enabled;
    this.refs.startBtn.disabled = !enabled;
    this.refs.resetBtn.disabled = enabled;
  }
}
