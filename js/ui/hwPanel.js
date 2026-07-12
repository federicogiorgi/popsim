// ui/hwPanel.js
// Mostra lo scostamento dall'equilibrio di Hardy-Weinberg per il gene scelto.
//
// Riferimento richiesto: p^2 + 2pq + q^2 = 1.
// Confrontiamo le frequenze genotipiche OSSERVATE (dagli individui nella
// sandbox) con quelle ATTESE sotto HW, calcolate dalle frequenze alleliche del
// modello. Nel caso a due alleli mostriamo esplicitamente i tre termini
// p^2, 2pq, q^2; con piu' alleli mostriamo la tabella generalizzata.

import { alleleLabel } from '../config.js';

export class HWPanel {
  constructor(container) {
    this.el = container;
  }

  // genePerStats : oggetto stats.perGene[gene] (contiene .freq, .He, .Ho, .F, .hw)
  // gene         : indice del gene (per l'etichetta)
  render(genePerStats, gene) {
    const s = genePerStats;
    const hw = s.hw;
    // Usa le frequenze alleliche OSSERVATE (quelle su cui si basa il test HW e
    // che gli studenti possono ricavare contando gli alleli nella sandbox).
    const obs = hw.p;
    const k = obs.length;

    // Riga di sintesi: frequenze alleliche osservate.
    let freqTxt = 'Frequenze osservate: ' + obs
      .map((p, i) => alleleLabel(i) + ' = ' + p.toFixed(3))
      .join(' &nbsp; ');

    // Giudizio basato sul TEST chi-quadro (valore-p), non sul solo F: cosi' il
    // caso di riferimento (tutte le forze a 0) resta stabilmente "in equilibrio"
    // anche con popolazioni piccole, dove F oscilla per solo rumore campionario.
    const p = hw.pValue;
    let verdict, cls;
    if (p >= 0.05) { verdict = 'in equilibrio di Hardy-Weinberg'; cls = 'ok'; }
    else if (p >= 0.01) { verdict = 'scostamento da HW (p < 0.05)'; cls = 'warn'; }
    else { verdict = 'forte scostamento da HW (p < 0.01)'; cls = 'bad'; }

    // Formula di riferimento, esplicita nel caso a due alleli.
    let formula;
    if (k === 2) {
      const p = obs[0], q = obs[1];
      formula =
        '<code>p² + 2pq + q² = 1</code> &nbsp;→&nbsp; ' +
        '<code>' + (p * p).toFixed(3) + ' + ' + (2 * p * q).toFixed(3) +
        ' + ' + (q * q).toFixed(3) + ' = ' +
        (p * p + 2 * p * q + q * q).toFixed(3) + '</code>';
    } else {
      formula = 'Attese: omozigote A<sub>i</sub>A<sub>i</sub> = p<sub>i</sub>² ; ' +
        'eterozigote A<sub>i</sub>A<sub>j</sub> = 2·p<sub>i</sub>·p<sub>j</sub>.';
    }

    // Tabella genotipi: osservati vs attesi.
    let rows = '';
    for (const c of hw.classes) {
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
      '<div class="hw-head">Gene ' + (gene + 1) + ' — <span class="badge ' + cls + '">' +
        verdict + '</span></div>' +
      '<p class="hw-line">' + freqTxt + '</p>' +
      '<p class="hw-formula">' + formula + '</p>' +
      '<table class="hw-table">' +
      '<thead><tr><th>Genotipo</th><th>Osservati</th><th>Attesi (HW)</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table>' +
      '<p class="hw-stats">' +
        'H<sub>o</sub> = ' + s.Ho.toFixed(3) + ' &nbsp; ' +
        'H<sub>e</sub> = ' + s.He.toFixed(3) + ' &nbsp; ' +
        'F = ' + s.F.toFixed(3) + ' &nbsp; ' +
        'χ² = ' + hw.chi2.toFixed(2) + ' (df ' + hw.df + ', p = ' + hw.pValue.toFixed(3) + ')' +
      '</p>';
  }

  clear() {
    this.el.innerHTML = '<p class="hint">Le statistiche di Hardy-Weinberg compariranno qui.</p>';
  }
}
