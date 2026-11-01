// In-browser twin of ml/build.py: same features, same exported models.
import { guide } from './data'
import type { Pokemon, TreeNode } from './types'

export type Features = Record<string, number>

const { types: TYPES, matrix } = guide.typeChart
const typeIndex = new Map(TYPES.map((t, i) => [t, i]))

/** Best multiplier any attacking type gets against the defender's type combo. */
export function offense(attacker: string[], defender: string[]) {
  let best = 0
  for (const atk of attacker) {
    let m = 1
    for (const d of defender) m *= matrix[typeIndex.get(atk)!][typeIndex.get(d)!]
    best = Math.max(best, m)
  }
  return best
}

export function pairFeatures(a: Pokemon, b: Pokemon): Features {
  const [hp, atk, def, spa, spd, spe] = a.stats.map((s, i) => s - b.stats[i])
  const offA = offense(a.types, b.types)
  const offB = offense(b.types, a.types)
  const ln = Math.log
  const [A, B] = [a.stats, b.stats]
  return {
    d_hp: hp, d_atk: atk, d_def: def, d_spa: spa, d_spd: spd, d_spe: spe,
    d_total: a.total - b.total,
    d_legendary: Number(a.legendary) - Number(b.legendary),
    type_adv: Math.log2(Math.max(offA, 0.25)) - Math.log2(Math.max(offB, 0.25)),
    atk_edge: ln(A[1]) - ln(B[2]) - (ln(B[1]) - ln(A[2])),
    spa_edge: ln(A[3]) - ln(B[4]) - (ln(B[3]) - ln(A[4])),
  }
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z))
const featureKeys = guide.features.map((f) => f.key)

/** Logistic regression: returns P(A wins) plus each feature's push on the log-odds. */
export function logreg(x: Features) {
  const { mean, scale, coef, intercept } = guide.model.logreg
  const contributions = featureKeys.map((k, i) => ({ key: k, value: (coef[i] * (x[k] - mean[i])) / scale[i] }))
  const z = intercept + contributions.reduce((s, c) => s + c.value, 0)
  return { p: sigmoid(z), contributions }
}

function leaf(nodes: TreeNode[], x: Features) {
  const path = [0]
  let i = 0
  while (nodes[i].l !== -1) {
    i = x[nodes[i].f!] <= nodes[i].t! ? nodes[i].l : nodes[i].r
    path.push(i)
  }
  return path
}

/** The small depth-3 tree; returns P(A wins) and the node path taken. */
export function tree(x: Features) {
  const path = leaf(guide.model.tree, x)
  return { p: guide.model.tree[path[path.length - 1]].p!, path }
}

/** Gradient boosting: init log-odds + learning rate x sum of every tree's leaf value. */
export function gbm(x: Features) {
  const { init, lr, trees } = guide.model.gbm
  let z = init
  for (const nodes of trees) {
    const path = leaf(nodes, x)
    z += lr * nodes[path[path.length - 1]].v!
  }
  return { p: sigmoid(z) }
}

export function predictAll(a: Pokemon, b: Pokemon) {
  const x = pairFeatures(a, b)
  return { x, logreg: logreg(x), tree: tree(x), gbm: gbm(x) }
}

export const featureLabel = (key: string) => guide.features.find((f) => f.key === key)?.label ?? key
