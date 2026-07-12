# PopSim — Software per Genetica di Popolazione

Simulatore didattico di genetica di popolazione che gira **interamente nel
browser**, pensato per l'uso in aula su PC e su telefono. Ospitato su GitHub
Pages: <https://federicogiorgi.github.io/popsim/>.

Ogni individuo è una particella cliccabile in un "mondo" (la sandbox) dove nasce,
si accoppia e muore. L'evoluzione della popolazione è governata da **cinque
forze** (cinque manopole): deriva genetica, mutazione, migrazione, selezione,
accoppiamento non casuale. **Con tutte le manopole a 0 la popolazione resta
all'equilibrio di Hardy-Weinberg**: è il comportamento di riferimento.

## Come si usa

1. Apri la pagina. In fondo, nel riquadro **Impostazioni iniziali**, scegli
   numero di individui (max 10000), numero di geni, alleli per gene e seme
   casuale. Regola le **cinque manopole** (tutte a 0 = Hardy-Weinberg).
2. Premi **Avvia**. La simulazione parte e viene registrata generazione per
   generazione.
3. La **barra temporale** (stile lettore video) permette di mettere in
   pausa/riprendere (anche con la **barra spaziatrice**) e di trascinare il
   cursore per rivedere stati passati.
4. Il **grafico** mostra l'andamento delle frequenze alleliche; il menu a tendina
   sceglie quale gene visualizzare. La barra verticale indica il tempo corrente.
5. **Clicca un individuo** nella sandbox per vederne età, sesso, corredo allelico
   e coefficiente F.
6. Le manopole restano regolabili **durante** la simulazione: gli effetti si
   vedono nelle generazioni successive.

## Vincoli tecnici rispettati

- JavaScript **vanilla**, **moduli ES nativi**, **nessun bundler**, nessuno step
  di build: il sorgente è ciò che viene servito.
- Rendering della sandbox e del grafico su **Canvas 2D**, senza librerie esterne
  (funziona anche **offline** in aula).
- Solo **percorsi relativi** (il sito vive in `/popsim/`).
- File `.nojekyll` vuoto nella radice; `index.html` alla radice, `css/` e `js/`
  separati.

## Struttura del codice

```
index.html            struttura della pagina e layout (sandbox -> tempo -> grafico -> ...)
css/styles.css        stile responsive, tema chiaro/scuro
js/
  config.js           costanti, default, tavolozza colori, scale delle manopole
  main.js             orchestratore: collega modello, renderer e UI; orologio di riproduzione
  recorder.js         cronologia della simulazione (per tornare indietro nel tempo)
  model/              LA "GENETICA" - logica pura, indipendente dal renderer
    rng.js            generatore casuale deterministico (riproducibilita')
    genetics.js       forze evolutive, Hardy-Weinberg, coefficiente F, test chi-quadro
    individual.js     fabbrica di individui (predisposta a piu' specie in futuro)
    population.js     stato della popolazione, ciclo vitale, statistiche
  render/
    sandbox.js        renderer Canvas 2D degli individui + selezione col clic
  ui/
    controls.js       manopole + parametri di setup + scelta del gene
    timeline.js       barra temporale in stile lettore video
    chart.js          grafico delle frequenze alleliche nel tempo
    hwPanel.js        pannello di scostamento da Hardy-Weinberg
    infoPanel.js      scheda dell'individuo selezionato
```

La **logica di simulazione (`js/model/`) è separata dal renderer (`js/render/`)**:
il modello non conosce il canvas, quindi il renderer resta sostituibile in futuro
(es. WebGL) senza toccare la genetica.

## Il modello, in breve

Scelta di fondo, importante per capire i grafici:

- **Le frequenze alleliche sono lo stato genetico "autoritativo"** della
  popolazione. Le cinque forze agiscono su queste frequenze. Gli **individui**
  della sandbox sono una **realizzazione campionaria** coerente con esse, usata
  per la grafica, i clic e il calcolo dello scostamento da HW.
- Questo garantisce che, con tutte le forze a 0, le frequenze restino **costanti**
  (il grafico mostra linee piatte) e la popolazione resti in HW. La **deriva** è
  l'unica forza che fa fluttuare casualmente le frequenze — più forte nelle
  popolazioni piccole.

Le cinque forze (in `js/model/genetics.js`):

| Manopola | Effetto |
|---|---|
| **Deriva genetica** | Campionamento casuale di 2N gameti (Wright-Fisher): passeggiata aleatoria delle frequenze, possibile fissazione. |
| **Mutazione** | Ogni allele muta verso un altro allele; spinge verso frequenze uniformi (1/k). |
| **Migrazione** | Rimpiazza una frazione della popolazione con migranti da una sorgente esterna (uniforme). |
| **Selezione** | Vantaggio riproduttivo direzionale a favore dell'allele A1. |
| **Accoppiamento non casuale** | Accoppiamento tra simili: eccesso di omozigoti (coefficiente F ~ valore della manopola), senza cambiare le frequenze alleliche. |

### Hardy-Weinberg

Il pannello dedicato confronta le frequenze **genotipiche osservate** con quelle
**attese** sotto Hardy-Weinberg, usando la relazione di riferimento

```
p^2 + 2pq + q^2 = 1
```

(generalizzata a più alleli: omozigote AiAi atteso pi^2, eterozigote AiAj atteso
2·pi·pj). Le frequenze attese si calcolano dalle frequenze alleliche **osservate
nel campione** (test HW standard). Il giudizio "in equilibrio / scostamento" si
basa sul **test chi-quadro** (valore-p), così il caso di riferimento resta
stabilmente "in equilibrio" anche con popolazioni piccole, dove il solo
coefficiente F oscillerebbe per rumore campionario.

## Prestazioni

Regge fino a **10000 individui**; il caso tipico d'aula è un centinaio. La logica
genetica per generazione è O(N) ed è leggera: il costo maggiore è il disegno
delle particelle sul Canvas, che resta sul thread principale. Il passo genetico è
**disaccoppiato** dal rendering (le frequenze avanzano al ritmo scelto con la
manopola «Velocità», mentre l'animazione gira a molti frame al secondo): questo
evita che l'animazione scatti. Il modello è scritto in forma pura e serializzabile
(snapshot con array tipizzati), quindi all'occorrenza è spostabile in un **Web
Worker** senza riscritture.

## Estensione futura (predisposta, non attiva)

La sandbox potrà ospitare **più specie** che coesistono (es. un predatore). Per
questo ogni individuo porta già un campo `species` e un contenitore `traits`:
aggiungere una specie significherà creare individui con un altro `species`/`traits`
senza riscrivere l'impianto. Per ora è presente **una sola specie**.

## Sviluppo locale

Serve il sito con un qualsiasi server statico (i moduli ES richiedono http://,
non `file://`):

```bash
python -m http.server 8000
# poi apri http://localhost:8000/
```
