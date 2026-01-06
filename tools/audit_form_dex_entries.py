"""Audit tool: scan species 1..1025 for multi-variety/form cases.

Goal
- PokeAPI does not provide separate pokemon-species resources for most forms.
- PokemonDB sometimes displays different Pokédex entries per form (e.g., Squawkabilly plumage).

This script produces a report of species that have multiple varieties and flags
cases where the *species-level* English flavor texts appear to reference only
one of the form tokens (heuristic).

Usage:
  python tools/audit_form_dex_entries.py
  python tools/audit_form_dex_entries.py --start 931 --end 931
  python tools/audit_form_dex_entries.py --out tools/form_dex_audit.json

Output
- Prints a summary to stdout.
- Optionally writes JSON output with full details.

Notes
- This is a heuristic report; it cannot prove PokemonDB has distinct per-form text.
- It is designed to help you find "likely exceptions" that may need manual overrides.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.request
from typing import Any

API = "https://pokeapi.co/api/v2"

# Tokens that commonly appear in PokeAPI variety names but rarely indicate that
# Pokédex flavor text itself should differ.
STOP_TOKENS = {
    "male",
    "female",
    "totem",
    "gmax",
    "mega",
    "primal",
    "eternamax",
    "starter",
    "partner",
    "build",
}


def fetch_json(url: str) -> Any:
    req = urllib.request.Request(url, headers={"User-Agent": "PokemonDB-tools/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = resp.read().decode("utf-8")
    return json.loads(data)


def normalize_text(text: str) -> str:
    return (
        (text or "")
        .replace("\f", " ")
        .replace("\n", " ")
        .replace("\r", " ")
    )


def get_variety_names(species: dict) -> list[str]:
    out: list[str] = []
    for v in species.get("varieties", []) or []:
        name = (v.get("pokemon", {}) or {}).get("name")
        if isinstance(name, str) and name:
            out.append(name)
    return out


def tokens_from_varieties(species_name: str, varieties: list[str]) -> list[str]:
    tokens: set[str] = set()
    base = (species_name or "").strip().lower()

    for name in varieties:
        n = name.strip().lower()
        if not n:
            continue

        suffix = n
        if base and n.startswith(base + "-"):
            suffix = n[len(base) + 1 :]

        for part in suffix.split("-"):
            part = part.strip().lower()
            if not part:
                continue
            if part.isdigit():
                continue
            if len(part) < 4:
                continue
            if part in STOP_TOKENS:
                continue
            tokens.add(part)

    return sorted(tokens)


def extract_en_flavor_texts(species: dict) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for e in species.get("flavor_text_entries", []) or []:
        if (e.get("language", {}) or {}).get("name") != "en":
            continue
        version = ((e.get("version") or {}) or {}).get("name")
        text = normalize_text(e.get("flavor_text") or "").strip()
        if not version or not text:
            continue
        out.append((version, text))
    return out


def token_hits(texts: list[str], token: str) -> int:
    # Word-boundary match (case-insensitive). Tokens are lowercase already.
    # Example: token "green" matches "Green-feathered".
    pat = re.compile(r"\b" + re.escape(token) + r"\b", flags=re.IGNORECASE)
    return sum(1 for t in texts if pat.search(t))


def analyze_species(species_id: int) -> dict:
    species = fetch_json(f"{API}/pokemon-species/{species_id}")
    species_name = str(species.get("name") or "")
    varieties = get_variety_names(species)

    record: dict[str, Any] = {
        "species_id": species_id,
        "species_name": species_name,
        "variety_count": len(varieties),
        "varieties": varieties,
        "tokens": [],
        "heuristic": {
            "suspicious": False,
            "reason": "",
            "hits": {},
            "example": None,
        },
    }

    if len(varieties) <= 1:
        return record

    tokens = tokens_from_varieties(species_name, varieties)
    record["tokens"] = tokens

    # Heuristic: if there are >=2 meaningful tokens and the flavor text matches
    # some tokens but not others, flag it.
    ft = extract_en_flavor_texts(species)
    all_texts = [t for _, t in ft]

    meaningful = [t for t in tokens if t not in STOP_TOKENS]
    if len(meaningful) < 2 or not all_texts:
        return record

    hits: dict[str, int] = {tok: token_hits(all_texts, tok) for tok in meaningful}
    record["heuristic"]["hits"] = hits

    max_hit = max(hits.values() or [0])
    min_hit = min(hits.values() or [0])

    if max_hit > 0 and min_hit == 0:
        # Find an example text that contains any hit token.
        example = None
        for version, text in ft:
            for tok, h in hits.items():
                if h > 0 and re.search(r"\b" + re.escape(tok) + r"\b", text, re.IGNORECASE):
                    example = {"version": version, "token": tok, "text": text}
                    break
            if example:
                break

        record["heuristic"]["suspicious"] = True
        record["heuristic"]["reason"] = "Flavor texts reference some variety tokens but not others"
        record["heuristic"]["example"] = example

    return record


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--start", type=int, default=1)
    ap.add_argument("--end", type=int, default=1025)
    ap.add_argument("--out", type=str, default="")
    ap.add_argument("--sleep", type=float, default=0.0, help="Optional delay between requests")
    args = ap.parse_args(argv[1:])

    start = max(1, int(args.start))
    end = max(start, int(args.end))

    results: list[dict] = []
    multi = 0
    suspicious = 0

    for sid in range(start, end + 1):
        try:
            rec = analyze_species(sid)
        except Exception as e:
            print(f"ERROR species {sid}: {e}")
            continue

        results.append(rec)
        if rec["variety_count"] > 1:
            multi += 1
        if rec.get("heuristic", {}).get("suspicious"):
            suspicious += 1
            ex = rec["heuristic"].get("example") or {}
            print(
                f"FLAG {rec['species_id']} {rec['species_name']}: tokens={rec['tokens']} "
                f"example={ex.get('version')}({ex.get('token')})"
            )

        if args.sleep and args.sleep > 0:
            time.sleep(float(args.sleep))

    print("\nSummary")
    print(f"- Range: {start}..{end}")
    print(f"- Species scanned: {len(results)}")
    print(f"- Species with >1 variety: {multi}")
    print(f"- Heuristic flagged: {suspicious}")

    if args.out:
        with open(args.out, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"\nWrote: {args.out}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
