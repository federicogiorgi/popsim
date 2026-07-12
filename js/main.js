// main.js
// Il "direttore d'orchestra": collega modello, renderer e interfaccia, e
// gestisce l'orologio di riproduzione (play/pausa/scrubbing).
//
// Idea chiave della linea temporale:
//   - La simulazione avanza SOLO quando siamo in riproduzione e ci troviamo
//     sul fronte temporale (l'ultima generazione simulata). In quel caso viene
//     calcolata una nuova generazione e registrata.
//   - Se il cursore e' indietro nel tempo, la riproduzione si limita a "riavvolgere
//     in avanti" la storia gia' registrata, senza simulare nulla di nuovo.
//   - In pausa nulla avanza; il cursore si puo' spostare liberamente (scrubbing).

import { Population } from './model/population.js';
import { Recorder } from './recorder.js';
import { SandboxRenderer } from './render/sandbox.js';
import { FrequencyChart } from './ui/chart.js';
import { Controls } from './ui/controls.js';
import { Timeline } from './ui/timeline.js';
import { HWPanel } from './ui/hwPanel.js';
import { InfoPanel, personFromSnapshot } from './ui/infoPanel.js';
import { WORLD } from './config.js';

// --- Riferimenti agli elementi del DOM ------------------------------------
const $ = (id) => document.getElementById(id);
const sandboxCanvas = $('sandbox');
const chartCanvas = $('chart');

const sandbox = new SandboxRenderer(sandboxCanvas);
sandbox.world = { width: WORLD.width, height: WORLD.height };
const chart = new FrequencyChart(chartCanvas);
const hwPanel = new HWPanel($('hwPanel'));
const infoPanel = new InfoPanel($('infoPanel'));

// --- Stato dell'applicazione ----------------------------------------------
const state = {
  pop: null,
  recorder: null,
  running: false,   // simulazione avviata?
  playing: false,   // in riproduzione?
  cursor: 0,        // tempo (generazione) attualmente mostrato
  speed: 4,         // generazioni al secondo
  selectedGene: 0,  // gene mostrato in sandbox e grafico
  selectedId: null, // individuo selezionato (per il pannello info)
};

// --- Controlli e timeline --------------------------------------------------
const controls = new Controls(
  {
    knobsContainer: $('knobs'),
    sizeInput: $('cfgSize'),
    genesInput: $('cfgGenes'),
    allelesInput: $('cfgAlleles'),
    seedInput: $('cfgSeed'),
    speedInput: $('speed'),
    speedLabel: $('speedLabel'),
    geneSelect: $('geneSelect'),
    startBtn: $('startBtn'),
    resetBtn: $('resetBtn'),
  },
  {
    onKnob: (name, value) => {
      if (state.pop) state.pop.setKnob(name, value);
    },
    onStart: (config) => start(config),
    onReset: () => reset(),
    onGeneChange: (idx) => { state.selectedGene = idx; forceRedraw(); },
    onSpeed: (v) => { state.speed = v; },
  }
);

const timeline = new Timeline(
  { playBtn: $('playBtn'), slider: $('slider'), timeLabel: $('timeLabel') },
  {
    onPlayPause: () => {
      if (!state.running) return;
      state.playing = !state.playing;
      forceRedraw();
    },
    onSeek: (cursor) => {
      if (!state.running) return;
      state.cursor = Math.max(0, Math.min(state.recorder.length - 1, cursor));
      forceRedraw();
    },
  }
);

controls.setStructuralEnabled(true);

// --- Avvio / Reset ---------------------------------------------------------
function start(config) {
  state.pop = new Population(config);
  state.recorder = new Recorder();
  // Registra il fotogramma iniziale (generazione 0).
  state.recorder.record(state.pop.stats(), state.pop.snapshot());
  state.running = true;
  state.playing = true;
  state.cursor = 0;
  state.selectedId = null;

  controls.populateGenes(config.nGenes, 0);
  state.selectedGene = 0;
  controls.setStructuralEnabled(false);
  $('startHint').style.display = 'none';
  infoPanel.clear();
  forceRedraw();
}

function reset() {
  state.running = false;
  state.playing = false;
  state.pop = null;
  if (state.recorder) state.recorder.clear();
  state.recorder = null;
  state.cursor = 0;
  state.selectedId = null;
  controls.setStructuralEnabled(true);
  $('startHint').style.display = '';
  hwPanel.clear();
  infoPanel.clear();
  // Pulisce la sandbox e il grafico.
  sandbox.resize();
  sandbox.ctx.clearRect(0, 0, sandbox.cssWidth, sandbox.cssHeight);
  chart.resize();
  chart.ctx.clearRect(0, 0, chart.cssWidth, chart.cssHeight);
  timeline.update(0, 0, false);
}

// --- Ciclo di riproduzione / rendering (requestAnimationFrame) -------------
let lastTime = performance.now();
let acc = 0;            // accumulatore di tempo per il passo genetico
let lastKey = '';       // chiave per evitare ridisegni inutili dei pannelli

function loop(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  if (state.running && state.playing) {
    acc += dt * state.speed;
    let steps = 0;
    // Avanza di una o piu' generazioni in base alla velocita' scelta.
    while (acc >= 1 && steps < 300) { acc -= 1; advanceOne(); steps++; }
    // Movimento fluido degli individui quando siamo sul fronte temporale.
    if (state.cursor === state.recorder.length - 1) state.pop.animate();
  } else {
    acc = 0;
  }

  render();
  requestAnimationFrame(loop);
}

function advanceOne() {
  const live = state.recorder.length - 1;
  if (state.cursor < live) {
    // Riproduzione della storia gia' registrata.
    state.cursor++;
  } else {
    // Siamo sul fronte: simula e registra una nuova generazione.
    state.pop.step();
    state.recorder.record(state.pop.stats(), state.pop.snapshot());
    state.cursor = state.recorder.length - 1;
  }
}

function forceRedraw() { lastKey = ''; }

function render() {
  if (!state.running) return;
  const live = state.recorder.length - 1;
  const cursor = state.cursor;

  // La sandbox si ridisegna ad ogni frame (per l'animazione del movimento).
  if (cursor === live) {
    sandbox.drawLive(state.pop.individuals, state.selectedGene, state.selectedId);
  } else {
    const { snap } = state.recorder.snapAt(cursor);
    if (snap) sandbox.drawSnapshot(snap, state.selectedGene, state.selectedId);
  }

  // I pannelli piu' "pesanti" si aggiornano solo quando qualcosa cambia
  // davvero (tempo, gene, selezione, stato di riproduzione): evita di
  // ricostruire il DOM 60 volte al secondo.
  const key = cursor + '|' + live + '|' + state.selectedGene + '|' +
    state.selectedId + '|' + state.playing;
  if (key !== lastKey) {
    lastKey = key;
    chart.draw(state.recorder.frames, state.selectedGene, cursor, state.pop.nAlleles);
    const stats = state.recorder.statsAt(cursor);
    hwPanel.render(stats.perGene[state.selectedGene], state.selectedGene);
    updateInfo(stats, cursor, live);
    timeline.update(cursor, live, state.playing);
  }
}

function updateInfo(stats, cursor, live) {
  if (state.selectedId == null) { infoPanel.clear(); return; }
  let person = null;
  let present = false;
  if (cursor === live) {
    const ind = state.pop.individuals.find((x) => x.id === state.selectedId);
    if (ind) {
      person = { id: ind.id, sex: ind.sex, age: ind.age, genotype: ind.genotype };
      present = true;
    }
  } else {
    const { snap } = state.recorder.snapAt(cursor);
    if (snap) { person = personFromSnapshot(snap, state.selectedId); present = !!person; }
  }
  infoPanel.show(person, stats, present);
}

// --- Selezione di un individuo con il clic ---------------------------------
sandboxCanvas.addEventListener('click', (e) => {
  if (!state.running) return;
  const rect = sandboxCanvas.getBoundingClientRect();
  const cssX = e.clientX - rect.left;
  const cssY = e.clientY - rect.top;
  const [wx, wy] = sandbox.cssToWorld(cssX, cssY);

  const live = state.recorder.length - 1;
  let idx, source;
  if (state.cursor === live) {
    idx = sandbox.pickFromLive(state.pop.individuals, wx, wy);
    source = state.pop.individuals;
    state.selectedId = idx >= 0 ? source[idx].id : null;
  } else {
    const { snap } = state.recorder.snapAt(state.cursor);
    if (snap) {
      idx = sandbox.pickFromSnapshot(snap, wx, wy);
      state.selectedId = idx >= 0 ? snap.id[idx] : null;
    }
  }
  forceRedraw();
});

// --- Adattamento alle dimensioni (responsive / mobile) ---------------------
function handleResize() {
  sandbox.resize();
  chart.resize();
  forceRedraw();
  // Ridisegna subito anche se in pausa.
  if (state.running) render();
}
window.addEventListener('resize', handleResize);
if (window.ResizeObserver) {
  const ro = new ResizeObserver(() => handleResize());
  ro.observe(sandboxCanvas);
  ro.observe(chartCanvas);
}

// Avvia il ciclo di rendering.
requestAnimationFrame(loop);
