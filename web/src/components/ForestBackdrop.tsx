/**
 * Decorative forest clearing behind the arena fighters. Original cartoon artwork built from simple shapes;
 * every color is a CSS variable (see arena.css) so light mode is a sunny day and dark mode is dusk.
 * Three tree layers (far treeline, middle row, big edge trees) get bigger and darker toward the viewer.
 */
const GROUND = 238

// far treeline: [x, scale]
const FAR = [[-10, 0.8], [30, 0.95], [72, 0.75], [110, 0.9], [150, 0.8], [190, 1], [232, 0.85], [272, 0.95], [312, 0.78],
  [352, 0.9], [392, 0.8], [430, 0.95], [470, 0.82], [510, 0.92], [550, 0.8], [590, 0.98], [630, 0.84], [670, 0.92],
  [710, 0.78], [750, 0.96], [790, 0.84], [830, 0.92], [870, 0.8], [910, 0.98], [950, 0.85], [990, 0.9]] as const
// middle row: [x, scale, kind]
const MID = [[60, 1.05, 'round'], [130, 1.25, 'pine'], [205, 0.95, 'round'], [275, 1.1, 'pine'], [345, 0.9, 'round'],
  [655, 0.95, 'round'], [725, 1.15, 'pine'], [795, 1, 'round'], [870, 1.3, 'pine'], [945, 1.05, 'round']] as const
const BUSHES = [[20, 1], [120, 0.8], [250, 0.9], [380, 0.7], [620, 0.75], [760, 0.9], [890, 0.8], [985, 1]] as const
const STARS = [[90, 30], [210, 62], [330, 22], [470, 48], [560, 18], [690, 40], [790, 70], [905, 26], [140, 90], [610, 86]] as const
const FIREFLIES = [[90, 200], [170, 168], [300, 214], [400, 186], [610, 196], [700, 160], [830, 206], [930, 176]] as const

function RoundTree({ x, s, y = GROUND, leaf = 'var(--leaf)', shade = 'var(--leaf-dark)' }: { x: number; s: number; y?: number; leaf?: string; shade?: string }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-5} y={-30} width={10} height={30} rx={3} fill="var(--trunk)" />
      <circle cx={-16} cy={-44} r={18} fill={shade} />
      <circle cx={16} cy={-44} r={18} fill={shade} />
      <circle cx={0} cy={-60} r={24} fill={leaf} />
      <circle cx={-14} cy={-48} r={15} fill={leaf} />
      <circle cx={14} cy={-50} r={15} fill={leaf} />
      <circle cx={-7} cy={-68} r={8} fill="var(--leaf-light)" />
    </g>
  )
}

function PineTree({ x, s }: { x: number; s: number }) {
  return (
    <g transform={`translate(${x} ${GROUND}) scale(${s})`} strokeLinejoin="round">
      <rect x={-4} y={-18} width={8} height={18} rx={2} fill="var(--trunk)" />
      <polygon points="-30,-16 30,-16 0,-56" fill="var(--pine-dark)" stroke="var(--pine-dark)" strokeWidth={6} />
      <polygon points="-24,-40 24,-40 0,-78" fill="var(--pine)" stroke="var(--pine)" strokeWidth={6} />
      <polygon points="-17,-62 17,-62 0,-96" fill="var(--pine)" stroke="var(--pine)" strokeWidth={6} />
      <polygon points="-6,-70 0,-90 4,-72" fill="var(--leaf-light)" />
    </g>
  )
}

function Bush({ x, s }: { x: number; s: number }) {
  return (
    <g transform={`translate(${x} ${GROUND + 8}) scale(${s})`}>
      <ellipse cx={0} cy={0} rx={26} ry={8} fill="var(--leaf-dark)" />
      <circle cx={-12} cy={-6} r={11} fill="var(--leaf)" />
      <circle cx={6} cy={-10} r={13} fill="var(--leaf)" />
      <circle cx={2} cy={-14} r={4} fill="var(--leaf-light)" />
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

export function ForestBackdrop() {
  return (
    <svg className="backdrop" viewBox="0 0 1000 340" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="backdrop-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--sky-top)' }} />
          <stop offset="1" style={{ stopColor: 'var(--sky-bottom)' }} />
        </linearGradient>
      </defs>
      <rect width={1000} height={340} fill="url(#backdrop-sky)" />
      <g className="stars">{STARS.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r={1.6} />)}</g>
      <circle cx={845} cy={64} r={30} fill="var(--sun)" />
      <g className="clouds">
        <Cloud x={160} y={62} s={1} />
        <Cloud x={520} y={40} s={0.75} />
        <Cloud x={720} y={100} s={0.6} />
      </g>
      <path d={`M0 ${GROUND - 60} Q 160 ${GROUND - 120} 330 ${GROUND - 70} T 660 ${GROUND - 80} T 1000 ${GROUND - 90} V 340 H 0 Z`} fill="var(--hill-far)" />
      {FAR.map(([x, s]) => <RoundTree key={x} x={x} s={s} y={GROUND - 26} leaf="var(--leaf-far)" shade="var(--leaf-far-dark)" />)}
      <path d={`M0 ${GROUND - 14} Q 250 ${GROUND - 50} 500 ${GROUND - 20} T 1000 ${GROUND - 26} V 340 H 0 Z`} fill="var(--hill-near)" />
      {MID.map(([x, s, kind]) => (kind === 'pine' ? <PineTree key={x} x={x} s={s} /> : <RoundTree key={x} x={x} s={s} />))}
      <rect y={GROUND} width={1000} height={340 - GROUND} fill="var(--grass)" />
      {BUSHES.map(([x, s]) => <Bush key={x} x={x} s={s} />)}
      <ellipse cx={500} cy={302} rx={430} ry={34} fill="var(--path)" />
      <ellipse cx={500} cy={302} rx={410} ry={26} fill="none" stroke="var(--path-line)" strokeWidth={2} strokeDasharray="10 8" />
      <RoundTree x={-30} s={2.1} y={350} />
      <RoundTree x={1030} s={2.1} y={350} />
      <g className="fireflies">{FIREFLIES.map(([x, y]) => <circle key={x} cx={x} cy={y} r={2.2} />)}</g>
    </svg>
  )
}
