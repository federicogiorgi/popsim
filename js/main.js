// main.js
// Il "direttore d'orchestra": collega modello, renderer e interfaccia.
//
// Flusso dell'applicazione:
//   1. SCHERMATA DI SETUP: l'utente sceglie i parametri iniziali e le cinque
//      forze, poi preme «Avvia».
//   2. GENERAZIONE IN BLOCCO: tutte le generazioni richieste vengono simulate e
//      registrate, mostrando "Simulazione evolutiva in corso…".
//   3. NAVIGAZIONE: la simulazione registrata diventa navigabile con la barra
//      temporale (play/pausa, cursore, barra spaziatrice). I parametri restano
//      in fondo alla pagina; «Riavvia» rigenera tutto.

import { Population } from './model/population.js';
import { Recorder } from './recorder.js';
import { SandboxRenderer } from './render/sandbox.js';
import { FrequencyChart } from './ui/chart.js';
import { Controls } from './ui/controls.js';
import { Timeline } from './ui/timeline.js';
import { HWPanel } from './ui/hwPanel.js';
import { InfoPanel, personFromSnapshot } from './ui/infoPanel.js';
import { WORLD } from './config.js';

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
  generating: false, // true durante la generazione in blocco
  playing: false,    // true durante la riproduzione
  cursor: 0,         // generazione attualmente mostrata
  speed: 6,          // generazioni al secondo in riproduzione
  selectedGene: 0,
  selectedId: null,  // individuo selezionato (per la scheda info)
};

// --- Controlli e timeline --------------------------------------------------
const controls = new Controls(
  {
    knobsContainer: $('knobs'),
    sizeInput: $('cfgSize'),
    generationsInput: $('cfgGenerations'),
    genesInput: $('cfgGenes'),
    allelesInput: $('cfgAlleles'),
    seedInput: $('cfgSeed'),
    speedInput: $('speed'),
    speedLabel: $('speedLabel'),
    geneSelect: $('geneSelect'),
  },
  {
    onGeneChange: (idx) => { state.selectedGene = idx; forceRedraw(); renderNow(); },
    onSpeed: (v) => { state.speed = v; },
  }
);

const timeline = new Timeline(
  { playBtn: $('playBtn'), slider: $('slider'), timeLabel: $('timeLabel') },
  {
    onPlayPause: () => togglePlay(),
    onSeek: (cursor) => {
      if (!state.recorder || state.generating) return;
      state.cursor = Math.max(0, Math.min(state.recorder.length - 1, cursor));
      forceRedraw();
      renderNow();
    },
  }
);

// Pulsanti Avvia / Riavvia: entrambi (ri)generano con i parametri correnti.
$('startBtn').addEventListener('click', () => run(controls.readConfig()));
$('restartBtn').addEventListener('click', () => run(controls.readConfig()));

// Chiusura della scheda info.
$('infoClose').addEventListener('click', () => {
  state.selectedId = null;
  setInfoVisible(false);
  forceRedraw();
});

// --- Cambio schermata (setup <-> simulazione) ------------------------------
function setView(view) {
  document.body.classList.remove('view-setup', 'view-sim');
  document.body.classList.add('view-' + view);
}

// --- Avvio: genera in blocco e poi rende navigabile ------------------------
async function run(config) {
  if (state.generating) return;
  state.config = config;
  setView('sim');
  state.selectedGene = 0;
  state.selectedId = null;
  setInfoVisible(false);
  controls.populateGenes(config.nGenes, 0);

  // Attende un frame perche' i canvas, ora visibili, abbiano dimensioni reali.
  await nextFrame();
  sandbox.resize();
  chart.resize();

  await generate(config);

  state.cursor = 0;
  state.playing = true; // parte in riproduzione dalla generazione 0
  forceRedraw();
  render(); // primo fotogramma subito, senza attendere il ciclo di animazione
}

// Genera tutte le generazioni, a blocchi, aggiornando la barra di avanzamento.
async function generate(config) {
  state.generating = true;
  showGenerating(true, 0, config.generations);

  state.pop = new Population(config);
  state.recorder = new Recorder();
  state.recorder.record(state.pop.stats(), state.pop.snapshot()); // generazione 0

  const total = config.generations;
  // Dimensione del blocco: piu' piccola se ci sono tanti individui, cosi' ogni
  // pausa per aggiornare l'interfaccia resta breve e l'animazione non scatta.
  const chunk = Math.max(1, Math.min(25, Math.round(300000 / (config.size * Math.max(1, config.nGenes)))));

  for (let g = 1; g <= total; g++) {
    state.pop.step();
    state.recorder.record(state.pop.stats(), state.pop.snapshot());
    if (g % chunk === 0 || g === total) {
      showGenerating(true, g, total);
      await nextFrame(); // cede il controllo: l'overlay si aggiorna, niente freeze
    }
  }

  state.generating = false;
  showGenerating(false);
}

function showGenerating(on, done = 0, total = 0) {
  const overlay = $('genOverlay');
  overlay.hidden = !on;
  if (on) {
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    $('genProgress').textContent = done + ' / ' + total + '  (' + pct + '%)';
    $('genBar').style.width = pct + '%';
  }
}

// --- Riproduzione / rendering (requestAnimationFrame) ----------------------
let lastTime = performance.now();
let acc = 0;
let lastKey = '';

function togglePlay() {
  if (!state.recorder || state.generating) return;
  const last = state.recorder.length - 1;
  // Se siamo alla fine e si preme play, riparte dall'inizio.
  if (!state.playing && state.cursor >= last) state.cursor = 0;
  state.playing = !state.playing;
  forceRedraw();
  renderNow();
}

function loop(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  if (state.recorder && !state.generating) {
    const last = state.recorder.length - 1;
    if (state.playing) {
      acc += dt * state.speed;
      while (acc >= 1 && state.cursor < last) { acc -= 1; state.cursor++; }
      if (state.cursor >= last) { state.playing = false; acc = 0; } // fine
    } else {
      acc = 0;
    }
    render();
  }
  requestAnimationFrame(loop);
}

function forceRedraw() { lastKey = ''; }

// Ridisegna subito (senza attendere il prossimo frame del ciclo di animazione):
// usato dopo le interazioni dell'utente per una risposta immediata.
function renderNow() {
  if (state.recorder && !state.generating) render();
}

function render() {
  const last = state.recorder.length - 1;
  const cursor = state.cursor;

  const { snap } = state.recorder.snapAt(cursor);
  if (snap) sandbox.drawSnapshot(snap, state.selectedGene, state.selectedId);

  // I pannelli piu' "pesanti" si aggiornano solo quando qualcosa cambia.
  const key = cursor + '|' + last + '|' + state.selectedGene + '|' +
    state.selectedId + '|' + state.playing;
  if (key !== lastKey) {
    lastKey = key;
    chart.draw(state.recorder.frames, state.selectedGene, cursor, state.pop.nAlleles);
    const stats = state.recorder.statsAt(cursor);
    hwPanel.render(stats.perGene[state.selectedGene], state.selectedGene);
    updateInfo(stats, cursor);
    timeline.update(cursor, last, state.playing);
  }
}

function updateInfo(stats, cursor) {
  if (state.selectedId == null) { setInfoVisible(false); return; }
  const { snap } = state.recorder.snapAt(cursor);
  const person = snap ? personFromSnapshot(snap, state.selectedId) : null;
  infoPanel.show(person, stats, !!person);
  setInfoVisible(true);
}

function setInfoVisible(on) {
  $('infoOverlay').hidden = !on;
}

// --- Selezione di un individuo con il clic ---------------------------------
sandboxCanvas.addEventListener('click', (e) => {
  if (!state.recorder || state.generating) return;
  const rect = sandboxCanvas.getBoundingClientRect();
  const [wx, wy] = sandbox.cssToWorld(e.clientX - rect.left, e.clientY - rect.top);
  const { snap } = state.recorder.snapAt(state.cursor);
  if (!snap) return;
  const idx = sandbox.pickFromSnapshot(snap, wx, wy);
  state.selectedId = idx >= 0 ? snap.id[idx] : null;
  setInfoVisible(state.selectedId != null);
  forceRedraw();
  renderNow();
});

// --- Adattamento alle dimensioni (responsive / mobile) ---------------------
function handleResize() {
  if (document.body.classList.contains('view-setup')) return;
  sandbox.resize();
  chart.resize();
  forceRedraw();
  if (state.recorder && !state.generating) render();
}
window.addEventListener('resize', handleResize);
if (window.ResizeObserver) {
  const ro = new ResizeObserver(() => handleResize());
  ro.observe(sandboxCanvas);
  ro.observe(chartCanvas);
}

// Cede il controllo al browser per un istante. Si sblocca con il primo tra
// requestAnimationFrame e un breve timeout: cosi' la generazione procede anche
// se la scheda e' in secondo piano (dove rAF puo' essere sospeso).
function nextFrame() {
  return new Promise((resolve) => {
    let done = false;
    const fin = () => { if (!done) { done = true; resolve(); } };
    requestAnimationFrame(fin);
    setTimeout(fin, 50);
  });
}

// Avvia il ciclo di rendering e parte dalla schermata di setup.
setView('setup');
requestAnimationFrame(loop);
