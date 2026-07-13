// individual.js
// Fabbrica di individui. Un individuo e' un semplice oggetto dati (nessun
// metodo), cosi' e' facile da serializzare e da registrare nella cronologia.
//
// La simulazione si basa su UN SOLO gene, che puo' avere piu' alleli: il
// genotipo e' quindi una coppia di alleli [a, b] (indici interi).

/**
 * Crea un individuo.
 * @param {object} o
 * @param {number} o.id        identificatore univoco e stabile nel tempo
 * @param {string} o.sex       'M' o 'F'
 * @param {number} o.age       eta' in ANNI
 * @param {[number,number]} o.genotype  coppia di alleli del gene
 * @param {number} o.lifespan  durata della vita prevista, in anni
 * @param {number} [o.F]       coefficiente di consanguineita' (IBD), 0..1
 * @param {number} [o.mother]  id della madre (0 = fondatore/immigrato)
 * @param {number} [o.father]  id del padre  (0 = fondatore/immigrato)
 * @param {number} [o.x],[o.y] posizione nel mondo
 */
export function createIndividual(o) {
  return {
    id: o.id,
    sex: o.sex,
    age: o.age,
    genotype: o.genotype,   // [a, b]
    lifespan: o.lifespan,
    F: o.F || 0,
    mother: o.mother || 0,
    father: o.father || 0,
    repro: 0,               // quante volte si e' gia' riprodotto
    x: o.x || 0,
    y: o.y || 0,
  };
}

// Vero se l'individuo e' eterozigote al gene (i due alleli sono diversi).
export function isHeterozygous(ind) {
  return ind.genotype[0] !== ind.genotype[1];
}
