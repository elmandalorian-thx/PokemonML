"""Download inputs.

  data/external/pokeapi_pokemon.json  PokeAPI name -> id list (for sprite/cry URLs), not committed
  data/raw/*.csv                      Kaggle "Pokemon - Weedle's Cave" (terminus7, CC0). Already committed;
                                      re-downloaded only with --kaggle

Run:  .venv/Scripts/python.exe ml/fetch_data.py
"""
import io
import sys
import urllib.request
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
KAGGLE = "https://www.kaggle.com/api/v1/datasets/download/terminus7/pokemon-challenge"
POKEAPI = "https://pokeapi.co/api/v2/pokemon?limit=2000"


def get(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "PokemonML/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def main() -> None:
    if "--kaggle" in sys.argv:
        raw = ROOT / "data" / "raw"
        raw.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(io.BytesIO(get(KAGGLE))) as z:
            for name in ("pokemon.csv", "combats.csv", "tests.csv"):
                (raw / name).write_bytes(z.read(name))
    ext = ROOT / "data" / "external"
    ext.mkdir(parents=True, exist_ok=True)
    (ext / "pokeapi_pokemon.json").write_bytes(get(POKEAPI))
    print("Downloaded data/external/pokeapi_pokemon.json")


if __name__ == "__main__":
    main()
