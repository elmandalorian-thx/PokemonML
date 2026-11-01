import { useMemo, useState } from 'react'
import { BarList, ChartFrame, Legend, linear, Radar, ticks, Tooltip, useWidth } from '../components/charts'
import { Art, Callout, Chapter, Code, StatTile, TypeBadge } from '../components/ui'
import { fmt, guide, pct, STAT_MEANS, STAT_NAMES, STAT_SHORT } from '../lib/data'
import type { Pokemon } from '../lib/types'

const fought = guide.pokemon.filter((p) => p.winRate !== null)
const STAT_OPTIONS = [...STAT_NAMES, 'Total']
const statOf = (p: Pokemon, s: string) => (s === 'Total' ? p.total : p.stats[STAT_NAMES.indexOf(s)])

export function Explore() {
  const [stat, setStat] = useState('Speed')
  const corr = guide.correlation.find((c) => c.stat === stat)!.r
  const hsw = [...guide.higherStatWins].sort((a, b) => b.rate - a.rate)
  const lw = guide.legendaryWinRate
  return (
    <Chapter id="explore" num="03" title="Explore before you model"
      kicker="Exploratory data analysis (EDA) is where you form hypotheses. Here, one chart tells us most of the story.">
      <div className="card block">
        <ChartFrame
          title="Which stat decides battles?"
          sub="Share of battles won by the Pokémon with the higher value of each stat (ties excluded). The axis starts at 50%, a coin flip."
          table={{ columns: ['Stat', 'Higher stat wins', 'Ties'], rows: hsw.map((s) => [s.stat, pct(s.rate), pct(s.ties)]) }}>
          <BarList labelWidth={110} domain={[0.5, 1]} format={(v) => pct(v, 0)}
            items={hsw.map((s) => ({ label: s.stat, value: s.rate, highlight: s.stat === 'Speed', note: `${s.stat}: higher wins ${pct(s.rate)} · ${pct(s.ties)} of battles tied` }))} />
        </ChartFrame>
      </div>
      <Callout kind="result" title="The headline finding">
        The faster Pokémon wins <strong>{pct(guide.higherStatWins.find((s) => s.stat === 'Speed')!.rate)}</strong> of battles.
        Total stats, the obvious “power level”, manages only {pct(guide.higherStatWins.find((s) => s.stat === 'Total')!.rate)}.
        The simulator that generated these battles clearly lets the faster Pokémon strike first, and striking first is usually decisive.
      </Callout>

      <div className="card block">
        <div className="controls" style={{ justifyContent: 'space-between' }}>
          <div>
            <div className="chart-title">Win rate vs. {stat}</div>
            <div className="chart-sub" style={{ margin: 0 }}>{fmt(fought.length)} Pokémon, each dot one Pokémon's share of battles won · correlation <strong className="tabular">r = {corr.toFixed(2)}</strong></div>
          </div>
          <div className="seg" role="group" aria-label="Stat on x axis">
            {STAT_OPTIONS.map((s) => <button key={s} aria-pressed={stat === s} onClick={() => setStat(s)}>{s}</button>)}
          </div>
        </div>
        <Scatter stat={stat} />
      </div>
      <p>Switch between stats. Speed is nearly a straight line: almost every slow Pokémon loses almost every battle. Attack and Sp. Atk
        show a trend but with a wide spread, and Defense barely matters at all.</p>

      <div className="grid-3 block">
        <StatTile label="Legendary win rate" value={pct(lw['True'])} note={`vs ${pct(lw['False'])} for non-legendary`} />
        <StatTile label="First Pokémon wins" value={pct(guide.counts.firstWins)} note="position seems to matter a little" />
        <StatTile label="Speed ties won by the 1st" value={pct(guide.ties.firstWinsOnTies)} note={`all ${fmt(guide.ties.ties)} tied battles went to the 2nd`} />
      </div>
      <TypeShapes />
      <Callout kind="pitfall" title="Correlation, confounding">
        Legendaries win far more often, but they are also much faster on average. Is it “being legendary” or just Speed?
        A good model, plus the importance checks in chapter 07, can tell these apart. Raw EDA cannot.
      </Callout>
      <Callout title="Look at the edge cases">
        That last tile is a quirk you'd miss without looking: whenever Speed is tied, the <em>second</em> Pokémon wins every time.
        It explains why the first Pokémon wins only {pct(guide.counts.firstWins)} overall. Remember it, because it comes back to bite us in chapter 04.
      </Callout>
      <Code code={`
wins  = combats.Winner.value_counts()
games = pd.concat([combats.First_pokemon, combats.Second_pokemon]).value_counts()
pokemon["win_rate"] = wins / games

pokemon[["HP","Attack","Defense","Sp. Atk","Sp. Def","Speed","win_rate"]].corr()["win_rate"]
# Speed 0.94 · Attack 0.50 · Sp. Atk 0.48 · Sp. Def 0.32 · HP 0.26 · Defense 0.13`} />
    </Chapter>
  )
}

function Scatter({ stat }: { stat: string }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<Pokemon | null>(null)
  const height = 360, m = { l: 44, r: 16, t: 10, b: 36 }
  const xs = fought.map((p) => statOf(p, stat))
  const [x0, x1] = [Math.min(...xs) * 0.95, Math.max(...xs) * 1.02]
  const x = linear(x0, x1, m.l, width - m.r)
  const y = linear(0, 1, height - m.b, m.t)
  const groups = useMemo(() => [fought.filter((p) => !p.legendary), fought.filter((p) => p.legendary)], [])
  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const mx = e.clientX - r.left, my = e.clientY - r.top
    let best: Pokemon | null = null, bd = 400
    for (const p of fought) {
      const d = (x(statOf(p, stat)) - mx) ** 2 + (y(p.winRate!) - my) ** 2
      if (d < bd) { bd = d; best = p }
    }
    setHover(best)
  }
  return (
    <div ref={ref} className="chart" style={{ position: 'relative' }}>
      <Legend items={[{ label: 'Regular', color: 'var(--series-1)' }, { label: 'Legendary', color: 'var(--series-2)' }]} />
      <svg width={width} height={height} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label={`Scatter of win rate against ${stat}`}>
        {ticks(0, 1, 4).map((t) => (
          <g key={t}><line className="gridline" x1={m.l} x2={width - m.r} y1={y(t)} y2={y(t)} /><text x={m.l - 8} y={y(t) + 4} textAnchor="end">{pct(t, 0)}</text></g>
        ))}
        {ticks(x0, x1, 6).map((t) => <text key={t} x={x(t)} y={height - m.b + 18} textAnchor="middle">{t}</text>)}
        <text x={(m.l + width) / 2} y={height - 2} textAnchor="middle">{stat}</text>
        <line className="axisline" x1={m.l} x2={width - m.r} y1={height - m.b} y2={height - m.b} />
        {groups.map((g, gi) => g.map((p) => (
          <circle key={p.id} cx={x(statOf(p, stat))} cy={y(p.winRate!)} r={hover?.id === p.id ? 6 : 4}
            fill={gi ? 'var(--series-2)' : 'var(--series-1)'} fillOpacity={0.75} stroke="var(--surface-1)" strokeWidth={1.5} style={{ transition: 'cx .5s, r .15s' }} />
        )))}
        {hover && <circle cx={x(statOf(hover, stat))} cy={y(hover.winRate!)} r={7} fill="none" stroke="var(--text-primary)" strokeWidth={1.5} />}
      </svg>
      {hover && (
        <Tooltip x={x(statOf(hover, stat))} y={y(hover.winRate!)}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Art p={hover} size={40} kind="small" />
            <div><b>{hover.name}</b><div className="muted">{stat} {statOf(hover, stat)} · won {pct(hover.winRate!)}</div></div>
          </div>
        </Tooltip>
      )}
    </div>
  )
}

/* ------------------------------------------------------------ type profiles (small multiples) */

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const typeProfiles = guide.typeChart.types.map((type) => {
  const members = guide.pokemon.filter((p) => p.types.includes(type))
  const rated = members.filter((p) => p.winRate !== null)
  return {
    type, count: members.length,
    stats: STAT_NAMES.map((_, i) => mean(members.map((p) => p.stats[i]))),
    winRate: mean(rated.map((p) => p.winRate!)),
  }
}).sort((a, b) => b.winRate - a.winRate)

function pearson(x: number[], y: number[]) {
  const mx = mean(x), my = mean(y)
  const cov = x.reduce((s, xi, i) => s + (xi - mx) * (y[i] - my), 0)
  return cov / Math.sqrt(x.reduce((s, xi) => s + (xi - mx) ** 2, 0) * y.reduce((s, yi) => s + (yi - my) ** 2, 0))
}
const typeSpeedR = pearson(typeProfiles.map((t) => t.stats[5]), typeProfiles.map((t) => t.winRate))
const radarMax = Math.ceil(Math.max(...typeProfiles.flatMap((t) => t.stats)) / 10) * 10

function TypeShapes() {
  const best = typeProfiles[0], worst = typeProfiles[typeProfiles.length - 1]
  return (
    <div className="block">
      <h3>Every type has a shape</h3>
      <p>Average the six stats of every Pokémon of a type and draw them as a radar chart: Fighting leans on Attack, Psychic on the special stats,
        Steel and Rock on Defense. Sorted by win rate, a pattern jumps out. The types that win most ({best.type}, {typeProfiles[1].type}, {typeProfiles[2].type})
        have Speed spikes; the types that lose most ({worst.type}, {typeProfiles[typeProfiles.length - 2].type}) are slow. Across the 18 types, average Speed
        and win rate correlate at <strong>r = {typeSpeedR.toFixed(2)}</strong>.</p>
      <div className="card">
        <Legend items={[{ label: 'Type average', color: 'var(--series-1)' }, { label: 'All Pokémon average', color: 'var(--text-muted)', line: true }]} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px 8px' }}>
          {typeProfiles.map((t, i) => (
            <div key={t.type} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 }}>
                <span className="mono muted">{i + 1}</span><TypeBadge type={t.type} />
              </div>
              <div className="muted tabular" style={{ fontSize: 12 }}>wins {pct(t.winRate, 0)} · Spe {Math.round(t.stats[5])}</div>
              <Radar compact size={150} max={radarMax} axes={STAT_SHORT}
                series={[
                  { key: 'all', label: 'All Pokémon', color: 'var(--text-muted)', values: STAT_MEANS, outline: true },
                  { key: t.type, label: t.type, color: 'var(--series-1)', values: t.stats },
                ]} />
            </div>
          ))}
        </div>
        <details className="table-view">
          <summary>View as table</summary>
          <table className="data-table">
            <thead><tr><th>Type</th><th className="num">Pokémon</th><th className="num">Win rate</th>{STAT_SHORT.map((s) => <th key={s} className="num">{s}</th>)}</tr></thead>
            <tbody>{typeProfiles.map((t) => (
              <tr key={t.type}><td>{t.type}</td><td className="num">{t.count}</td><td className="num">{pct(t.winRate)}</td>
                {t.stats.map((v, i) => <td key={i} className="num">{v.toFixed(0)}</td>)}</tr>
            ))}</tbody>
          </table>
        </details>
      </div>
      <p className="muted" style={{ fontSize: 14 }}>Idea from Diego Rosa's exploratory analysis of the same dataset (see Credits). Dual-type Pokémon count toward both of their types.</p>
    </div>
  )
}
