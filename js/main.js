// main.js
// Il "direttore d'orchestra": collega modello, renderer e interfaccia.
//
// Flusso dell'applicazione:
//   1. SCHERMATA DI SETUP: l'utente sceglie i parametri iniziali e le forze,
//      poi preme «Avvia».
//   2. GENERAZIONE IN BLOCCO: tutti gli anni richiesti vengono simulati e
//      registrati, mostrando "Simulazione evolutiva in corso…".
//   3. NAVIGAZIONE: la simulazione registrata diventa navigabile con la barra
//      temporale (play/pausa, cursore, barra spaziatrice). I parametri restano
//      in fondo alla pagina; «Riavvia» rigenera tutto.

import { Population } from './model/population.js';
import { Recorder } from './recorder.js';
import { SandboxRenderer } from './render/sandbox.js';
import { FrequencyChart } from './ui/chart.js';
import { PopChart } from './ui/popChart.js';
import { Controls } from './ui/controls.js';
import { Timeline } from './ui/timeline.js';
import { HWPanel } from './ui/hwPanel.js';
import { InfoPanel, personFromSnapshot } from './ui/infoPanel.js';
import { WORLD } from './config.js';

const $ = (id) => document.getElementById(id);

const sandboxCanvas = $('sandbox');
const chartCanvas = $('chart');
const popChartCanvas = $('popChart');
const sandbox = new SandboxRenderer(sandboxCanvas);
sandbox.world = { width: WORLD.width, height: WORLD.height };
const chart = new FrequencyChart(chartCanvas);
const popChart = new PopChart(popChartCanvas);
const hwPanel = new HWPanel($('hwPanel'));
const infoPanel = new InfoPanel($('infoPanel'));

// --- Stato dell'applicazione ----------------------------------------------
const state = {
  pop: null,
  recorder: null,
  generating: false, // true durante la generazione in blocco
  playing: false,    // true durante la riproduzione
  cursor: 0,         // anno attualmente mostrato
  speed: 30,         // anni al secondo in riproduzione
  selectedId: null,  // individuo selezionato (per la scheda info)
};

// --- Controlli e timeline --------------------------------------------------
const controls = new Controls(
  {
    knobsContainer: $('knobs'),
    sizeInput: $('cfgSize'),
    yearsInput: $('cfgYears'),
    lifeInput: $('cfgLife'),
    allelesInput: $('cfgAlleles'),
    seedInput: $('cfgSeed'),
    freqContainer: $('freqInputs'),
    speedInput: $('speed'),
    speedLabel: $('speedLabel'),
  },
  {
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
  state.selectedId = null;
  setInfoVisible(false);

  // Attende un frame perche' i canvas, ora visibili, abbiano dimensioni reali.
  await nextFrame();
  sandbox.resize();
  chart.resize();
  popChart.resize();

  await generate(config);

  state.cursor = 0;
  state.playing = true; // parte in riproduzione dall'anno 0
  forceRedraw();
  render(); // primo fotogramma subito, senza attendere il ciclo di animazione
}

// Genera tutti gli anni, a blocchi, aggiornando la barra di avanzamento.
async function generate(config) {
  state.generating = true;
  showGenerating(true, 0, config.years);

  state.pop = new Population(config);
  state.recorder = new Recorder();
  state.recorder.record(state.pop.stats(), state.pop.snapshot()); // anno 0

  const total = config.years;
  const chunk = Math.max(1, Math.min(25, Math.round(300000 / Math.max(1, config.size))));

  for (let g = 1; g <= total; g++) {
    state.pop.step();
    state.recorder.record(state.pop.stats(), state.pop.snapshot());
    if (state.pop.individuals.length === 0) { // estinzione: si ferma
      showGenerating(true, g, total);
      break;
    }
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

function renderNow() {
  if (state.recorder && !state.generating) render();
}

function render() {
  const last = state.recorder.length - 1;
  const cursor = state.cursor;

  // Animazione fluida: durante il play interpola le posizioni tra l'anno corrente
  // e il successivo (acc = frazione accumulata dal ciclo di riproduzione). In
  // pausa o durante lo scrubbing (f = 0) si disegna il fotogramma esatto.
  const f = (state.playing && cursor < last) ? Math.min(1, acc) : 0;
  const cur = state.recorder.snapAt(cursor);
  if (f > 0) {
    const nxt = state.recorder.snapAt(cursor + 1);
    if (cur.snap && cur.exact && nxt.snap && nxt.exact && nxt.snap !== cur.snap) {
      sandbox.drawInterpolated(cur.snap, nxt.snap, f, state.selectedId);
    } else if (cur.snap) {
      sandbox.drawSnapshot(cur.snap, state.selectedId);
    }
  } else if (cur.snap) {
    sandbox.drawSnapshot(cur.snap, state.selectedId);
  }

  // I pannelli piu' "pesanti" si aggiornano solo quando qualcosa cambia.
  const key = cursor + '|' + last + '|' + state.selectedId + '|' + state.playing;
  if (key !== lastKey) {
    lastKey = key;
    const stats = state.recorder.statsAt(cursor);
    chart.draw(state.recorder.frames, cursor);
    popChart.draw(state.recorder.frames, cursor);
    hwPanel.render(stats);
    updateInfo(cursor);
    timeline.update(cursor, last, state.playing, stats.size);
  }
}

function updateInfo(cursor) {
  if (state.selectedId == null) { setInfoVisible(false); return; }
  const { snap } = state.recorder.snapAt(cursor);
  const person = snap ? personFromSnapshot(snap, state.selectedId) : null;
  infoPanel.show(person, !!person);
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
  popChart.resize();
  forceRedraw();
  if (state.recorder && !state.generating) render();
}
window.addEventListener('resize', handleResize);
if (window.ResizeObserver) {
  const ro = new ResizeObserver(() => handleResize());
  ro.observe(sandboxCanvas);
  ro.observe(chartCanvas);
  ro.observe(popChartCanvas);
}

// Cede il controllo al browser per un istante.
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
