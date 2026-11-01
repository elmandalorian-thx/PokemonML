import { useState } from 'react'
import { useWidth } from '../components/charts'
import { Art, Callout, Chapter, Code, PokemonPicker, StatTile, Types } from '../components/ui'
import { byName, guide, pct } from '../lib/data'
import { offense, pairFeatures } from '../lib/model'

const EXPLAIN: Record<string, string> = {
  d_hp: 'A.HP − B.HP', d_atk: 'A.Attack − B.Attack', d_def: 'A.Defense − B.Defense', d_spa: 'A.SpAtk − B.SpAtk',
  d_spd: 'A.SpDef − B.SpDef', d_spe: 'A.Speed − B.Speed', d_total: 'sum of all six, A − B',
  d_legendary: '1 if only A is legendary, −1 if only B', type_adv: 'log₂(A’s best hit on B) − log₂(B’s best hit on A)',
  atk_edge: 'log(A.Atk / B.Def) − log(B.Atk / A.Def)', spa_edge: 'log(A.SpA / B.SpD) − log(B.SpA / A.SpD)',
}

export function Features() {
  const [a, setA] = useState(byName('Pikachu'))
  const [b, setB] = useState(byName('Gyarados'))
  const x = pairFeatures(a, b)
  const aug = guide.augmentation
  return (
    <Chapter id="features" num="04" title="Engineer the features"
      kicker="A model can't read “Pikachu vs Gyarados”. It reads numbers. Feature engineering is how we turn a matchup into a row of numbers.">
      <p>The key idea is that a battle is about the <em>relationship</em> between two Pokémon, not either one alone, so every feature
        compares A against B. A positive number means “A has the edge”. Pick any two and watch the feature vector change:</p>

      <div className="card block">
        <div className="grid-2" style={{ gap: 16 }}>
          <PokemonPicker label="Pokémon A" value={a} onChange={setA} />
          <PokemonPicker label="Pokémon B" value={b} onChange={setB} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', margin: '14px 0' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><Art p={a} size={72} /><div><b>{a.name}</b><br /><Types types={a.types} /></div></div>
          <span className="mono muted">vs</span>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'flex-end', textAlign: 'right' }}><div><b>{b.name}</b><br /><Types types={b.types} /></div><Art p={b} size={72} flip /></div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Feature</th><th>How it's computed</th><th className="num">Value</th><th>Favors</th></tr></thead>
            <tbody>{guide.features.map((f) => {
              const v = x[f.key]
              return (
                <tr key={f.key} style={f.key === 'd_spe' ? { background: 'var(--surface-2)' } : undefined}>
                  <td><b>{f.label}</b></td><td className="mono muted" style={{ fontSize: 12 }}>{EXPLAIN[f.key]}</td>
                  <td className="num">{Number.isInteger(v) ? v : v.toFixed(2)}</td>
                  <td>{Math.abs(v) < 1e-9 ? <span className="muted">even</span> : <span>{v > 0 ? a.name : b.name}</span>}</td>
                </tr>
              )
            })}</tbody>
          </table>
        </div>
      </div>

      <div className="grid-2 block" style={{ alignItems: 'start' }}>
        <div>
          <h3>Domain knowledge as features</h3>
          <p><strong>Type advantage</strong> encodes game rules the raw CSV doesn't contain: Water beats Fire, Ground is immune to Electric,
            and so on. We take each side's best possible hit and compare them on a log scale, so 2× vs ½× is +2 and even is 0.</p>
          <p><strong>Physical and special edge</strong> use the fact that damage scales with <em>Attack ÷ Defense</em>, not
            Attack − Defense. A ratio feature puts that knowledge straight into the inputs.</p>
          <Callout title="Feature engineering beats model tuning">
            The most powerful lever in applied ML is usually giving the model the right inputs, not picking a fancier algorithm.
            In chapter 07 the physical edge comes out as the 2nd most useful feature, ahead of every raw stat but Speed.
          </Callout>
        </div>
        <TypeChart attacker={a.types} defender={b.types} offA={offense(a.types, b.types)} />
      </div>

      <div className="block">
        <h3>An experiment that failed (and why that's useful)</h3>
        <p>A tempting trick: since every battle has two sides, we can double the training data by adding each battle again with A and B
          swapped (features negated, label flipped). This is <strong>data augmentation</strong>, and it bakes in the assumption that
          battle order doesn't matter. We measured it:</p>
        <div className="grid-3">
          <StatTile label="Gradient boosting, original data" value={pct(aug.without)} />
          <StatTile label="…with swapped copies added" value={pct(aug.with)} note={`${((aug.without - aug.with) * 100).toFixed(1)} points worse`} />
          <StatTile label="Speed ties won by the 2nd Pokémon" value={pct(1 - guide.ties.firstWinsOnTies)} note="the rule augmentation erased" />
        </div>
        <Callout kind="pitfall" title="Augmentation is an assumption">
          Remember the tie quirk from chapter 03? Order <em>does</em> matter: ties always go to the second Pokémon. Mirroring every battle
          told the model the opposite, and it got worse. Only augment with transformations you know leave the label unchanged, then
          measure, because a sensible-sounding idea can still hurt.
        </Callout>
      </div>
      <Code code={`
def pair_features(pokemon, a_ids, b_ids):
    A, B = pokemon.loc[a_ids], pokemon.loc[b_ids]
    f = pd.DataFrame()
    for stat in ["HP", "Attack", "Defense", "Sp. Atk", "Sp. Def", "Speed"]:
        f[f"d_{stat}"] = A[stat].values - B[stat].values      # A minus B
    f["d_legendary"] = A.Legendary.astype(int).values - B.Legendary.astype(int).values
    f["type_adv"] = log2(best_hit(A, B)) - log2(best_hit(B, A))
    f["atk_edge"] = log(A.Attack / B.Defense) - log(B.Attack / A.Defense)
    return f

X = pair_features(pokemon, combats.First_pokemon, combats.Second_pokemon)
y = (combats.Winner == combats.First_pokemon).astype(int)`} />
    </Chapter>
  )
}

/** 18x18 type effectiveness heatmap, diverging around 1x. The current matchup is highlighted. */
function TypeChart({ attacker, defender, offA }: { attacker: string[]; defender: string[]; offA: number }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const { types, matrix } = guide.typeChart
  const [hover, setHover] = useState<[number, number] | null>(null)
  const lab = 64, cell = Math.max(10, Math.floor((width - lab) / types.length))
  const fill = (m: number) => (m === 0 ? 'var(--div-pos)' : m < 1 ? 'var(--div-pos-soft)' : m > 1 ? 'var(--div-neg)' : 'var(--div-mid)')
  const glyph = (m: number) => (m === 0 ? '0' : m < 1 ? '½' : m > 1 ? '2' : '')
  return (
    <div className="card">
      <div className="chart-title">Type effectiveness chart</div>
      <div className="chart-sub">Rows attack, columns defend. Highlighted: {attacker.join('/')} attacking {defender.join('/')} → best hit <b>{offA}×</b>.</div>
      <div className="legend">
        {[['Super effective 2×', 'var(--div-neg)'], ['Normal 1×', 'var(--div-mid)'], ['Resisted ½×', 'var(--div-pos-soft)'], ['Immune 0×', 'var(--div-pos)']].map(([l, c]) => (
          <span key={l}><i style={{ background: c, outline: '1px solid var(--border)' }} />{l}</span>
        ))}
      </div>
      <div ref={ref} className="chart" style={{ position: 'relative' }}>
        <svg width={width} height={lab + cell * types.length} onMouseLeave={() => setHover(null)}>
          {types.map((t, j) => (
            <text key={t} transform={`translate(${lab + j * cell + cell / 2 + 3},${lab - 4}) rotate(-60)`} style={{ fontSize: 10, fill: defender.includes(t) ? 'var(--text-primary)' : undefined, fontWeight: defender.includes(t) ? 700 : 400 }}>{t}</text>
          ))}
          {types.map((t, i) => (
            <g key={t}>
              <text x={lab - 4} y={lab + i * cell + cell / 2 + 3.5} textAnchor="end" style={{ fontSize: 10, fill: attacker.includes(t) ? 'var(--text-primary)' : undefined, fontWeight: attacker.includes(t) ? 700 : 400 }}>{t}</text>
              {types.map((u, j) => {
                const m = matrix[i][j]
                const on = attacker.includes(t) && defender.includes(u)
                return (
                  <g key={u} onMouseEnter={() => setHover([i, j])}>
                    <rect x={lab + j * cell + 1} y={lab + i * cell + 1} width={cell - 2} height={cell - 2} rx={2} fill={fill(m)}
                      stroke={on ? 'var(--text-primary)' : 'none'} strokeWidth={2}
                      opacity={attacker.includes(t) || defender.includes(u) ? 1 : 0.55} />
                    {cell >= 16 && glyph(m) && <text x={lab + j * cell + cell / 2} y={lab + i * cell + cell / 2 + 3.5} textAnchor="middle"
                      style={{ fontSize: 9, fill: m === 0 || m > 1 ? '#fff' : 'var(--text-primary)', pointerEvents: 'none' }}>{glyph(m)}</text>}
                  </g>
                )
              })}
            </g>
          ))}
        </svg>
        {hover && (
          <div className="tooltip" style={{ left: lab + hover[1] * cell + cell / 2, top: lab + hover[0] * cell }}>
            {types[hover[0]]} → {types[hover[1]]}: <b>{matrix[hover[0]][hover[1]]}×</b>
          </div>
        )}
      </div>
    </div>
  )
}

