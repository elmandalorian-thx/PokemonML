# PokemonML

Visual machine-learning walkthrough built on the Kaggle "Pokemon Challenge" dataset (predict battle winners).
A Python pipeline trains and evaluates models and exports JSON; a static React site presents the guide in 9 chapters and
runs the exported models in the browser (the "arena").

## Deployment

| Item | Value |
|------|-------|
| Repo | `elmandalorian-thx/PokemonML` (`main`) |
| Hosting | GitHub Pages via `.github/workflows/pages.yml`; needs the repo to be public (or a paid plan) |
| URL | `https://elmandalorian-thx.github.io/PokemonML/` — Vite `base` is `/PokemonML/` |
| Env vars | none |

## Tech stack

| Layer | Tech |
|-------|------|
| ML | Python 3.13, pandas, scikit-learn (venv at `.venv`, created with `uv`) |
| Web | Vite + React 19 + TypeScript, hand-built SVG charts (no chart library) |
| Assets | Sprites/cries hot-linked from PokeAPI GitHub repos (never bundled) |

## Architecture & data flow

```
ml/fetch_data.py -> data/raw/*.csv, data/external/pokeapi_pokemon.json   (gitignored)
ml/build.py      -> web/src/data/guide.json      (bundled: metrics, chart data, models, pokemon)
                 -> web/public/data/battles.json (fetched lazily: head-to-head records)
                 -> web/public/data/submission.csv
web/src/lib/model.ts mirrors ml/build.py features + inference (logreg, depth-3 tree, GBM trees)
```

- **Every number in the UI comes from `guide.json`.** Never hard-code a metric in a section; read it from `guide`.
- **Feature parity:** `pair_features()` in `ml/build.py` and `pairFeatures()` in `web/src/lib/model.ts` must match exactly.
  `build.py` asserts the exported GBM trees reproduce sklearn's `decision_function`. Keep thresholds unrounded.
- Theme: CSS variables in `web/src/index.css`; `data-theme="dark"` on `<html>` (toggle in `App.tsx`).
- Chart palette follows the dataviz method: series-1 blue / series-2 orange / series-3 aqua (validated), A = blue, B = orange everywhere.

## Shared components / utilities

| File | What to reuse |
|------|---------------|
| `components/charts.tsx` | `ChartFrame` (title/legend/table view), `BarList`, `DivergingBars`, `LineChart`, `Legend`, `Tooltip`, `useWidth`, `linear`, `ticks`, `barPath` |
| `components/ui.tsx` | `Chapter`, `Callout` (concept/pitfall/result/try), `Code`, `StatTile`, `TypeBadge`/`Types`, `Art` (sprite w/ fallbacks), `StatBars`, `PokemonPicker` |
| `components/TreeDiagram.tsx` | Depth-3 tree diagram with optional highlighted `path` |
| `lib/data.ts` | `guide`, `getPokemon`, `byName`, `headToHead`, `pct`, `fmt` |
| `lib/model.ts` | `pairFeatures`, `predictAll`, `logreg`, `tree`, `gbm`, `featureLabel` |
| `lib/assets.ts` | `sprite.small/art/animated`, `playCry`, `fallbackChain` |

## New chapter / metric checklist

1. Compute the metric in `ml/build.py` and add it to the `guide` dict.
2. Add its type to `web/src/lib/types.ts`.
3. Run `.venv/Scripts/python.exe ml/build.py` (~2 min).
4. Add/extend a section in `web/src/sections/`, wrap charts in `ChartFrame` with a `table` prop.
5. New chapter: add it to `CHAPTERS` in `App.tsx` and render it in `<main>`.
6. `cd web && npx tsc -b && npm run build`, then check light + dark in the browser.

## File structure

```
ml/            build.py (pipeline), type_chart.py, fetch_data.py, requirements.txt
web/src/       App.tsx, index.css, lib/, components/, sections/ (one file per chapter group), data/guide.json
web/public/    favicon.svg, data/battles.json, data/submission.csv
docs/          CHANGELOG.md
```

## Development guidelines

- Train on the original battle orientation. Swap-augmentation is kept only as a measured experiment (it erases the speed-tie rule).
- Charts: thin marks, hairline solid grid, legend for 2+ series, hover tooltip, table view. No dual axes.
- Text never uses series colors; identity comes from swatches.
- Keep sprites/cries hot-linked; every `<img>` needs a `fallbackChain`.
- Test the arena with the presets (speed tie + Swap must flip the winner).

## References

- `docs/CHANGELOG.md`: history of changes
- Dataset: https://www.kaggle.com/datasets/terminus7/pokemon-challenge
