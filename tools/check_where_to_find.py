"""Quick audit tool for the site's "Where to find" fallback logic.

This script uses PokeAPI only. For a given Pokémon (name or id), it prints:
- whether the PokeAPI encounters endpoint has any entries per version
- the evolution ancestors used for the "Evolve ..." fallback

Usage:
  python tools/check_where_to_find.py venusaur
  python tools/check_where_to_find.py 3
"""

from __future__ import annotations

import json
import sys
import urllib.request

API = "https://pokeapi.co/api/v2"


def fetch_json(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": "PokemonDB-tools/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = resp.read().decode("utf-8")
    return json.loads(data)


def get_species_chain(pokemon_identifier: str):
    p = fetch_json(f"{API}/pokemon/{pokemon_identifier}")
    s = fetch_json(p["species"]["url"])
    evo = fetch_json(s["evolution_chain"]["url"])
    return p, s, evo


def find_ancestors(chain_node: dict, target: str):
    target = target.lower()
    found = None

    def walk(node: dict, path: list[str]):
        nonlocal found
        if found is not None:
            return
        name = node.get("species", {}).get("name", "").lower()
        if not name:
            return
        if name == target:
            found = list(path)
            return
        next_path = path + [name]
        for child in node.get("evolves_to", []) or []:
            walk(child, next_path)

    walk(chain_node, [])
    return found or []


def get_encounter_versions(pokemon_id: int):
    encounters = fetch_json(f"{API}/pokemon/{pokemon_id}/encounters")
    versions: set[str] = set()
    for loc in encounters:
        for vd in loc.get("version_details", []) or []:
            v = vd.get("version", {}).get("name")
            if v:
                versions.add(v)
    return encounters, versions


def main(argv: list[str]) -> int:
    if len(argv) < 2:
        print("Usage: python tools/check_where_to_find.py <pokemon-name-or-id>")
        return 2

    ident = argv[1]
    p, s, evo = get_species_chain(ident)

    ancestors = find_ancestors(evo.get("chain", {}), s.get("name", ""))

    encounters, versions = get_encounter_versions(int(p["id"]))

    print(f"Pokemon: {p['name']} (id {p['id']})")
    print(f"Species: {s['name']}")
    print(f"Ancestors for evolve fallback: {', '.join(ancestors) if ancestors else '(none)'}")
    print(f"Encounter records: {len(encounters)}")
    print(f"Versions with any encounter data: {len(versions)}")

    # Show a few versions as a sanity check
    for v in sorted(list(versions))[:25]:
        print(f"  - {v}")
    if len(versions) > 25:
        print(f"  ... (+{len(versions)-25} more)")

    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
