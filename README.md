# PopSim — Software per Genetica di Popolazione

Simulatore didattico di genetica di popolazione che gira **interamente nel
browser**, pensato per l'uso in aula su PC e su telefono. Ospitato su GitHub
Pages: <https://federicogiorgi.github.io/popsim/>.

La simulazione si basa su **un solo gene** (che può avere più alleli). Ogni
individuo è una particella cliccabile in un "mondo" (la sandbox) dove **nasce, si
accoppia e muore**, anno dopo anno. Nella popolazione — finita e piccola — la
**deriva genetica** emerge da sola: con la sola **mortalità = 1** la popolazione
resta all'incirca costante ed evolve per pura deriva, spesso fino alla fissazione
di un allele.

## Come si usa

1. Il sito si apre sulla **schermata di setup**: scegli numero di individui,
   **durata** della simulazione (in anni, fino a 10000), **vita media** di un
   individuo (in anni), numero di **alleli iniziali** (max 9) e seme casuale, e
   regola le **forze evolutive**.
2. Premi **Avvia simulazione**. Tutti gli anni vengono calcolati in blocco
   mostrando «Simulazione evolutiva in corso…» con una barra di avanzamento.
3. Al termine appaiono **sandbox** e **grafico**, e la simulazione è **navigabile**:
   la **barra temporale** (stile lettore video) mette in pausa/riprende (anche con
   la **barra spaziatrice**) e il cursore si trascina per rivedere qualsiasi anno.
   Il cursore è allineato con la barra verticale del grafico.
4. Il **grafico** mostra l'andamento delle frequenze alleliche nel tempo (una
   linea per allele, stesso colore usato nella sandbox).
5. **Clicca un individuo** nella sandbox: una scheda in overlay ne mostra sesso,
   età (in anni), genotipo, coefficiente di consanguineità F, genitori e figli.
6. I **parametri restano in fondo alla pagina**, modificabili: il pulsante
   **Riavvia simulazione** rigenera tutto con i nuovi valori.

## Il modello, in breve

Modello **individuo-centrico e spaziale** (un solo gene, più alleli possibili):

- **Tempo in anni.** Ogni passo della simulazione è un anno. Gli individui hanno
  un'età in anni e una durata di vita attorno alla **vita media** impostata (n
  anni, di default 10).
- **Ciclo vitale.** Ogni anno gli individui invecchiano, gli adulti in età
  riproduttiva (dagli **anni 2 a n-1**) si accoppiano a coppie generando prole, e
  poi avvengono le morti. Ogni individuo si riproduce al massimo **n-2 volte**.
- **Mortalità.** Il numero di morti è legato a quello dei nati tramite la manopola
  **Mortalità**: con **1** la popolazione resta costante, **sotto 1** cresce,
  **sopra 1** diminuisce (fino all'estinzione).
- **Posizioni non casuali.** In ogni anno un individuo è **isolato** oppure
  **accanto** al partner con cui si accoppia; la **prole nasce vicino ai genitori**,
  ma non a diretto contatto.
- **Forma e colore.** Cerchio = femmina, quadrato = maschio. Il **colore dipende
  solo dagli alleli**: un omozigote ha una tinta unita; un **eterozigote** è
  tagliato in **diagonale**, con l'allele minore (in ordine alfabetico A1<…<A9) in
  alto a sinistra e il maggiore in basso a destra.
- **Deriva.** Essendo la popolazione finita, le frequenze alleliche fluttuano da
  sole; più piccola è la popolazione, più forte è la deriva.

### Le forze evolutive

| Manopola | Effetto |
|---|---|
| **Mortalità** | Morti per ogni nato: 1 = popolazione costante, <1 crescita, >1 declino. |
| **Mutazione** | Un allele trasmesso può mutare in un **nuovo allele**. Cap a **9 alleli**: oltre, nessun nuovo allele (così le etichette restano a una cifra e l'ordine alfabetico è ben definito). |
| **Selezione** | Vantaggio di sopravvivenza direzionale a favore dell'allele **A1**. |
| **Migrazione** | Una frazione dei nuovi nati è in realtà un **immigrato non imparentato**, con alleli casuali. |

### Consanguineità (coefficiente F)

Il coefficiente F è calcolato dal **pedigree**, tramite alleli **IBD** (Identical
By Descent) — **non** dal semplice essere omozigoti. Deriva dalla formula sui
cammini di Wright

```
F = Σ (1/2)^n · (1 + F_A)
```

e si ottiene in modo ricorsivo dai coefficienti di parentela dei genitori (vedi
`js/model/kinship.js`). F è **sempre compreso tra 0 e 1** (mai negativo): vale 0
per fondatori/immigrati non imparentati e sale nel tempo nelle popolazioni piccole
(0.25 già per figli di fratelli). Il pannello mostra la **consanguineità media**
della popolazione.

### Hardy-Weinberg

Il pannello dedicato confronta le frequenze **genotipiche osservate** con quelle
**attese** sotto Hardy-Weinberg:

```
p² + 2pq + q² = 1
```

(generalizzata a più alleli: omozigote AiAi atteso pi², eterozigote AiAj atteso
2·pi·pj). Le attese si calcolano dalle frequenze alleliche **osservate nel
campione**. Il giudizio "in equilibrio / scostamento" si basa sul **test
chi-quadro** (valore-p).

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
  config.js           costanti, default, tavolozza colori (9 alleli), definizione delle manopole
  main.js             orchestratore: collega modello, renderer e UI; orologio di riproduzione
  recorder.js         cronologia della simulazione (per tornare indietro nel tempo)
  model/              LA "GENETICA" - logica pura, indipendente dal renderer
    rng.js            generatore casuale deterministico (riproducibilità)
    genetics.js       misure (frequenze, eterozigosità, Hardy-Weinberg, test chi-quadro)
    kinship.js        consanguineità F dal pedigree (alleli IBD)
    individual.js     fabbrica di individui (dati puri, serializzabili)
    population.js     ciclo vitale, accoppiamento spaziale, mortalità, statistiche, snapshot
  render/
    sandbox.js        renderer Canvas 2D degli individui (colore diagonale) + selezione col clic
  ui/
    controls.js       manopole + parametri di setup
    timeline.js       barra temporale in stile lettore video
    chart.js          grafico delle frequenze alleliche nel tempo
    hwPanel.js        pannello di scostamento da Hardy-Weinberg
    infoPanel.js      scheda dell'individuo selezionato
```

La **logica di simulazione (`js/model/`) è separata dal renderer (`js/render/`)**:
il modello non conosce il canvas, quindi il renderer resta sostituibile in futuro
(es. WebGL) senza toccare la genetica.

## Prestazioni

Pensato per una **piccola popolazione** (default 50, cap 1000). Il calcolo della
consanguineità dal pedigree ha costo ~N² per anno, quindi popolazioni grandi
combinate con durate lunghe rallentano; per questo, con mortalità < 1, la crescita
è limitata da un **tetto di sicurezza** (capacità portante) che evita che la
popolazione esploda e blocchi il browser. La simulazione viene **calcolata in
blocco** all'avvio (a piccoli lotti, cedendo il controllo al browser tra un lotto e
l'altro) e poi **registrata**: la riproduzione successiva scorre i fotogrammi già
calcolati (snapshot con array tipizzati), quindi resta fluida navigando avanti e
indietro.

## Sviluppo locale

Serve il sito con un qualsiasi server statico (i moduli ES richiedono http://,
non `file://`):

```bash
python -m http.server 8000
# poi apri http://localhost:8000/
```
