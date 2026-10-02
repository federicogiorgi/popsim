// ui/hwPanel.js
// Mostra lo scostamento dall'equilibrio di Hardy-Weinberg per il gene.
//
// Riferimento: p² + 2pq + q² = 1. Confrontiamo le frequenze genotipiche
// OSSERVATE (dagli individui nella sandbox) con quelle ATTESE sotto HW, calcolate
// dalle frequenze alleliche osservate. Con piu' alleli mostriamo la tabella
// generalizzata (omozigote A_iA_i atteso p_i², eterozigote A_iA_j atteso 2·p_i·p_j).
//
// Nota importante: qui F e' la CONSANGUINEITÀ media della popolazione calcolata
// dal pedigree (alleli IBD), sempre >= 0.

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

    // L'equilibrio di Hardy-Weinberg richiede DUE condizioni, mostrate come due
    // verifiche separate (ognuna col proprio esito), piu' un verdetto finale:
    //   (1) le frequenze alleliche NON cambiano nel tempo (nessuna forza che le
    //       sposta: deriva, migrazione, selezione, mutazione). Si vede
    //       dall'andamento nel tempo (freqInfo, calcolato dalla cronologia);
    //   (2) le proporzioni genotipiche sono quelle di HW (accoppiamento casuale).
    //       E' l'UNICA cosa che misura il test chi-quadro, su un singolo anno.
    // Tenerle separate evita l'apparente contraddizione "chi-quadro non
    // significativo ma NON in equilibrio": la deriva, ad esempio, viola la (1)
    // lasciando intatta la (2).
    const p = hw.pValue;
    const hasTrend = !!(freqInfo && freqInfo.window > 0);
    const changing = !!(freqInfo && freqInfo.changing);
    const significant = p < 0.05;

    // Le proporzioni genotipiche sono alterate SOLO dall'accoppiamento non
    // casuale (le altre forze campionano comunque in proporzioni di HW). Con
    // accoppiamento casuale un chi-quadro significativo e' solo rumore
    // campionario (capita nel ~5% dei casi): lo mostriamo, ma non fa cadere
    // il verdetto.
    const genoViolated = matingKnob > 0 && significant;

    const check1 = hasTrend
      ? checkLine(!changing, '① Frequenze alleliche stabili nel tempo',
          changing ? 'no: stanno cambiando' : 'sì',
          'variazione max ' + freqInfo.delta.toFixed(3) + ' negli ultimi ' +
          freqInfo.window + ' anni')
      : checkLine(true, '① Frequenze alleliche stabili nel tempo', 'sì',
          'primo anno: nessuna variazione ancora osservabile');

    const testTxt = 'χ² = ' + hw.chi2.toFixed(2) + ', df ' + hw.df + ', p = ' + p.toFixed(3);
    let check2;
    if (!significant) {
      check2 = checkLine(true, '② Proporzioni genotipiche di HW (test χ²)',
        'sì', testTxt + ': non significativo');
    } else if (genoViolated) {
      check2 = checkLine(false, '② Proporzioni genotipiche di HW (test χ²)',
        'no: alterate dall’accoppiamento non casuale', testTxt + ': significativo');
    } else {
      check2 = checkLine(null, '② Proporzioni genotipiche di HW (test χ²)',
        'sì, probabilmente', testTxt + ': significativo, ma l’accoppiamento è casuale, ' +
        'quindi è una fluttuazione campionaria (falso positivo atteso nel ~5% dei casi)');
    }

    let cls = 'ok';
    let verdict = 'In equilibrio di Hardy-Weinberg (① e ② soddisfatte)';
    if (changing || genoViolated) {
      const failed = [];
      if (changing) failed.push('①');
      if (genoViolated) failed.push('②');
      verdict = 'NON in equilibrio di Hardy-Weinberg (non soddisfatta: ' + failed.join(' e ') + ')';
      cls = genoViolated && p < 0.01 ? 'bad' : 'warn';
    }

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

    this.el.innerHTML =
      '<div class="hw-head"><span class="badge ' + cls + '">' + verdict + '</span></div>' +
      '<ul class="hw-checks">' + check1 + check2 + '</ul>' +
      '<p class="hw-line">' + freqTxt + '</p>' +
      '<p class="hw-formula">' + formula + '</p>' +
      '<table class="hw-table">' +
      '<thead><tr><th>Genotipo</th><th>Osservati</th><th>Attesi (HW)</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table>' +
      '<p class="hw-stats">' +
        'Coefficiente F (consanguineità, IBD) = ' + stats.F.toFixed(3) +
      '</p>';
  }

  clear() {
    this.el.innerHTML = '<p class="hint">Le statistiche di Hardy-Weinberg compariranno qui.</p>';
  }
}

// Una riga di verifica: esito (true = soddisfatta, false = violata, null =
// soddisfatta con riserva), titolo, risposta breve e dettaglio numerico.
function checkLine(ok, title, answer, detail) {
  const cls = ok === true ? 'ok' : ok === false ? 'bad' : 'warn';
  const icon = ok === true ? '✓' : ok === false ? '✗' : '~';
  return '<li class="hw-check ' + cls + '">' +
    '<span class="hw-check-icon" aria-hidden="true">' + icon + '</span>' +
    '<span>' + title + ': <strong>' + answer + '</strong> ' +
    '<span class="muted">(' + detail + ')</span></span></li>';
}
