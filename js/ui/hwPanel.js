// ui/hwPanel.js
// Mostra lo scostamento dall'equilibrio di Hardy-Weinberg per il gene.
//
// Hardy-Weinberg e' una PREVISIONE: se nessuna forza agisce, dalle frequenze
// alleliche p, q di una generazione nascono genotipi p² + 2pq + q² = 1. Il
// pannello confronta i genotipi OSSERVATI oggi (individui nella sandbox) con
// quelli PREVISTI da HW a partire dalle frequenze alleliche di HW_WINDOW anni
// fa. Con piu' alleli: omozigote A_iA_i atteso p_i², eterozigote 2·p_i·p_j.
// Cosi' ogni forza produce uno scostamento: deriva, selezione, migrazione e
// mutazione spostando le frequenze alleliche, l'accoppiamento non casuale
// alterando le proporzioni genotipiche.
//
// Nota importante: qui F e' la CONSANGUINEITÀ media della popolazione calcolata
// dal pedigree (alleli IBD), sempre >= 0.

import { alleleLabel, HW_WINDOW } from '../config.js';
import { t } from '../i18n.js';

// Le forze che possono spostare la popolazione da Hardy-Weinberg (la mortalita'
// cambia solo il numero di individui).
const FORCES = ['drift', 'mutation', 'migration', 'selection', 'mating'];

export class HWPanel {
  // container : dove va il dettaglio (verifiche, frequenze, tabella dei genotipi)
  // summaryEl : (facoltativo) dove va il solo esito, ✓ Sì / ✗ No, ben visibile
  constructor(container, summaryEl = null) {
    this.el = container;
    this.summaryEl = summaryEl;
  }

  // stats    : oggetto restituito da Population.stats()
  // freqInfo : { changing, delta, window } sull'andamento delle frequenze nel tempo
  // knobs    : valori delle manopole (per riconoscere i falsi positivi del test)
  render(stats, freqInfo, knobs = {}) {
    const hw = stats.hw;
    const refYear = Math.max(0, stats.year - HW_WINDOW);
    const refTxt = refYear === 0 ? t('hw.refYear0') : t('hw.refAgo', stats.year - refYear);

    // Alleli da mostrare: presenti oggi o nella generazione di riferimento.
    const shown = [];
    for (let i = 0; i < hw.p.length; i++) if (hw.p[i] > 0 || hw.refP[i] > 0) shown.push(i);
    const fmt = (arr) => shown.map((i) => alleleLabel(i) + ' = ' + arr[i].toFixed(3)).join(' &nbsp; ');

    // L'equilibrio di Hardy-Weinberg richiede DUE condizioni, mostrate come due
    // verifiche separate (ognuna col proprio esito), piu' un verdetto finale:
    //   (1) le frequenze alleliche NON cambiano nel tempo (dalla cronologia);
    //   (2) i genotipi osservati oggi sono quelli PREVISTI da HW con le
    //       frequenze di riferimento (test chi-quadro). Ogni forza la viola.
    const p = hw.pValue;
    const hasTrend = !!(freqInfo && freqInfo.window > 0);
    const changing = !!(freqInfo && freqInfo.changing);
    const significant = p < 0.05;
    const anyForce = FORCES.some((name) => (knobs[name] || 0) > 0);

    // Senza alcuna forza attiva, un chi-quadro significativo e' solo rumore
    // campionario (capita nel ~5% dei casi): lo mostriamo, ma non fa cadere il
    // verdetto. Un allele comparso dal nulla (mutazione) invece e' certo.
    const genoViolated = hw.impossible || (anyForce && significant);

    const check1 = hasTrend
      ? checkLine(!changing, t('hw.c1'), changing ? t('hw.c1.no') : t('hw.yes'),
          t('hw.c1.detail', freqInfo.delta.toFixed(3), freqInfo.window))
      : checkLine(true, t('hw.c1'), t('hw.yes'), t('hw.c1.first'));

    const title2 = t('hw.c2');
    const testTxt = 'χ² = ' + hw.chi2.toFixed(2) + ', df ' + hw.df + ', p = ' + p.toFixed(3);
    let check2;
    if (hw.impossible) {
      check2 = checkLine(false, title2, t('hw.c2.newAllele'), t('hw.c2.newAlleleDetail', refYear));
    } else if (!significant) {
      check2 = checkLine(true, title2, t('hw.yes'), testTxt + ': ' + t('hw.c2.notSig'));
    } else if (genoViolated) {
      check2 = checkLine(false, title2, t('hw.c2.no'), testTxt + ': ' + t('hw.c2.sig'));
    } else {
      check2 = checkLine(null, title2, t('hw.c2.probably'), testTxt + ': ' + t('hw.c2.falsePos'));
    }

    this._summary(!(changing || genoViolated));

    let cls = 'ok';
    let verdict = t('hw.inEq');
    if (changing || genoViolated) {
      const failed = [];
      if (changing) failed.push('①');
      if (genoViolated) failed.push('②');
      verdict = t('hw.notEq', failed.join(t('hw.and')));
      cls = genoViolated && p < 0.01 ? 'bad' : 'warn';
    }

    // Formula di riferimento (con esponenti in apice), calcolata con le
    // frequenze della generazione di riferimento: e' la PREVISIONE di HW.
    const ref = hw.refP;
    const refShown = shown.filter((i) => ref[i] > 0);
    let formula = '<code>p<sup>2</sup> + 2pq + q<sup>2</sup> = 1</code>';
    if (refShown.length === 2) {
      const pi = ref[refShown[0]], qi = ref[refShown[1]];
      formula += ' &nbsp;→&nbsp; ' +
        '<code>' + (pi * pi).toFixed(3) + ' + ' + (2 * pi * qi).toFixed(3) +
        ' + ' + (qi * qi).toFixed(3) + ' = ' +
        (pi * pi + 2 * pi * qi + qi * qi).toFixed(3) + '</code>';
    } else if (refShown.length > 2) {
      formula += '<br><span class="muted">' + t('hw.homoRule') + ' A<sub>i</sub>A<sub>i</sub> = p<sub>i</sub><sup>2</sup> ; ' +
        t('hw.heteroRule') + ' A<sub>i</sub>A<sub>j</sub> = 2·p<sub>i</sub>·p<sub>j</sub></span>';
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
      '<p class="hw-line">' + t('hw.refFreqs', refTxt, refYear) + fmt(ref) +
        ' &nbsp;<span class="muted">' + t('hw.base') + '</span></p>' +
      '<p class="hw-line">' + t('hw.nowFreqs') + fmt(hw.p) + '</p>' +
      '<p class="hw-formula">' + formula + '</p>' +
      '<table class="hw-table">' +
      '<thead><tr><th>' + t('hw.genotype') + '</th><th>' + t('hw.observed') + '</th><th>' +
        t('hw.expected', refYear) + '</th></tr></thead>' +
      '<tbody>' + rows + '</tbody></table>' +
      '<p class="hw-stats">' +
        t('hw.F') + ' = ' + stats.F.toFixed(3) +
      '</p>';
  }

  clear() {
    this.el.innerHTML = '<p class="hint">' + t('hw.placeholder') + '</p>';
    this._summary(null);
  }

  // Esito sintetico: true = in equilibrio, false = no, null = ancora nessun dato.
  _summary(inEq) {
    if (!this.summaryEl) return;
    this.summaryEl.className = 'hw-sum-verdict' + (inEq === true ? ' ok' : inEq === false ? ' bad' : '');
    this.summaryEl.textContent = inEq === true ? '✓ ' + t('hw.sumYes') : inEq === false ? '✗ ' + t('hw.sumNo') : '–';
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
