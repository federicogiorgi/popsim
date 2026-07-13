// ui/hwPanel.js
// Mostra lo scostamento dall'equilibrio di Hardy-Weinberg per il gene.
//
// Riferimento: p² + 2pq + q² = 1. Confrontiamo le frequenze genotipiche
// OSSERVATE (dagli individui nella sandbox) con quelle ATTESE sotto HW, calcolate
// dalle frequenze alleliche osservate. Con piu' alleli mostriamo la tabella
// generalizzata (omozigote A_iA_i atteso p_i², eterozigote A_iA_j atteso 2·p_i·p_j).
//
// Nota importante: qui F e' la CONSANGUINEITÀ media della popolazione calcolata
// dal pedigree (alleli IBD), sempre >= 0 — non e' 1 - Ho/He, che potrebbe
// risultare negativa per solo rumore campionario.

import { alleleLabel } from '../config.js';

export class HWPanel {
  constructor(container) {
    this.el = container;
  }

  // stats : oggetto restituito da Population.stats()
  render(stats) {
    const hw = stats.hw;
    const obs = hw.p;

    // Solo gli alleli effettivamente presenti.
    const present = [];
    for (let i = 0; i < obs.length; i++) if (obs[i] > 0) present.push(i);
    const k = present.length || 1;

    const freqTxt = 'Frequenze osservate: ' + present
      .map((i) => alleleLabel(i) + ' = ' + obs[i].toFixed(3))
      .join(' &nbsp; ');

    // Giudizio basato sul test chi-quadro (valore-p).
    const p = hw.pValue;
    let verdict, cls;
    if (p >= 0.05) { verdict = 'in equilibrio di Hardy-Weinberg'; cls = 'ok'; }
    else if (p >= 0.01) { verdict = 'scostamento da HW (p < 0.05)'; cls = 'warn'; }
    else { verdict = 'forte scostamento da HW (p < 0.01)'; cls = 'bad'; }

    // Formula di riferimento, esplicita nel caso a due alleli.
    let formula;
    if (k === 2) {
      const pi = obs[present[0]], qi = obs[present[1]];
      formula =
        '<code>p² + 2pq + q² = 1</code> &nbsp;→&nbsp; ' +
        '<code>' + (pi * pi).toFixed(3) + ' + ' + (2 * pi * qi).toFixed(3) +
        ' + ' + (qi * qi).toFixed(3) + ' = ' +
        (pi * pi + 2 * pi * qi + qi * qi).toFixed(3) + '</code>';
    } else {
      formula = 'Attese: omozigote A<sub>i</sub>A<sub>i</sub> = p<sub>i</sub>² ; ' +
        'eterozigote A<sub>i</sub>A<sub>j</sub> = 2·p<sub>i</sub>·p<sub>j</sub>.';
    }

    // Tabella genotipi: solo classi con osservati o attesi non trascurabili.
    let rows = '';
    for (const c of hw.classes) {
      if (c.obs === 0 && c.exp < 0.05) continue;
      const label = c.homozygous
        ? alleleLabel(c.i) + alleleLabel(c.i)
        : alleleLabel(c.i) + alleleLabel(c.j);
      rows +=
        '<tr>' +
        '<td>' + label + '</td>' +
        '<td>' + c.obs + ' <span class="muted">(' + (c.obsFreq * 100).toFixed(1) + '%)</span></td>' +
        '<td>' + c.exp.toFixed(1) + ' <span class="muted">(' + (c.expFreq * 100).toFixed(1) + '%)</span></td>' +
        '</tr>';
    }

    this.el.innerHTML =
      '<div class="hw-head"><span class="badge ' + cls + '">' + verdict + '</span></div>' +
      '<p class="hw-line">' + freqTxt + '</p>' +
      '<p class="hw-formula">' + formula + '</p>' +
      '<table class="hw-table">' +
      '<thead><tr><th>Genotipo</th><th>Osservati</th><th>Attesi (HW)</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table>' +
      '<p class="hw-stats">' +
        'H<sub>o</sub> = ' + stats.Ho.toFixed(3) + ' &nbsp; ' +
        'H<sub>e</sub> = ' + stats.He.toFixed(3) + ' &nbsp; ' +
        'F (consanguineità, IBD) = ' + stats.F.toFixed(3) + ' &nbsp; ' +
        'χ² = ' + hw.chi2.toFixed(2) + ' (df ' + hw.df + ', p = ' + hw.pValue.toFixed(3) + ')' +
      '</p>';
  }

  clear() {
    this.el.innerHTML = '<p class="hint">Le statistiche di Hardy-Weinberg compariranno qui.</p>';
  }
}
