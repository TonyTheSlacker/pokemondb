import datetime
import json
import os
import re
import shutil
import sys
import urllib.request

POKEDB_EXPORT_BASE = "https://cdn.pokedb.org"
URL_LOCATION_AREAS = f"{POKEDB_EXPORT_BASE}/data_export_location_areas_json"
URL_ENCOUNTERS = f"{POKEDB_EXPORT_BASE}/data_export_encounters_json"
URL_LOCATIONS = f"{POKEDB_EXPORT_BASE}/data_export_locations_json"

# Region identifiers used by PokeDB's export tables.
# NOTE: DLC areas appear as their own region_area_identifier (e.g. Isle of Armor, Crown Tundra).
TARGET_REGIONS = {
    "galar",
    "isle-of-armor",
    "crown-tundra",
    "hisui",
    "paldea",
    # Gen 7/8 games where PokeAPI encounter tables are commonly missing:
    "kanto",   # Let's Go
    "sinnoh",  # BDSP
}

TARGET_VERSIONS = {
    "sword",
    "shield",
    "legends-arceus",
    "scarlet",
    "violet",
    "lets-go-pikachu",
    "lets-go-eevee",
    "brilliant-diamond",
    "shining-pearl",
}

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
DATA_DIR = os.path.join(ROOT, "data")
CACHE_DIR = os.path.join(DATA_DIR, ".cache")

OUT_FILE = os.path.join(DATA_DIR, "pokedb-encounters-g8g9.json")
OUT_JS_FILE = os.path.join(DATA_DIR, "pokedb-encounters-g8g9.js")


def download(url: str, dest_path: str) -> None:
    os.makedirs(os.path.dirname(dest_path), exist_ok=True)
    if os.path.exists(dest_path) and os.path.getsize(dest_path) > 0:
        return
    print(f"Downloading {url} -> {dest_path}")
    with urllib.request.urlopen(url) as resp, open(dest_path, "wb") as f:
        shutil.copyfileobj(resp, f)


_num_re = re.compile(r"\d+")


def parse_level_range(levels_text: str):
    if not levels_text:
        return None, None
    nums = [int(x) for x in _num_re.findall(str(levels_text))]
    if not nums:
        return None, None
    return min(nums), max(nums)


def parse_percentish(value):
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    # Common forms: "20%", "0.2", "20".
    try:
        if s.endswith("%"):
            return float(s[:-1].strip())
        f = float(s)
        # Heuristic: probabilities often are 0..1
        if 0 <= f <= 1:
            return f * 100.0
        return f
    except ValueError:
        return None


def main() -> int:
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(CACHE_DIR, exist_ok=True)

    loc_areas_path = os.path.join(CACHE_DIR, "pokedb_location_areas.json")
    encounters_path = os.path.join(CACHE_DIR, "pokedb_encounters.json")
    locations_path = os.path.join(CACHE_DIR, "pokedb_locations.json")

    download(URL_LOCATION_AREAS, loc_areas_path)
    download(URL_ENCOUNTERS, encounters_path)
    download(URL_LOCATIONS, locations_path)

    print("Loading locations...")
    with open(locations_path, "r", encoding="utf-8") as f:
        locations = json.load(f)

    target_locations = set()
    location_to_region_area = {}
    for row in locations:
        loc_id = row.get("identifier")
        region = row.get("region_area_identifier")
        if not loc_id or not region:
            continue
        region_norm = str(region).lower()
        if region_norm in TARGET_REGIONS:
            target_locations.add(loc_id)
            location_to_region_area[loc_id] = region_norm

    print("Loading location areas...")
    with open(loc_areas_path, "r", encoding="utf-8") as f:
        location_areas = json.load(f)

    # Build mapping: location_area_identifier -> location_identifier
    area_to_location = {}
    target_area_ids = set()
    for row in location_areas:
        area_id = row.get("identifier")
        loc_id = row.get("location_identifier")
        if not area_id or not loc_id:
            continue
        area_to_location[area_id] = loc_id
        if loc_id in target_locations:
            target_area_ids.add(area_id)

    print(f"Target location areas: {len(target_area_ids)}")

    print("Loading encounters...")
    with open(encounters_path, "r", encoding="utf-8") as f:
        encounters = json.load(f)

    out_locations = {}

    for e in encounters:
        area_id = e.get("location_area_identifier")
        if area_id not in target_area_ids:
            continue

        versions = e.get("version_identifiers") or []
        versions = [v for v in versions if v in TARGET_VERSIONS]
        if not versions:
            continue

        loc_id = area_to_location.get(area_id)
        if not loc_id:
            continue

        pokemon_form = e.get("pokemon_form_identifier") or ""
        pokemon = str(pokemon_form)
        if pokemon.endswith("-default"):
            pokemon = pokemon[: -len("-default")]

        min_lvl, max_lvl = parse_level_range(e.get("levels"))

        # Prefer explicit rate_overall; else probability_overall.
        chance = parse_percentish(e.get("rate_overall"))
        if chance is None:
            chance = parse_percentish(e.get("probability_overall"))

        conditions = []
        if e.get("during_morning"):
            conditions.append("Time Morning")
        if e.get("during_day"):
            conditions.append("Time Day")
        if e.get("during_evening"):
            conditions.append("Time Evening")
        if e.get("during_night"):
            conditions.append("Time Night")

        # Weather checks (PLA) – show as detail chips.
        for key, label in [
            ("while_clear", "Weather Clear"),
            ("while_cloudy", "Weather Cloudy"),
            ("while_harsh_sunlight", "Weather Harsh Sunlight"),
            ("while_blizzard", "Weather Blizzard"),
        ]:
            if e.get(key):
                conditions.append(label)

        # Terrain (SV)
        for key, label in [
            ("on_terrain_land", "Terrain Land"),
            ("on_terrain_watersurface", "Terrain Water Surface"),
            ("on_terrain_underwater", "Terrain Underwater"),
            ("on_terrain_overland", "Terrain Overland"),
            ("on_terrain_sky", "Terrain Sky"),
        ]:
            if e.get(key):
                conditions.append(label)

        method = e.get("encounter_method_identifier") or "special"

        out_locations.setdefault(loc_id, []).append(
            {
                "pokemon": pokemon,
                "versions": versions,
                "method": method,
                "chance": chance,
                "minLevel": min_lvl,
                "maxLevel": max_lvl,
                "conditions": conditions,
                "area": area_id,
            }
        )

    meta = {
        "source": "PokeDB Data Export",
        "sourceUrl": "https://pokedb.org/data-export",
        "generatedAt": datetime.datetime.now(datetime.timezone.utc)
        .replace(microsecond=0)
        .isoformat()
        .replace("+00:00", "Z"),
        "regions": sorted(TARGET_REGIONS),
        "versions": sorted(TARGET_VERSIONS),
        "tables": {
            "encounters": URL_ENCOUNTERS,
            "location_areas": URL_LOCATION_AREAS,
            "locations": URL_LOCATIONS,
        },
        "note": "Provided for educational/research/non-commercial use per PokeDB guidelines; see sourceUrl for terms.",
    }

    payload = {
        "_meta": meta,
        "locations": out_locations,
        # Allows the frontend to split SwSh base game vs DLC rows (and similar future grouping)
        # without hardcoding location slug lists.
        "locationRegions": {k: location_to_region_area.get(k) for k in out_locations.keys()},
    }

    print(f"Writing {OUT_FILE} (locations={len(out_locations)})")
    with open(OUT_FILE, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, separators=(",", ":"))

    # Also write a JS wrapper for file:// browsing (fetching local JSON is often blocked).
    print(f"Writing {OUT_JS_FILE}")
    with open(OUT_JS_FILE, "w", encoding="utf-8") as f:
        f.write("window.__POKEDB_ENCOUNTERS_G8G9__ = ")
        f.write(json.dumps(payload, ensure_ascii=False, separators=(",", ":")))
        f.write(";\n")

    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
