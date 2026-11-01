# Changelog

## 2026-11-01

- Initial ML pipeline `ml/build.py`: cleaning, 11 pair features (stat diffs, type advantage, physical/special edge), baselines, logistic regression, depth-3 tree, gradient boosting (95.1% test accuracy)
- Experiments exported for the guide: overfitting curve, learning curve, permutation importance, ablation, leakage, group split, swap-augmentation (hurts: 93.7%), "is faster" step feature (logreg 88.2% → 94.6%)
- Found the simulator rule that speed ties always go to the second Pokémon
- Web guide (`web/`): 9 chapters, hand-built SVG charts with table views, light/dark themes
- Arena: pick two Pokémon, animated sprites and cries, in-browser GBM inference, tree path, feature contributions, real head-to-head record
- Kaggle `submission.csv` for `tests.csv`; GitHub Pages workflow
