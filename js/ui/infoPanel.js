// ui/infoPanel.js
// Pannello con le informazioni di un singolo individuo, mostrato quando se ne
// clicca uno nella sandbox: sesso, eta' (in anni), corredo allelico, zigosita',
// coefficiente di consanguineita' F (da IBD), genitori e numero di figli.

import { ALLELE_COLORS, alleleLabel } from '../config.js';
import { t } from '../i18n.js';

export class InfoPanel {
  constructor(container) {
    this.el = container;
    this.clear();
  }

  clear() {
    this.el.innerHTML = '<p class="hint">' + t('info.hint') + '</p>';
  }

  // person  : { id, sex, age, a, b, F, mother, father, repro }
  // present : false se l'individuo selezionato non esiste in questo istante
  show(person, present = true) {
    if (!present || !person) {
      this.el.innerHTML = '<p class="hint">' + t('info.absent') + '</p>';
      return;
    }

    const homo = person.a === person.b;
    const lo = Math.min(person.a, person.b);
    const hi = Math.max(person.a, person.b);

    const sexLabel = person.sex === 'F' ? t('info.female') : t('info.male');
    const shape = person.sex === 'F' ? '&#9679;' : '&#9632;'; // cerchio / quadrato

    const origin = (person.mother === 0 && person.father === 0)
      ? t('info.founder')
      : t('info.parents', person.mother, person.father);

    this.el.innerHTML =
      '<div class="info-head"><span class="info-shape">' + shape + '</span>' +
      '<strong>' + t('info.individual', person.id) + '</strong></div>' +
      '<table class="info-table">' +
      '<tr><td>' + t('info.sex') + '</td><td>' + sexLabel + '</td></tr>' +
      '<tr><td>' + t('info.age') + '</td><td>' + t('info.ageVal', person.age) + '</td></tr>' +
      '<tr><td>' + t('info.genotype') + '</td><td>' + this._allelePill(lo) + this._allelePill(hi) +
        ' <span class="muted">(' + (homo ? t('info.homo') : t('info.hetero')) + ')</span></td></tr>' +
      '<tr><td>' + t('info.inbreeding') + '</td><td>F = ' + person.F.toFixed(3) +
        ' <span class="muted">' + t('info.fromIBD') + '</span></td></tr>' +
      '<tr><td>' + t('info.parentsLabel') + '</td><td>' + origin + '</td></tr>' +
      '<tr><td>' + t('info.children') + '</td><td>' + person.repro + '</td></tr>' +
      '</table>';
  }

  // Pastiglia colorata con l'etichetta di un allele.
  _allelePill(i) {
    const color = ALLELE_COLORS[i % ALLELE_COLORS.length];
    return '<span class="allele-pill" style="background:' + color + '">' +
      alleleLabel(i) + '</span>';
  }
}

// Estrae un individuo (oggetto "person") da uno snapshot dato il suo id.
export function personFromSnapshot(snap, id) {
  for (let i = 0; i < snap.n; i++) {
    if (snap.id[i] === id) {
      return {
        id: snap.id[i],
        sex: snap.sex[i] === 1 ? 'F' : 'M',
        age: snap.age[i],
        a: snap.a[i],
        b: snap.b[i],
        F: snap.F[i],
        mother: snap.mother[i],
        father: snap.father[i],
        repro: snap.repro[i],
      };
    }
  }
  return null;
}
