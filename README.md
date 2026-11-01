# Who wins? A Pokémon battle ML walkthrough

An interactive, visual machine-learning guide built on the Kaggle
[Pokemon Challenge](https://www.kaggle.com/datasets/terminus7/pokemon-challenge) dataset: 50,000 battles between 800 Pokémon.

It walks the full workflow: framing, data cleaning, EDA, feature engineering, baselines, three models,
honest evaluation (overfitting, learning curves, leakage, calibration). It ends in an **arena** where you pick two
Pokémon and the trained model calls the fight, in your browser.

**Highlights from the data**
- The faster Pokémon wins 93.9% of battles; a one-line rule gets 94.0% on held-out battles.
- Speed ties always go to the *second* Pokémon, which is why swap-augmentation makes models worse.
- Gradient boosting reaches 95.1%; logistic regression only 88.2% until it gets an "is faster?" feature (94.6%).

## Run it

```bash
uv venv .venv && uv pip install --python .venv/Scripts/python.exe -r ml/requirements.txt
.venv/Scripts/python.exe ml/fetch_data.py   # Kaggle CSVs + PokeAPI id list
.venv/Scripts/python.exe ml/build.py        # train, evaluate, export JSON + submission.csv
cd web && npm install && npm run dev
```

Artwork and cries are hot-linked from the open [PokeAPI](https://github.com/PokeAPI) sprite and cry repositories.
Pokémon and related names are trademarks of Nintendo, Game Freak and The Pokémon Company. Educational, non-commercial project.
