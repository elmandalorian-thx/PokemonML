"""Pokemon Challenge ML pipeline.

Trains every model shown in the guide and exports JSON for the web app:
  web/src/data/guide.json      metrics, charts, models (bundled into the app)
  web/public/data/battles.json head-to-head record per matchup (fetched lazily)
  data/output/submission.csv   Kaggle predictions for tests.csv (local only)

Run:  .venv/Scripts/python.exe ml/build.py
"""
from __future__ import annotations

import json
import re
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.inspection import permutation_importance
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, confusion_matrix, log_loss, roc_auc_score, roc_curve
from sklearn.model_selection import GroupShuffleSplit, train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier

from type_chart import TYPES, offense_multiplier

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
OUT_SRC = ROOT / "web" / "src" / "data"
OUT_PUBLIC = ROOT / "web" / "public" / "data"
SEED = 42
STATS = ["HP", "Attack", "Defense", "Sp. Atk", "Sp. Def", "Speed"]
STAT_KEYS = ["hp", "atk", "def", "spa", "spd", "spe"]

# ---------------------------------------------------------------- 1. load + clean


def load_pokemon() -> pd.DataFrame:
    p = pd.read_csv(RAW / "pokemon.csv").set_index("#")
    # Row 63 has no name. Its stats (65/105/60/60/70/95, Fighting, Gen 1) are Primeape's.
    p.loc[63, "Name"] = "Primeape"
    # Missing Type 2 is not missing data: the Pokemon simply has one type.
    p["Type 2"] = p["Type 2"].fillna("")
    p["Total"] = p[STATS].sum(axis=1)
    return p


# Dataset names that don't follow the PokeAPI slug pattern.
SLUG_OVERRIDES = {
    "Primeape": 57, "Basculin": 550, "Frillish": 592, "Jellicent": 593, "Pyroar": 668,
    "Hoopa Confined": 720, "Zygarde Half Forme": 718, "DeoxysAttack Forme": "deoxys-attack",
    "Kyurem Black Kyurem": "kyurem-black", "Kyurem White Kyurem": "kyurem-white",
    "Heat Rotom": "rotom-heat", "Wash Rotom": "rotom-wash", "Frost Rotom": "rotom-frost",
    "Fan Rotom": "rotom-fan", "Mow Rotom": "rotom-mow",
}


def pokeapi_ids(p: pd.DataFrame) -> pd.Series:
    """Map each dataset row to the PokeAPI id used by sprite and cry files."""
    api = {
        x["name"]: int(x["url"].rstrip("/").split("/")[-1])
        for x in json.loads((ROOT / "data/external/pokeapi_pokemon.json").read_text())["results"]
    }

    def slug(name: str) -> str:
        s = name.lower().replace("♀", "-f").replace("♂", "-m").replace("é", "e")
        s = re.sub(r"['.:]", "", s)
        s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
        s = re.sub(r"-(forme|cloak|mode|size)$", "", s)
        if m := re.match(r"^mega-(.+?)(-x|-y)?$", s):
            s = f"{m.group(1)}-mega{m.group(2) or ''}"
        if m := re.match(r"^primal-(.+)$", s):
            s = f"{m.group(1)}-primal"
        return s

    ids = {}
    for idx, name in p["Name"].items():
        o = SLUG_OVERRIDES.get(name, slug(name))
        ids[idx] = o if isinstance(o, int) else api.get(o)
    out = pd.Series(ids)
    missing = out[out.isna()]
    if len(missing):
        raise SystemExit(f"Unmapped Pokemon: {p.loc[missing.index, 'Name'].tolist()}")
    return out.astype(int)


# ---------------------------------------------------------------- 2. features

FEATURES = ["d_hp", "d_atk", "d_def", "d_spa", "d_spd", "d_spe", "d_total", "d_legendary", "type_adv",
            "atk_edge", "spa_edge"]
FEATURE_LABELS = {
    "d_hp": "HP diff", "d_atk": "Attack diff", "d_def": "Defense diff", "d_spa": "Sp. Atk diff",
    "d_spd": "Sp. Def diff", "d_spe": "Speed diff", "d_total": "Total stats diff",
    "d_legendary": "Legendary diff", "type_adv": "Type advantage",
    "atk_edge": "Physical edge", "spa_edge": "Special edge",
}


def pair_features(p: pd.DataFrame, a: np.ndarray, b: np.ndarray) -> pd.DataFrame:
    """Every feature compares A against B; swapping the pair flips its sign (antisymmetric)."""
    A, B = p.loc[a], p.loc[b]
    f = pd.DataFrame(index=range(len(a)))
    for stat, key in zip(STATS, STAT_KEYS):
        f[f"d_{key}"] = A[stat].values - B[stat].values
    f["d_total"] = A["Total"].values - B["Total"].values
    f["d_legendary"] = A["Legendary"].astype(int).values - B["Legendary"].astype(int).values
    off_a = [offense_multiplier((t1, t2), (u1, u2)) for t1, t2, u1, u2 in
             zip(A["Type 1"], A["Type 2"], B["Type 1"], B["Type 2"])]
    off_b = [offense_multiplier((u1, u2), (t1, t2)) for t1, t2, u1, u2 in
             zip(A["Type 1"], A["Type 2"], B["Type 1"], B["Type 2"])]
    f["type_adv"] = np.log2(np.maximum(off_a, 0.25)) - np.log2(np.maximum(off_b, 0.25))
    # Damage scales with Attack / Defense, so compare ratios (on a log scale) rather than raw gaps
    def ln(x):
        return np.log(x.values.astype(float))
    f["atk_edge"] = (ln(A["Attack"]) - ln(B["Defense"])) - (ln(B["Attack"]) - ln(A["Defense"]))
    f["spa_edge"] = (ln(A["Sp. Atk"]) - ln(B["Sp. Def"])) - (ln(B["Sp. Atk"]) - ln(A["Sp. Def"]))
    return f[FEATURES].astype(float)


def augment(X: pd.DataFrame, y: np.ndarray) -> tuple[pd.DataFrame, np.ndarray]:
    """Add every battle a second time with the Pokemon swapped (features negated, label flipped)."""
    return pd.concat([X, -X], ignore_index=True), np.concatenate([y, 1 - y])


# ---------------------------------------------------------------- 3. helpers


def make_gbm() -> GradientBoostingClassifier:
    return GradientBoostingClassifier(n_estimators=200, max_depth=4, learning_rate=0.1,
                                      subsample=0.8, random_state=SEED)


def r(x, n=4):
    return round(float(x), n)


def evaluate(model, X, y) -> dict:
    prob = model.predict_proba(X)[:, 1]
    pred = (prob >= 0.5).astype(int)
    return {"accuracy": r(accuracy_score(y, pred)), "logLoss": r(log_loss(y, prob)),
            "auc": r(roc_auc_score(y, prob))}


def export_tree(tree, feature_names, with_counts=False) -> list[dict]:
    t = tree.tree_
    nodes = []
    for i in range(t.node_count):
        leaf = t.children_left[i] == -1
        n = {"l": int(t.children_left[i]), "r": int(t.children_right[i])}
        if not leaf:
            n["f"] = feature_names[t.feature[i]]
            n["t"] = float(t.threshold[i])  # exact: rounding flips decisions on continuous features
        if with_counts:
            v = t.value[i][0]  # class fractions in recent sklearn
            n["n"] = int(t.n_node_samples[i])
            n["p"] = r(v[1] / v.sum())
        elif leaf:
            n["v"] = r(t.value[i][0][0], 6)
        nodes.append(n)
    return nodes


def gbm_raw(trees, init, lr, x: dict) -> float:
    """Pure-Python twin of the JS inference, used to verify the export."""
    s = init
    for nodes in trees:
        i = 0
        while nodes[i]["l"] != -1:
            i = nodes[i]["l"] if x[nodes[i]["f"]] <= nodes[i]["t"] else nodes[i]["r"]
        s += lr * nodes[i]["v"]
    return s


# ---------------------------------------------------------------- 4. pipeline


def main() -> None:
    p = load_pokemon()
    p["apiId"] = pokeapi_ids(p)
    c = pd.read_csv(RAW / "combats.csv")
    tests = pd.read_csv(RAW / "tests.csv")

    a, b = c.First_pokemon.values, c.Second_pokemon.values
    y = (c.Winner.values == a).astype(int)
    X = pair_features(p, a, b)
    pair_key = np.minimum(a, b) * 1000 + np.maximum(a, b)

    # --- EDA numbers
    games = pd.concat([c.First_pokemon, c.Second_pokemon]).value_counts()
    wins = c.Winner.value_counts()
    p["games"] = games.reindex(p.index).fillna(0).astype(int)
    p["wins"] = wins.reindex(p.index).fillna(0).astype(int)
    p["winRate"] = np.where(p.games > 0, p.wins / p.games.replace(0, 1), np.nan)

    higher_stat_wins = []
    for stat, key in zip(STATS + ["Total"], STAT_KEYS + ["total"]):
        d = X[f"d_{key}"].values
        m = d != 0
        higher_stat_wins.append({"stat": stat, "rate": r(((d > 0) == y)[m].mean()),
                                 "ties": r((~m).mean())})
    corr = [{"stat": s, "r": r(p[[s, "winRate"]].dropna().corr().iloc[0, 1], 3)}
            for s in STATS + ["Total"]]

    # Do repeated matchups always end the same way? (an estimate of label noise)
    df_pairs = pd.DataFrame({"k": pair_key, "w": c.Winner.values})
    rep = df_pairs.groupby("k").w.agg(["count", "nunique"])
    rep = rep[rep["count"] > 1]
    noise = {"repeatedPairs": int(len(rep)), "inconsistent": int((rep["nunique"] > 1).sum())}

    # --- Split: hold out 20% of battles, never touched until evaluation
    idx_tr, idx_te = train_test_split(np.arange(len(y)), test_size=0.2, random_state=SEED, stratify=y)
    X_tr, X_te, y_tr, y_te = X.iloc[idx_tr], X.iloc[idx_te].reset_index(drop=True), y[idx_tr], y[idx_te]

    # --- Baselines (no learning)
    def rule_acc(score):
        pred = np.where(score > 0, 1, np.where(score < 0, 0, np.random.default_rng(SEED).integers(0, 2, len(score))))
        return r(accuracy_score(y_te, pred))

    baselines = [
        {"name": "Always pick the 2nd Pokemon", "accuracy": r((y_te == 0).mean())},
        {"name": "Coin flip", "accuracy": rule_acc(np.zeros(len(y_te)))},
        {"name": "Higher total stats wins", "accuracy": rule_acc(X_te.d_total.values)},
        {"name": "Legendary wins", "accuracy": rule_acc(X_te.d_legendary.values)},
        {"name": "Faster Pokemon wins", "accuracy": rule_acc(X_te.d_spe.values)},
        {"name": "Faster wins, ties go to the 2nd", "accuracy": r(((X_te.d_spe.values > 0).astype(int) == y_te).mean())},
    ]
    ties = X.d_spe.values == 0
    tie_info = {"ties": int(ties.sum()), "firstWinsOnTies": r(y[ties].mean()),
                "firstWinsWhenFaster": r(y[X.d_spe.values > 0].mean())}

    # --- Models
    scaler = StandardScaler().fit(X_tr)
    logreg = LogisticRegression(max_iter=2000).fit(scaler.transform(X_tr), y_tr)
    tree3 = DecisionTreeClassifier(max_depth=3, random_state=SEED).fit(X_tr, y_tr)
    gbm = make_gbm().fit(X_tr, y_tr)

    # Experiment: mirror every battle (swap A/B). Sensible-looking, but it erases the tie rule.
    Xa, ya = augment(X_tr.reset_index(drop=True), y_tr)
    augmentation = {"without": r(gbm.score(X_te, y_te)), "with": r(make_gbm().fit(Xa, ya).score(X_te, y_te))}

    # Experiment: a linear model can't draw a step. Hand it an "is faster" indicator.
    def with_faster(X_):
        return X_.assign(faster=(X_.d_spe > 0).astype(int))
    sc_f = StandardScaler().fit(with_faster(X_tr))
    lr_f = LogisticRegression(max_iter=2000).fit(sc_f.transform(with_faster(X_tr)), y_tr)
    step_feature = {"logreg": None, "logregWithFaster": r(lr_f.score(sc_f.transform(with_faster(X_te)), y_te))}

    class Scaled:  # wraps logreg so evaluate() can take raw features
        def predict_proba(self, X_):
            return logreg.predict_proba(scaler.transform(X_))

    models = [
        {"key": "logreg", "name": "Logistic regression", **evaluate(Scaled(), X_te, y_te)},
        {"key": "tree", "name": "Decision tree (depth 3)", **evaluate(tree3, X_te, y_te)},
        {"key": "gbm", "name": "Gradient boosting", **evaluate(gbm, X_te, y_te)},
    ]
    # Train accuracy too, so the guide can talk about the generalisation gap
    for m, est in zip(models, [Scaled(), tree3, gbm]):
        m["trainAccuracy"] = r(accuracy_score(y_tr, (est.predict_proba(X_tr)[:, 1] >= 0.5)))

    step_feature["logreg"] = models[0]["accuracy"]
    gbm_prob = gbm.predict_proba(X_te)[:, 1]
    cm = confusion_matrix(y_te, gbm_prob >= 0.5).tolist()
    fpr, tpr, _ = roc_curve(y_te, gbm_prob)
    keep = np.unique(np.linspace(0, len(fpr) - 1, 60).astype(int))
    roc = [{"fpr": r(fpr[i], 3), "tpr": r(tpr[i], 3)} for i in keep]

    # Calibration: when the model says 80%, does it win 80% of the time?
    bins = np.linspace(0, 1, 11)
    which = np.clip(np.digitize(gbm_prob, bins) - 1, 0, 9)
    calibration = [{"bin": r((bins[i] + bins[i + 1]) / 2, 2), "predicted": r(gbm_prob[which == i].mean()),
                    "actual": r(y_te[which == i].mean()), "n": int((which == i).sum())}
                   for i in range(10) if (which == i).sum() > 0]

    # --- Overfitting: tree depth vs train/test accuracy
    depth_curve = []
    for d in [1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, None]:
        t = DecisionTreeClassifier(max_depth=d, random_state=SEED).fit(X_tr, y_tr)
        depth_curve.append({"depth": d or t.get_depth(), "unlimited": d is None,
                            "train": r(t.score(X_tr, y_tr)), "test": r(t.score(X_te, y_te))})

    # --- Learning curve: how much data do we need?
    learning_curve = []
    rng = np.random.default_rng(SEED)
    for n in [100, 250, 500, 1000, 2500, 5000, 10000, 20000, len(X_tr)]:
        sub = rng.choice(len(X_tr), n, replace=False)
        Xs, ys = X_tr.iloc[sub], y_tr[sub]
        g = make_gbm().fit(Xs, ys)
        sc = StandardScaler().fit(Xs)
        lr_ = LogisticRegression(max_iter=2000).fit(sc.transform(Xs), ys)
        learning_curve.append({"n": n, "gbm": r(g.score(X_te, y_te)),
                               "logreg": r(lr_.score(sc.transform(X_te), y_te))})

    # --- Feature importance (permutation on the held-out set)
    pi = permutation_importance(gbm, X_te, y_te, n_repeats=5, random_state=SEED, scoring="accuracy")
    importance = sorted([{"feature": FEATURE_LABELS[f], "key": f, "drop": r(pi.importances_mean[i])}
                         for i, f in enumerate(FEATURES)], key=lambda d: -d["drop"])

    # --- Ablation: what if we hide Speed?
    def fit_score(cols):
        return r(make_gbm().fit(X_tr[cols], y_tr).score(X_te[cols], y_te))

    no_speed = [f for f in FEATURES if f not in ("d_spe", "d_total")]
    base_cols = ["d_hp", "d_atk", "d_def", "d_spa", "d_spd", "d_spe"]
    ablation = [
        {"name": "Speed only", "accuracy": fit_score(["d_spe"])},
        {"name": "All features except Speed", "accuracy": fit_score(no_speed)},
        {"name": "Six raw stat diffs", "accuracy": fit_score(base_cols)},
        {"name": "All features", "accuracy": models[2]["accuracy"]},
    ]

    # --- Leakage demo: a "win rate" feature computed from ALL battles (incl. test) vs train only
    def winrate_from(rows):
        cc = c.iloc[rows]
        g_ = pd.concat([cc.First_pokemon, cc.Second_pokemon]).value_counts()
        w_ = cc.Winner.value_counts().reindex(g_.index).fillna(0)
        return (w_ / g_).reindex(p.index).fillna(0.5)

    def with_wr(wr):
        Xw = X.copy()
        Xw["d_wr"] = wr.loc[a].values - wr.loc[b].values
        return r(make_gbm().fit(Xw.iloc[idx_tr], y_tr).score(Xw.iloc[idx_te], y_te))

    leakage = {"clean": models[2]["accuracy"],
               "leaky": with_wr(winrate_from(np.arange(len(c)))),
               "honest": with_wr(winrate_from(idx_tr))}

    # --- Pair leakage: does seeing the same matchup in train inflate the score?
    gss = GroupShuffleSplit(n_splits=1, test_size=0.2, random_state=SEED)
    g_tr, g_te = next(gss.split(X, y, groups=pair_key))
    g = make_gbm().fit(X.iloc[g_tr], y[g_tr])
    leakage["groupSplit"] = r(g.score(X.iloc[g_te], y[g_te]))
    leakage["sharedPairsInTest"] = int(np.isin(pair_key[idx_te], pair_key[idx_tr]).sum())

    # --- Predictions for tests.csv (the Kaggle deliverable)
    Xt = pair_features(p, tests.First_pokemon.values, tests.Second_pokemon.values)
    tp = gbm.predict_proba(Xt)[:, 1]
    test_preds = {"count": int(len(tests)), "firstWins": int((tp >= 0.5).sum()),
                  "confident": int(((tp > 0.9) | (tp < 0.1)).sum())}
    sub = tests.copy()
    sub["Winner"] = np.where(tp >= 0.5, tests.First_pokemon, tests.Second_pokemon)
    (ROOT / "data" / "output").mkdir(parents=True, exist_ok=True)
    sub.to_csv(ROOT / "data" / "output" / "submission.csv", index=False)

    # --- Export models for in-browser inference
    gbm_trees = [export_tree(est[0], FEATURES) for est in gbm.estimators_]
    prior = gbm.init_.class_prior_[1]
    gbm_init = float(np.log(prior / (1 - prior)))
    # Verify the exported trees reproduce sklearn's scores exactly
    raw_sk = gbm.decision_function(X_te.iloc[:500])
    raw_js = [gbm_raw(gbm_trees, gbm_init, gbm.learning_rate, row) for row in X_te.iloc[:500].to_dict("records")]
    assert np.allclose(raw_sk, raw_js, atol=1e-4), "GBM export mismatch"

    pokemon = []
    for idx, row in p.iterrows():
        pokemon.append({
            "id": int(idx), "apiId": int(row.apiId), "name": row.Name,
            "types": [t for t in (row["Type 1"], row["Type 2"]) if t],
            "stats": [int(row[s]) for s in STATS], "total": int(row.Total),
            "gen": int(row.Generation), "legendary": bool(row.Legendary),
            "games": int(row.games), "wins": int(row.wins),
            "winRate": None if np.isnan(row.winRate) else r(row.winRate),
        })

    guide = {
        "counts": {"pokemon": len(p), "battles": len(c), "tests": len(tests), "train": len(idx_tr),
                   "test": len(idx_te), "neverFought": int((p.games == 0).sum()),
                   "missingType2": int((p["Type 2"] == "").sum()),
                   "legendary": int(p.Legendary.sum()), "firstWins": r(y.mean())},
        "noise": noise, "ties": tie_info, "augmentation": augmentation, "stepFeature": step_feature,
        "higherStatWins": higher_stat_wins, "correlation": corr,
        "legendaryWinRate": {str(k): r(v) for k, v in p.groupby("Legendary").winRate.mean().items()},
        "baselines": baselines, "models": models, "confusion": cm, "roc": roc,
        "calibration": calibration, "depthCurve": depth_curve, "learningCurve": learning_curve,
        "importance": importance, "ablation": ablation, "leakage": leakage, "testPredictions": test_preds,
        "features": [{"key": f, "label": FEATURE_LABELS[f]} for f in FEATURES],
        "sampleBattles": [{"a": int(a[i]), "b": int(b[i]), "winner": int(c.Winner[i])} for i in range(8)],
        "typeChart": {"types": TYPES, "matrix": [[offense_multiplier((atk, ""), (d, "")) for d in TYPES] for atk in TYPES]},
        "model": {
            "logreg": {"mean": scaler.mean_.round(5).tolist(), "scale": scaler.scale_.round(5).tolist(),
                       "coef": logreg.coef_[0].round(5).tolist(), "intercept": r(logreg.intercept_[0], 5)},
            "tree": export_tree(tree3, FEATURES, with_counts=True),
            "gbm": {"init": gbm_init, "lr": gbm.learning_rate, "trees": gbm_trees},
        },
        "pokemon": pokemon,
    }

    # Head-to-head records: "lo-hi" -> [wins by lo, wins by hi]
    h2h: dict[str, list[int]] = {}
    for fa, fb, w in zip(a, b, c.Winner.values):
        lo, hi = min(fa, fb), max(fa, fb)
        rec = h2h.setdefault(f"{lo}-{hi}", [0, 0])
        rec[0 if w == lo else 1] += 1

    OUT_SRC.mkdir(parents=True, exist_ok=True)
    OUT_PUBLIC.mkdir(parents=True, exist_ok=True)
    (OUT_SRC / "guide.json").write_text(json.dumps(guide, separators=(",", ":")), encoding="utf-8")
    (OUT_PUBLIC / "battles.json").write_text(json.dumps(h2h, separators=(",", ":")), encoding="utf-8")

    print("baselines", [(x["name"], x["accuracy"]) for x in baselines])
    print("models", [(m["name"], m["accuracy"], m["trainAccuracy"]) for m in models])
    print("ablation", ablation)
    print("leakage", leakage)
    print("noise", noise, tie_info, augmentation, step_feature)
    print("importance", importance[:4])
    print("depth", [(d["depth"], d["train"], d["test"]) for d in depth_curve])
    print("learning", learning_curve)


if __name__ == "__main__":
    main()
