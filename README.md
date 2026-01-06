
# Pokémon Database (static site)

![Language](https://img.shields.io/badge/Language-HTML5%20%2F%20CSS3%20%2F%20JavaScript-E34C26?logo=html5&logoColor=white)
![API](https://img.shields.io/badge/API-Pok%C3%A9API-FFCA12?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI0ZGQ0ExMiIgZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMjAgMTAgMjAgMjAtNC40OCAyMC0xMFM0OC4yMyAyIDEyIDJ6Ii8+PC9zdmc+)
![UI](https://img.shields.io/badge/UI-Responsive%20Design-61DAFB)
![Storage](https://img.shields.io/badge/Storage-Client--side%20Caching-FCC624)

This repo is a vanilla HTML/CSS/JS Pokémon “database” that runs entirely in the browser.
It pulls most data live from PokéAPI and uses a small local index (generated from PokeDB’s data export) as a fallback for encounter tables that PokéAPI often doesn’t provide.

There is no build step and no server-side code.

## Run locally

### Option A: open the file

Open `index.html` in your browser.

This usually works with `file://`, but some browsers are stricter about local file fetches.

### Option B: run a local web server (recommended)

From the repo root:

```bash
python -m http.server
```

Then open `http://localhost:8000/`.

## What’s implemented

### Main page

- Pokédex grid (search by name/ID, filter by type)
- A sidebar Pokédex menu (loads different Pokédex lists; some entries in the menu are placeholders)
- Moves tab (`index.html#moves`)
- Type chart tab (`index.html#type-chart`)

### Detail pages

- Pokémon details: `pages/pokemon-detail.html?id=...`
  - Uses PokéAPI `pokemon`, `pokemon-species`, and `evolution-chain`
  - Renders multiple varieties/forms for a species (from `pokemon-species.varieties`)
  - Shows a “Where to find …” section built from PokéAPI encounters, with a fallback index for games/regions where PokéAPI is missing tables

- Move detail: `pages/move-detail.html?move=...`
  - Uses PokéAPI move data
  - Falls back to GraphQL-Pokemon for some missing move fields
  - Note: when the GraphQL fallback is used, “learned by” lists are not available

- Abilities list + detail:
  - `pages/abilities.html`
  - `pages/ability-detail.html?ability=...`
  - The abilities list filters out entries with no English short effect / no Pokémon

- Egg groups:
  - `pages/egg-group.html?group=...`

- Locations guide + location detail:
  - `pages/locations.html`
  - `pages/location-detail.html?location=...`

## Data sources

- PokéAPI (`https://pokeapi.co/api/v2`) — primary live data
- GraphQL-Pokemon (`https://graphqlpokemon.favware.tech/v8`) — fallback for some missing dex flavor text and move fields
- PokeDB Data Export (`https://pokedb.org/data-export`) — used to generate a compact local encounters index

The generated encounter index lives in:

- `data/pokedb-encounters-g8g9.json`
- `data/pokedb-encounters-g8g9.js` (a wrapper that assigns the JSON to `window.__POKEDB_ENCOUNTERS_G8G9__` for `file://` compatibility)

## Regenerating the encounters index (optional)

`tools/build_pokedb_encounters.py` downloads PokeDB’s export JSON into `data/.cache/`, then writes the compact index into `data/`.

```bash
python tools/build_pokedb_encounters.py
```

## Notes about the code layout

- `js/script.js` is a tiny loader that `document.write`s `js/script.part1.js` … `js/script.part4.js` in order.
- `Pokémon Database.html` is a legacy filename that redirects to `index.html`.

## Tools (maintenance scripts)

The `tools/` folder contains small Python scripts used while developing the site:

- `audit_form_dex_entries.py`: heuristic audit for species with many varieties where flavor text may differ per form
- `summarize_form_dex_audit.py`: summary printer for the audit output JSON
- `check_where_to_find.py`: prints what PokéAPI returns for a Pokémon’s encounter endpoint and what the “evolve from …” fallback would use
- `check_alola_evos.py`: prints evolution chain details for a small set of Alola-related families

---

## 🐛 Known Limitations

* Offline mode not supported (requires internet for API calls)
* Move tutors and event-exclusive moves may have limited availability info
* Some encounter mechanics are simplified when displayed in tables (e.g., SV probability systems, raids)
* Some older generation form data may be sparse in PokéAPI
* Pokémon: Legends Z-A location/encounter rows are not available yet (placeholder messaging)

---

## 🚀 Future Enhancements

* [ ] Move tutor database
* [ ] Item encyclopedia
* [ ] Expand encounter coverage (more regions/versions)
* [ ] Battle simulator
* [ ] Build planner with competitive move sets
* [ ] Offline mode with local caching
* [ ] Team builder with compatibility checks
* [ ] Dark/Light theme toggle

---

## 📄 License

This is a fan project. Pokémon and Pokémon character names are trademarks of Nintendo / Game Freak / Creatures.
If you redistribute this project, make sure you comply with the terms of any upstream data sources (PokéAPI, GraphQL-Pokemon, PokeDB Data Export).

---

**Created as a fan/learning project.**
