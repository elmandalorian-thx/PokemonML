# Changelog

## 2026-11-01

- Arena backdrop is now a cartoon forest clearing (tree layers, bushes, fireflies at dusk) instead of a village (`components/ForestBackdrop.tsx`)
- Radar charts (`Radar` in charts.tsx): 18 type profiles in Explore (avg Speed vs win rate r = 0.96), Pokédex detail, arena A-vs-B matchup (replaces the stat butterfly)
- Jupyter notebook `notebooks/pokemon_battle_ml.ipynb`: full pipeline, commented and mapped to Géron's *Hands-On ML* (3rd ed.)
- Kaggle CSVs committed in `data/raw/` and downloadable from the site (`kaggleData` Vite plugin); credits for Kaggle/T7, the book, Diego Rosa's article
- Removed the submission.csv download (it is still written locally to `data/output/`)
- Fixed dark-mode chart labels rendering black (all chart roots carry `.chart`)
- Initial ML pipeline `ml/build.py`: cleaning, 11 pair features (stat diffs, type advantage, physical/special edge), baselines, logistic regression, depth-3 tree, gradient boosting (95.1% test accuracy)
- Experiments exported for the guide: overfitting curve, learning curve, permutation importance, ablation, leakage, group split, swap-augmentation (hurts: 93.7%), "is faster" step feature (logreg 88.2% → 94.6%)
- Found the simulator rule that speed ties always go to the second Pokémon
- Web guide (`web/`): 9 chapters, hand-built SVG charts with table views, light/dark themes
- Arena: pick two Pokémon, animated sprites and cries, in-browser GBM inference, tree path, feature contributions, real head-to-head record
- Kaggle `submission.csv` for `tests.csv`; GitHub Pages workflow
