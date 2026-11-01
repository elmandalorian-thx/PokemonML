"""Gen 6 type effectiveness chart (18 types, matches the dataset's generations 1-6)."""

TYPES = ["Normal", "Fire", "Water", "Electric", "Grass", "Ice", "Fighting", "Poison", "Ground",
         "Flying", "Psychic", "Bug", "Rock", "Ghost", "Dragon", "Dark", "Steel", "Fairy"]

# attacking type -> {defending type: multiplier}; anything not listed is 1x
_CHART = {
    "Normal": {"Rock": .5, "Steel": .5, "Ghost": 0},
    "Fire": {"Grass": 2, "Ice": 2, "Bug": 2, "Steel": 2, "Fire": .5, "Water": .5, "Rock": .5, "Dragon": .5},
    "Water": {"Fire": 2, "Ground": 2, "Rock": 2, "Water": .5, "Grass": .5, "Dragon": .5},
    "Electric": {"Water": 2, "Flying": 2, "Electric": .5, "Grass": .5, "Dragon": .5, "Ground": 0},
    "Grass": {"Water": 2, "Ground": 2, "Rock": 2, "Fire": .5, "Grass": .5, "Poison": .5, "Flying": .5,
              "Bug": .5, "Dragon": .5, "Steel": .5},
    "Ice": {"Grass": 2, "Ground": 2, "Flying": 2, "Dragon": 2, "Fire": .5, "Water": .5, "Ice": .5, "Steel": .5},
    "Fighting": {"Normal": 2, "Ice": 2, "Rock": 2, "Dark": 2, "Steel": 2, "Poison": .5, "Flying": .5,
                 "Psychic": .5, "Bug": .5, "Fairy": .5, "Ghost": 0},
    "Poison": {"Grass": 2, "Fairy": 2, "Poison": .5, "Ground": .5, "Rock": .5, "Ghost": .5, "Steel": 0},
    "Ground": {"Fire": 2, "Electric": 2, "Poison": 2, "Rock": 2, "Steel": 2, "Grass": .5, "Bug": .5, "Flying": 0},
    "Flying": {"Grass": 2, "Fighting": 2, "Bug": 2, "Electric": .5, "Rock": .5, "Steel": .5},
    "Psychic": {"Fighting": 2, "Poison": 2, "Psychic": .5, "Steel": .5, "Dark": 0},
    "Bug": {"Grass": 2, "Psychic": 2, "Dark": 2, "Fire": .5, "Fighting": .5, "Poison": .5, "Flying": .5,
            "Ghost": .5, "Steel": .5, "Fairy": .5},
    "Rock": {"Fire": 2, "Ice": 2, "Flying": 2, "Bug": 2, "Fighting": .5, "Ground": .5, "Steel": .5},
    "Ghost": {"Psychic": 2, "Ghost": 2, "Dark": .5, "Normal": 0},
    "Dragon": {"Dragon": 2, "Steel": .5, "Fairy": 0},
    "Dark": {"Psychic": 2, "Ghost": 2, "Fighting": .5, "Dark": .5, "Fairy": .5},
    "Steel": {"Ice": 2, "Rock": 2, "Fairy": 2, "Fire": .5, "Water": .5, "Electric": .5, "Steel": .5},
    "Fairy": {"Fighting": 2, "Dragon": 2, "Dark": 2, "Fire": .5, "Poison": .5, "Steel": .5},
}


def offense_multiplier(attacker: tuple[str, str], defender: tuple[str, str]) -> float:
    """Best damage multiplier any of the attacker's types gets against the defender's type combo."""
    best = 0.0
    for atk in attacker:
        if not atk:
            continue
        m = 1.0
        for d in defender:
            if d:
                m *= _CHART[atk].get(d, 1.0)
        best = max(best, m)
    return best
