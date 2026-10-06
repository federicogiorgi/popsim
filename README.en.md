<p align="center">
  <img src="assets/banner.png" alt="PopSim — An educational population genetics simulator" width="820">
</p>

<p align="center">
  <b>▶ Try it now:</b> <a href="https://federicogiorgi.github.io/popsim/">federicogiorgi.github.io/popsim</a><br>
  <sub>Runs entirely in the browser · no installation · works offline too</sub><br>
  <sub>🇮🇹 <a href="README.md">Versione italiana</a></sub>
</p>

---

## What it is

**PopSim** is an **educational** population genetics simulator. It lets you
*see*, in real time and interactively, the concepts that are usually taught in
class only through formulas: **Hardy-Weinberg equilibrium**, **genetic drift**,
**selection**, **migration**, **mutation**, **non-random mating** and
**inbreeding**.

The idea is simple: a small population of individuals lives in a "world" (the
*sandbox*). Every individual **is born, mates and dies**, year after year. You
adjust the "evolutionary forces" with knobs and watch how the allele
frequencies change — or don't — over time.

Designed for the classroom: few parameters, effects visible within seconds,
**reproducible** results (same random seed → same evolution).

The interface is available in **Italian** (default) and **English**: switch
with the small flags in the top-right corner of the parameters box, next to the
light/dark theme switch.

## How it works

The simulation follows **a single gene**, which can have up to **9 alleles**
(A1, A2, …). Each individual carries two alleles (its *genotype*).

- **Shape = sex.** Circle ● = female, square ■ = male.
- **Colour = alleles.** A homozygote (e.g. A1A1) has a single solid colour; a
  **heterozygote** (e.g. A1A2) is **split diagonally**: the lower allele in
  alphabetical order at the top left, the higher one at the bottom right.
- **Time in years.** Each step is one year. Individuals have an age in years and
  a lifespan around the chosen **mean lifespan**. They reproduce between ages 2
  and n−1.
- **Non-random positions.** Each year an individual is either **alone** or
  **next to** the partner it mates with; offspring are born close to their
  parents.

Under the hood the model has **two levels**, and this is its teaching core:

1. The population's **allele frequencies** are the "authoritative" genetic state
   and evolve under the forces. **With all forces at 0 they stay constant**:
   this is Hardy-Weinberg equilibrium, the reference case.
2. The **individuals** shown in the sandbox are a realisation consistent with
   those frequencies, with a real **pedigree** used to compute inbreeding.

### The evolutionary forces

| Knob | Effect |
|---|---|
| **Mortality** | Deaths per birth: **1** = constant population, **< 1** it grows, **> 1** it shrinks (down to extinction). |
| **Genetic drift** | Random fluctuation of the frequencies (Wright-Fisher sampling): at 0 the frequencies stay constant; above 0 they perform a random walk and can become **fixed**. Stronger in small populations (∝ 1/N). |
| **Mutation** | Appearance of **new alleles** over time (up to a maximum of 9). |
| **Migration (Gene flow)** | **Unrelated migrants** moving in from / out to an external population: pulls the frequencies together and **lowers inbreeding**. The flow is balanced, so the population size stays constant. |
| **Selection** | Directional advantage for allele **A1**. |
| **Non-random mating** | Like mates with like: **excess of homozygotes**, without changing the allele frequencies. |

### Hardy-Weinberg equilibrium

Hardy-Weinberg is a **prediction**: if no force is acting, the allele
frequencies p and q of one generation produce genotypes in the proportions
<code>p² + 2pq + q² = 1</code>, and the frequencies stay the same generation
after generation. The panel checks **two conditions**, shown as two separate
checks (① and ②), with a verdict above that says "**in equilibrium**" only when
**both** are satisfied:

1. **Allele frequencies are stable over time** (over the last 30 years). In the
   chart this shows as **flat lines**; if a line slopes, the population is
   evolving.
2. **Genotypes are as predicted by Hardy-Weinberg** — a **chi-square test**
   between the genotypes **observed today** and those **expected** (p², 2pq, q²)
   from the allele frequencies of **30 years earlier** (a few generations
   before). The expected frequencies are fixed in advance, so the degrees of
   freedom are (genotype classes − 1).

With this comparison **every force produces a departure from HW**: drift,
selection, migration and mutation shift the allele frequencies (today's
genotypes are no longer the predicted ones), while non-random mating distorts
the proportions (excess of homozygotes). A new allele that appears by mutation
even makes the genotypes impossible under the prediction. Without forces,
observed and expected agree. The *Genotype frequencies over time* chart uses the
same expected values.

Two notes for the classroom:

- The test is statistical: with **few individuals** or **weak drift** the shift
  may not yet be significant (drift is itself a random fluctuation), while
  check ① still detects it.
- If χ² is significant but **no force is active**, check ② flags it as a likely
  sampling fluctuation (false positive expected in ~5% of cases) and the
  verdict does not change.

### Inbreeding (coefficient F)

The coefficient **F** is computed from the **pedigree**, through **IBD**
(*Identical By Descent*) alleles — not simply from being homozygous. It derives
from Wright's path formula

```
F = Σ (1/2)ⁿ · (1 + F_A)
```

and is **always between 0 and 1**: it is 0 for unrelated individuals and rises
over time in small, closed populations (already 0.25 for offspring of full
siblings). The panel shows the population's **mean** inbreeding; clicking an
individual shows its own F, its parents and its offspring.

## How to use it

1. **Start screen.** Set the number of individuals, the duration (in years), the
   mean lifespan, the number of **starting alleles** and their **frequencies**,
   the random seed, and adjust the forces. Press **«Start simulation»**.
2. **Computation.** All years are simulated in one go (progress bar).
3. **Exploration.** On a wide screen the simulation fits in **a single 16:9
   screen**, designed for the projector (text grows with the screen): on the
   left the sandbox, the **timeline** and the allele-frequency chart; on the
   right the **Hardy-Weinberg** result (✓ Yes / ✗ No), the forces and the
   parameters, with **«Restart»** at the bottom. The timeline (video-player
   style: play/pause, also with the space bar) lets you scroll to any year;
   during playback the animation is smooth. Scrolling down you find the other
   charts and the Hardy-Weinberg details.
4. **Charts.** *Allele frequencies over time* (one line per allele), *Genotype
   frequencies over time* and *Number of individuals over time*. In the genotype
   chart each genotype has two lines: **thick** = observed frequency, **thin** =
   frequency expected under Hardy-Weinberg (p², 2pq, q²). When the two lines
   diverge, the genotype proportions are not those of HW. Homozygotes have the
   colour of their allele, heterozygotes a line in two alternating colours (like
   the diagonally split symbols in the sandbox).
5. **Details.** **Click an individual** to see its sex, age, genotype,
   inbreeding, parents and offspring.

## Classroom examples

The examples used in class. Start from the **default values** and change
**only** the listed parameters.

| # | Concept | Parameters | What you see |
|---|---|---|---|
| 1 | **Hardy-Weinberg equilibrium** — the reference case, the "null model" | all defaults | the two frequency lines stay **flat** (A1 = 0.6, A2 = 0.4); the panel says "in equilibrium"; observed genotypes ≈ expected (p², 2pq, q²). Without forces the frequencies do not change: no evolution is taking place |
| 2 | **Strong selection** (one allele becomes the only one) | Selection = 0.5, No. of individuals = 200, Freq. A1 = 0.1, Freq. A2 = 0.9 | A1, although initially rare, replaces the other allele. During the rise: "NOT in equilibrium" (the frequencies are changing); once fixation is reached, the population returns to Hardy-Weinberg equilibrium |
| 3 | **Genetic drift**: small vs large population | Run A: Genetic drift = 0.3, No. of individuals = 20 · Run B: Genetic drift = 0.3, No. of individuals = 500 | in Run A the frequencies oscillate widely and an allele often disappears within a few hundred years; in Run B the lines stay almost flat. Drift is stronger the smaller the population |
| 4 | **Non-random mating** | Non-random mating = 1, No. of individuals = 300 | the allele frequencies stay **unchanged** at their starting values (flat lines!), but in the panel the coefficient F rises and χ² is huge: "NOT in equilibrium" (check ②). Heterozygotes tend to disappear: it is the only force that changes genotype proportions without changing allele frequencies |
| 5 | **Isolated population**: drift + immigration *(combination)* | Run A: No. of individuals = 20, Genetic drift = 1 · Run B (*rescue*): as A + Migration (gene flow) = 0.4 | Run A: the small population loses an allele. Run B: the genetic variability of the small population is rescued by constant immigration |
| 6 | **Weak selection versus drift** *(combination)* | Duration = 100 years, Selection = 0.3, Genetic drift = 1, Freq. A1 = 0.1, Freq. A2 = 0.9 | the favoured allele A1 sometimes becomes fixed and sometimes is lost by drift: changing the seed changes the outcome. **Seed = 1**: A1 is lost by drift; **Seed = 2**: A1 becomes fixed and is the only allele left; **Seed = 5**: see for yourself. In small populations drift can overpower weak selection |
| 7 | **Mutation** (birth of new alleles) | Mutation = 1, Genetic drift = 0.1, Duration = 10000 years | new coloured lines appear over time (A3, A4, … up to 9); some alleles persist in the population, others disappear right away (try several seeds). Mutation is the ultimate source of variability |
| Bonus | **Departure from Hardy-Weinberg** | No. of individuals = 150, Genetic drift = 1 | check whether the population is in Hardy-Weinberg equilibrium (for long periods both checks ① and ② say "no"), then try the other forces |

**Tips:** keep the speed low (1–5×) to watch the individuals move; use the same
**Seed** for "same luck" comparisons.

## Technical notes

- **Vanilla JavaScript**, **native ES modules**, **no bundler** and no build
  step: the source is what gets served.
- Rendering with **Canvas 2D**, no external libraries (works **offline**).
- User interface in **Italian** (default) and **English** (`js/i18n.js`).
- **Relative paths** only (the site lives under `/popsim/`); `.nojekyll` in the
  root.
- **File version** (`?v=N` in `index.html`, also in the modules' import map):
  bump it at every release, so that browsers never mix old cached files with
  new ones. Every new module in `js/` must be added to the import map.
- **Deterministic** seeded random numbers → reproducible simulations.

### Code structure

```
index.html            page structure and layout
css/styles.css        responsive styles, light/dark theme (system theme by default)
js/
  config.js           constants, defaults, colour palette, knob definitions
  i18n.js             interface texts in Italian and English (choice remembered in the browser)
  main.js             orchestrator: connects model, renderer and interface
  recorder.js         simulation history (to go back in time)
  model/              THE "GENETICS" — pure logic, independent of the renderer
    rng.js            deterministic random number generator
    genetics.js       forces on the frequencies + measures (Hardy-Weinberg, chi-square)
    kinship.js        pedigree inbreeding F (IBD alleles)
    individual.js     individual factory (plain, serialisable data)
    population.js     two levels: frequencies + individuals; life cycle, spatial mating
  render/
    sandbox.js        Canvas 2D renderer of the individuals (diagonal colours, smooth animation)
  ui/
    controls.js       knobs + setup parameters + starting frequencies
    timeline.js       video-player style timeline
    chart.js          allele frequencies over time
    genoChart.js      genotype frequencies (observed and HW-expected) over time
    popChart.js       number of individuals over time
    theme.js          light/dark theme switch (choice remembered in the browser)
    hwPanel.js        Hardy-Weinberg equilibrium panel
    infoPanel.js      card of the selected individual
```

The simulation logic (`js/model/`) is **separate from the renderer**
(`js/render/`): the model knows nothing about the canvas, so the renderer can be
replaced without touching the genetics.

### Performance

Designed for a **small population** (default 50, cap 1000). Computing
inbreeding costs ~N² per year, so very large populations and long durations are
slower; with mortality < 1, growth is limited by a **safety ceiling** that keeps
the browser responsive. The simulation is **computed in one go** at start and
then **recorded**: scrolling back and forth stays smooth.

## Local development

ES modules require `http://` (not `file://`): serve the site with any static
server.

```bash
python -m http.server 8000
# then open http://localhost:8000/
```

## License

Released under the [MIT License](LICENSE).

## Author

Developed by **Federico M. Giorgi**.
