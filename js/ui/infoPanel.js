// ui/infoPanel.js
// Pannello con le informazioni di un singolo individuo, mostrato quando se ne
// clicca uno nella sandbox: sesso, eta' (in anni), corredo allelico, zigosita',
// coefficiente di consanguineita' F (da IBD), genitori e numero di figli.

import { ALLELE_COLORS, alleleLabel } from '../config.js';

export class InfoPanel {
  constructor(container) {
    this.el = container;
    this.clear();
  }

  clear() {
    this.el.innerHTML =
      '<p class="hint">Clicca un individuo nella sandbox per vederne i dettagli.</p>';
  }

  // person  : { id, sex, age, a, b, F, mother, father, repro }
  // present : false se l'individuo selezionato non esiste in questo istante
  show(person, present = true) {
    if (!present || !person) {
      this.el.innerHTML =
        '<p class="hint">L’individuo selezionato non è presente in questo istante ' +
        '(nato dopo, oppure già morto).</p>';
      return;
    }

    const homo = person.a === person.b;
    const lo = Math.min(person.a, person.b);
    const hi = Math.max(person.a, person.b);

    const sexLabel = person.sex === 'F' ? 'Femmina (F)' : 'Maschio (M)';
    const shape = person.sex === 'F' ? '&#9679;' : '&#9632;'; // cerchio / quadrato

    const origin = (person.mother === 0 && person.father === 0)
      ? 'fondatore / immigrato'
      : '#' + person.mother + ' (madre) × #' + person.father + ' (padre)';

    this.el.innerHTML =
      '<div class="info-head"><span class="info-shape">' + shape + '</span>' +
      '<strong>Individuo #' + person.id + '</strong></div>' +
      '<table class="info-table">' +
      '<tr><td>Sesso</td><td>' + sexLabel + '</td></tr>' +
      '<tr><td>Età</td><td>' + person.age + (person.age === 1 ? ' anno' : ' anni') + '</td></tr>' +
      '<tr><td>Genotipo</td><td>' + this._allelePill(lo) + this._allelePill(hi) +
        ' <span class="muted">(' + (homo ? 'omozigote' : 'eterozigote') + ')</span></td></tr>' +
      '<tr><td>Consanguineità</td><td>F = ' + person.F.toFixed(3) +
        ' <span class="muted">(da IBD)</span></td></tr>' +
      '<tr><td>Genitori</td><td>' + origin + '</td></tr>' +
      '<tr><td>Figli</td><td>' + person.repro + '</td></tr>' +
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
