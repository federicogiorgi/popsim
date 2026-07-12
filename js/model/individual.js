// individual.js
// Fabbrica di individui. Un individuo e' un semplice oggetto dati (nessun
// metodo), cosi' e' facile da serializzare e da registrare nella cronologia.
//
// ESTENSIONE FUTURA (prevista, non ancora implementata): piu' specie che
// coabitano nella sandbox (es. un predatore). Per questo ogni individuo porta
// gia' un campo `species` e un contenitore `traits` per caratteristiche
// specifiche di specie (velocita', dieta, ...). Aggiungere una specie in futuro
// significhera' creare individui con un altro `species` e un altro set di
// `traits`, senza riscrivere l'impianto: la popolazione e il renderer trattano
// gli individui in modo generico.

/**
 * Crea un individuo.
 * @param {object} o
 * @param {number} o.id        identificatore univoco e stabile nel tempo
 * @param {string} o.species   specie (per ora sempre la stessa)
 * @param {string} o.sex       'M' o 'F'
 * @param {number} o.age       eta' in tick (generazioni)
 * @param {Array<[number,number]>} o.genotype  per ogni gene, coppia di alleli
 * @param {number} o.x,o.y     posizione nel mondo
 * @param {number} o.vx,o.vy   velocita' (solo per l'animazione, non influisce
 *                             sulla genetica: lo spazio e' per ora decorativo)
 * @param {object} [o.traits]  caratteristiche specifiche di specie (estensione)
 */
export function createIndividual(o) {
  return {
    id: o.id,
    species: o.species,
    sex: o.sex,
    age: o.age,
    genotype: o.genotype,
    x: o.x,
    y: o.y,
    vx: o.vx,
    vy: o.vy,
    traits: o.traits || null,
  };
}

// Numero di loci eterozigoti dell'individuo (utile per il pannello informazioni).
export function heterozygousLoci(ind) {
  let h = 0;
  for (const g of ind.genotype) if (g[0] !== g[1]) h++;
  return h;
}
