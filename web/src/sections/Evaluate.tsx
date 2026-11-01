import { BarList, ChartFrame, LineChart, useWidth } from '../components/charts'
import { Callout, Chapter, Code, StatTile } from '../components/ui'
import { fmt, guide, pct } from '../lib/data'

const S1 = 'var(--series-1)', S2 = 'var(--series-2)', S3 = 'var(--series-3)'

export function Evaluate() {
  const dc = guide.depthCurve
  const best = dc.reduce((b, d) => (d.test > b.test ? d : b))
  const deepest = dc[dc.length - 1]
  const lc = guide.learningCurve
  const lk = guide.leakage
  const gbm = guide.models.find((m) => m.key === 'gbm')!
  const ceiling = guide.noise.inconsistent / guide.noise.repeatedPairs
  return (
    <Chapter id="evaluate" num="07" title="Evaluate honestly"
      kicker="A single accuracy number hides a lot. Here are the checks a careful practitioner runs before trusting a model.">

      <div className="block">
        <h3>Overfitting: when a model memorises instead of learning</h3>
        <p>Let a decision tree grow deeper and it fits the training battles better and better, until it reaches {pct(deepest.train, 0)}. But
          accuracy on <em>new</em> battles peaks at depth {best.depth} ({pct(best.test)}) and then <strong>falls</strong>. The extra depth
          is memorising noise: specific matchups and lucky wins that won't repeat.</p>
        <div className="card">
          <ChartFrame title="Decision tree depth vs. accuracy"
            sub="Train accuracy keeps rising, while test accuracy peaks and then falls."
            legend={<div className="legend"><span><i className="line" style={{ background: S1 }} />Train</span><span><i className="line" style={{ background: S2 }} />Test (unseen)</span></div>}
            table={{ columns: ['Depth', 'Train', 'Test'], rows: dc.map((d) => [d.unlimited ? `${d.depth} (unlimited)` : d.depth, pct(d.train, 2), pct(d.test, 2)]) }}>
            <LineChart yDomain={[0.92, 1]} xFormat={(v) => String(v)} yFormat={(v) => pct(v, 0)} xLabel="Max depth"
              markers={[{ x: best.depth, label: `best test: depth ${best.depth}` }]}
              series={[
                { key: 'train', label: 'Train', color: S1, points: dc.map((d) => ({ x: d.depth, y: d.train })) },
                { key: 'test', label: 'Test', color: S2, points: dc.map((d) => ({ x: d.depth, y: d.test })) },
              ]} />
          </ChartFrame>
        </div>
        <Callout kind="pitfall" title="The gap is the warning sign">
          Train accuracy far above test accuracy means overfitting. Our gradient boosting model scores {pct(gbm.trainAccuracy)} on train and {pct(gbm.accuracy)} on
          test, a small gap, which is healthy.
        </Callout>
      </div>

      <div className="block">
        <h3>Learning curve: would more data help?</h3>
        <p>Train each model on a growing slice of the battles and score it on the same test set. Gradient boosting climbs steadily but
          is already flattening out. Logistic regression is flat from the start: its problem is its shape, not a lack of data.</p>
        <div className="card">
          <ChartFrame title="Test accuracy vs. number of training battles"
            legend={<div className="legend"><span><i className="line" style={{ background: S1 }} />Gradient boosting</span><span><i className="line" style={{ background: S3 }} />Logistic regression</span></div>}
            table={{ columns: ['Training battles', 'Gradient boosting', 'Logistic regression'], rows: lc.map((d) => [fmt(d.n), pct(d.gbm, 2), pct(d.logreg, 2)]) }}>
            <LineChart logX yDomain={[0.84, 0.96]} xFormat={(v) => (v >= 1000 ? `${v / 1000}K` : String(v))} yFormat={(v) => pct(v, 0)} xLabel="Training battles (log scale)"
              series={[
                { key: 'gbm', label: 'Boosting', color: S1, points: lc.map((d) => ({ x: d.n, y: d.gbm })) },
                { key: 'lr', label: 'LogReg', color: S3, points: lc.map((d) => ({ x: d.n, y: d.logreg })) },
              ]} />
          </ChartFrame>
        </div>
        <Callout title="Bias vs. variance">
          A model that improves with more data is limited by <strong>variance</strong> (more examples help). One that stays flat is limited by <strong>bias</strong>:
          its assumptions are wrong, and you need better features or a different model. The learning curve tells you which fix to try.
        </Callout>
      </div>

      <div className="grid-2 block" style={{ alignItems: 'start' }}>
        <div className="card">
          <ChartFrame title="Confusion matrix · gradient boosting" sub={`${fmt(guide.counts.test)} held-out battles. Where are the mistakes?`}
            table={{ columns: ['', 'Predicted B wins', 'Predicted A wins'], rows: [['Actually B won', ...guide.confusion[0]], ['Actually A won', ...guide.confusion[1]]] }}>
            <Confusion />
          </ChartFrame>
        </div>
        <div className="card">
          <ChartFrame title="Calibration · can we trust the probabilities?" sub="When the model says 80%, does A win about 80% of the time?"
            legend={<div className="legend"><span><i className="line" style={{ background: S1 }} />Model</span><span><i className="line" style={{ background: 'var(--axis)' }} />Perfect calibration</span></div>}
            table={{ columns: ['Predicted', 'Actual', 'Battles'], rows: guide.calibration.map((c) => [pct(c.predicted), pct(c.actual), fmt(c.n)]) }}>
            <LineChart height={250} yDomain={[0, 1]} xFormat={(v) => pct(v, 0)} yFormat={(v) => pct(v, 0)} xLabel="Predicted P(A wins)"
              series={[
                { key: 'ideal', label: 'Perfect', color: 'var(--axis)', endLabel: false, points: guide.calibration.map((c) => ({ x: c.predicted, y: c.predicted })) },
                { key: 'model', label: 'Model', color: S1, points: guide.calibration.map((c) => ({ x: c.predicted, y: c.actual })) },
              ]} />
          </ChartFrame>
        </div>
      </div>

      <div className="grid-2 block" style={{ alignItems: 'start' }}>
        <div className="card">
          <ChartFrame title="Permutation importance" sub="Accuracy lost when one feature is shuffled into noise"
            table={{ columns: ['Feature', 'Accuracy drop'], rows: guide.importance.map((d) => [d.feature, pct(d.drop, 2)]) }}>
            <BarList labelWidth={130} format={(v) => `${(v * 100).toFixed(1)} pts`}
              items={guide.importance.map((d, i) => ({ label: d.feature, value: Math.max(0, d.drop), highlight: i === 0, note: `Shuffling ${d.feature} costs ${(d.drop * 100).toFixed(2)} points` }))} />
          </ChartFrame>
        </div>
        <div className="card">
          <ChartFrame title="Ablation · retrain with features removed" sub="Gradient boosting, test accuracy"
            table={{ columns: ['Feature set', 'Accuracy'], rows: guide.ablation.map((d) => [d.name, pct(d.accuracy, 2)]) }}>
            <BarList labelWidth={170} domain={[0.6, 1]} format={(v) => pct(v, 1)}
              items={guide.ablation.map((d) => ({ label: d.name, value: d.accuracy, highlight: d.name === 'All features except Speed', note: `${d.name}: ${pct(d.accuracy, 2)}` }))} />
          </ChartFrame>
        </div>
      </div>
      <p>Two ways of asking “what matters?” agree. Shuffle Speed and the model loses {(guide.importance[0].drop * 100).toFixed(0)} points.
        Remove it and retrain, and the best possible model with everything else falls to {pct(guide.ablation.find((a) => a.name.startsWith('All features except'))!.accuracy)}.
        <strong> Legendary status adds almost nothing once Speed is known</strong>, which settles the confounding question from chapter 03.</p>

      <div className="block">
        <h3>Leakage: the bug that makes you look brilliant</h3>
        <p>Suppose we add each Pokémon's overall win rate as a feature. Computed from <em>all</em> battles, that number quietly includes
          the outcomes of the test battles, so the model gets to peek at the answers. Computed honestly, from training battles only, the peek disappears.</p>
        <div className="grid-4">
          <StatTile label="Without win-rate feature" value={pct(lk.clean, 2)} />
          <StatTile label="Win rate from ALL battles" value={pct(lk.leaky, 2)} note="⚠ leaks test labels" />
          <StatTile label="Win rate from train only" value={pct(lk.honest, 2)} note="honest version" />
          <StatTile label="Split by matchup instead" value={pct(lk.groupSplit, 2)} note={`${fmt(lk.sharedPairsInTest)} test battles repeat a train matchup`} />
        </div>
        <Callout kind="pitfall" title="Small here, catastrophic elsewhere">
          The leak only adds {((lk.leaky - lk.honest) * 100).toFixed(2)} points because every Pokémon has around 128 battles, so one test result barely moves its win rate.
          With 5 battles per Pokémon it would be a large, fake jump. The rule is simple: <strong>nothing computed from the test set may feed a feature</strong>.
          We also checked that repeated matchups don't inflate the score. Splitting so a matchup never appears on both sides gives the same accuracy.
        </Callout>
      </div>

      <div className="block">
        <h3>How good could any model be?</h3>
        <div className="grid-3">
          <StatTile label="Matchups that repeat" value={fmt(guide.noise.repeatedPairs)} />
          <StatTile label="…with different winners" value={fmt(guide.noise.inconsistent)} note={`${pct(ceiling)} of repeats`} />
          <StatTile label="Our model's error rate" value={pct(1 - gbm.accuracy)} />
        </div>
        <Callout title="Irreducible error">
          Identical matchups don't always end the same way, so the battles include some randomness (critical hits, damage rolls). Some of
          our {pct(1 - gbm.accuracy)} error is that noise, and no model can remove it. Knowing the ceiling stops you from chasing the
          last fraction of a percent forever.
        </Callout>
      </div>
      <Code code={`
from sklearn.inspection import permutation_importance
from sklearn.model_selection import GroupShuffleSplit

# importance: shuffle one column at a time, measure the damage
pi = permutation_importance(gbm, X_test, y_test, n_repeats=5, scoring="accuracy")

# leakage check: keep every matchup entirely in train OR test
pair = np.minimum(a, b) * 1000 + np.maximum(a, b)
train_idx, test_idx = next(GroupShuffleSplit(test_size=0.2).split(X, y, groups=pair))`} />
    </Chapter>
  )
}

function Confusion() {
  const [ref, width] = useWidth<HTMLDivElement>()
  const cm = guide.confusion
  const total = cm.flat().reduce((a, b) => a + b, 0)
  const max = Math.max(...cm.flat())
  const lab = 96, top = 26, size = Math.min(130, (width - lab) / 2)
  const labels = ['B wins', 'A wins']
  return (
    <div ref={ref} className="chart">
      <svg width={width} height={top + size * 2 + 8}>
        <text x={lab + size} y={12} textAnchor="middle">Predicted</text>
        {labels.map((l, j) => <text key={l} x={lab + j * size + size / 2} y={top - 2} textAnchor="middle" className="label">{l}</text>)}
        {cm.map((row, i) => (
          <g key={i}>
            <text x={lab - 10} y={top + i * size + size / 2 + 4} textAnchor="end" className="label">Actual {labels[i]}</text>
            {row.map((v, j) => {
              const correct = i === j
              const t = v / max
              const dark = correct && t > 0.4
              return (
                <g key={j}>
                  <rect x={lab + j * size + 1} y={top + i * size + 1} width={size - 2} height={size - 2} rx={6}
                    fill={correct ? 'var(--seq-4)' : 'var(--seq-1)'} opacity={correct ? 0.35 + 0.65 * t : 1} />
                  <text x={lab + j * size + size / 2} y={top + i * size + size / 2} textAnchor="middle"
                    style={{ fontSize: 20, fontWeight: 650, fill: dark ? '#fff' : 'var(--text-primary)' }}>{fmt(v)}</text>
                  <text x={lab + j * size + size / 2} y={top + i * size + size / 2 + 18} textAnchor="middle"
                    style={{ fill: dark ? '#fff' : 'var(--text-secondary)' }}>{correct ? 'correct' : 'wrong'} · {pct(v / total)}</text>
                </g>
              )
            })}
          </g>
        ))}
      </svg>
    </div>
  )
}
