import { guide, pct } from '../lib/data'
import { featureLabel } from '../lib/model'
import { useWidth } from './charts'

const nodes = guide.model.tree
const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })

function rule(f: string, t: number) {
  if (f === 'd_spe' && Math.abs(t) < 1) return 'A not faster than B'
  return `${featureLabel(f)} ≤ ${Math.abs(t) < 10 ? t.toFixed(2) : Math.round(t)}`
}

/** Lays the depth-3 tree out top-down; leaves spread evenly. Highlights `path` (node indices). */
export function TreeDiagram({ path = [] }: { path?: number[] }) {
  const [ref, measured] = useWidth<HTMLDivElement>()
  const width = Math.max(measured, 760) // scroll sideways on narrow screens rather than squash
  const pos = new Map<number, { x: number; depth: number }>()
  let leaf = 0
  const leaves = nodes.filter((n) => n.l === -1).length
  const walk = (i: number, depth: number): number => {
    const n = nodes[i]
    const x = n.l === -1 ? (leaf++ + 0.5) / leaves : (walk(n.l, depth + 1) + walk(n.r, depth + 1)) / 2
    pos.set(i, { x, depth })
    return x
  }
  walk(0, 0)
  const maxDepth = Math.max(...[...pos.values()].map((p) => p.depth))
  const rowH = 92, boxW = Math.min(150, width / leaves - 8), boxH = 54
  const X = (i: number) => pos.get(i)!.x * width
  const Y = (i: number) => pos.get(i)!.depth * rowH + 4
  const on = new Set(path)
  return (
    <div ref={ref} className="chart" style={{ overflowX: 'auto' }}>
      <svg width={width} height={(maxDepth + 1) * rowH} role="img" aria-label="Decision tree diagram">
        {nodes.map((n, i) => n.l === -1 ? null : [n.l, n.r].map((c, k) => (
          <g key={`${i}-${c}`}>
            <path d={`M${X(i)},${Y(i) + boxH}C${X(i)},${Y(i) + boxH + 22} ${X(c)},${Y(c) - 22} ${X(c)},${Y(c)}`} fill="none"
              stroke={on.has(i) && on.has(c) ? 'var(--text-primary)' : 'var(--axis)'} strokeWidth={on.has(i) && on.has(c) ? 2.5 : 1.25} />
            <text x={(X(i) + X(c)) / 2 + (k ? 6 : -6)} y={Y(i) + boxH + 20} textAnchor={k ? 'start' : 'end'} style={{ fontSize: 11 }}>{k ? 'no' : 'yes'}</text>
          </g>
        )))}
        {nodes.map((n, i) => {
          const isLeaf = n.l === -1
          const p = n.p!
          const active = on.has(i)
          return (
            <g key={i} transform={`translate(${X(i) - boxW / 2},${Y(i)})`} opacity={path.length && !active ? 0.45 : 1}>
              <rect width={boxW} height={boxH} rx={10} fill="var(--surface-1)" stroke={active ? 'var(--text-primary)' : 'var(--border)'} strokeWidth={active ? 2 : 1} />
              <text x={10} y={20} style={{ fontSize: 11.5, fill: 'var(--text-primary)', fontWeight: 600 }}>
                {isLeaf ? (p >= 0.5 ? 'Predict: A wins' : 'Predict: B wins') : rule(n.f!, n.t!)}
              </text>
              <rect x={10} y={30} width={boxW - 20} height={6} rx={3} fill="var(--series-2)" />
              <rect x={10} y={30} width={(boxW - 20) * p} height={6} rx={3} fill="var(--series-1)" />
              <text x={10} y={49} style={{ fontSize: 10.5 }}>P(A) {pct(p, 0)} · {compact.format(n.n!)} battles</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
