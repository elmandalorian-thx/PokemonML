import { Callout, Chapter, Code, StatTile } from '../components/ui'
import { fmt, guide, pct } from '../lib/data'

const LESSONS = [
  ['Frame it first', 'Inputs, output, metric, and a held-out test set before any code.'],
  ['Understand every column', 'A blank Type 2 isn’t missing data. Row #63 could be repaired, not dropped.'],
  ['Explore to find the story', 'One bar chart revealed that Speed decides 94% of battles.'],
  ['Beat a baseline', `A one-line rule scores ${pct(guide.baselines[guide.baselines.length - 1].accuracy)}. Without it, 88% would look like success.`],
  ['Fit the model to the shape', 'Steps need trees, or a step feature for linear models.'],
  ['Test your assumptions', 'Mirroring battles sounded smart and cost 1.4 points.'],
  ['Watch the train/test gap', 'Deeper trees memorised noise and got worse on new battles.'],
  ['Guard against leakage', 'Nothing from the test set may touch the features.'],
]

export function Wrap() {
  const t = guide.testPredictions
  return (
    <Chapter id="wrap" num="09" title="Takeaways & next steps"
      kicker="The Kaggle deliverable, what this dataset teaches, and where to take it next.">
      <div className="grid-3">
        <StatTile label="Matchups in tests.csv" value={fmt(t.count)} note="no winners given: the exam" />
        <StatTile label="Predicted wins for the 1st Pokémon" value={pct(t.firstWins / t.count)} note="close to the 47% seen in training" />
        <StatTile label="Predictions above 90% confidence" value={pct(t.confident / t.count)} note="most matchups aren’t close" />
      </div>
      <p style={{ marginTop: 16 }}>
        <a className="btn btn-primary" href={`${import.meta.env.BASE_URL}data/submission.csv`} download style={{ textDecoration: 'none' }}>Download submission.csv</a>
        <span className="muted" style={{ fontSize: 14, marginLeft: 12 }}>First_pokemon, Second_pokemon, Winner, predicted by gradient boosting</span>
      </p>

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

      <div className="block">
        <h3>Exercises to try yourself</h3>
        <div className="grid-2">
          <div className="card"><h4>1 · Beat 95%</h4><p>Add an “is faster” flag and a “speed tie” flag to the boosting model. Then try <code>HistGradientBoostingClassifier</code> with tuned depth and learning rate, using cross-validation, not the test set.</p></div>
          <div className="card"><h4>2 · Simulate the simulator</h4><p>Write a tiny battle engine (faster attacks first, damage ∝ Attack ÷ Defense) and compare its accuracy to the ML models. Can a hand-written rule match learned ones?</p></div>
          <div className="card"><h4>3 · Explain with SHAP</h4><p>Install <code>shap</code> and compute per-battle explanations for the boosting model. Do they agree with the logistic regression contributions in the arena?</p></div>
          <div className="card"><h4>4 · Break it on purpose</h4><p>Train on Generations 1–5 only and test on Generation 6. Does the model generalise to Pokémon it has never seen? This is a <em>distribution shift</em> test.</p></div>
        </div>
      </div>
      <Callout title="Reproduce everything">
        Every number on this page comes from <code>ml/build.py</code>. It downloads nothing, trains every model, and writes the JSON this site reads.
        The arena runs the exported boosting trees directly in your browser, the same {guide.model.gbm.trees.length} trees scikit-learn trained.
      </Callout>
      <Code label="Run the pipeline" code={`
# from the project root
uv venv .venv && uv pip install pandas scikit-learn
.venv/Scripts/python.exe ml/build.py      # trains, evaluates, exports JSON + submission.csv
cd web && npm install && npm run dev       # open the guide`} />
      <footer className="muted" style={{ fontSize: 13, marginTop: 48 }}>
        Data: Kaggle “Pokemon Challenge” (terminus7). Artwork and cries hot-linked from the open PokeAPI sprites and cries repositories.
        Pokémon and all related names are trademarks of Nintendo, Game Freak and The Pokémon Company. This is an educational, non-commercial project.
      </footer>
    </Chapter>
  )
}
