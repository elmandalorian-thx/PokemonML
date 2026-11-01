/**
 * Decorative village scene behind the arena fighters. Original artwork built from simple shapes;
 * every color is a CSS variable (see arena.css) so light mode is a sunny day and dark mode is dusk.
 */
const HOUSES = [
  { x: 70, w: 92, h: 58, roof: 'var(--roof-1)' },
  { x: 205, w: 74, h: 48, roof: 'var(--roof-2)' },
  { x: 700, w: 84, h: 54, roof: 'var(--roof-3)' },
  { x: 838, w: 100, h: 62, roof: 'var(--roof-4)' },
]
const TREES = [[30, 1], [180, 0.8], [300, 1.1], [355, 0.75], [640, 0.9], [675, 1.15], [800, 0.8], [965, 1]] as const
const STARS = [[90, 30], [210, 62], [330, 22], [470, 48], [560, 18], [690, 40], [790, 70], [905, 26], [140, 90], [610, 86]] as const
const GROUND = 238

function House({ x, w, h, roof }: (typeof HOUSES)[number]) {
  const top = GROUND - h
  const peak = top - w * 0.42
  return (
    <g>
      <rect x={x + w * 0.66} y={peak + 6} width={10} height={top - peak} fill="var(--wall-shade)" />
      <rect x={x} y={top} width={w} height={h} rx={2} fill="var(--wall)" />
      <rect x={x} y={top} width={w} height={6} fill="var(--wall-shade)" />
      <polygon points={`${x - 8},${top + 2} ${x + w / 2},${peak} ${x + w + 8},${top + 2}`} fill={roof} />
      <rect x={x + w / 2 - 9} y={GROUND - 26} width={18} height={26} rx={2} fill="var(--door)" />
      <rect className="win" x={x + 10} y={top + 14} width={16} height={14} rx={2} />
      <rect className="win" x={x + w - 26} y={top + 14} width={16} height={14} rx={2} />
    </g>
  )
}

function Tree({ x, s }: { x: number; s: number }) {
  return (
    <g transform={`translate(${x} ${GROUND}) scale(${s})`}>
      <rect x={-4} y={-26} width={8} height={26} fill="var(--trunk)" />
      <circle cx={0} cy={-46} r={24} fill="var(--leaf)" />
      <circle cx={-12} cy={-36} r={15} fill="var(--leaf-dark)" />
    </g>
  )
}

function Cloud({ x, y, s }: { x: number; y: number; s: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="var(--cloud)">
      <ellipse cx={0} cy={0} rx={38} ry={13} />
      <circle cx={-12} cy={-8} r={14} />
      <circle cx={10} cy={-12} r={18} />
    </g>
  )
}

export function TownBackdrop() {
  return (
    <svg className="town" viewBox="0 0 1000 340" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="town-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--sky-top)' }} />
          <stop offset="1" style={{ stopColor: 'var(--sky-bottom)' }} />
        </linearGradient>
      </defs>
      <rect width={1000} height={340} fill="url(#town-sky)" />
      <g className="stars">{STARS.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.6} />)}</g>
      <circle cx={845} cy={70} r={30} fill="var(--sun)" className="sun" />
      <g className="clouds">
        <Cloud x={160} y={70} s={1} />
        <Cloud x={520} y={46} s={0.75} />
        <Cloud x={740} y={110} s={0.6} />
      </g>
      <path d={`M0 ${GROUND - 40} Q 160 ${GROUND - 110} 330 ${GROUND - 50} T 660 ${GROUND - 60} T 1000 ${GROUND - 70} V 340 H 0 Z`} fill="var(--hill-far)" />
      <path d={`M0 ${GROUND - 14} Q 250 ${GROUND - 64} 500 ${GROUND - 22} T 1000 ${GROUND - 30} V 340 H 0 Z`} fill="var(--hill-near)" />
      {TREES.map(([x, s]) => <Tree key={x} x={x} s={s} />)}
      {HOUSES.map((h) => <House key={h.x} {...h} />)}
      <rect y={GROUND} width={1000} height={340 - GROUND} fill="var(--grass)" />
      <g stroke="var(--fence)" strokeWidth={3} strokeLinecap="round">
        <line x1={0} y1={GROUND + 6} x2={360} y2={GROUND + 6} />
        <line x1={640} y1={GROUND + 6} x2={1000} y2={GROUND + 6} />
        {Array.from({ length: 22 }, (_, i) => (i < 11 ? 12 + i * 33 : 652 + (i - 11) * 33)).map((x) => (
          <line key={x} x1={x} y1={GROUND - 4} x2={x} y2={GROUND + 14} />
        ))}
      </g>
      <path d={`M440 ${GROUND} Q 500 ${GROUND + 40} 470 340 H 530 Q 560 ${GROUND + 40} 560 ${GROUND} Z`} fill="var(--path)" />
      <ellipse cx={500} cy={302} rx={430} ry={34} fill="var(--path)" />
      <ellipse cx={500} cy={302} rx={410} ry={26} fill="none" stroke="var(--path-line)" strokeWidth={2} strokeDasharray="10 8" />
    </svg>
  )
}
