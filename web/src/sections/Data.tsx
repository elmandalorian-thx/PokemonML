import { useMemo, useState } from 'react'
import { Legend, Radar } from '../components/charts'
import { Art, Callout, Chapter, Code, Types } from '../components/ui'
import { playCry } from '../lib/assets'
import { byName, fmt, getPokemon, guide, pct, STAT_MEANS, STAT_SHORT } from '../lib/data'
import type { Pokemon } from '../lib/types'

const FILES = [
  { name: 'pokemon.csv', rows: guide.counts.pokemon, cols: '#, Name, Type 1, Type 2, HP, Attack, Defense, Sp. Atk, Sp. Def, Speed, Generation, Legendary', role: 'The features: one row per Pokémon.' },
  { name: 'combats.csv', rows: guide.counts.battles, cols: 'First_pokemon, Second_pokemon, Winner', role: 'The labels: who fought whom, and who won.' },
  { name: 'tests.csv', rows: guide.counts.tests, cols: 'First_pokemon, Second_pokemon', role: 'The Kaggle exam: matchups with no winner given.' },
]

const ISSUES = [
  { title: 'One Pokémon has no name', detail: <>Row <code>#63</code> is blank. Its stats (65 / 105 / 60 / 60 / 70 / 95, Fighting, Gen 1) match <strong>Primeape</strong> exactly, so we fill it in. Never drop a row you can repair.</> },
  { title: `${guide.counts.missingType2} “missing” Type 2 values`, detail: <>They aren't missing. Those Pokémon simply <em>have one type</em>. Treating this as missing data and imputing it would invent information. <strong>Know what a blank means before you fill it.</strong></> },
  { title: `${guide.counts.neverFought} Pokémon never fought`, detail: <>They have no win rate at all. Any feature built from battle history would be undefined for them, which is a small preview of the <strong>cold-start problem</strong>.</> },
  { title: `${fmt(guide.noise.repeatedPairs)} matchups happen more than once`, detail: <>…and in <strong>{guide.noise.inconsistent}</strong> of them the winner changes between meetings. The battles contain randomness, so no model can be 100% right.</> },
  { title: '“#” is not the Pokédex number', detail: <>It's a row id. Mega forms have their own rows, so <code>#7</code> is Charizard but the Pokédex says #6. We map names to PokeAPI ids to fetch the artwork and cries you see here.</> },
]

export function Data() {
  const [q, setQ] = useState('')
  const [sort, setSort] = useState<'id' | 'total' | 'spe' | 'win'>('id')
  const [selected, setSelected] = useState<Pokemon>(byName('Garchomp'))
  const list = useMemo(() => {
    const s = q.trim().toLowerCase()
    const f = guide.pokemon.filter((p) => !s || p.name.toLowerCase().includes(s) || p.types.some((t) => t.toLowerCase() === s))
    const key = { id: (p: Pokemon) => p.id, total: (p: Pokemon) => -p.total, spe: (p: Pokemon) => -p.stats[5], win: (p: Pokemon) => -(p.winRate ?? -1) }[sort]
    return [...f].sort((a, b) => key(a) - key(b))
  }, [q, sort])

  return (
    <Chapter id="data" num="02" title="Meet the data"
      kicker="Three CSV files. Most of the work in real ML happens here, in understanding what each column actually means.">
      <div className="grid-3">
        {FILES.map((f) => (
          <div className="card" key={f.name}>
            <div className="mono" style={{ fontSize: 14, fontWeight: 700 }}>{f.name}</div>
            <div style={{ fontSize: 28, fontWeight: 650, margin: '4px 0' }}>{fmt(f.rows)} <span className="muted" style={{ fontSize: 14, fontWeight: 400 }}>rows</span></div>
            <p style={{ marginBottom: 8 }}>{f.role}</p>
            <div className="mono muted" style={{ fontSize: 12, lineHeight: 1.5 }}>{f.cols}</div>
          </div>
        ))}
      </div>

      <div className="block">
        <h3>A peek at <code>combats.csv</code></h3>
        <p>Each row is just three ids. The model's job is to learn what it is about the winner's row in <code>pokemon.csv</code> that made it win.</p>
        <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="data-table" style={{ margin: 0 }}>
            <thead><tr><th>First_pokemon</th><th>Second_pokemon</th><th>Winner</th></tr></thead>
            <tbody>{guide.sampleBattles.slice(0, 5).map((b, i) => {
              const [A, B] = [getPokemon(b.a), getPokemon(b.b)]
              const cell = (p: Pokemon) => <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Art p={p} size={32} kind="small" /><span className="mono">{p.id}</span> {p.name}</span>
              return <tr key={i}><td>{cell(A)}</td><td>{cell(B)}</td><td><strong>{cell(getPokemon(b.winner))}</strong></td></tr>
            })}</tbody>
          </table>
        </div>
      </div>

      <div className="block">
        <h3>The Pokédex, as a dataset</h3>
        <p>Every Pokémon is one row of features. Click one to see its stats and its real battle record. Click the artwork to hear its cry.</p>
        <div className="grid-2" style={{ gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', alignItems: 'start' }}>
          <div className="card" style={{ padding: 16 }}>
            <div className="controls">
              <div style={{ flex: '1 1 200px' }}><input type="search" placeholder="Search name or type (e.g. dragon)…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search Pokémon" /></div>
              <div className="seg" role="group" aria-label="Sort">
                {([['id', '#'], ['total', 'Total'], ['spe', 'Speed'], ['win', 'Win rate']] as const).map(([k, l]) => (
                  <button key={k} aria-pressed={sort === k} onClick={() => setSort(k)}>{l}</button>
                ))}
              </div>
            </div>
            <div className="muted" style={{ fontSize: 13, marginBottom: 8 }}>{list.length} Pokémon</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', gap: 4, maxHeight: 420, overflowY: 'auto' }}>
              {list.map((p) => (
                <button key={p.id} onClick={() => setSelected(p)} title={p.name}
                  style={{ border: 0, borderRadius: 10, padding: '4px 2px', cursor: 'pointer', background: p.id === selected.id ? 'var(--surface-2)' : 'transparent',
                    outline: p.id === selected.id ? '2px solid var(--accent)' : undefined, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Art p={p} size={56} kind="small" />
                  <span style={{ fontSize: 10.5, lineHeight: 1.2, color: 'var(--text-secondary)', textAlign: 'center', maxWidth: 72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
                </button>
              ))}
            </div>
          </div>
          <PokemonDetail p={selected} />
        </div>
      </div>

      <div className="block">
        <h3>Data quality: five things worth noticing</h3>
        <div style={{ display: 'grid', gap: 10 }}>
          {ISSUES.map((it, i) => (
            <div key={i} className="card" style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: 12, padding: '16px 20px' }}>
              <span className="mono" style={{ color: 'var(--accent)', fontWeight: 700 }}>{String(i + 1).padStart(2, '0')}</span>
              <div><h4>{it.title}</h4><p style={{ margin: 0 }}>{it.detail}</p></div>
            </div>
          ))}
        </div>
      </div>
      <Callout kind="pitfall" title="Missing ≠ unknown">
        Before you reach for <code>fillna()</code>, ask why the value is blank. “No second type”, “not measured”, and “typo” are
        three very different things, and each needs a different fix.
      </Callout>
      <Code code={`
import pandas as pd

pokemon = pd.read_csv("pokemon.csv").set_index("#")
combats = pd.read_csv("combats.csv")

pokemon.isna().sum()          # Name: 1, Type 2: 386
pokemon.loc[63, "Name"] = "Primeape"            # identified by its stats
pokemon["Type 2"] = pokemon["Type 2"].fillna("")  # "no second type", not missing

# First_pokemon wins only ${pct(guide.counts.firstWins)} of the time: is position meaningful?
(combats.Winner == combats.First_pokemon).mean()`} />
    </Chapter>
  )
}

function PokemonDetail({ p }: { p: Pokemon }) {
  return (
    <div className="card" style={{ position: 'sticky', top: 70 }}>
      <button onClick={() => playCry(p.apiId)} title={`Play ${p.name}'s cry`} aria-label={`Play ${p.name}'s cry`}
        style={{ border: 0, background: 'var(--surface-2)', borderRadius: 12, width: '100%', cursor: 'pointer', display: 'flex', justifyContent: 'center', padding: 8, position: 'relative' }}>
        <Art p={p} size={180} />
        <span style={{ position: 'absolute', right: 10, bottom: 8, fontSize: 12 }} className="muted">🔊 cry</span>
      </button>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', margin: '12px 0 4px', gap: 8 }}>
        <h4 style={{ fontSize: 20, margin: 0 }}>{p.name}</h4>
        <span className="mono muted" style={{ fontSize: 12 }}>#{p.id} · Gen {p.gen}{p.legendary ? ' · Legendary' : ''}</span>
      </div>
      <Types types={p.types} />
      <div style={{ margin: '10px 0 4px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Radar size={250} max={Math.max(150, Math.ceil(Math.max(...p.stats) / 50) * 50)} axes={STAT_SHORT}
          axisNote={(i) => String(p.stats[i])}
          series={[
            { key: 'avg', label: 'Average Pokémon', color: 'var(--text-muted)', values: STAT_MEANS, outline: true },
            { key: 'p', label: p.name, color: 'var(--series-1)', values: p.stats },
          ]} />
        <Legend items={[{ label: p.name, color: 'var(--series-1)' }, { label: 'Average Pokémon', color: 'var(--text-muted)', line: true }]} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, borderTop: '1px solid var(--grid)', paddingTop: 10 }}>
        <span className="muted">Total {p.total}</span>
        {p.games ? <span><strong>{pct(p.winRate!)}</strong> <span className="muted">won · {p.wins}/{p.games} battles</span></span> : <span className="muted">Never fought</span>}
      </div>
    </div>
  )
}
