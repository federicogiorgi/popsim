// ui/infoPanel.js
// Pannello con le informazioni di un singolo individuo, mostrato quando se ne
// clicca uno nella sandbox: eta', sesso, corredo allelico, coefficiente F.

import { ALLELE_COLORS, alleleLabel } from '../config.js';
import { heterozygousLoci } from '../model/individual.js';

export class InfoPanel {
  constructor(container) {
    this.el = container;
    this.clear();
  }

  clear() {
    this.el.innerHTML =
      '<p class="hint">Clicca un individuo nella sandbox per vederne i dettagli.</p>';
  }

  // person   : { id, sex, age, genotype:[[a,b],...] }
  // stats    : statistiche del tick corrente (per l'eterozigosita' attesa)
  // present  : false se l'individuo selezionato non esiste a questo tempo
  show(person, stats, present = true) {
    if (!present || !person) {
      this.el.innerHTML =
        '<p class="hint">L\'individuo selezionato non e\' presente in questo istante ' +
        '(nato dopo, oppure gia\' morto).</p>';
      return;
    }

    const nGenes = person.genotype.length;

    // Eterozigosita' osservata dell'individuo (loci eterozigoti / totale).
    const hetLoci = heterozygousLoci(person);
    const hoInd = nGenes > 0 ? hetLoci / nGenes : 0;

    // Eterozigosita' attesa media (media di He sui geni, dal modello).
    let meanHe = 0;
    for (let g = 0; g < nGenes; g++) meanHe += stats.perGene[g].He;
    meanHe = nGenes > 0 ? meanHe / nGenes : 0;

    // Stima individuale del coefficiente F rispetto all'atteso di popolazione.
    // F = 1 - Ho/He. Non e' un F "vero" del singolo (che non e' osservabile),
    // ma un indicatore didattico di quanto l'individuo sia omozigote rispetto
    // all'attesa sotto Hardy-Weinberg.
    const fInd = meanHe > 0 ? 1 - hoInd / meanHe : 0;

    const sexLabel = person.sex === 'F' ? 'Femmina (F)' : 'Maschio (M)';
    const shape = person.sex === 'F' ? '&#9679;' : '&#9632;'; // cerchio / quadrato

    // Righe del corredo allelico, una per gene, con pastiglie colorate.
    let genoRows = '';
    for (let g = 0; g < nGenes; g++) {
      const a = person.genotype[g][0];
      const b = person.genotype[g][1];
      const homo = a === b;
      genoRows +=
        '<tr>' +
        '<td>Gene ' + (g + 1) + '</td>' +
        '<td>' + this._allelePill(a) + this._allelePill(b) + '</td>' +
        '<td class="muted">' + (homo ? 'omozigote' : 'eterozigote') + '</td>' +
        '</tr>';
    }

    this.el.innerHTML =
      '<div class="info-head"><span class="info-shape">' + shape + '</span>' +
      '<strong>Individuo #' + person.id + '</strong></div>' +
      '<table class="info-table">' +
      '<tr><td>Sesso</td><td colspan="2">' + sexLabel + '</td></tr>' +
      '<tr><td>Eta\'</td><td colspan="2">' + person.age + ' generazioni</td></tr>' +
      genoRows +
      '<tr><td>Eterozigosita\'</td><td colspan="2">' + hetLoci + '/' + nGenes +
        ' loci (H<sub>o</sub> = ' + hoInd.toFixed(2) + ')</td></tr>' +
      '<tr><td>Coefficiente F</td><td colspan="2">' + fInd.toFixed(2) +
        ' <span class="muted">(rispetto ad H<sub>e</sub> = ' + meanHe.toFixed(2) + ')</span></td></tr>' +
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
// Ritorna null se non presente in quello snapshot.
export function personFromSnapshot(snap, id) {
  for (let i = 0; i < snap.n; i++) {
    if (snap.id[i] === id) {
      const genotype = [];
      for (let g = 0; g < snap.ng; g++) {
        const base = (i * snap.ng + g) * 2;
        genotype.push([snap.geno[base], snap.geno[base + 1]]);
      }
      return { id: snap.id[i], sex: snap.sex[i] === 1 ? 'F' : 'M', age: snap.age[i], genotype };
    }
  }
  return null;
}
