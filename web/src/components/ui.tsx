import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { fallbackChain, sprite } from '../lib/assets'
import { guide, STAT_SHORT } from '../lib/data'
import type { Pokemon } from '../lib/types'

export function Chapter({ id, num, title, kicker, children }: {
  id: string; num: string; title: string; kicker: string; children: ReactNode
}) {
  return (
    <section className="chapter" id={id}>
      <header className="chapter-head">
        <span className="chapter-num">{num}</span>
        <h2>{title}</h2>
        <p className="chapter-kicker">{kicker}</p>
      </header>
      {children}
    </section>
  )
}

const CALLOUT_TAG = { concept: 'ML concept', pitfall: '⚠ Pitfall', result: '✓ Result', try: 'Try it' }

export function Callout({ kind = 'concept', title, children }: {
  kind?: keyof typeof CALLOUT_TAG; title?: string; children: ReactNode
}) {
  return (
    <aside className={`callout ${kind}`}>
      <div className="callout-tag">{CALLOUT_TAG[kind]}{title && <span style={{ textTransform: 'none', letterSpacing: 0 }}>· {title}</span>}</div>
      <p>{children}</p>
    </aside>
  )
}

/** Collapsible Python snippet; lines starting with # render as comments. */
export function Code({ label = 'Show the Python', code }: { label?: string; code: string }) {
  return (
    <details className="code">
      <summary>{label}</summary>
      <pre>{code.trim().split('\n').map((line, i) => (
        <div key={i} className={line.trimStart().startsWith('#') ? 'c' : undefined}>{line || ' '}</div>
      ))}</pre>
    </details>
  )
}

export function StatTile({ label, value, note }: { label: string; value: ReactNode; note?: ReactNode }) {
  return (
    <div className="tile">
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      {note && <div className="tile-note">{note}</div>}
    </div>
  )
}

export const TYPE_COLORS: Record<string, string> = {
  Normal: '#A8A77A', Fire: '#EE8130', Water: '#6390F0', Electric: '#F7D02C', Grass: '#7AC74C', Ice: '#96D9D6',
  Fighting: '#C22E28', Poison: '#A33EA1', Ground: '#E2BF65', Flying: '#A98FF3', Psychic: '#F95587', Bug: '#A6B91A',
  Rock: '#B6A136', Ghost: '#735797', Dragon: '#6F35FC', Dark: '#705746', Steel: '#B7B7CE', Fairy: '#D685AD',
}
const DARK_TEXT = new Set(['Normal', 'Electric', 'Grass', 'Ice', 'Ground', 'Flying', 'Bug', 'Rock', 'Steel', 'Fairy', 'Fire', 'Water', 'Psychic'])

export function TypeBadge({ type }: { type: string }) {
  return (
    <span className="type" style={{ background: TYPE_COLORS[type], color: DARK_TEXT.has(type) ? '#111' : '#fff' }}>{type}</span>
  )
}
export const Types = ({ types }: { types: string[] }) => (
  <span className="types">{types.map((t) => <TypeBadge key={t} type={t} />)}</span>
)

export function Art({ p, size, kind = 'art', flip, className }: {
  p: Pokemon; size: number; kind?: 'art' | 'small' | 'animated'; flip?: boolean; className?: string
}) {
  const chain = kind === 'animated' ? [sprite.art(p.apiId), sprite.small(p.apiId)] : kind === 'art' ? [sprite.small(p.apiId)] : []
  return (
    <img src={sprite[kind](p.apiId)} alt={p.name} width={size} height={size} loading="lazy"
      className={`${kind === 'small' ? 'pixel' : ''} ${className ?? ''}`}
      style={{ objectFit: 'contain', transform: flip ? 'scaleX(-1)' : undefined }}
      onError={fallbackChain(...chain)} />
  )
}

export function StatBars({ p, highlight }: { p: Pokemon; highlight?: number }) {
  return (
    <div style={{ display: 'grid', gap: 4 }}>
      {p.stats.map((s, i) => (
        <div className="statbar" key={i}>
          <span className="muted" style={i === highlight ? { color: 'var(--text-primary)', fontWeight: 700 } : undefined}>{STAT_SHORT[i]}</span>
          <div className="track"><div className="fill" style={{ width: `${Math.min(100, (s / 180) * 100)}%`, background: i === highlight ? 'var(--series-1)' : 'var(--axis)' }} /></div>
          <span className="tabular" style={{ textAlign: 'right' }}>{s}</span>
        </div>
      ))}
    </div>
  )
}

/** Searchable Pokemon combobox. */
export function PokemonPicker({ value, onChange, label }: { value: Pokemon; onChange: (p: Pokemon) => void; label: string }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const box = useRef<HTMLDivElement>(null)
  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    const list = s ? guide.pokemon.filter((p) => p.name.toLowerCase().includes(s) || p.types.some((t) => t.toLowerCase() === s)) : guide.pokemon
    return list.slice(0, 60)
  }, [q])
  useEffect(() => {
    const close = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  const pick = (p: Pokemon) => { onChange(p); setOpen(false); setQ('') }
  return (
    <div ref={box} style={{ position: 'relative' }}>
      <label className="sr-only" htmlFor={`pick-${label}`}>{label}</label>
      <input id={`pick-${label}`} type="search" role="combobox" aria-expanded={open} autoComplete="off"
        placeholder={`${value.name} — search name or type…`} value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0) }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
          if (e.key === 'Enter' && results[active]) pick(results[active])
          if (e.key === 'Escape') setOpen(false)
        }} />
      {open && (
        <ul role="listbox" style={{
          position: 'absolute', zIndex: 30, left: 0, right: 0, top: '100%', marginTop: 6, maxHeight: 320, overflowY: 'auto',
          listStyle: 'none', padding: 4, background: 'var(--surface-1)', border: '1px solid var(--border)', borderRadius: 12,
          boxShadow: '0 12px 32px rgba(0,0,0,.18)',
        }}>
          {results.map((p, i) => (
            <li key={p.id} role="option" aria-selected={i === active}
              onMouseDown={(e) => { e.preventDefault(); pick(p) }} onMouseEnter={() => setActive(i)}
              style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '4px 8px', borderRadius: 8, cursor: 'pointer',
                background: i === active ? 'var(--surface-2)' : undefined }}>
              <Art p={p} size={36} kind="small" />
              <span style={{ fontSize: 14, fontWeight: 600 }}>{p.name}</span>
              <span style={{ marginLeft: 'auto' }}><Types types={p.types} /></span>
            </li>
          ))}
          {!results.length && <li className="muted" style={{ padding: 10, fontSize: 14 }}>No match</li>}
        </ul>
      )}
    </div>
  )
}
