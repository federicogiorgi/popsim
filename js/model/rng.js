// rng.js
// Generatore di numeri pseudo-casuali deterministico (algoritmo "mulberry32").
//
// Perche' non usare Math.random()? Con un seme fisso la simulazione diventa
// RIPRODUCIBILE: la stessa configurazione produce sempre la stessa evoluzione.
// In aula questo permette di rifare esattamente lo stesso esperimento.

export class RNG {
  constructor(seed = 12345) {
    this.setSeed(seed);
  }

  setSeed(seed) {
    // Lo stato interno e' un intero a 32 bit senza segno.
    this._s = seed >>> 0;
  }

  // Numero float in [0, 1). E' il mattone su cui si basa tutto il resto.
  next() {
    let t = (this._s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  // Intero in [0, n).
  int(n) {
    return Math.floor(this.next() * n);
  }

  // Float in [a, b).
  range(a, b) {
    return a + this.next() * (b - a);
  }

  // Vero con probabilita' p.
  bool(p) {
    return this.next() < p;
  }

  // Estrae un indice secondo un vettore di pesi (probabilita' anche non
  // normalizzate). Usato per pescare un allele dato il vettore di frequenze.
  weighted(weights) {
    let sum = 0;
    for (const w of weights) sum += w;
    let r = this.next() * sum;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return i;
    }
    return weights.length - 1;
  }

  // Numero da distribuzione normale (metodo di Box-Muller).
  // Serve, ad esempio, per estrarre la durata della vita attorno alla media.
  gaussian(mean = 0, std = 1) {
    const u = 1 - this.next();
    const v = this.next();
    return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  // Mescola un array sul posto (algoritmo di Fisher-Yates). Usato per formare
  // le coppie di accoppiamento e per disporre i gruppi nello spazio.
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }
}
