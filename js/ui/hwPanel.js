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

  // stats      : oggetto restituito da Population.stats()
  // freqInfo   : { changing, delta, window } sull'andamento delle frequenze nel tempo
  // matingKnob : valore della manopola "accoppiamento non casuale" (0..1)
  render(stats, freqInfo, matingKnob = 0) {
    const hw = stats.hw;
    const obs = hw.p;

    // Solo gli alleli effettivamente presenti.
    const present = [];
    for (let i = 0; i < obs.length; i++) if (obs[i] > 0) present.push(i);
    const k = present.length || 1;

    const freqTxt = 'Frequenze osservate: ' + present
      .map((i) => alleleLabel(i) + ' = ' + obs[i].toFixed(3))
      .join(' &nbsp; ');

    // L'equilibrio di Hardy-Weinberg richiede DUE cose:
    //   1) le frequenze alleliche NON cambiano nel tempo (nessuna forza che le
    //      sposta: deriva, migrazione, selezione, mutazione);
    //   2) le proporzioni genotipiche sono quelle di HW (accoppiamento casuale).
    // Il test chi-quadro cattura solo la (2); la (1) si vede dall'andamento delle
    // frequenze nel tempo (parametro freqInfo, calcolato dalla cronologia).
    const p = hw.pValue;
    const changing = !!(freqInfo && freqInfo.changing);
    const reasons = [];
    let cls = 'ok';
    if (changing) {
      reasons.push('le frequenze alleliche stanno cambiando');
      cls = 'warn';
    }
    // Le proporzioni genotipiche sono alterate SOLO dall'accoppiamento non
    // casuale (le altre forze campionano comunque in proporzioni di HW). Percio'
    // segnaliamo lo scostamento genotipico solo quando quella manopola e' attiva:
    // altrimenti un chi-quadro significativo e' solo rumore campionario (con
    // popolazioni piccole capita nel ~5% dei casi anche ad accoppiamento casuale).
    if (matingKnob > 0 && p < 0.05) {
      reasons.push('proporzioni genotipiche alterate (accoppiamento non casuale)');
      cls = p < 0.01 ? 'bad' : 'warn';
    }
    const verdict = reasons.length === 0
      ? 'in equilibrio di Hardy-Weinberg'
      : 'NON in equilibrio: ' + reasons.join(' · ');

    // Formula di riferimento, sempre mostrata (con esponenti in apice).
    let formula =
      '<code>p<sup>2</sup> + 2pq + q<sup>2</sup> = 1</code>';
    if (k === 2) {
      // Espansione numerica esplicita nel caso a due alleli.
      const pi = obs[present[0]], qi = obs[present[1]];
      formula += ' &nbsp;→&nbsp; ' +
        '<code>' + (pi * pi).toFixed(3) + ' + ' + (2 * pi * qi).toFixed(3) +
        ' + ' + (qi * qi).toFixed(3) + ' = ' +
        (pi * pi + 2 * pi * qi + qi * qi).toFixed(3) + '</code>';
    } else {
      // Con piu' di due alleli, la generalizzazione della stessa relazione.
      formula += '<br><span class="muted">omozigote A<sub>i</sub>A<sub>i</sub> = p<sub>i</sub><sup>2</sup> ; ' +
        'eterozigote A<sub>i</sub>A<sub>j</sub> = 2·p<sub>i</sub>·p<sub>j</sub></span>';
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

    // Riga sull'andamento delle frequenze nel tempo (violazione della condizione 1).
    let trendTxt = '';
    if (freqInfo && freqInfo.window > 0) {
      const arrow = changing ? '↕ in variazione' : '→ stabili';
      trendTxt = '<p class="hw-line ' + (changing ? '' : 'muted') + '">' +
        'Frequenze nel tempo: <strong>' + arrow + '</strong> ' +
        '<span class="muted">(variazione max ' + freqInfo.delta.toFixed(3) +
        ' negli ultimi ' + freqInfo.window + ' anni)</span></p>';
    }

    this.el.innerHTML =
      '<div class="hw-head"><span class="badge ' + cls + '">' + verdict + '</span></div>' +
      '<p class="hw-line">' + freqTxt + '</p>' +
      trendTxt +
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
