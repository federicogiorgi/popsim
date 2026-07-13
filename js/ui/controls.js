// ui/controls.js
// Costruisce e gestisce i controlli dell'interfaccia:
//   - le manopole delle forze evolutive (mortalita', mutazione, selezione, migrazione)
//   - i parametri strutturali di setup (individui, durata, vita media, alleli, seme)
//   - il controllo di velocita' della riproduzione.
//
// Gli stessi controlli fungono da schermata iniziale e, dopo l'avvio, da pannello
// parametri in fondo alla pagina (con il tasto "Riavvia"). I valori vengono letti
// al momento di generare la simulazione (readConfig).

import { KNOBS, DEFAULTS, LIMITS } from '../config.js';

export class Controls {
  constructor(refs, callbacks) {
    this.refs = refs;
    this.cb = callbacks;
    this.knobInputs = {};

    this._buildKnobs();
    this._wireSetup();
  }

  // Crea le manopole nel contenitore dedicato, a partire dalla loro definizione.
  _buildKnobs() {
    const container = this.refs.knobsContainer;
    container.innerHTML = '';
    for (const def of KNOBS) {
      const wrap = document.createElement('div');
      wrap.className = 'knob';

      const label = document.createElement('label');
      label.className = 'knob-label';
      label.textContent = def.label;
      const val = document.createElement('span');
      val.className = 'knob-value';
      val.textContent = def.default.toFixed(2);
      label.appendChild(val);

      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(def.min);
      input.max = String(def.max);
      input.step = String(def.step);
      input.value = String(def.default);
      input.setAttribute('aria-label', def.label);
      input.addEventListener('input', () => {
        val.textContent = parseFloat(input.value).toFixed(2);
      });

      const hint = document.createElement('p');
      hint.className = 'knob-hint';
      hint.textContent = def.hint;

      wrap.appendChild(label);
      wrap.appendChild(input);
      wrap.appendChild(hint);
      container.appendChild(wrap);

      this.knobInputs[def.name] = input;
    }
  }

  // Collega i campi di setup e il controllo di velocita'.
  _wireSetup() {
    const r = this.refs;
    r.sizeInput.value = String(DEFAULTS.size);
    r.yearsInput.value = String(DEFAULTS.years);
    r.lifeInput.value = String(DEFAULTS.meanLife);
    r.allelesInput.value = String(DEFAULTS.nAlleles);
    r.seedInput.value = String(DEFAULTS.seed);

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
    const years = clampInt(this.refs.yearsInput.value, 1, LIMITS.maxYears, DEFAULTS.years);
    const meanLife = clampInt(this.refs.lifeInput.value, 3, LIMITS.maxLife, DEFAULTS.meanLife);
    const nAlleles = clampInt(this.refs.allelesInput.value, 2, LIMITS.maxAlleles, DEFAULTS.nAlleles);
    let seed = parseInt(this.refs.seedInput.value, 10);
    if (!Number.isFinite(seed)) seed = DEFAULTS.seed;

    // Riscrive i valori validati nei campi (feedback all'utente).
    this.refs.sizeInput.value = String(size);
    this.refs.yearsInput.value = String(years);
    this.refs.lifeInput.value = String(meanLife);
    this.refs.allelesInput.value = String(nAlleles);
    this.refs.seedInput.value = String(seed);

    const knobs = {};
    for (const def of KNOBS) knobs[def.name] = parseFloat(this.knobInputs[def.name].value);

    return { size, years, meanLife, nAlleles, seed, knobs };
  }
}
