import { Callout, Chapter, Code, StatTile } from '../components/ui'
import { fmt, guide, pct } from '../lib/data'

const REPO = 'https://github.com/elmandalorian-thx/PokemonML'
const NOTEBOOK = `${REPO}/blob/main/notebooks/pokemon_battle_ml.ipynb`
const COLAB = 'https://colab.research.google.com/github/elmandalorian-thx/PokemonML/blob/main/notebooks/pokemon_battle_ml.ipynb'
const KAGGLE = 'https://www.kaggle.com/datasets/terminus7/pokemon-challenge'

const LESSONS = [
  ['Frame it first', 'Inputs, output, metric, and a held-out test set before any code.'],
  ['Understand every column', 'A blank Type 2 isn’t missing data. Row #63 could be repaired, not dropped.'],
  ['Explore to find the story', 'One bar chart revealed that Speed decides 94% of battles.'],
  ['Beat a baseline', `A one-line rule scores ${pct(guide.baselines[guide.baselines.length - 1].accuracy)}. Without it, 88% would look like success.`],
  ['Fit the model to the shape', 'Steps need trees, or a step feature for linear models.'],
  ['Test your assumptions', 'Mirroring battles sounded smart and cost 1.4 points.'],
  ['Watch the train/test gap', 'Deeper trees memorised noise and got worse on new battles.'],
  ['Guard against leakage', 'Nothing from the test set may feed a feature.'],
]

const FILES = [
  { file: 'pokemon.csv', rows: guide.counts.pokemon, what: 'Stats, types, generation and legendary flag for every Pokémon' },
  { file: 'combats.csv', rows: guide.counts.battles, what: 'Recorded battles: first, second and winner ids' },
  { file: 'tests.csv', rows: guide.counts.tests, what: 'Matchups to predict (no winner given)' },
]

export function Wrap() {
  const t = guide.testPredictions
  return (
    <Chapter id="wrap" num="09" title="Takeaways, data & notebook"
      kicker="What this dataset teaches, how to get the data, and the notebook with every line of code.">
      <div className="grid-3">
        <StatTile label="Matchups in tests.csv" value={fmt(t.count)} note="no winners given: the Kaggle exam" />
        <StatTile label="Predicted wins for the 1st Pokémon" value={pct(t.firstWins / t.count)} note="close to the 47% seen in training" />
        <StatTile label="Predictions above 90% confidence" value={pct(t.confident / t.count)} note="most matchups aren’t close" />
      </div>

      <div className="block">
        <h3>Eight lessons that transfer to any ML project</h3>
        <div className="grid-4">
          {LESSONS.map(([h, d], i) => (
            <div className="card" key={h} style={{ padding: 18 }}>
              <div className="mono" style={{ color: 'var(--accent)', fontSize: 12 }}>{String(i + 1).padStart(2, '0')}</div>
              <h4 style={{ margin: '4px 0' }}>{h}</h4>
              <p style={{ margin: 0, fontSize: 14 }}>{d}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="block" id="notebook">
        <h3>The notebook: every step in code</h3>
        <p>The companion Jupyter notebook runs the whole project top to bottom: loading, cleaning, exploring, feature engineering, baselines,
          cross-validation, the three models, evaluation and the battle predictor. Every step is commented and mapped to the chapter of
          Aurélien Géron's <em>Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow</em> (3rd ed.) that explains it.</p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <a className="btn btn-primary" href={NOTEBOOK} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>View the notebook on GitHub</a>
          <a className="btn" href={COLAB} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>Open in Google Colab</a>
        </div>
      </div>

      <div className="block" id="data-files">
        <h3>Download the data</h3>
        <p>The original Kaggle files, unchanged. The dataset is public domain (CC0), so you can use it however you like.</p>
        <div className="grid-3">
          {FILES.map((f) => (
            <a key={f.file} className="card" href={`${import.meta.env.BASE_URL}data/kaggle/${f.file}`} download
              style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <div className="mono" style={{ fontWeight: 700, fontSize: 15 }}>⤓ {f.file}</div>
              <div style={{ fontSize: 22, fontWeight: 650, margin: '2px 0' }}>{fmt(f.rows)} <span className="muted" style={{ fontSize: 13, fontWeight: 400 }}>rows</span></div>
              <p style={{ margin: 0, fontSize: 14 }}>{f.what}</p>
            </a>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 14, marginTop: 12 }}>
          Source: <a href={KAGGLE} target="_blank" rel="noreferrer">Pokemon – Weedle’s Cave on Kaggle</a>. Also in the repository under{' '}
          <a href={`${REPO}/tree/main/data/raw`} target="_blank" rel="noreferrer"><code>data/raw/</code></a>.
        </p>
      </div>

      <div className="block">
        <h3>Exercises to try yourself</h3>
        <div className="grid-2">
          <div className="card"><h4>1 · Beat 95%</h4><p>Add an “is faster” flag and a “speed tie” flag to the boosting model. Then tune <code>HistGradientBoostingClassifier</code> with cross-validation, not the test set.</p></div>
          <div className="card"><h4>2 · Simulate the simulator</h4><p>Write a tiny battle engine (faster attacks first, damage ∝ Attack ÷ Defense) and compare its accuracy to the ML models. Can a hand-written rule match learned ones?</p></div>
          <div className="card"><h4>3 · Explain with SHAP</h4><p>Install <code>shap</code> and compute per-battle explanations for the boosting model. Do they agree with the logistic regression contributions in the arena?</p></div>
          <div className="card"><h4>4 · Break it on purpose</h4><p>Train on Generations 1–5 only and test on Generation 6. Does the model generalise to Pokémon it has never seen? This is a <em>distribution shift</em> test.</p></div>
        </div>
      </div>
      <Callout title="Reproduce everything">
        Every number on this page comes from <code>ml/build.py</code>, which trains every model and writes the JSON this site reads. The arena runs
        the exported boosting trees directly in your browser: the same {guide.model.gbm.trees.length} trees scikit-learn trained.
      </Callout>
      <Code label="Run it locally" code={`
git clone ${REPO}.git && cd PokemonML
uv venv .venv && uv pip install -r ml/requirements.txt
.venv/Scripts/python.exe ml/build.py      # trains, evaluates, exports the JSON for the site
jupyter lab notebooks/pokemon_battle_ml.ipynb   # or open the notebook in Colab
cd web && npm install && npm run dev       # the interactive guide`} />

      <div className="block" id="credits">
        <h3>Credits</h3>
        <div className="grid-2">
          <div className="card">
            <h4>Created by</h4>
            <p style={{ margin: 0 }}><strong>Juan Barahona</strong>: guide, analysis, notebook and arena.{' '}
              <a href="https://github.com/elmandalorian-thx" target="_blank" rel="noreferrer">github.com/elmandalorian-thx</a> ·{' '}
              <a href={REPO} target="_blank" rel="noreferrer">source code</a></p>
          </div>
          <div className="card">
            <h4>Data · Kaggle</h4>
            <p style={{ margin: 0 }}><a href={KAGGLE} target="_blank" rel="noreferrer">Pokemon – Weedle’s Cave</a> (the “Pokemon Challenge”) by{' '}
              <strong>T7 – Hackathon Challenge</strong> (terminus7), published on <strong>Kaggle</strong> under CC0: Public Domain. This whole project is built on
              their dataset and challenge. Thank you.</p>
          </div>
          <div className="card">
            <h4>Method · the book</h4>
            <p style={{ margin: 0 }}>Aurélien Géron, <em>Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow</em>, 3rd edition (O’Reilly, 2022),
              ISBN 978-1-098-12597-4. The workflow and the notebook's chapter references follow this book.</p>
          </div>
          <div className="card">
            <h4>Related reading</h4>
            <p style={{ margin: 0 }}>Diego Rosa, <a href="https://towardsdatascience.com/your-favorite-game-from-a-different-point-of-view-93732173adf7/" target="_blank" rel="noreferrer">“Your
              favorite game from a different point of view”</a>, <em>Towards Data Science</em> (Aug 2020): an exploratory analysis of the same Kaggle dataset
              that also finds Speed is king, derives features from the game's damage formula, and picks a data-driven Gen-1 team. (We tested its
              damage ÷ HP feature: our edge features already capture it, so accuracy didn't change.)</p>
          </div>
          <div className="card">
            <h4>Artwork & cries</h4>
            <p style={{ margin: 0 }}>Hot-linked from the open <a href="https://github.com/PokeAPI" target="_blank" rel="noreferrer">PokeAPI</a> sprites and cries repositories.
              Pokémon and all related names are trademarks of Nintendo, Game Freak and The Pokémon Company. This is an educational, non-commercial project.</p>
          </div>
        </div>
      </div>
    </Chapter>
  )
}
