// ui/controls.js
// Costruisce e gestisce i controlli dell'interfaccia:
//   - le manopole delle forze evolutive (mortalita', deriva, mutazione,
//     migrazione, selezione, accoppiamento non casuale)
//   - i parametri strutturali di setup (individui, durata, vita media, alleli, seme)
//   - le frequenze alleliche iniziali (un campo per allele)
//   - il controllo di velocita' della riproduzione.
//
// Gli stessi controlli fungono da schermata iniziale e, dopo l'avvio, da pannello
// parametri in fondo alla pagina (con il tasto "Riavvia").

import { KNOBS, DEFAULTS, LIMITS, defaultFreqs, alleleLabel } from '../config.js';

export class Controls {
  constructor(refs, callbacks) {
    this.refs = refs;
    this.cb = callbacks;
    this.knobInputs = {};
    this.freqInputs = [];

    this._buildKnobs();
    this._wireSetup();
    this._buildFreqInputs(DEFAULTS.nAlleles);
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

    // Cambiando il numero di alleli si rigenerano i campi delle frequenze iniziali.
    r.allelesInput.addEventListener('change', () => {
      let k = parseInt(r.allelesInput.value, 10);
      if (!Number.isFinite(k)) k = DEFAULTS.nAlleles;
      k = Math.max(2, Math.min(LIMITS.maxAlleles, k));
      r.allelesInput.value = String(k);
      this._buildFreqInputs(k);
    });

    r.speedInput.value = String(DEFAULTS.speed);
    if (r.speedLabel) r.speedLabel.textContent = DEFAULTS.speed + '×';
    r.speedInput.addEventListener('input', () => {
      const v = parseInt(r.speedInput.value, 10);
      if (r.speedLabel) r.speedLabel.textContent = v + '×';
      this.cb.onSpeed(v);
    });
  }

  // Crea un campo di frequenza iniziale per ciascun allele, con valori di default
  // sensati (somma = 1).
  _buildFreqInputs(k) {
    const container = this.refs.freqContainer;
    if (!container) return;
    container.innerHTML = '';
    this.freqInputs = [];
    const defs = defaultFreqs(k);
    for (let i = 0; i < k; i++) {
      const label = document.createElement('label');
      label.textContent = 'Freq. ' + alleleLabel(i);
      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.max = '1';
      input.step = '0.01';
      input.value = String(defs[i]);
      label.appendChild(input);
      container.appendChild(label);
      this.freqInputs.push(input);
    }
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

    // Se il numero di alleli e' cambiato senza aver rigenerato i campi, allinea.
    if (this.freqInputs.length !== nAlleles) this._buildFreqInputs(nAlleles);

    // Frequenze iniziali: lette dai campi e normalizzate a somma 1.
    let raw = this.freqInputs.map((inp) => {
      const v = parseFloat(inp.value);
      return Number.isFinite(v) && v > 0 ? v : 0;
    });
    let sum = raw.reduce((a, b) => a + b, 0);
    if (sum <= 0) { raw = defaultFreqs(nAlleles); sum = raw.reduce((a, b) => a + b, 0); }
    const initFreq = raw.map((v) => v / sum);
    // Rimostra i valori normalizzati nei campi (feedback all'utente).
    this.freqInputs.forEach((inp, i) => { inp.value = String(+initFreq[i].toFixed(3)); });

    this.refs.sizeInput.value = String(size);
    this.refs.yearsInput.value = String(years);
    this.refs.lifeInput.value = String(meanLife);
    this.refs.allelesInput.value = String(nAlleles);
    this.refs.seedInput.value = String(seed);

    const knobs = {};
    for (const def of KNOBS) knobs[def.name] = parseFloat(this.knobInputs[def.name].value);

    return { size, years, meanLife, nAlleles, seed, initFreq, knobs };
  }
}
