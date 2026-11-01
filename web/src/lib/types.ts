// Shape of src/data/guide.json, produced by ml/build.py

export interface Pokemon {
  id: number
  apiId: number
  name: string
  types: string[]
  /** HP, Attack, Defense, Sp. Atk, Sp. Def, Speed */
  stats: number[]
  total: number
  gen: number
  legendary: boolean
  games: number
  wins: number
  winRate: number | null
}

export interface TreeNode {
  l: number
  r: number
  f?: string
  t?: number
  n?: number
  p?: number
  v?: number
}

export interface Named { name: string; accuracy: number }

export interface ModelScore {
  key: 'logreg' | 'tree' | 'gbm'
  name: string
  accuracy: number
  trainAccuracy: number
  logLoss: number
  auc: number
}

export interface Guide {
  counts: {
    pokemon: number; battles: number; tests: number; train: number; test: number
    neverFought: number; missingType2: number; legendary: number; firstWins: number
  }
  noise: { repeatedPairs: number; inconsistent: number }
  ties: { ties: number; firstWinsOnTies: number; firstWinsWhenFaster: number }
  augmentation: { without: number; with: number }
  stepFeature: { logreg: number; logregWithFaster: number }
  higherStatWins: { stat: string; rate: number; ties: number }[]
  correlation: { stat: string; r: number }[]
  legendaryWinRate: Record<string, number>
  baselines: Named[]
  models: ModelScore[]
  confusion: number[][]
  roc: { fpr: number; tpr: number }[]
  calibration: { bin: number; predicted: number; actual: number; n: number }[]
  depthCurve: { depth: number; unlimited: boolean; train: number; test: number }[]
  learningCurve: { n: number; gbm: number; logreg: number }[]
  importance: { feature: string; key: string; drop: number }[]
  ablation: Named[]
  leakage: { clean: number; leaky: number; honest: number; groupSplit: number; sharedPairsInTest: number }
  testPredictions: { count: number; firstWins: number; confident: number }
  features: { key: string; label: string }[]
  sampleBattles: { a: number; b: number; winner: number }[]
  typeChart: { types: string[]; matrix: number[][] }
  model: {
    logreg: { mean: number[]; scale: number[]; coef: number[]; intercept: number }
    tree: TreeNode[]
    gbm: { init: number; lr: number; trees: TreeNode[][] }
  }
  pokemon: Pokemon[]
}
