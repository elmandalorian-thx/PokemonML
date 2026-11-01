import { sprite } from '../lib/assets'
import { Art, Callout, Chapter, Code, StatTile } from '../components/ui'
import { byName, fmt, guide, pct } from '../lib/data'
import { predictAll } from '../lib/model'

const gbmAcc = guide.models.find((m) => m.key === 'gbm')!.accuracy
const fasterRule = guide.higherStatWins.find((s) => s.stat === 'Speed')!.rate

export function Hero() {
  const [a, b, c] = [byName('Charizard'), byName('Gengar'), byName('Pikachu')]
  return (
    <>
      <header className="hero">
        <div>
          <span className="eyebrow">A machine learning walkthrough · Kaggle “Pokémon Challenge”</span>
          <h1>Who wins?<br />Teaching a model to call Pokémon battles.</h1>
          <p className="hero-lede">
            {fmt(guide.counts.battles)} recorded battles between {fmt(guide.counts.pokemon)} Pokémon, and one question:
            given two of them, can a machine predict the winner? This guide walks the whole workflow, from framing the
            problem to cleaning, exploring, feature engineering, baselines, models and evaluation, and then puts the
            trained model in the arena so you can test it yourself.
          </p>
          <p style={{ fontSize: 14, marginTop: -4 }}>
            By <a href="https://github.com/elmandalorian-thx" target="_blank" rel="noreferrer"><strong>Juan Barahona</strong></a> ·
            Data: <a href="https://www.kaggle.com/datasets/terminus7/pokemon-challenge" target="_blank" rel="noreferrer">Kaggle “Pokemon – Weedle’s Cave”</a> by
            T7 – Hackathon Challenge (CC0) · Method: Géron, <em>Hands-On Machine Learning</em> (3rd ed.)
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 24, flexWrap: 'wrap' }}>
            <a className="btn btn-primary" href="#problem" style={{ textDecoration: 'none' }}>Start the walkthrough</a>
            <a className="btn" href="#arena" style={{ textDecoration: 'none' }}>Skip to the arena →</a>
            <a className="btn" href="#notebook" style={{ textDecoration: 'none' }}>Notebook & data</a>
          </div>
        </div>
        <div className="hero-art" aria-hidden>
          <img src={sprite.art(a.apiId)} alt="" style={{ left: '0%', top: '4%' }} />
          <img src={sprite.art(b.apiId)} alt="" style={{ right: '0%', top: '26%', transform: 'scaleX(-1)' }} />
          <img src={sprite.art(c.apiId)} alt="" style={{ left: '24%', bottom: '0%', width: '44%' }} />
        </div>
      </header>
      <div className="grid-4">
        <StatTile label="Pokémon" value={fmt(guide.counts.pokemon)} note="6 generations, incl. Mega forms" />
        <StatTile label="Recorded battles" value={fmt(guide.counts.battles)} note="our training signal" />
        <StatTile label="Faster Pokémon wins" value={pct(fasterRule)} note="one rule, no ML" />
        <StatTile label="Best model, unseen battles" value={pct(gbmAcc)} note="gradient boosting" />
      </div>
    </>
  )
}

export function Problem() {
  const [a, b] = [byName('Charizard'), byName('Squirtle')]
  const p = predictAll(a, b).gbm.p
  return (
    <Chapter id="problem" num="01" title="Frame the problem"
      kicker="Before touching data, say exactly what goes in, what comes out, and how you'll know it worked.">
      <div className="card" style={{ padding: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1.1fr', gap: 18, alignItems: 'center' }} className="frame-diagram">
          <div style={{ textAlign: 'center' }}>
            <Art p={a} size={110} />
            <div className="mono muted" style={{ fontSize: 12 }}>{a.name} · stats + types</div>
          </div>
          <span className="mono muted">+</span>
          <div style={{ textAlign: 'center' }}>
            <Art p={b} size={110} flip />
            <div className="mono muted" style={{ fontSize: 12 }}>{b.name} · stats + types</div>
          </div>
          <span className="mono muted">→</span>
          <div className="card" style={{ background: 'var(--surface-2)', boxShadow: 'none' }}>
            <div className="mono" style={{ fontSize: 12, color: 'var(--accent)' }}>model(A, B)</div>
            <div style={{ fontSize: 26, fontWeight: 700 }}>P({a.name} wins) = {p.toFixed(2)}</div>
            <div className="muted" style={{ fontSize: 13 }}>a probability between 0 and 1</div>
          </div>
        </div>
      </div>
      <div className="grid-3 block">
        <div className="card"><h4>Task type</h4><p><strong>Supervised binary classification.</strong> Every past battle is a labelled example: two inputs and a known answer (“did A win?”). The model learns the mapping from examples.</p></div>
        <div className="card"><h4>Target (y)</h4><p><code>1</code> if the first Pokémon won, <code>0</code> if the second did. A probability output is more useful than a hard label: it says <em>how sure</em> the model is.</p></div>
        <div className="card"><h4>Success metric</h4><p><strong>Accuracy on battles the model never saw.</strong> We hold out 20% of battles ({fmt(guide.counts.test)}) and touch them only at the very end.</p></div>
      </div>
      <Callout title="Why hold data out?">
        A model graded on its own training data is a student who has memorised the answer key. The held-out
        <strong> test set</strong> simulates the future: new matchups the model has to reason about.
      </Callout>
      <Code code={`
from sklearn.model_selection import train_test_split

# 80% to learn from, 20% locked away for the final exam
idx_train, idx_test = train_test_split(
    range(len(combats)), test_size=0.2, random_state=42,
    stratify=y,   # keep the same win/loss balance in both parts
)`} />
    </Chapter>
  )
}
