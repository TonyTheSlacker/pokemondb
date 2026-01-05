# Pokémon Database

![Language](https://img.shields.io/badge/Language-HTML5%20%2F%20CSS3%20%2F%20JavaScript-E34C26?logo=html5&logoColor=white)
![API](https://img.shields.io/badge/API-PokéAPI-FFCA12?logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI0ZGQ0ExMiIgZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMjAgMTAgMjAgMjAtNC40OCAyMC0xMFM0OC4yMyAyIDEyIDJ6Ii8+PC9zdmc+)
![UI](https://img.shields.io/badge/UI-Responsive%20Design-61DAFB)
![Storage](https://img.shields.io/badge/Storage-Client--side%20Caching-FCC624)

A comprehensive, interactive **Pokémon Database** web application that provides detailed information about 1,000+ Pokémon across multiple generations. Search, filter, and explore Pokémon by type, ability, egg group, and more with a modern, responsive interface.

The site is powered primarily by PokéAPI, with fallbacks for missing dex/move text and for Gen 8/9 encounters.

---

## ⚡ Key Features

* **Complete Pokédex Coverage:** Browse 1,000+ Pokémon with detailed stats, abilities, moves, and breeding information.
* **Multi-Pokedex Support:** Switch between different regional Pokédexes (National, Scarlet & Violet, Sword & Shield, Legends: Arceus, etc.).
* **Advanced Search & Filtering:** Filter Pokémon by type, ability, egg group, or search by name.
* **Form Variants Display:** View all Pokémon forms including Mega Evolutions, Alola forms, Galar forms, and Origin forms.
* **Evolution Chain Visualization:** See complete evolution chains with branching paths and conditional evolutions.
* **Move Sets:** Browse all moves by type, damage class, and effectiveness with detailed move information.
* **Pokémon Locations (Where to find):** Pokémon detail pages include a PokémonDB-style “Where to find” section under the moveset.
* **Locations Guide + Location Details:** Browse locations by region on the guide page, then open a location detail page to see encounter tables.
* **Type Effectiveness Chart:** Interactive chart showing type matchups and super-effective relationships.
* **Abilities Database:** Complete ability list with affected Pokémon and detailed descriptions.
* **Egg Groups & Breeding Info:** Find compatible breeding pairs and breeding mechanics for all Pokémon.
* **Responsive Design:** Fully responsive UI that works seamlessly on desktop, tablet, and mobile devices.
* **Dynamic Navigation:** Seamlessly navigate between detail pages while preserving your selected Pokédex context.

---

## 🛠️ Technical Architecture

### Frontend Stack
* **HTML5/CSS3:** Semantic markup with modern CSS Grid and Flexbox layouts.
* **Vanilla JavaScript:** No framework dependencies—pure JavaScript for performance and maintainability.
* **Client-side Caching:** Efficient data caching to minimize API calls.
* **URL Parameters:** State management via query strings for shareable links.

### Data Source
The application integrates multiple community data sources:
* **PokéAPI** (REST) — primary source for Pokémon, species, moves, evolution chains, etc.
* **GraphQL-Pokemon** (favware/graphql-pokemon) — fallback for missing dex flavor text and some move fields.
* **PokeDB Data Export** — used to backfill Gen 8/9 wild encounter tables where PokéAPI is incomplete (Galar/Hisui/Paldea).

Gen 8/9 encounter data is loaded from a compact local index:
* `data/pokedb-encounters-g8g9.json` — compact encounters index
* `data/pokedb-encounters-g8g9.js` — wraps the JSON into `window.__POKEDB_ENCOUNTERS_G8G9__` for `file://` compatibility
  * preloaded by `pages/pokemon-detail.html` and `pages/location-detail.html`

### Core Components
* **`index.html`:** Main hub with grid view, type filters, and move/type chart tabs.
* **`pages/pokemon-detail.html`:** Detailed view for individual Pokémon with stats, forms, abilities, and evolution chains.
  * Includes a PokémonDB-like “Where to find …” section below the moveset.
* **`pages/abilities.html`:** Searchable ability database with affected Pokémon listings.
* **`pages/egg-group.html`:** Breeding database organized by egg group.
* **`pages/locations.html`:** Locations guide page (region tabs → locations list).
* **`pages/location-detail.html`:** Location detail page (encounter tables + links back to Pokémon pages).
* **`js/script.js`:** Small loader that includes the split app scripts in order.
  * `js/script.part1.js` … `js/script.part4.js` contain the actual app logic.
* **`css/style.css`:** Base styling with dark theme and responsive breakpoints.
* **Detail Pages CSS:** Specialized styling for pokemon detail, abilities, and egg groups.

### Key Algorithms & Features
```javascript
// Example: Type Effectiveness Calculation
const TYPE_CHART_DATA = [
  // 18x18 matrix showing super-effective (2), not very effective (0.5), and neutral (1) matchups
];

function calculateTypeDefenses(types) {
    // Multiplies effectiveness for each type combination
    // Returns multiplier array for all 18 types
}
```

---

## 🚀 Installation & Usage

### Quick Start (No Installation Required!)
Simply open the **`index.html`** file in any modern web browser:
```
1. Download/clone the project
2. Open: index.html
3. Start exploring!
```

Tip: This project works when opened via `file://`, but running a local server avoids browser restrictions and tends to be more reliable.
For example:
* VS Code “Live Server” extension, or
* `python -m http.server` from the project folder.

### Browser Requirements
* Chrome 60+
* Firefox 55+
* Safari 12+
* Edge 79+
* Any modern browser with ES6 support

### Project Structure
```
PokemonDB/
├── index.html
├── Pokémon Database.html
├── pages/
│   ├── abilities.html
│   ├── ability-detail.html
│   ├── egg-group.html
│   ├── locations.html
│   ├── location-detail.html
│   ├── move-detail.html
│   └── pokemon-detail.html
├── js/
│   ├── script.js
│   ├── script.part1.js
│   ├── script.part2.js
│   ├── script.part3.js
│   └── script.part4.js
├── css/
│   ├── abilities.css
│   ├── ability-detail.css
│   ├── detail.css
│   ├── egg-group.css
│   ├── locations-guide.css
│   ├── locations.css
│   ├── move-detail.css
│   ├── moves-full.css
│   ├── moves.css
│   ├── style.css
│   └── typechart.css
├── data/
│   ├── pokedb-encounters-g8g9.json
│   └── pokedb-encounters-g8g9.js
└── tools/
  └── build_pokedb_encounters.py
```

---

## 📊 Supported Features

### Pokédex Coverage
* **National Pokédex** - All Pokémon currently available in PokéAPI
* **Regional Pokédexes** - Scarlet & Violet, Legends: Arceus, Sword & Shield, and 17+ others
* **Specialized Lists** - Shinydex, Competitive Pokédex, Size Pokédex, Pokémon GO

### Pokémon Forms Supported
* Mega Evolutions (Mega X, Mega Y)
* Gigantamax Forms
* Regional Variants (Alola, Galar, Hisui, Paldea)
* Origin Forms (Dialga, Palkia, Giratina)
* Special Forms (Primal Groudon/Kyogre, Therian Tornadus/Thundurus, etc.)

### Filtering Options
* **Type Filter:** Single or multiple type combinations
* **Ability Filter:** All regular and hidden abilities
* **Egg Group Filter:** 15 egg groups including special categories
* **Text Search:** Real-time name-based filtering

### Information Available Per Pokémon
* National and Regional Pokédex numbers
* Type(s) and effectiveness matchups
* Base stats with level 100 min/max calculations
* Height, weight, and growth rate
* Abilities (regular and hidden)
* Egg groups and breeding info
* Base friendship and experience yield
* All learnable moves (by level, TM, and breeding)
* Evolution chain with conditions
* Multiple form variants with different stats

---

## 🎨 Design Highlights

* **Dark Theme:** Eye-friendly dark mode with cyan/blue accent colors
* **Responsive Grid:** Adaptive layout from mobile (1 col) to desktop (4+ cols)
* **Interactive Elements:** Hover effects, smooth transitions, and active states
* **Type Colors:** Each type has its official color coding for quick visual identification
* **Loading States:** Skeleton screens and spinners for better UX during data fetching

---

## 🔄 Navigation Flow

```
index.html (Main Hub)
  ├── [Click Pokemon] → pages/pokemon-detail.html?id=X (Detail View)
    │   ├── [Previous/Next] → Navigate adjacent Pokémon
    │   ├── [Form Tab] → Switch between variants
  │   └── [Ability Link] → pages/ability-detail.html?ability=Y
    │
  ├── [Abilities Tab] → pages/abilities.html
  │   └── [Pokemon Card] → pages/pokemon-detail.html?id=X
    │
    ├── [Type Chart Tab] → Type effectiveness matrix
    │
    ├── [Moves Tab] → Full move database
    │   ├── Filter by type, damage class
    │   └── View Pokémon that learn each move
    │
    ├── [Sidebar Pokedex] → Switch between regional dexes
    │   └── Reload main page with selected dex
    │
    └── [Egg Groups] → pages/egg-group.html?group=Z
      └── [Pokemon Card] → pages/pokemon-detail.html?id=X
```

---

## 💡 Advanced Features

### Dynamic Navigation System
All pokedex links across detail pages use JavaScript handlers to preserve context and prevent redirects back to the main page. Clicking a pokedex from any page loads that dex directly.

### Form Variant Handling
The system intelligently detects and displays all form variants:
- Filters out duplicate base forms
- Shows form names with proper capitalization
- Maintains separate stats for each form
- Preserves evolution chains across forms

### Efficient Caching
* Stores fetched Pokémon data in memory
* Caches evolution chains and move data
* Reduces API calls through intelligent filtering

---

## 📝 Data Attribution

This project pulls data from multiple community sources:

* **[PokéAPI](https://pokeapi.co/)** — primary source for Pokémon, moves, species, and most relationships.
* **[GraphQL-Pokemon](https://github.com/favware/graphql-pokemon)** — fallback source for missing dex flavor text and some move fields.
* **[PokeDB Data Export](https://pokedb.org/data-export)** — used to backfill Gen 8/9 wild encounter tables where PokéAPI is currently incomplete.

The Gen 8/9 encounters index is generated into [data/pokedb-encounters-g8g9.json](data/pokedb-encounters-g8g9.json) using [tools/build_pokedb_encounters.py](tools/build_pokedb_encounters.py).
PokeDB’s export is provided for educational/research/non-commercial use and requests attribution; see their Data Export page for details.

### Regenerating encounter data
If PokeDB updates their export (or you want to refresh locally):

1) Build the compact JSON index:
```powershell
python tools/build_pokedb_encounters.py
```

2) Update the `file://` wrapper JS (so pages can load the index without fetching local JSON):
```powershell
$json = Get-Content data/pokedb-encounters-g8g9.json -Raw
"window.__POKEDB_ENCOUNTERS_G8G9__=$json" | Set-Content data/pokedb-encounters-g8g9.js -Encoding UTF8
```

Notes:
* The index is intentionally limited to **Galar / Hisui / Paldea** and mainline versions used by this site (SwSh / PLA / SV).
* Some encounter mechanics are simplified for display.

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
