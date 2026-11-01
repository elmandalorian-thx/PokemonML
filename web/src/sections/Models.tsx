import { BarList, ChartFrame, DivergingBars, Legend } from '../components/charts'
import { TreeDiagram } from '../components/TreeDiagram'
import { Callout, Chapter, Code, StatTile } from '../components/ui'
import { guide, pct } from '../lib/data'

const fasterTies = guide.baselines.find((b) => b.name.startsWith('Faster wins, ties'))!.accuracy
const BASELINE_LABEL: Record<string, string> = {
  'Always pick the 2nd Pokemon': 'Always pick the 2nd',
  'Coin flip': 'Coin flip',
  'Higher total stats wins': 'Higher total stats wins',
  'Legendary wins': 'Legendary wins',
  'Faster Pokemon wins': 'Faster wins',
  'Faster wins, ties go to the 2nd': 'Faster wins (ties → 2nd)',
}

export function Baselines() {
  const items = [...guide.baselines].sort((a, b) => b.accuracy - a.accuracy)
  return (
    <Chapter id="baselines" num="05" title="Set a baseline first"
      kicker="Before training anything, find out how well a dumb rule does. Every model has to beat it, or it isn't worth having.">
      <div className="card">
        <ChartFrame title="Accuracy of simple rules on the held-out battles" sub="No learning involved. Each is a one-line if-statement."
          table={{ columns: ['Rule', 'Accuracy'], rows: items.map((b) => [BASELINE_LABEL[b.name], pct(b.accuracy)]) }}>
          <BarList labelWidth={190} domain={[0.4, 1]} format={(v) => pct(v, 0)}
            items={items.map((b) => ({ label: BASELINE_LABEL[b.name], value: b.accuracy, highlight: b.accuracy === fasterTies, note: `${BASELINE_LABEL[b.name]}: ${pct(b.accuracy)}` }))} />
        </ChartFrame>
      </div>
      <Callout kind="result" title={`The bar to beat: ${pct(fasterTies)}`}>
        “Whoever is faster wins, and the second Pokémon wins ties” is right {pct(fasterTies)} of the time. That's an unusually strong
        baseline, so the real question for ML is whether it can find the remaining few percent. Without this number, a 90%-accurate
        model would sound impressive. With it, we know that model is <em>worse than an if-statement</em>.
      </Callout>
      <Code code={`
faster = X_test.d_spe > 0                      # is A faster than B?
baseline_pred = faster.astype(int)             # ties (d_spe == 0) -> predict B
(baseline_pred == y_test).mean()               # ${fasterTies.toFixed(3)}`} />
    </Chapter>
  )
}

export function Models() {
  const [lr, tree, gbm] = guide.models
  const step = guide.stepFeature
  const coefs = guide.features.map((f, i) => ({ label: f.label, value: guide.model.logreg.coef[i] }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
  const compare = [
    ...guide.models.map((m) => ({ label: m.name, value: m.accuracy, highlight: true, note: `${m.name}: ${pct(m.accuracy, 2)} test · ${pct(m.trainAccuracy, 2)} train` })),
    { label: 'Baseline: faster wins', value: fasterTies, highlight: false, note: `Baseline: ${pct(fasterTies, 2)}` },
  ].sort((a, b) => b.value - a.value)

  return (
    <Chapter id="models" num="06" title="Train three models"
      kicker="Three classic algorithms, from simple and transparent to powerful and opaque. Each one teaches something different.">

      <div className="block">
        <h3><span className="mono muted" style={{ fontSize: 15 }}>A ·</span> Logistic regression <span className="muted" style={{ fontWeight: 400 }}>· {pct(lr.accuracy)}</span></h3>
        <p>The simplest serious classifier. It gives each feature a weight, adds them up, and squashes the total into a probability.
          Its weights are readable: a positive weight means “more of this helps A”. But it scores <strong>{pct(lr.accuracy)}</strong>,
          which is <em>below the baseline</em>.</p>
        <div className="grid-2" style={{ alignItems: 'start' }}>
          <div className="card">
            <ChartFrame title="Learned weights (standardised features)" sub="Which way each feature pushes the prediction, and how hard"
              table={{ columns: ['Feature', 'Weight'], rows: coefs.map((c) => [c.label, c.value.toFixed(3)]) }}>
              <DivergingBars items={coefs} format={(v) => v.toFixed(2)} leftLabel="favors B" rightLabel="favors A" />
            </ChartFrame>
            <p style={{ fontSize: 14, marginTop: 12, marginBottom: 0 }}>Odd detail: <em>Defense diff</em> gets a negative weight, as if more defense hurt.
              It doesn't. Defense also appears inside Total and Physical edge, and with <strong>correlated features</strong> the weights share
              credit in strange ways. Read single coefficients with care.</p>
          </div>
          <div>
            <Callout kind="pitfall" title="Wrong shape, not wrong data">
              A linear model assumes a smooth slope: 10 more Speed is always worth the same bump in log-odds. But the battle rule is a
              <strong> step</strong>. Being faster by 1 point is as good as being faster by 50. A straight line can't draw a step.
            </Callout>
            <div className="grid-2" style={{ gap: 12 }}>
              <StatTile label="Logistic regression" value={pct(step.logreg)} />
              <StatTile label="+ one “is faster?” feature" value={pct(step.logregWithFaster)} note="same model, better input" />
            </div>
          </div>
        </div>
      </div>

      <div className="block">
        <h3><span className="mono muted" style={{ fontSize: 15 }}>B ·</span> Decision tree <span className="muted" style={{ fontWeight: 400 }}>· {pct(tree.accuracy)}</span></h3>
        <p>A tree asks yes/no questions, one after another. Thresholds are exactly the step-shaped rules this problem needs, so a tree
          <strong> rediscovers the Speed rule on its own</strong> as its very first question. This one is limited to 3 levels so a human can read it:</p>
        <div className="card"><TreeDiagram /></div>
        <Legend items={[{ label: 'share of training battles A won', color: 'var(--series-1)' }, { label: 'share B won', color: 'var(--series-2)' }]} />
      </div>

      <div className="block">
        <h3><span className="mono muted" style={{ fontSize: 15 }}>C ·</span> Gradient boosting <span className="muted" style={{ fontWeight: 400 }}>· {pct(gbm.accuracy)}</span></h3>
        <p><strong>{guide.model.gbm.trees.length} small trees, trained one after another</strong>, where each new tree focuses on the battles the
          previous ones got wrong. Their votes are added up. You lose the single readable diagram, but you gain accuracy: this is the
          only model that clearly beats the baseline. It's the model behind the arena in chapter 08.</p>
        <div className="card">
          <ChartFrame title="Test accuracy, all models vs. the baseline"
            sub="Held-out battles the models never trained on. Zoomed to 85–97% to show the differences."
            table={{ columns: ['Model', 'Test accuracy', 'Train accuracy', 'Log loss', 'AUC'], rows: [
              ...guide.models.map((m) => [m.name, pct(m.accuracy, 2), pct(m.trainAccuracy, 2), m.logLoss.toFixed(3), m.auc.toFixed(3)]),
              ['Baseline: faster wins', pct(fasterTies, 2), '—', '—', '—'],
            ] }}>
            <BarList labelWidth={200} domain={[0.85, 0.97]} format={(v) => pct(v, 1)} items={compare} />
          </ChartFrame>
        </div>
      </div>
      <Callout title="Which model should you use?">
        It depends on the job. To <em>explain</em> battles to a person, the 3-level tree is nearly as accurate as the best model and fits on one
        screen. To <em>win a leaderboard</em>, use boosting. And the logistic regression result shows why you should never judge an
        algorithm without checking that its assumptions fit the data.
      </Callout>
      <Code code={`
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import GradientBoostingClassifier

logreg = LogisticRegression(max_iter=2000).fit(scaler.transform(X_train), y_train)
tree   = DecisionTreeClassifier(max_depth=3).fit(X_train, y_train)
gbm    = GradientBoostingClassifier(n_estimators=200, max_depth=4,
                                    learning_rate=0.1, subsample=0.8).fit(X_train, y_train)

for m in (tree, gbm):
    print(type(m).__name__, m.score(X_test, y_test))`} />
    </Chapter>
  )
}
