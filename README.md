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

**Notebook:** [`notebooks/pokemon_battle_ml.ipynb`](notebooks/pokemon_battle_ml.ipynb)
([open in Colab](https://colab.research.google.com/github/elmandalorian-thx/PokemonML/blob/main/notebooks/pokemon_battle_ml.ipynb))
runs the whole project with every step commented and mapped to the matching chapter of the book below.

**Data:** the original Kaggle CSVs are in [`data/raw/`](data/raw) and downloadable from the site.

## Run it

```bash
uv venv .venv && uv pip install --python .venv/Scripts/python.exe -r ml/requirements.txt
.venv/Scripts/python.exe ml/fetch_data.py   # PokeAPI id list (add --kaggle to re-download the CSVs)
.venv/Scripts/python.exe ml/build.py        # train, evaluate, export the site JSON
cd web && npm install && npm run dev
```

## Credits

- **Created by** Juan Barahona ([github.com/elmandalorian-thx](https://github.com/elmandalorian-thx))
- **Data:** [Pokemon – Weedle's Cave](https://www.kaggle.com/datasets/terminus7/pokemon-challenge) (the "Pokemon Challenge") by
  T7 – Hackathon Challenge (terminus7) on Kaggle, CC0: Public Domain. This project is built on their dataset and challenge.
- **Method:** Aurélien Géron, *Hands-On Machine Learning with Scikit-Learn, Keras, and TensorFlow*, 3rd ed. (O'Reilly, 2022).
- **Related reading:** Diego Rosa, ["Your favorite game from a different point of view"](https://towardsdatascience.com/your-favorite-game-from-a-different-point-of-view-93732173adf7/)
  (Towards Data Science, 2020), which inspired the type radar charts.

Artwork and cries are hot-linked from the open [PokeAPI](https://github.com/PokeAPI) sprite and cry repositories.
Pokémon and related names are trademarks of Nintendo, Game Freak and The Pokémon Company. Educational, non-commercial project.
