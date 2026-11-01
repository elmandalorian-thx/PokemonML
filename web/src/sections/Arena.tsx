import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { DivergingBars, Legend, Radar } from '../components/charts'
import { TownBackdrop } from '../components/TownBackdrop'
import { TreeDiagram } from '../components/TreeDiagram'
import { Art, Callout, Chapter, PokemonPicker, TYPE_COLORS, Types } from '../components/ui'
import { fallbackChain, playCry, sprite } from '../lib/assets'
import { byName, guide, headToHead, pct, STAT_SHORT } from '../lib/data'
import { featureLabel, predictAll } from '../lib/model'
import type { Pokemon } from '../lib/types'
import './arena.css'

type Side = 'A' | 'B'
type Phase = 'idle' | 'fighting' | 'done'

const PRESETS: { label: string; a: string; b: string; lesson: string }[] = [
  { label: 'Speed beats power', a: 'Pikachu', b: 'Dragonite', lesson: 'Pikachu has 280 fewer total stats but is faster.' },
  { label: 'Speed tie', a: 'Mewtwo', b: 'Jolteon', lesson: 'Both have 130 Speed, and ties go to the 2nd Pokémon. Now press Swap and fight again.' },
  { label: 'Speed isn’t everything', a: 'Electrode', b: 'Snorlax', lesson: 'Electrode is 110 Speed faster, but Snorlax is far too bulky.' },
  { label: 'Coin flip', a: 'Ninjask', b: 'Tyranitar', lesson: 'The model is genuinely unsure, so try “Roll the dice”.' },
  { label: 'Magikarp’s day', a: 'Magikarp', b: 'Shuckle', lesson: 'Even Magikarp wins if the other side is slower.' },
]

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))
const randomPokemon = () => guide.pokemon[Math.floor(Math.random() * guide.pokemon.length)]

export function Arena() {
  const [a, setA] = useState<Pokemon>(byName('Pikachu'))
  const [b, setB] = useState<Pokemon>(byName('Dragonite'))
  const [phase, setPhase] = useState<Phase>('idle')
  const [hp, setHp] = useState<[number, number]>([1, 1])
  const [fx, setFx] = useState<{ lunge?: Side; hit?: Side; fainted?: Side; winner?: Side }>({})
  const [narration, setNarration] = useState('Pick two Pokémon, then press Fight.')
  const [mode, setMode] = useState<'likely' | 'roll'>('likely')
  const [sound, setSound] = useState(true)
  const [lesson, setLesson] = useState<string | null>(PRESETS[0].lesson)
  const [outcome, setOutcome] = useState<{ winner: Side; upset: boolean } | null>(null)
  const [h2h, setH2h] = useState<Awaited<ReturnType<typeof headToHead>> | undefined>(undefined)
  const token = useRef(0)

  const pred = useMemo(() => predictAll(a, b), [a, b])
  const name = (s: Side) => (s === 'A' ? a.name : b.name)

  const reset = () => { token.current++; setPhase('idle'); setHp([1, 1]); setFx({}); setOutcome(null); setH2h(undefined); setNarration('Press Fight when ready.') }
  const choose = (na: Pokemon, nb: Pokemon, l: string | null = null) => { setA(na); setB(nb); setLesson(l); reset() }
  useEffect(() => () => { token.current++ }, [])

  async function fight() {
    const my = ++token.current
    const alive = () => token.current === my
    const pA = pred.gbm.p
    const aWins = mode === 'likely' ? pA >= 0.5 : Math.random() < pA
    const winner: Side = aWins ? 'A' : 'B'
    const loser: Side = aWins ? 'B' : 'A'
    setPhase('fighting'); setHp([1, 1]); setFx({}); setOutcome(null); setH2h(undefined)
    headToHead(a.id, b.id).then((r) => alive() && setH2h(r))

    setNarration(`${a.name} vs ${b.name}!`)
    if (sound) { playCry(a.apiId); await wait(900); if (!alive()) return; playCry(b.apiId) }
    await wait(900); if (!alive()) return

    const first: Side = a.stats[5] > b.stats[5] ? 'A' : 'B' // ties go to the 2nd Pokemon, as in the data
    setNarration(a.stats[5] === b.stats[5]
      ? `Speed tie at ${a.stats[5]}! ${b.name} moves first as the 2nd Pokémon.`
      : `${name(first)} is faster (${Math.max(a.stats[5], b.stats[5])} vs ${Math.min(a.stats[5], b.stats[5])}) and strikes first.`)
    await wait(1100); if (!alive()) return

    // Decorative choreography: the loser drops in 3 hits; the winner keeps HP in line with the model's confidence.
    const conf = aWins ? pA : 1 - pA
    const keep = Math.min(0.9, Math.max(0.08, (conf - 0.5) * 1.8))
    const loserSteps = [0.6 + Math.random() * 0.1, 0.25 + Math.random() * 0.1, 0]
    const winnerHits = first === loser ? 3 : 2
    let lHit = 0, wHit = 0, attacker = first
    const cur: [number, number] = [1, 1]
    while (true) {
      const target: Side = attacker === 'A' ? 'B' : 'A'
      setFx({ lunge: attacker }); await wait(220); if (!alive()) return
      setFx({ hit: target })
      const ti = target === 'A' ? 0 : 1
      if (target === loser) cur[ti] = loserSteps[lHit++]
      else cur[ti] = 1 - ((1 - keep) * ++wHit) / winnerHits
      setHp([cur[0], cur[1]])
      await wait(520); if (!alive()) return
      setFx({})
      if (target === loser && cur[ti] === 0) break
      attacker = target
      await wait(160)
    }
    setFx({ fainted: loser, winner })
    const upset = (winner === 'A') !== (pA >= 0.5)
    setOutcome({ winner, upset })
    setNarration(`${name(loser)} fainted. ${name(winner)} wins!`)
    if (sound) playCry(winner === 'A' ? a.apiId : b.apiId)
    setPhase('done')
  }

  const tint: CSSProperties = { ['--tint-a' as string]: TYPE_COLORS[a.types[0]], ['--tint-b' as string]: TYPE_COLORS[b.types[0]] }
  const pA = pred.gbm.p

  return (
    <Chapter id="arena" num="08" title="The arena"
      kicker="Pick two Pokémon and press Fight. The trained model calls the winner, then shows its reasoning and what really happened in the dataset.">
      <div className="card" style={{ padding: 20 }}>
        <div className="arena-pickers">
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}><PokemonPicker label="First Pokémon (A)" value={a} onChange={(p) => choose(p, b)} /></div>
            <button className="btn" onClick={() => choose(randomPokemon(), b)} title="Random" aria-label="Random first Pokémon">🎲</button>
          </div>
          <button className="btn" onClick={() => choose(b, a, lesson)} title="Swap order">⇄ Swap</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}><PokemonPicker label="Second Pokémon (B)" value={b} onChange={(p) => choose(a, p)} /></div>
            <button className="btn" onClick={() => choose(a, randomPokemon())} title="Random" aria-label="Random second Pokémon">🎲</button>
          </div>
        </div>
        <div className="chips" style={{ marginTop: 12 }}>
          <span className="muted" style={{ fontSize: 13, alignSelf: 'center' }}>Try:</span>
          {PRESETS.map((p) => (
            <button key={p.label} className="chip" onClick={() => choose(byName(p.a), byName(p.b), p.lesson)}>
              <Art p={byName(p.a)} size={22} kind="small" />{p.label}
            </button>
          ))}
        </div>
        {lesson && <div className="muted" style={{ fontSize: 14, marginTop: 10 }}>💡 {lesson}</div>}

        <div className="stage" style={{ ...tint, marginTop: 16 }}>
          <TownBackdrop />
          <Fighter p={a} side="A" hp={hp[0]} fx={fx} />
          <div className="vs">
            <div className="vs-badge">VS</div>
            <button className="btn btn-primary fight-btn" onClick={phase === 'done' ? reset : fight} disabled={phase === 'fighting'}>
              {phase === 'idle' ? 'Fight!' : phase === 'fighting' ? 'Fighting…' : 'Reset'}
            </button>
            <div style={{ marginTop: 12, display: 'grid', gap: 8, justifyItems: 'center' }}>
              <div className="seg" role="group" aria-label="Outcome mode">
                <button aria-pressed={mode === 'likely'} onClick={() => setMode('likely')} title="Winner = the model's most likely outcome">Most likely</button>
                <button aria-pressed={mode === 'roll'} onClick={() => setMode('roll')} title="Sample the winner using the model's probability">Roll the dice</button>
              </div>
              <button className="btn" style={{ fontSize: 12.5, padding: '4px 10px' }} onClick={() => setSound((s) => !s)} aria-pressed={sound}>
                {sound ? '🔊 Cries on' : '🔇 Cries off'}
              </button>
            </div>
          </div>
          <Fighter p={b} side="B" hp={hp[1]} fx={fx} />
        </div>
        <div className="narration" aria-live="polite">{narration}</div>
        <p className="muted" style={{ fontSize: 13, textAlign: 'center', margin: '4px auto 0' }}>
          The animation is just for show: the model doesn't simulate moves. It only outputs P(A wins). “Roll the dice” samples from
          that probability, so upsets happen as often as the model expects them to.
        </p>
      </div>

      {phase === 'done' && outcome && <Verdict a={a} b={b} pred={pred} outcome={outcome} h2h={h2h} />}
      {phase !== 'done' && (
        <div className="card block" style={{ textAlign: 'center' }}>
          <span className="muted">The model's verdict, its reasoning and the real battle record appear here after the fight.</span>
        </div>
      )}
      <Callout kind="try" title="Things to test">
        Swap A and B in a speed tie and watch the prediction flip. Pit a Legendary against a faster non-legendary. Find a pair that
        never met in the dataset: the model still makes a confident call, because it learned <em>rules</em>, not a lookup table.
        That's generalisation. Current call: P({a.name} wins) = {pct(pA)}.
      </Callout>
    </Chapter>
  )
}

function Fighter({ p, side, hp, fx }: { p: Pokemon; side: Side; hp: number; fx: { lunge?: Side; hit?: Side; fainted?: Side; winner?: Side } }) {
  const [zoom, setZoom] = useState(1.6)
  const cls = ['fighter',
    fx.lunge === side ? (side === 'A' ? 'lunge-right' : 'lunge-left') : '',
    fx.hit === side ? 'hit' : '', fx.fainted === side ? 'fainted' : '', fx.winner === side ? 'winner' : ''].join(' ')
  const color = hp > 0.5 ? 'var(--good)' : hp > 0.2 ? 'var(--warning)' : 'var(--critical)'
  return (
    <div className={cls}>
      <div className="spot">
        <img key={p.apiId} src={sprite.animated(p.apiId)} alt={p.name}
          style={{ ['--flip' as string]: side === 'A' ? -1 : 1, ['--zoom' as string]: zoom, imageRendering: 'pixelated', maxHeight: 180 } as CSSProperties}
          onLoad={(e) => setZoom(Math.min(2, Math.max(1, 110 / e.currentTarget.naturalHeight)))}
          onError={fallbackChain(sprite.art(p.apiId))} />
      </div>
      <div className="plate">
        <div className="name"><span>{p.name}</span><span className="mono muted" style={{ fontSize: 11 }}>{side === 'A' ? '1st' : '2nd'}</span></div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
          <Types types={p.types} /><span className="muted tabular" style={{ fontSize: 12 }}>Spe {p.stats[5]}</span>
        </div>
        <div className="hp" role="progressbar" aria-label={`${p.name} HP`} aria-valuenow={Math.round(hp * 100)}><div style={{ width: `${hp * 100}%`, background: color }} /></div>
      </div>
    </div>
  )
}

function Verdict({ a, b, pred, outcome, h2h }: {
  a: Pokemon; b: Pokemon; pred: ReturnType<typeof predictAll>; outcome: { winner: Side; upset: boolean }
  h2h: Awaited<ReturnType<typeof headToHead>> | undefined
}) {
  const pA = pred.gbm.p
  const call = pA >= 0.5 ? a : b
  const conf = Math.max(pA, 1 - pA)
  const models = [
    { name: 'Gradient boosting', p: pred.gbm.p, acc: guide.models[2].accuracy },
    { name: 'Decision tree (depth 3)', p: pred.tree.p, acc: guide.models[1].accuracy },
    { name: 'Logistic regression', p: pred.logreg.p, acc: guide.models[0].accuracy },
  ]
  const contrib = [...pred.logreg.contributions].sort((x, y) => Math.abs(y.value) - Math.abs(x.value)).slice(0, 6)
    .map((c) => ({ label: featureLabel(c.key), value: c.value }))
  const actualCall = h2h && h2h.meetings ? (h2h.winsA > h2h.winsB ? 'A' : h2h.winsB > h2h.winsA ? 'B' : null) : null
  return (
    <div className="block" style={{ display: 'grid', gap: 20 }}>
      <div className="grid-2">
        <div className="card">
          <div className="muted" style={{ fontSize: 13 }}>The model's call (gradient boosting)</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '6px 0 10px' }}>
            <Art p={call} size={64} />
            <div>
              <div style={{ fontSize: 26, fontWeight: 750, lineHeight: 1.1 }}>{call.name} wins</div>
              <div className="muted">{pct(conf)} confident{conf < 0.6 ? ' · a near coin-flip' : conf > 0.95 ? ' · very sure' : ''}</div>
            </div>
          </div>
          {outcome.upset && <div style={{ fontSize: 14 }}>🎲 <strong>Upset!</strong> You rolled the dice and the {pct(1 - conf, 0)} outcome happened. Low-probability events still occur, and a good model expects that.</div>}
          <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
            {models.map((m) => (
              <div key={m.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span><strong>{m.name}</strong></span><span className="muted">{pct(m.acc)} accurate overall</span>
                </div>
                <div className="seg-bar" aria-label={`${m.name}: ${a.name} ${pct(m.p)}, ${b.name} ${pct(1 - m.p)}`}>
                  <div style={{ flexBasis: `${m.p * 100}%`, background: 'var(--series-1)' }}>{m.p > 0.18 ? `${a.name} ${pct(m.p, 0)}` : ''}</div>
                  <div style={{ flexBasis: `${(1 - m.p) * 100}%`, background: 'var(--series-2)' }}>{1 - m.p > 0.18 ? `${pct(1 - m.p, 0)} ${b.name}` : ''}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="legend" style={{ marginTop: 10, marginBottom: 0 }}>
            <span><i style={{ background: 'var(--series-1)' }} />{a.name} (A)</span><span><i style={{ background: 'var(--series-2)' }} />{b.name} (B)</span>
          </div>
        </div>
        <div className="card">
          <div className="muted" style={{ fontSize: 13 }}>Ground truth: what the dataset recorded</div>
          {h2h === undefined ? <p style={{ marginTop: 8 }}>Loading battle log…</p> : h2h === null ? (
            <>
              <div style={{ fontSize: 22, fontWeight: 700, margin: '6px 0' }}>These two never met</div>
              <p>Of {guide.counts.battles.toLocaleString()} battles, none was {a.name} vs {b.name}. This is a <strong>genuine prediction</strong> about
                an unseen matchup, which is exactly what the model is for.</p>
            </>
          ) : (
            <>
              <div style={{ fontSize: 22, fontWeight: 700, margin: '6px 0' }}>Met {h2h.meetings}× · {a.name} won {h2h.winsA}, {b.name} won {h2h.winsB}</div>
              <p>{actualCall === null ? 'A split record, so even reality was undecided.'
                : (actualCall === 'A') === (pA >= 0.5) ? <>✓ The model's call <strong>matches</strong> the recorded result.</>
                  : <>✗ The model's call <strong>disagrees</strong> with the record. This is one of the ~{pct(1 - guide.models[2].accuracy, 0)} it gets wrong (or noise in the battle).</>}
                {' '}Note: if this battle was in the training set, the model has seen it before. Agreement here is less impressive than on unseen pairs.</p>
            </>
          )}
          <div style={{ marginTop: 14 }}>
            <div className="muted" style={{ fontSize: 13, marginBottom: 4 }}>Stat matchup ({a.name} · {b.name})</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Radar size={290} max={Math.max(150, Math.ceil(Math.max(...a.stats, ...b.stats) / 50) * 50)} axes={STAT_SHORT}
                axisNote={(i) => `${a.stats[i]} · ${b.stats[i]}`}
                series={[
                  { key: 'A', label: a.name, color: 'var(--series-1)', values: a.stats },
                  { key: 'B', label: b.name, color: 'var(--series-2)', values: b.stats },
                ]} />
              <Legend items={[{ label: `A · ${a.name}`, color: 'var(--series-1)' }, { label: `B · ${b.name}`, color: 'var(--series-2)' }]} />
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="chart-title">How the decision tree reasoned</div>
        <div className="chart-sub">The highlighted path is the series of questions this matchup answered.</div>
        <TreeDiagram path={pred.tree.path} />
      </div>
      <div className="card">
        <div className="chart-title">What pushed the prediction (logistic regression)</div>
        <div className="chart-sub">Each feature's contribution to the log-odds, the six largest. A local explanation of one prediction.
          {(pred.logreg.p >= 0.5) !== (pred.gbm.p >= 0.5) && <> <strong>Note that logistic regression disagrees with the other two models here.</strong> That's its “straight line vs. step” weakness from chapter 06.</>}</div>
        <DivergingBars items={contrib} format={(v) => (v > 0 ? '+' : '') + v.toFixed(2)} leftLabel={`favors ${b.name}`} rightLabel={`favors ${a.name}`} />
      </div>
    </div>
  )
}
