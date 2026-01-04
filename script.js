const API = 'https://pokeapi.co/api/v2';
const TYPES = ['all', 'normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];
const TYPE_COLORS = {
normal: '#A8A878', fire: '#F08030', water: '#6890F0', grass: '#78C850', electric: '#F8D030',
ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0', ground: '#E0C068', flying: '#A890F0',
psychic: '#F85888', bug: '#A8B820', rock: '#B8A038', ghost: '#705898', dragon: '#7038F8',
dark: '#705848', steel: '#B8B8D0', fairy: '#EE99AC'
};

const EGG_GROUP_DISPLAY_NAMES = {
    'indeterminate': 'Amorphous',
    'humanshape': 'Human-Like',
    'plant': 'Grass',
    'ground': 'Field'
};

const EGG_GROUP_DESCRIPTIONS = {
    'indeterminate': 'Amorphous Pokémon (previously known as \'Indeterminate\') are not usually based on real creatures; instead they comprise shapeless blobs or gases. Most Ghost and Poison Pokémon are here.',
    'bug': 'Bug Pokémon are based on insects and other arthropods. They are among the most common Pokémon types.',
    'ditto': 'Ditto is the only Pokémon in this group. It can breed with any Pokémon from any other egg group (except No Eggs).',
    'dragon': 'Dragon Pokémon are reptilian creatures with powerful abilities. Most are Dragon-type, though some are dragon-like in appearance.',
    'fairy': 'Fairy Pokémon tend to be cute, whimsical creatures often associated with the Fairy type. Many are small and magical in nature.',
    'flying': 'Flying Pokémon are avian creatures or have wings. Most are Flying-type, though some are simply bird-like in appearance.',
    'ground': 'Field Pokémon comprise mostly land-dwelling mammals. This is the largest egg group, containing a wide variety of terrestrial creatures.',
    'plant': 'Grass Pokémon are plant-based creatures. Most are Grass-type and share botanical characteristics.',
    'humanshape': 'Human-Like Pokémon are bipedal with humanoid body structures. They often have arms, legs, and human-like proportions.',
    'mineral': 'Mineral Pokémon are inorganic or rock-based creatures. Many are Rock, Steel, or Ground-type.',
    'monster': 'Monster Pokémon are large, powerful creatures. This group includes many of the most iconic and strongest Pokémon.',
    'no-eggs': 'These Pokémon cannot breed. This group includes Legendary Pokémon, Mythical Pokémon, Baby Pokémon, and certain special forms.',
    'water1': 'Water 1 Pokémon are primarily fish and other aquatic creatures that live in water. Most are Water-type.',
    'water2': 'Water 2 Pokémon are amphibious creatures that can live both in water and on land. Many are based on amphibians and reptiles.',
    'water3': 'Water 3 Pokémon are shellfish, crustaceans, and other invertebrates. Most have shells or exoskeletons.'
};

function getEggGroupDisplayName(apiName) {
    if (EGG_GROUP_DISPLAY_NAMES[apiName]) {
        return EGG_GROUP_DISPLAY_NAMES[apiName];
    }
    return apiName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

let allPokemon = [];
let pokemon = [];
let allMoves = [];
let moves = [];
let filter = 'all';
let damageClassFilter = 'all';
let currentPage = 'pokedex';
const typeCache = {};
const damageClassCache = {};

const DAMAGE_CLASSES = ['all', 'physical', 'special', 'status'];

// 0: No effect, 0.5: Not very effective, 1: Normal, 2: Super effective
// Rows: Attacker, Cols: Defender
// Order: NOR, FIR, WAT, ELE, GRA, ICE, FIG, POI, GRO, FLY, PSY, BUG, ROC, GHO, DRA, DAR, STE, FAI
const TYPE_CHART_DATA = [
[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.5, 0, 1, 1, 0.5, 1], // Normal
[1, 0.5, 0.5, 1, 2, 2, 1, 1, 1, 1, 1, 2, 0.5, 1, 0.5, 1, 2, 1], // Fire
[1, 2, 0.5, 1, 0.5, 1, 1, 1, 2, 1, 1, 1, 2, 1, 0.5, 1, 1, 1], // Water
[1, 1, 2, 0.5, 0.5, 1, 1, 1, 0, 2, 1, 1, 1, 1, 0.5, 1, 1, 1], // Electric
[1, 0.5, 2, 1, 0.5, 1, 1, 0.5, 2, 0.5, 1, 0.5, 2, 1, 0.5, 1, 0.5, 1], // Grass
[1, 0.5, 0.5, 1, 2, 0.5, 1, 1, 2, 2, 1, 1, 1, 1, 2, 1, 0.5, 1], // Ice
[2, 1, 1, 1, 1, 2, 1, 0.5, 1, 0.5, 0.5, 0.5, 2, 0, 1, 2, 2, 0.5], // Fighting
[1, 1, 1, 1, 2, 1, 1, 0.5, 0.5, 1, 1, 1, 0.5, 0.5, 1, 1, 0, 2], // Poison
[1, 2, 1, 2, 0.5, 1, 1, 2, 1, 0, 1, 0.5, 2, 1, 1, 1, 2, 1], // Ground
[1, 1, 1, 0.5, 2, 1, 2, 1, 1, 1, 1, 2, 0.5, 1, 1, 1, 0.5, 1], // Flying
[1, 1, 1, 1, 1, 1, 2, 2, 1, 1, 0.5, 1, 1, 1, 1, 0, 0.5, 1], // Psychic
[1, 0.5, 1, 1, 2, 1, 0.5, 0.5, 1, 0.5, 2, 1, 1, 0.5, 1, 2, 0.5, 0.5], // Bug
[1, 2, 1, 1, 1, 2, 0.5, 1, 0.5, 2, 1, 2, 1, 1, 1, 1, 0.5, 1], // Rock
[0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 0.5, 1, 1], // Ghost
[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 0.5, 0], // Dragon
[1, 1, 1, 1, 1, 1, 0.5, 1, 1, 1, 2, 1, 1, 2, 1, 0.5, 1, 0.5], // Dark
[1, 0.5, 0.5, 0.5, 1, 2, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 0.5, 2], // Steel
[1, 0.5, 1, 1, 1, 1, 2, 0.5, 1, 1, 1, 1, 1, 1, 2, 2, 0.5, 1] // Fairy
];

const TYPE_ORDER = ['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];

const VERSION_GROUP_TO_GEN = {
'red-blue': 1, 'yellow': 1,
'gold-silver': 2, 'crystal': 2,
'ruby-sapphire': 3, 'emerald': 3, 'firered-leafgreen': 3,
'diamond-pearl': 4, 'platinum': 4, 'heartgold-soulsilver': 4,
'black-white': 5, 'black-2-white-2': 5,
'x-y': 6, 'omega-ruby-alpha-sapphire': 6,
'sun-moon': 7, 'ultra-sun-ultra-moon': 7, 'lets-go-pikachu-lets-go-eevee': 7,
'sword-shield': 8, 'brilliant-diamond-shining-pearl': 8, 'legends-arceus': 8,
'scarlet-violet': 9
};

// Mainline game versions for dex flavor text (pokemon-species.flavor_text_entries)
const MAINLINE_VERSION_META = {
    // Gen I
    'red': { gen: 1, label: 'Red' },
    'blue': { gen: 1, label: 'Blue' },
    'yellow': { gen: 1, label: 'Yellow' },

    // Gen II
    'gold': { gen: 2, label: 'Gold' },
    'silver': { gen: 2, label: 'Silver' },
    'crystal': { gen: 2, label: 'Crystal' },

    // Gen III
    'ruby': { gen: 3, label: 'Ruby' },
    'sapphire': { gen: 3, label: 'Sapphire' },
    'emerald': { gen: 3, label: 'Emerald' },
    'firered': { gen: 3, label: 'FireRed' },
    'leafgreen': { gen: 3, label: 'LeafGreen' },

    // Gen IV
    'diamond': { gen: 4, label: 'Diamond' },
    'pearl': { gen: 4, label: 'Pearl' },
    'platinum': { gen: 4, label: 'Platinum' },
    'heartgold': { gen: 4, label: 'HeartGold' },
    'soulsilver': { gen: 4, label: 'SoulSilver' },

    // Gen V
    'black': { gen: 5, label: 'Black' },
    'white': { gen: 5, label: 'White' },
    'black-2': { gen: 5, label: 'Black 2' },
    'white-2': { gen: 5, label: 'White 2' },

    // Gen VI
    'x': { gen: 6, label: 'X' },
    'y': { gen: 6, label: 'Y' },
    'omega-ruby': { gen: 6, label: 'Omega Ruby' },
    'alpha-sapphire': { gen: 6, label: 'Alpha Sapphire' },

    // Gen VII
    'sun': { gen: 7, label: 'Sun' },
    'moon': { gen: 7, label: 'Moon' },
    'ultra-sun': { gen: 7, label: 'Ultra Sun' },
    'ultra-moon': { gen: 7, label: 'Ultra Moon' },
    'lets-go-pikachu': { gen: 7, label: "Let's Go Pikachu" },
    'lets-go-eevee': { gen: 7, label: "Let's Go Eevee" },

    // Gen VIII
    'sword': { gen: 8, label: 'Sword' },
    'shield': { gen: 8, label: 'Shield' },
    'brilliant-diamond': { gen: 8, label: 'Brilliant Diamond' },
    'shining-pearl': { gen: 8, label: 'Shining Pearl' },
    'legends-arceus': { gen: 8, label: 'Legends: Arceus' },

    // Gen IX
    'scarlet': { gen: 9, label: 'Scarlet' },
    'violet': { gen: 9, label: 'Violet' },
    // Not currently present in PokeAPI as of now, but included for forward-compat.
    'legends-z-a': { gen: 9, label: 'Legends: Z-A' }
};

const GEN_VERSION_ORDER = {
    1: ['red', 'blue', 'yellow'],
    2: ['gold', 'silver', 'crystal'],
    3: ['ruby', 'sapphire', 'emerald', 'firered', 'leafgreen'],
    4: ['diamond', 'pearl', 'platinum', 'heartgold', 'soulsilver'],
    5: ['black', 'white', 'black-2', 'white-2'],
    6: ['x', 'y', 'omega-ruby', 'alpha-sapphire'],
    7: ['sun', 'moon', 'ultra-sun', 'ultra-moon', 'lets-go-pikachu', 'lets-go-eevee'],
    8: ['sword', 'shield', 'brilliant-diamond', 'shining-pearl', 'legends-arceus'],
    9: ['scarlet', 'violet', 'legends-z-a']
};

// GraphQL-Pokemon fallback (favware/graphql-pokemon)
// Used to fill gaps where PokeAPI lacks newer dex entries / descriptions.
const GQL_POKEMON_API = 'https://graphqlpokemon.favware.tech/v8';

// Map GraphQL-Pokemon flavorTexts.game (display names) -> PokeAPI version keys
// e.g. "Omega Ruby" -> "omega-ruby".
const MAINLINE_LABEL_TO_VERSION = (() => {
    const map = {};
    for (const [versionKey, meta] of Object.entries(MAINLINE_VERSION_META)) {
        if (meta?.label) map[meta.label] = versionKey;
    }
    return map;
})();

const gqlRequestCache = new Map();

async function fetchGraphqlPokemon(query, variables) {
    const cacheKey = JSON.stringify({ query, variables: variables || null });
    if (gqlRequestCache.has(cacheKey)) return gqlRequestCache.get(cacheKey);

    const p = (async () => {
        const res = await fetch(GQL_POKEMON_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, variables: variables || {} })
        });

        const json = await res.json().catch(() => null);
        if (!res.ok) {
            throw new Error(`GraphQL-Pokemon HTTP ${res.status}`);
        }
        if (json?.errors?.length) {
            const msg = json.errors.map(e => e?.message).filter(Boolean).join('; ') || 'GraphQL error';
            throw new Error(msg);
        }
        return json;
    })();

    gqlRequestCache.set(cacheKey, p);
    return p;
}

async function fetchGraphqlDexFlavorTextsByDexNumber(dexNumber) {
    if (!Number.isFinite(dexNumber)) return null;
    const query = `query($n: Int!, $take: Int, $rev: Boolean){
        getPokemonByDexNumber(number: $n, takeFlavorTexts: $take, reverseFlavorTexts: $rev){
            num
            species
            flavorTexts { game flavor }
        }
    }`;
    const json = await fetchGraphqlPokemon(query, { n: dexNumber, take: 50, rev: false });
    const flavorTexts = json?.data?.getPokemonByDexNumber?.flavorTexts;
    if (!Array.isArray(flavorTexts) || !flavorTexts.length) return null;

    const byVersion = {};
    for (const ft of flavorTexts) {
        const game = ft?.game;
        const text = normalizeFlavorText(ft?.flavor);
        if (!game || !text) continue;
        const versionKey = MAINLINE_LABEL_TO_VERSION[game];
        if (!versionKey) continue;
        if (!byVersion[versionKey]) byVersion[versionKey] = text;
    }
    return Object.keys(byVersion).length ? byVersion : null;
}

async function fetchGraphqlMoveFallback(moveQuery) {
    if (!moveQuery) return null;
    const query = `query($q: String!, $take: Int){
        getFuzzyMove(move: $q, take: $take){
            name
            shortDesc
            desc
            accuracy
            pp
            priority
            basePower
            type
            category
        }
    }`;
    const json = await fetchGraphqlPokemon(query, { q: String(moveQuery), take: 1 });
    const result = json?.data?.getFuzzyMove;
    if (!Array.isArray(result) || !result.length) return null;
    return result[0] || null;
}

function normalizeFlavorText(text) {
    return (text || '')
        .replace(/\f/g, ' ')
        .replace(/\n/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function buildDexEntriesByGeneration(species) {
    const byVersion = new Map();
    const entries = (species?.flavor_text_entries || []).filter(e => e?.language?.name === 'en');

    for (const entry of entries) {
        const versionName = entry?.version?.name;
        if (!versionName) continue;
        if (!MAINLINE_VERSION_META[versionName]) continue;
        if (byVersion.has(versionName)) continue;

        const text = normalizeFlavorText(entry.flavor_text);
        if (!text) continue;
        byVersion.set(versionName, text);
    }

    // Optional GraphQL-Pokemon fallback entries (keyed by PokeAPI version keys)
    const gqlExtras = species?.__gqlDexByVersion;
    if (gqlExtras && typeof gqlExtras === 'object') {
        for (const [versionKey, textRaw] of Object.entries(gqlExtras)) {
            if (!versionKey || byVersion.has(versionKey)) continue;
            const text = normalizeFlavorText(textRaw);
            if (!text) continue;
            if (!MAINLINE_VERSION_META[versionKey]) continue;
            byVersion.set(versionKey, text);
        }
    }

    const byGen = {};
    for (let gen = 1; gen <= 9; gen++) {
        const order = GEN_VERSION_ORDER[gen] || [];
        const rows = order
            .filter(v => byVersion.has(v))
            .map(v => ({
                version: v,
                label: MAINLINE_VERSION_META[v].label,
                text: byVersion.get(v)
            }));
        if (rows.length) byGen[gen] = rows;
    }

    return byGen;
}

function renderDexEntriesSectionHtml(species) {
    const byGen = buildDexEntriesByGeneration(species);

    const gensWithEntries = Object.keys(byGen)
        .map(n => parseInt(n, 10))
        .filter(n => !Number.isNaN(n))
        .sort((a, b) => a - b);
    const firstActiveGen = gensWithEntries[0] || 1;

    const allGens = [1, 2, 3, 4, 5, 6, 7, 8, 9];

    const tabs = allGens.map(gen => {
        const active = gen === firstActiveGen ? ' active' : '';
        return `<button type="button" class="dex-tab${active}" data-dex-gen="${gen}" role="tab">Gen ${gen}</button>`;
    }).join('');

    const panels = allGens.map(gen => {
        const active = gen === firstActiveGen ? ' active' : '';
        const rowsData = byGen[gen] || [];
        const rows = rowsData
            .map(r => `
                <div class="dex-entry-row">
                    <div class="dex-entry-game">${r.label}</div>
                    <div class="dex-entry-text">${r.text}</div>
                </div>
            `)
            .join('');

        let emptyText = 'No entries for this generation.';
        if (gen === 9) emptyText = 'No Scarlet/Violet entries for this species in PokeAPI.';
        const empty = rowsData.length ? '' : `<div class="dex-empty">${emptyText}</div>`;

        return `
            <div class="dex-panel${active}" data-dex-panel="${gen}" role="tabpanel">
                ${rows || empty}
            </div>
        `;
    }).join('');

    return `
        <div class="full-width-section dex-entries-section">
            <h3 class="section-header">Pokédex entries</h3>
            <div class="dex-tabs" role="tablist">${tabs}</div>
            <div class="dex-panels">${panels}</div>
        </div>
    `;
}

function setupDexEntryTabs(root) {

    if (!root) return;
    const tabs = root.querySelectorAll('.dex-tab');
    if (!tabs.length) return;

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const gen = tab.dataset.dexGen;
            root.querySelectorAll('.dex-tab').forEach(t => t.classList.remove('active'));
            root.querySelectorAll('.dex-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            const panel = root.querySelector(`.dex-panel[data-dex-panel="${gen}"]`);
            if (panel) panel.classList.add('active');
        });
    });
}

function parseDexId(raw) {
    if (raw == null) return null;
    if (raw === 'all') return 'all';
    if (/^\d+$/.test(String(raw))) return parseInt(String(raw), 10);
    return raw;
}

function setupActionDelegation() {
    if (setupActionDelegation._installed) return;
    setupActionDelegation._installed = true;

    document.addEventListener('click', (e) => {
        const el = e.target?.closest?.('[data-action]');
        if (!el) return;

        const action = el.dataset.action;
        if (!action) return;

        // Most of these are anchors; keep SPA-like behavior.
        e.preventDefault();

        switch (action) {
            case 'toggle-pokedex-menu':
                togglePokedexMenu(el);
                return;
            case 'toggle-egg-group-menu':
                toggleEggGroupMenu(el);
                return;
            case 'load-pokedex': {
                const id = parseDexId(el.dataset.dexId);
                const name = el.dataset.dexName || '';
                loadPokedex(id, name, el);
                return;
            }
            case 'navigate-pokedex': {
                const id = parseDexId(el.dataset.dexId);
                const name = el.dataset.dexName || '';
                navigateToPokedex(id, name);
                return;
            }
            case 'switch-page':
                switchPage(el.dataset.page, el);
                return;
            case 'close-modal':
                closeModal();
                return;
            case 'set-type-filter':
                setFilter(el.dataset.type, el);
                return;
            case 'set-damage-class-filter':
                setDamageClassFilter(el.dataset.damageClass, el);
                return;
            case 'open-pokemon':
                window.location.href = `pokemon.html?id=${el.dataset.pokemonId}`;
                return;
            case 'open-move':
                moveDetail(el.dataset.moveId);
                return;
            case 'sort-moves':
                sortMoves(el.dataset.field);
                return;
            case 'change-moves-page':
                changeMovesPage(parseInt(el.dataset.delta || '0', 10));
                return;
            case 'switch-gen-tab':
                switchGenTab(parseInt(el.dataset.gen || '0', 10));
                return;
            case 'filter-by-ability':
                filterByAbility(el.dataset.ability, e);
                return;
            case 'clear-ability-filter':
                init();
                return;
            case 'load-location':
                loadLocationFromInput();
                return;
            case 'show-ability-pokemon':
                showAbilityPokemon(el.dataset.ability);
                return;
            case 'sort-abilities':
                sortAbilitiesTable(parseInt(el.dataset.sortColumn || '0', 10));
                return;
            default:
                return;
        }
    });
}

// --- Locations page (PokeAPI location + encounters) ---

const versionGroupCache = new Map(); // versionName -> versionGroupName
const versionGenCache = new Map(); // versionName -> generationNumber

const VERSION_ABBREVIATIONS = {
    'red': 'R',
    'blue': 'B',
    'yellow': 'Y',
    'gold': 'G',
    'silver': 'S',
    'crystal': 'C',
    'ruby': 'R',
    'sapphire': 'S',
    'emerald': 'E',
    'firered': 'FR',
    'leafgreen': 'LG',
    'diamond': 'D',
    'pearl': 'P',
    'platinum': 'Pt',
    'heartgold': 'HG',
    'soulsilver': 'SS',
    'black': 'B',
    'white': 'W',
    'black-2': 'B2',
    'white-2': 'W2',
    'x': 'X',
    'y': 'Y',
    'omega-ruby': 'OR',
    'alpha-sapphire': 'AS',
    'sun': 'S',
    'moon': 'M',
    'ultra-sun': 'US',
    'ultra-moon': 'UM',
    'lets-go-pikachu': 'LGP',
    'lets-go-eevee': 'LGE',
    'sword': 'Sw',
    'shield': 'Sh',
    'brilliant-diamond': 'BD',
    'shining-pearl': 'SP',
    'legends-arceus': 'LA',
    'scarlet': 'Sc',
    'violet': 'Vi'
};

function slugToTitle(text) {
    return String(text || '')
        .replace(/_/g, '-')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

function parseIdFromUrl(url) {
    try {
        return parseInt(String(url).split('/').filter(Boolean).pop(), 10);
    } catch {
        return NaN;
    }
}

async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
    return res.json();
}

async function promisePool(items, concurrency, worker) {
    const results = new Array(items.length);
    let idx = 0;

    const runners = new Array(Math.min(concurrency, items.length)).fill(0).map(async () => {
        while (idx < items.length) {
            const cur = idx++;
            results[cur] = await worker(items[cur], cur);
        }
    });

    await Promise.all(runners);
    return results;
}

function getVersionAbbrev(versionName) {
    const v = String(versionName || '');
    if (VERSION_ABBREVIATIONS[v]) return VERSION_ABBREVIATIONS[v];
    if (MAINLINE_VERSION_META[v]?.label) {
        // e.g. "FireRed" -> "FR"
        const label = MAINLINE_VERSION_META[v].label;
        const caps = label.match(/[A-Z]/g);
        if (caps && caps.length >= 2) return caps.slice(0, 3).join('');
    }

    const parts = v.split('-').filter(Boolean);
    const abbr = parts.map(p => p[0]?.toUpperCase() || '').join('');
    return abbr.slice(0, 3) || v.slice(0, 3).toUpperCase();
}

async function getGenerationForVersion(versionName) {
    const v = String(versionName || '');
    if (!v) return null;
    if (versionGenCache.has(v)) return versionGenCache.get(v);

    let versionGroup = versionGroupCache.get(v);
    if (!versionGroup) {
        const versionData = await fetchJson(`${API}/version/${v}`);
        versionGroup = versionData?.version_group?.name;
        if (versionGroup) versionGroupCache.set(v, versionGroup);
    }

    const gen = VERSION_GROUP_TO_GEN[versionGroup] || null;
    versionGenCache.set(v, gen);
    return gen;
}

function methodDisplay(methodName) {
    const m = String(methodName || '');
    const map = {
        'walk': { title: 'Walking', subtitle: 'Walking in grass or a cave' },
        'surf': { title: 'Surfing', subtitle: 'Surfing on water' },
        'old-rod': { title: 'Old Rod', subtitle: 'Fishing with the Old Rod' },
        'good-rod': { title: 'Good Rod', subtitle: 'Fishing with the Good Rod' },
        'super-rod': { title: 'Super Rod', subtitle: 'Fishing with the Super Rod' },
        'rock-smash': { title: 'Rock Smash', subtitle: 'Smashing breakable rocks' },
        'headbutt': { title: 'Headbutt', subtitle: 'Headbutt large trees in the field' },
        'gift': { title: 'Special', subtitle: 'Special encounter' },
        'special': { title: 'Special', subtitle: 'Special encounter' }
    };
    if (map[m]) return map[m];
    return { title: slugToTitle(m), subtitle: '' };
}

function formatLevelRange(minLevel, maxLevel) {
    const min = Number(minLevel);
    const max = Number(maxLevel);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return '-';
    if (min === max) return String(min);
    return `${min}-${max}`;
}

function rarityIconHtml(chance) {
    const n = Number(chance);
    if (!Number.isFinite(n) || n < 0) return '<span class="details-muted">-</span>';

    let cls = 'rate-limited';
    let label = 'Limited';
    if (n >= 21) {
        cls = 'rate-common';
        label = 'Common (21-100%)';
    } else if (n >= 6) {
        cls = 'rate-uncommon';
        label = 'Uncommon (6-20%)';
    } else if (n >= 1) {
        cls = 'rate-rare';
        label = 'Rare (1-5%)';
    }

    const exact = Number.isFinite(n) ? `${n}%` : '';
    return `<span class="rate-icon ${cls}" title="${label}${exact ? ` — ${exact}` : ''}"></span>`;
}

function extractTimeTokens(conditions) {
    const src = Array.isArray(conditions) ? conditions : [];
    return src
        .map(c => String(c || ''))
        .filter(c => c.startsWith('Time '))
        .map(c => c.replace(/^Time\s+/, '').trim().toLowerCase());
}

function extractSeasonTokens(conditions) {
    const src = Array.isArray(conditions) ? conditions : [];
    return src
        .map(c => String(c || ''))
        .filter(c => c.startsWith('Season '))
        .map(c => c.replace(/^Season\s+/, '').trim().toLowerCase());
}

function timeIconsHtml(conditions) {
    const tokens = extractTimeTokens(conditions);
    if (!tokens.length) return '<span class="details-muted">-</span>';

    const uniq = Array.from(new Set(tokens));
    const order = ['morning', 'day', 'night'];
    uniq.sort((a, b) => order.indexOf(a) - order.indexOf(b));

    const map = {
        morning: { cls: 'ico-morning', title: 'Morning', text: 'M' },
        day: { cls: 'ico-day', title: 'Day', text: 'D' },
        night: { cls: 'ico-night', title: 'Night', text: 'N' }
    };

    return uniq
        .map(t => {
            const m = map[t] || { cls: 'ico-generic', title: slugToTitle(t), text: (t[0] || '?').toUpperCase() };
            return `<span class="mini-icon ${m.cls}" title="${m.title}">${m.text}</span>`;
        })
        .join('');
}

function seasonIconsHtml(conditions) {
    const tokens = extractSeasonTokens(conditions);
    if (!tokens.length) return '';

    const uniq = Array.from(new Set(tokens));
    const order = ['spring', 'summer', 'autumn', 'fall', 'winter'];
    uniq.sort((a, b) => order.indexOf(a) - order.indexOf(b));

    const normalize = (t) => (t === 'fall' ? 'autumn' : t);
    const map = {
        spring: { cls: 'ico-spring', title: 'Spring', text: 'Sp' },
        summer: { cls: 'ico-summer', title: 'Summer', text: 'Su' },
        autumn: { cls: 'ico-autumn', title: 'Autumn', text: 'Au' },
        winter: { cls: 'ico-winter', title: 'Winter', text: 'Wi' }
    };

    return uniq
        .map(t => {
            const k = normalize(t);
            const m = map[k] || { cls: 'ico-generic', title: slugToTitle(k), text: k.slice(0, 2) };
            return `<span class="mini-icon ${m.cls}" title="${m.title}">${m.text}</span>`;
        })
        .join('');
}

function shortConditionChip(label) {
    const raw = String(label || '').trim();
    if (!raw) return '';
    const shortened = raw
        .replace(/^Radio\s+/i, 'Radio ')
        .replace(/^Slot\s+/i, '')
        .replace(/^Swarm\s+/i, 'Swarm ');
    return `<span class="cond-chip" title="${raw}">${shortened}</span>`;
}

function buildKeyToIconsHtml() {
    return `
        <div class="icon-key">
            <div class="icon-key-title">Key to icons</div>
            <div class="icon-key-sub">These icons are used throughout the location guide.</div>
            <div class="icon-key-grid">
                <div class="icon-key-col">
                    <div class="icon-key-col-title">Times</div>
                    <div class="icon-key-row"><span class="mini-icon ico-morning" title="Morning">M</span><span>Morning</span></div>
                    <div class="icon-key-row"><span class="mini-icon ico-day" title="Day">D</span><span>Day</span></div>
                    <div class="icon-key-row"><span class="mini-icon ico-night" title="Night">N</span><span>Night</span></div>
                </div>
                <div class="icon-key-col">
                    <div class="icon-key-col-title">Seasons</div>
                    <div class="icon-key-row"><span class="mini-icon ico-spring" title="Spring">Sp</span><span>Spring</span></div>
                    <div class="icon-key-row"><span class="mini-icon ico-summer" title="Summer">Su</span><span>Summer</span></div>
                    <div class="icon-key-row"><span class="mini-icon ico-autumn" title="Autumn">Au</span><span>Autumn</span></div>
                    <div class="icon-key-row"><span class="mini-icon ico-winter" title="Winter">Wi</span><span>Winter</span></div>
                </div>
                <div class="icon-key-col">
                    <div class="icon-key-col-title">Encounter rates</div>
                    <div class="icon-key-row"><span class="rate-icon rate-common" title="Common (21-100%)"></span><span>Common (21-100%)</span></div>
                    <div class="icon-key-row"><span class="rate-icon rate-uncommon" title="Uncommon (6-20%)"></span><span>Uncommon (6-20%)</span></div>
                    <div class="icon-key-row"><span class="rate-icon rate-rare" title="Rare (1-5%)"></span><span>Rare (1-5%)</span></div>
                    <div class="icon-key-row"><span class="rate-icon rate-limited" title="Limited"></span><span>Limited</span></div>
                </div>
            </div>
        </div>
    `;
}

function sortMethodKey(methodName) {
    const order = ['walk', 'surf', 'old-rod', 'good-rod', 'super-rod', 'rock-smash', 'headbutt', 'special', 'gift'];
    const idx = order.indexOf(methodName);
    return idx === -1 ? 999 : idx;
}

function getLocationNameParts(locationSlug) {
    const slug = String(locationSlug || '');
    const parts = slug.split('-');
    const regionCandidates = ['kanto', 'johto', 'hoenn', 'sinnoh', 'unova', 'kalos', 'alola', 'galar', 'hisui', 'paldea'];
    const region = parts.find(p => regionCandidates.includes(p)) || '';
    const cleaned = parts.filter(p => p !== region);
    return {
        region,
        title: slugToTitle(cleaned.join('-') || slug),
        regionTitle: region ? slugToTitle(region) : ''
    };
}

// PokeDB encounter fallback (https://pokedb.org/data-export)
// Used only when PokeAPI returns empty encounter tables for Gen 8/9 regions.
const POKEDB_ENCOUNTERS_INDEX_URL = 'data/pokedb-encounters-g8g9.json';
let pokedbEncountersIndexPromise = null;
const pokemonIdByNameCache = new Map();

// Pokemon detail: build a version -> locations map (PokeAPI encounters + PokeDB fallback)
const whereToFindByPokemonCache = new Map();
const locationAreaToLocationCache = new Map();

const WHERE_TO_FIND_GROUPS = [
    { gen: 1, labels: ['Red', 'Blue', 'Yellow'], versions: ['red', 'blue', 'yellow'] },
    { gen: 2, labels: ['Gold', 'Silver', 'Crystal'], versions: ['gold', 'silver', 'crystal'] },
    { gen: 3, labels: ['Ruby', 'Sapphire', 'Emerald'], versions: ['ruby', 'sapphire', 'emerald'] },
    { gen: 3, labels: ['FireRed', 'LeafGreen'], versions: ['firered', 'leafgreen'] },
    { gen: 4, labels: ['Diamond', 'Pearl', 'Platinum'], versions: ['diamond', 'pearl', 'platinum'] },
    { gen: 4, labels: ['HeartGold', 'SoulSilver'], versions: ['heartgold', 'soulsilver'] },
    { gen: 5, labels: ['Black', 'White'], versions: ['black', 'white'] },
    { gen: 5, labels: ['Black 2', 'White 2'], versions: ['black-2', 'white-2'] },
    { gen: 6, labels: ['X', 'Y'], versions: ['x', 'y'] },
    { gen: 6, labels: ['Omega Ruby', 'Alpha Sapphire'], versions: ['omega-ruby', 'alpha-sapphire'] },
    { gen: 7, labels: ['Sun', 'Moon'], versions: ['sun', 'moon'] },
    { gen: 7, labels: ['Ultra Sun', 'Ultra Moon'], versions: ['ultra-sun', 'ultra-moon'] },
    { gen: 7, labels: ["Let's Go Pikachu", "Let's Go Eevee"], versions: ['lets-go-pikachu', 'lets-go-eevee'] },
    { gen: 8, labels: ['Sword', 'Shield'], versions: ['sword', 'shield'] },
    { gen: 8, labels: ['Brilliant Diamond', 'Shining Pearl'], versions: ['brilliant-diamond', 'shining-pearl'] },
    { gen: 8, labels: ['Legends: Arceus'], versions: ['legends-arceus'] },
    { gen: 9, labels: ['Scarlet', 'Violet'], versions: ['scarlet', 'violet'] },
    { gen: 9, labels: ['Legends: Z-A'], versions: ['legends-z-a'] }
];

function getSpeciesIntroducedGen(species) {
    const url = species?.generation?.url;
    const id = parseIdFromUrl(url);
    return Number.isFinite(id) ? id : null;
}

async function getLocationForLocationAreaUrl(areaUrl) {
    if (!areaUrl) return null;
    if (locationAreaToLocationCache.has(areaUrl)) return locationAreaToLocationCache.get(areaUrl);
    const p = fetchJson(areaUrl)
        .then(d => d?.location?.name || null)
        .catch(() => null);
    locationAreaToLocationCache.set(areaUrl, p);
    return p;
}

async function fetchPokeApiLocationsByVersionForPokemon(pokemonId) {
    const out = new Map();
    const encounters = await fetchJson(`${API}/pokemon/${pokemonId}/encounters`).catch(() => []);
    if (!Array.isArray(encounters) || !encounters.length) return out;

    const areaUrls = Array.from(
        new Set(
            encounters
                .map(e => e?.location_area?.url)
                .filter(Boolean)
        )
    );

    const locations = await promisePool(areaUrls, 6, (u) => getLocationForLocationAreaUrl(u));
    const areaToLocation = new Map();
    for (let i = 0; i < areaUrls.length; i++) {
        const loc = locations[i];
        if (loc) areaToLocation.set(areaUrls[i], loc);
    }

    for (const e of encounters) {
        const areaUrl = e?.location_area?.url;
        const loc = areaToLocation.get(areaUrl);
        if (!loc) continue;

        for (const vd of (e?.version_details || [])) {
            const version = vd?.version?.name;
            if (!version) continue;
            if (!out.has(version)) out.set(version, new Set());
            out.get(version).add(loc);
        }
    }

    return out;
}

async function fetchPokeDbLocationsByVersionForPokemon(pokemonSlug) {
    const out = new Map();
    const idx = await loadPokeDbEncountersIndex();
    const locations = idx?.locations;
    if (!locations) return out;

    const wanted = String(pokemonSlug || '').trim().toLowerCase();
    if (!wanted) return out;

    for (const [locationId, list] of Object.entries(locations)) {
        if (!Array.isArray(list) || !list.length) continue;
        for (const e of list) {
            if (String(e?.pokemon || '').toLowerCase() !== wanted) continue;
            const versions = Array.isArray(e?.versions) ? e.versions : [];
            for (const v of versions) {
                if (!v) continue;
                if (!out.has(v)) out.set(v, new Set());
                out.get(v).add(locationId);
            }
        }
    }

    return out;
}

async function buildWhereToFindByVersion(pokemonId, pokemonSlug) {
    const cacheKey = String(pokemonId);
    if (whereToFindByPokemonCache.has(cacheKey)) return whereToFindByPokemonCache.get(cacheKey);

    const p = (async () => {
        const map = new Map();

        const [pokeApiMap, pokeDbMap] = await Promise.all([
            fetchPokeApiLocationsByVersionForPokemon(pokemonId).catch(() => new Map()),
            fetchPokeDbLocationsByVersionForPokemon(pokemonSlug).catch(() => new Map())
        ]);

        const merge = (src) => {
            for (const [version, locs] of src.entries()) {
                if (!map.has(version)) map.set(version, new Set());
                const set = map.get(version);
                for (const loc of locs) set.add(loc);
            }
        };

        merge(pokeApiMap);
        merge(pokeDbMap);

        return map;
    })();

    whereToFindByPokemonCache.set(cacheKey, p);
    return p;
}

function renderWhereToFindSectionPlaceholderHtml(pokemon) {
    const displayName = formatName(pokemon?.name || '');
    return `
        <div class="full-width-section wherefind-section" data-pokemon-id="${pokemon?.id}" data-pokemon-slug="${pokemon?.name}">
            <h3 class="section-header">Where to find ${displayName}</h3>
            <div class="wherefind-body">
                <div class="learnset-empty">Loading location data...</div>
            </div>
        </div>
    `;
}

function renderWhereToFindRowsHtml(groups, byVersion, species) {
    const isSpecial = !!(species?.is_mythical || species?.is_legendary);
    const introGen = getSpeciesIntroducedGen(species);

    const rows = groups.map(g => {
        const genTooEarly = introGen && g.gen < introGen;

        const locations = new Set();
        for (const v of g.versions) {
            const set = byVersion.get(v);
            if (set) for (const loc of set) locations.add(loc);
        }

        let rightHtml = '';

        if (genTooEarly) {
            rightHtml = `<span class="details-muted">Not available in this game</span>`;
        } else if (g.versions.includes('legends-z-a')) {
            rightHtml = `<span class="details-muted">Location data not yet available</span>`;
        } else if (locations.size) {
            const locList = Array.from(locations).slice(0, 8);
            const links = locList
                .map(loc => `<a class="wherefind-link" href="location-detail.html?location=${encodeURIComponent(loc)}">${slugToTitle(loc)}</a>`)
                .join(', ');
            const more = locations.size > locList.length ? ` <span class="details-muted">(+${locations.size - locList.length} more)</span>` : '';
            rightHtml = `${links}${more}`;
        } else if (isSpecial) {
            rightHtml = `Trade/migrate from another game`;
        } else {
            rightHtml = `<span class="details-muted">Not available in this game</span>`;
        }

        const left = g.labels.map(l => `<div class="wherefind-game">${l}</div>`).join('');
        return `
            <div class="wherefind-row">
                <div class="wherefind-games">${left}</div>
                <div class="wherefind-note">${rightHtml}</div>
            </div>
        `;
    }).join('');

    return rows || `<div class="learnset-empty">No location data available.</div>`;
}

async function setupWhereToFindSection(root, pokemon, species) {
    const section = root?.querySelector(`.wherefind-section[data-pokemon-id="${pokemon?.id}"]`);
    if (!section) return;

    const body = section.querySelector('.wherefind-body');
    if (!body) return;

    const introGen = getSpeciesIntroducedGen(species);
    const groups = WHERE_TO_FIND_GROUPS.filter(g => !introGen || g.gen >= introGen);

    const byVersion = await buildWhereToFindByVersion(pokemon?.id, pokemon?.name);

    body.innerHTML = renderWhereToFindRowsHtml(groups, byVersion, species);
}

function pokedbMethodToAppMethod(method) {
    const m = String(method || '').toLowerCase();
    // Keep this mapping conservative; unknown methods will just be shown as-is.
    if (m === 'symbol-encounter' || m === 'random-encounter') return 'walk';
    return m || 'special';
}

async function loadPokeDbEncountersIndex() {
    // When opened via file://, browsers often block fetching local JSON.
    // In that case we load the dataset via a plain <script> that sets a global.
    if (window.__POKEDB_ENCOUNTERS_G8G9__) return window.__POKEDB_ENCOUNTERS_G8G9__;
    if (pokedbEncountersIndexPromise) return pokedbEncountersIndexPromise;
    pokedbEncountersIndexPromise = fetch(POKEDB_ENCOUNTERS_INDEX_URL)
        .then(r => (r.ok ? r.json() : null))
        .catch(() => null);
    return pokedbEncountersIndexPromise;
}

async function getPokemonIdByNameCached(pokemonName) {
    const key = String(pokemonName || '').trim().toLowerCase();
    if (!key) return null;
    if (pokemonIdByNameCache.has(key)) return pokemonIdByNameCache.get(key);
    const p = fetchJson(`${API}/pokemon/${key}`)
        .then(d => (Number.isFinite(d?.id) ? d.id : null))
        .catch(() => null);
    pokemonIdByNameCache.set(key, p);
    return p;
}

async function fetchPokeDbEncounterRowsForLocation(locationIdentifier) {
    const idx = await loadPokeDbEncountersIndex();
    const list = idx?.locations?.[locationIdentifier];
    if (!Array.isArray(list) || !list.length) return [];

    const uniquePokemon = Array.from(new Set(list.map(e => String(e?.pokemon || '').toLowerCase()).filter(Boolean)));
    // Resolve IDs with small concurrency.
    const idResults = await promisePool(uniquePokemon, 6, (name) => getPokemonIdByNameCached(name));
    const nameToId = new Map();
    for (let i = 0; i < uniquePokemon.length; i++) {
        const id = idResults[i];
        if (Number.isFinite(id)) nameToId.set(uniquePokemon[i], id);
    }

    const rows = [];
    for (const e of list) {
        const pokemonName = String(e?.pokemon || '').toLowerCase();
        const pokemonId = nameToId.get(pokemonName);
        if (!Number.isFinite(pokemonId)) continue;

        const versions = Array.isArray(e?.versions) ? e.versions : [];
        const method = pokedbMethodToAppMethod(e?.method);
        const chance = Number.isFinite(e?.chance) ? Math.round(e.chance) : null;
        const minLevel = Number.isFinite(e?.minLevel) ? e.minLevel : null;
        const maxLevel = Number.isFinite(e?.maxLevel) ? e.maxLevel : null;
        const conditions = Array.isArray(e?.conditions) ? e.conditions.slice() : [];

        for (const version of versions) {
            if (!version) continue;
            rows.push({
                pokemonId,
                pokemonName,
                version,
                method,
                chance,
                minLevel,
                maxLevel,
                conditions
            });
        }
    }

    return rows;
}

async function loadLocationFromInput() {
    const input = document.getElementById('locationSearch');
    const raw = input?.value || '';
    const normalized = String(raw).trim().toLowerCase().replace(/\s+/g, '-');
    if (!normalized) return;
    const url = new URL(window.location.href);
    url.searchParams.set('location', normalized);
    window.history.replaceState({}, '', url.toString());
    await loadAndRenderLocation(normalized);
}

async function loadAndRenderLocation(locationNameOrId) {
    const root = document.getElementById('locationsRoot');
    if (!root) return;

    root.innerHTML = `
        <div class="loading-container">
            <div class="pokeball-spinner"></div>
            <div>Loading location data...</div>
        </div>
    `;

    try {
        const location = await fetchJson(`${API}/location/${locationNameOrId}`);
        const regionName = location?.region?.name || '';

        const areas = Array.isArray(location?.areas) ? location.areas : [];
        const areaUrls = areas.map(a => a?.url).filter(Boolean);

        // Pull all area encounter tables (limit concurrency to avoid being too aggressive)
        const areaData = await promisePool(areaUrls, 6, (url) => fetchJson(url).catch(() => null));

        let rows = [];
        const seen = new Set();

        for (const area of areaData.filter(Boolean)) {
            const pokemonEncounters = Array.isArray(area?.pokemon_encounters) ? area.pokemon_encounters : [];
            for (const pe of pokemonEncounters) {
                const pokemonName = pe?.pokemon?.name;
                const pokemonUrl = pe?.pokemon?.url;
                const pokemonId = parseIdFromUrl(pokemonUrl);
                if (!pokemonName || !Number.isFinite(pokemonId)) continue;

                const versionDetails = Array.isArray(pe?.version_details) ? pe.version_details : [];
                for (const vd of versionDetails) {
                    const version = vd?.version?.name;
                    if (!version) continue;
                    const encounterDetails = Array.isArray(vd?.encounter_details) ? vd.encounter_details : [];
                    for (const d of encounterDetails) {
                        const method = d?.method?.name || 'special';
                        const chance = d?.chance;
                        const minLevel = d?.min_level;
                        const maxLevel = d?.max_level;
                        const conditions = (d?.condition_values || [])
                            .map(cv => cv?.name)
                            .filter(Boolean)
                            .map(slugToTitle)
                            .sort();

                        const key = [pokemonId, version, method, chance, minLevel, maxLevel, conditions.join('|')].join('::');
                        if (seen.has(key)) continue;
                        seen.add(key);

                        rows.push({
                            pokemonId,
                            pokemonName,
                            version,
                            method,
                            chance,
                            minLevel,
                            maxLevel,
                            conditions
                        });
                    }
                }
            }
        }

        // If PokeAPI provides no encounters for Gen 8/9 regions, fall back to a compact local
        // index generated from PokeDB Data Export (non-commercial; see README).
        const regionKey = String(regionName || '').toLowerCase();
        let usedPokeDbFallback = false;
        if (!rows.length && (regionKey === 'galar' || regionKey === 'hisui' || regionKey === 'paldea')) {
            try {
                const pokedbRows = await fetchPokeDbEncounterRowsForLocation(location?.name || locationNameOrId);
                if (pokedbRows.length) {
                    rows = pokedbRows;
                    usedPokeDbFallback = true;
                }
            } catch (e) {
                // Non-fatal; we'll just show empty-state.
                console.warn('PokeDB encounter fallback failed:', e);
            }
        }

        const uniqueVersions = Array.from(new Set(rows.map(r => r.version)));
        await Promise.all(uniqueVersions.map(v => getGenerationForVersion(v).catch(() => null)));

        for (const r of rows) {
            r.gen = await getGenerationForVersion(r.version).catch(() => null);
        }

        // Group identical encounters across games within the same generation.
        // We only merge when the encounter chance matches (to avoid losing per-game differences).
        const grouped = new Map();
        for (const r of rows) {
            if (!r.gen) continue;
            const key = [
                r.pokemonId,
                r.gen,
                r.method,
                r.chance,
                r.minLevel,
                r.maxLevel,
                (r.conditions || []).join('|')
            ].join('::');

            if (!grouped.has(key)) {
                grouped.set(key, {
                    pokemonId: r.pokemonId,
                    pokemonName: r.pokemonName,
                    gen: r.gen,
                    method: r.method,
                    chance: r.chance,
                    minLevel: r.minLevel,
                    maxLevel: r.maxLevel,
                    conditions: r.conditions || [],
                    versions: []
                });
            }

            grouped.get(key).versions.push(r.version);
        }

        const byGen = new Map();
        for (const entry of grouped.values()) {
            if (!byGen.has(entry.gen)) byGen.set(entry.gen, []);
            byGen.get(entry.gen).push(entry);
        }

        const gens = Array.from(byGen.keys()).sort((a, b) => b - a);

        const locParts = getLocationNameParts(location?.name || locationNameOrId);
        const displayTitle = locParts.title;
        const displayRegion = slugToTitle(regionName || locParts.regionTitle || '');

        const contentsLinks = gens
            .map(g => `<a href="#gen-${g}">Generation ${g}</a>`)
            .join('');

        const contentBar = gens.length
            ? `<div class="location-contents"><span class="location-contents-label">Contents</span>${contentsLinks}</div>`
            : '';

        const genSections = gens.map(gen => {
            const genRows = byGen.get(gen) || [];

            const byMethod = new Map();
            for (const r of genRows) {
                if (!byMethod.has(r.method)) byMethod.set(r.method, []);
                byMethod.get(r.method).push(r);
            }

            const methods = Array.from(byMethod.keys()).sort((a, b) => {
                const ka = sortMethodKey(a);
                const kb = sortMethodKey(b);
                if (ka !== kb) return ka - kb;
                return a.localeCompare(b);
            });

            const methodSections = methods.map(method => {
                const md = methodDisplay(method);
                const methodRows = (byMethod.get(method) || [])
                    .slice()
                    .sort((a, b) => {
                        const na = a.pokemonName.localeCompare(b.pokemonName);
                        if (na !== 0) return na;
                        const oa = GEN_VERSION_ORDER[a.gen] || [];
                        const ob = GEN_VERSION_ORDER[b.gen] || [];
                        const va = (a.versions || [])[0] || '';
                        const vb = (b.versions || [])[0] || '';
                        const ia = oa.indexOf(va);
                        const ib = ob.indexOf(vb);
                        if (ia !== -1 && ib !== -1) return ia - ib;
                        return String(va).localeCompare(String(vb));
                    });

                const body = methodRows.map(r => {
                    const spriteUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${r.pokemonId}.png`;
                    const displayName = slugToTitle(r.pokemonName);
                    const versions = Array.from(new Set(r.versions || []));
                    const order = GEN_VERSION_ORDER[r.gen] || [];
                    versions.sort((a, b) => {
                        const ia = order.indexOf(a);
                        const ib = order.indexOf(b);
                        if (ia !== -1 && ib !== -1) return ia - ib;
                        if (ia !== -1) return -1;
                        if (ib !== -1) return 1;
                        return a.localeCompare(b);
                    });

                    const games = versions
                        .map(v => `<span class="game-chip" title="${MAINLINE_VERSION_META[v]?.label || slugToTitle(v)}">${getVersionAbbrev(v)}</span>`)
                        .join('');
                    const levels = `<span class="levels">${formatLevelRange(r.minLevel, r.maxLevel)}</span>`;

                    const seasonIcons = seasonIconsHtml(r.conditions || []);
                    const remaining = (r.conditions || []).filter(c => !String(c).startsWith('Time ') && !String(c).startsWith('Season '));
                    const detailChips = remaining.length
                        ? remaining.map(shortConditionChip).join('')
                        : '<span class="details-muted">-</span>';

                    const details = seasonIcons
                        ? `<div class="detail-icons">${seasonIcons}</div><div class="detail-chips">${detailChips}</div>`
                        : `<div class="detail-chips">${detailChips}</div>`;

                    const times = timeIconsHtml(r.conditions || []);

                    return `
                        <tr>
                            <td>
                                <div class="poke-cell">
                                    <img class="poke-sprite" src="${spriteUrl}" alt="${displayName}">
                                    <a class="poke-link" href="pokemon.html?id=${r.pokemonId}">${displayName}</a>
                                </div>
                            </td>
                            <td>${games}</td>
                            <td>${times}</td>
                            <td>${rarityIconHtml(r.chance)}</td>
                            <td>${levels}</td>
                            <td>${details}</td>
                        </tr>
                    `;
                }).join('');

                const subtitle = md.subtitle ? `<div class="method-subtitle">${md.subtitle}</div>` : '';

                return `
                    <div class="method-block">
                        <div class="method-title">${md.title}</div>
                        ${subtitle}
                        <table class="encounter-table">
                            <thead>
                                <tr>
                                    <th>Pokémon</th>
                                    <th>Games</th>
                                    <th>Times</th>
                                    <th>Rarity</th>
                                    <th>Levels</th>
                                    <th>Details</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${body || `<tr><td colspan="6" class="details-muted">No encounters found.</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                `;
            }).join('');

            return `
                <section id="gen-${gen}" class="gen-section">
                    <div class="section-header">Generation ${gen}</div>
                    ${methodSections}
                </section>
            `;
        }).join('');

        const regionLine = displayRegion ? `Region: <span style="color:#f5f7ff;font-weight:700">${displayRegion}</span>` : 'Region: -';
        const apiNote = usedPokeDbFallback
            ? `Source: PokeAPI (locations) + PokeDB Data Export (encounters)`
            : `Source: PokeAPI (location + location-area encounter data)`;

        let emptyNote = '';
        if (!gens.length) {
            const r = String(regionName || '').toLowerCase();
            if (r === 'galar' || r === 'hisui' || r === 'paldea') {
                emptyNote = `
                    <div class="empty">
                        No encounter data found for this <b>${slugToTitle(r)}</b> location.
                        <div class="details-muted" style="margin-top:6px;">
                            PokeAPI encounter tables are incomplete for these regions; this site will use a PokeDB-based fallback when available.
                        </div>
                    </div>
                `;
            }
        }

        root.innerHTML = `
            <div class="location-meta">
                <div class="location-title">${displayTitle} <span class="muted">(location)</span></div>
                <div class="location-subtitle">${regionLine} · <span class="details-muted">${apiNote}</span></div>
            </div>
            ${buildKeyToIconsHtml()}
            ${contentBar}
            ${genSections || emptyNote || '<div class="empty">No encounter data found for this location.</div>'}
        `;
    } catch (e) {
        console.error(e);
        root.innerHTML = `<div class="empty">Couldn’t load that location. Try something like <span style="color:#3bd5ff">kanto-route-3</span>.</div>`;
    }
}

async function initLocationsPage() {
    const root = document.getElementById('locationsRoot');
    if (!root) return;

    const input = document.getElementById('locationSearch');
    const btn = document.getElementById('loadLocationBtn');

    const urlParams = new URLSearchParams(window.location.search);
    const initial = (urlParams.get('location') || 'kanto-route-3').trim();
    if (input) input.value = initial;

    if (btn && !btn._locationsBound) {
        btn._locationsBound = true;
        btn.addEventListener('click', () => loadLocationFromInput());
    }
    if (input && !input._locationsBound) {
        input._locationsBound = true;
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') loadLocationFromInput();
        });
    }

    await loadAndRenderLocation(initial);
}

async function initLocationsGuidePage() {
    const tabsRoot = document.getElementById('regionTabs');
    const panelsRoot = document.getElementById('regionPanels');
    if (!tabsRoot || !panelsRoot) return;

    const regions = [
        { id: 1, slug: 'kanto', label: 'Kanto' },
        { id: 2, slug: 'johto', label: 'Johto' },
        { id: 3, slug: 'hoenn', label: 'Hoenn' },
        { id: 4, slug: 'sinnoh', label: 'Sinnoh' },
        { id: 5, slug: 'unova', label: 'Unova' },
        { id: 6, slug: 'kalos', label: 'Kalos' },
        { id: 7, slug: 'alola', label: 'Alola' },
        { id: 8, slug: 'galar', label: 'Galar' },
        { id: 9, slug: 'hisui', label: 'Hisui' },
        { id: 10, slug: 'paldea', label: 'Paldea' }
    ];

    const urlParams = new URLSearchParams(window.location.search);
    const requested = (urlParams.get('region') || '').trim().toLowerCase();
    const initialRegion = regions.find(r => r.slug === requested)?.slug || 'kanto';

    tabsRoot.innerHTML = regions
        .map(r => `<button type="button" class="region-tab${r.slug === initialRegion ? ' active' : ''}" data-region-tab="${r.slug}">${r.label}</button>`)
        .join('');

    panelsRoot.innerHTML = regions
        .map(r => `
            <div class="region-panel${r.slug === initialRegion ? ' active' : ''}" data-region-panel="${r.slug}">
                <div class="loading">Loading ${r.label} locations...</div>
            </div>
        `)
        .join('');

    // Tab switching
    tabsRoot.querySelectorAll('.region-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const region = btn.dataset.regionTab;
            tabsRoot.querySelectorAll('.region-tab').forEach(b => b.classList.remove('active'));
            panelsRoot.querySelectorAll('.region-panel').forEach(p => p.classList.remove('active'));
            btn.classList.add('active');
            const panel = panelsRoot.querySelector(`.region-panel[data-region-panel="${region}"]`);
            if (panel) panel.classList.add('active');

            const url = new URL(window.location.href);
            url.searchParams.set('region', region);
            window.history.replaceState({}, '', url.toString());

            // Lazy-load if needed
            if (panel && !panel.dataset.loaded) {
                loadRegionLocations(region, panel);
            }
        });
    });

    // Load initial panel
    const initialPanel = panelsRoot.querySelector(`.region-panel[data-region-panel="${initialRegion}"]`);
    if (initialPanel) {
        await loadRegionLocations(initialRegion, initialPanel);
    }
}

async function loadRegionLocations(regionSlug, panelEl) {
    if (!panelEl) return;
    panelEl.dataset.loaded = '1';

    const regionMeta = {
        kanto: 1,
        johto: 2,
        hoenn: 3,
        sinnoh: 4,
        unova: 5,
        kalos: 6,
        alola: 7,
        galar: 8,
        hisui: 9,
        paldea: 10
    };
    const id = regionMeta[String(regionSlug || '')] || 1;

    try {
        const region = await fetchJson(`${API}/region/${id}`);
        const locations = (region?.locations || [])
            .map(l => l?.name)
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b));

        const links = locations.map(slug => {
            const label = slugToTitle(slug);
            return `<a class="location-link" href="location-detail.html?location=${encodeURIComponent(slug)}">${label}</a>`;
        }).join('');

        panelEl.innerHTML = `
            <div class="region-grid">
                ${links || '<div class="empty">No locations found.</div>'}
            </div>
        `;
    } catch (e) {
        console.error(e);
        panelEl.innerHTML = `<div class="empty">Error loading region locations.</div>`;
    }
}

const POKEDEX_IDS = {
  'national': 1,
  'kanto': 2,
  'original-johto': 3,
  'hoenn': 4,
  'original-sinnoh': 5,
  'extended-sinnoh': 6,
  'updated-johto': 7,
  'original-unova': 8,
  'updated-unova': 9,
  'kalos-central': 12,
  'kalos-coastal': 13,
  'kalos-mountain': 14,
  'updated-hoenn': 15,
  'original-alola': 16,
  'original-melemele': 17,
  'original-akala': 18,
  'original-ulaula': 19,
  'original-poni': 20,
  'updated-alola': 21,
  'updated-melemele': 22,
  'updated-akala': 23,
  'updated-ulaula': 24,
  'updated-poni': 25,
  'letsgo-kanto': 26,
  'galar': 27,
  'isle-of-armor': 28,
  'crown-tundra': 29,
  'hisui': 30,
  'paldea': 31,
  'kitakami': 32,
  'blueberry': 33
};

const moveDetailsCache = {};
const machineDetailsCache = {};
const pokemonDetailsCache = {};
let currentPokemonMoves = {};

// Detail-page learnset store (per form)
const learnsetStore = {};

function getVersionGroupDisplayName(vg) {
    const map = {
        'red-blue': 'Red/Blue',
        'yellow': 'Yellow',
        'gold-silver': 'Gold/Silver',
        'crystal': 'Crystal',
        'ruby-sapphire': 'Ruby/Sapphire',
        'emerald': 'Emerald',
        'firered-leafgreen': 'FireRed/LeafGreen',
        'diamond-pearl': 'Diamond/Pearl',
        'platinum': 'Platinum',
        'heartgold-soulsilver': 'HeartGold/SoulSilver',
        'black-white': 'Black/White',
        'black-2-white-2': 'Black 2/White 2',
        'x-y': 'X/Y',
        'omega-ruby-alpha-sapphire': 'Omega Ruby/Alpha Sapphire',
        'sun-moon': 'Sun/Moon',
        'ultra-sun-ultra-moon': 'Ultra Sun/Ultra Moon',
        'lets-go-pikachu-lets-go-eevee': "Let's Go",
        'sword-shield': 'Sword/Shield',
        'brilliant-diamond-shining-pearl': 'Brilliant Diamond/Shining Pearl',
        'legends-arceus': 'Legends: Arceus',
        'scarlet-violet': 'Scarlet/Violet'
    };
    return map[vg] || vg.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function buildLearnsetData(pokemonData) {
    const byGen = {};
    const moves = pokemonData?.moves || [];

    for (const m of moves) {
        const moveName = m?.move?.name;
        const moveUrl = m?.move?.url;
        if (!moveName || !moveUrl) continue;

        for (const vgd of (m.version_group_details || [])) {
            const vg = vgd?.version_group?.name;
            const method = vgd?.move_learn_method?.name;
            if (!vg || !method) continue;
            const gen = VERSION_GROUP_TO_GEN[vg];
            if (!gen) continue;

            if (!byGen[gen]) byGen[gen] = {};
            if (!byGen[gen][vg]) byGen[gen][vg] = {};
            if (!byGen[gen][vg][method]) byGen[gen][vg][method] = [];

            byGen[gen][vg][method].push({
                name: moveName,
                url: moveUrl,
                level: vgd.level_learned_at || 0
            });
        }
    }

    // Sort lists
    Object.keys(byGen).forEach(gen => {
        Object.keys(byGen[gen]).forEach(vg => {
            Object.keys(byGen[gen][vg]).forEach(method => {
                const list = byGen[gen][vg][method];
                if (method === 'level-up') {
                    list.sort((a, b) => (a.level - b.level) || a.name.localeCompare(b.name));
                } else {
                    list.sort((a, b) => a.name.localeCompare(b.name));
                }
            });
        });
    });

    return byGen;
}

function renderLearnsetSectionHtml(pokemonData, learnsetKey) {
    const data = learnsetStore[learnsetKey];
    const gens = Object.keys(data || {}).map(n => parseInt(n, 10)).filter(n => !Number.isNaN(n)).sort((a, b) => a - b);
    if (!gens.length) {
        return `
            <div class="full-width-section learnset-section" data-learnset-key="${learnsetKey}">
                <h3 class="section-header">Moves learned by ${pokemonData.name.replace(/\b\w/g, l => l.toUpperCase())}</h3>
                <div class="learnset-empty">No move learnset data available.</div>
            </div>
        `;
    }

    const activeGen = Math.max(...gens);

    const genButtons = gens.map(g => {
        const active = g === activeGen ? ' active' : '';
        return `<button type="button" class="learnset-genbtn${active}" data-learnset-gen="${g}">${g}</button>`;
    }).join('');

    return `
        <div class="full-width-section learnset-section" data-learnset-key="${learnsetKey}" data-active-gen="${activeGen}">
            <h3 class="section-header">Moves learned by ${pokemonData.name.charAt(0).toUpperCase() + pokemonData.name.slice(1)}</h3>
            <div class="learnset-genbar">
                <div class="learnset-genlabel">In other generations</div>
                <div class="learnset-gens">${genButtons}</div>
            </div>
            <div class="learnset-gametabs" role="tablist"></div>
            <div class="learnset-grid">
                <div class="learnset-col" data-method="level-up">
                    <div class="learnset-col-title">Moves learnt by level up</div>
                    <div class="learnset-col-desc"></div>
                    <div class="learnset-table-wrap"></div>
                </div>
                <div class="learnset-col" data-method="machine">
                    <div class="learnset-col-title">Moves learnt by TM</div>
                    <div class="learnset-col-desc"></div>
                    <div class="learnset-table-wrap"></div>
                </div>
            </div>
        </div>
    `;
}

function setupLearnsetSection(root) {
    if (!root) return;
    const section = root.querySelector('.learnset-section');
    if (!section) return;

    const key = section.dataset.learnsetKey;
    const data = learnsetStore[key];
    if (!data) return;

    const gens = Object.keys(data).map(n => parseInt(n, 10)).filter(n => !Number.isNaN(n)).sort((a, b) => a - b);
    const defaultGen = parseInt(section.dataset.activeGen || '', 10) || Math.max(...gens);

    section.querySelectorAll('.learnset-genbtn').forEach(btn => {
        btn.addEventListener('click', () => {
            const gen = parseInt(btn.dataset.learnsetGen || '', 10);
            if (!gen) return;
            section.dataset.activeGen = String(gen);
            section.querySelectorAll('.learnset-genbtn').forEach(b => b.classList.toggle('active', b === btn));
            renderLearnsetForGen(section, gen);
        });
    });

    renderLearnsetForGen(section, defaultGen);
}

function renderLearnsetForGen(section, gen) {
    const key = section.dataset.learnsetKey;
    const data = learnsetStore[key] || {};
    const genData = data[gen] || {};

    const versionGroups = Object.keys(genData);
    versionGroups.sort((a, b) => getVersionGroupDisplayName(a).localeCompare(getVersionGroupDisplayName(b)));

    const gameTabs = section.querySelector('.learnset-gametabs');
    if (!versionGroups.length) {
        if (gameTabs) gameTabs.innerHTML = '';
        section.querySelectorAll('.learnset-table-wrap').forEach(w => w.innerHTML = '<div class="learnset-empty">No data for this generation.</div>');
        section.querySelectorAll('.learnset-col-desc').forEach(d => d.textContent = '');
        return;
    }

    const activeVg = versionGroups[0];
    section.dataset.activeVg = activeVg;

    if (gameTabs) {
        gameTabs.innerHTML = versionGroups.map((vg, idx) => {
            const active = idx === 0 ? ' active' : '';
            return `<button type="button" class="learnset-gametab${active}" data-learnset-vg="${vg}" role="tab">${getVersionGroupDisplayName(vg)}</button>`;
        }).join('');

        gameTabs.querySelectorAll('.learnset-gametab').forEach(tab => {
            tab.addEventListener('click', () => {
                const vg = tab.dataset.learnsetVg;
                if (!vg) return;
                section.dataset.activeVg = vg;
                gameTabs.querySelectorAll('.learnset-gametab').forEach(t => t.classList.toggle('active', t === tab));
                renderLearnsetTables(section, gen, vg);
            });
        });
    }

    renderLearnsetTables(section, gen, activeVg);
}

function renderLearnsetTables(section, gen, vg) {
    const key = section.dataset.learnsetKey;
    const data = learnsetStore[key] || {};
    const methods = (data[gen] && data[gen][vg]) ? data[gen][vg] : {};

    const pokemonName = (document.querySelector('.detail-h1')?.textContent || 'This Pokémon').trim();
    const gameName = getVersionGroupDisplayName(vg);

    const levelMoves = methods['level-up'] || [];
    const tmMoves = methods['machine'] || [];

    const left = section.querySelector('.learnset-col[data-method="level-up"]');
    const right = section.querySelector('.learnset-col[data-method="machine"]');

    if (left) {
        const desc = left.querySelector('.learnset-col-desc');
        if (desc) desc.textContent = `${pokemonName} learns the following moves in ${gameName} at the levels specified.`;
        const wrap = left.querySelector('.learnset-table-wrap');
        if (wrap) wrap.innerHTML = renderLearnsetTableHtml('level-up', levelMoves, vg);
    }

    if (right) {
        const desc = right.querySelector('.learnset-col-desc');
        if (desc) desc.textContent = `${pokemonName} is compatible with these Technical Machines in ${gameName}:`;
        const wrap = right.querySelector('.learnset-table-wrap');
        if (wrap) wrap.innerHTML = renderLearnsetTableHtml('machine', tmMoves, vg);
    }

    loadLearnsetMoveDetails(section, vg);
}

function renderLearnsetTableHtml(method, moves, vg) {
    if (!moves.length) {
        return `<div class="learnset-empty">No moves available.</div>`;
    }

    const isLevel = method === 'level-up';
    const isTM = method === 'machine';

    return `
        <table class="learnset-table">
            <thead>
                <tr>
                    ${isLevel ? '<th style="width:60px">Lv.</th>' : ''}
                    ${isTM ? '<th style="width:60px">TM</th>' : ''}
                    <th>Move</th>
                    <th style="width:90px">Type</th>
                    <th style="width:70px">Cat.</th>
                    <th style="width:70px">Pwr.</th>
                    <th style="width:70px">Acc.</th>
                </tr>
            </thead>
            <tbody>
                ${moves.map(m => `
                    <tr class="learnset-move-row" data-url="${m.url}" data-method="${method}" data-vg="${vg}">
                        ${isLevel ? `<td class="learnset-lv">${m.level || 1}</td>` : ''}
                        ${isTM ? `<td class="learnset-tm">-</td>` : ''}
                        <td class="learnset-move">${m.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                        <td class="type-cell">-</td>
                        <td class="cat-cell">-</td>
                        <td class="pwr-cell">-</td>
                        <td class="acc-cell">-</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

async function loadLearnsetMoveDetails(section, vg) {
    const rows = section.querySelectorAll('.learnset-move-row');
    for (const row of rows) {
        const url = row.dataset.url;
        const id = url.split('/').filter(Boolean).pop();
        const method = row.dataset.method;

        const apply = async (d) => {
            row.querySelector('.type-cell').innerHTML = `<span class="type-tag" style="background:${TYPE_COLORS[d.type.name]};font-size:10px;padding:2px 6px;">${d.type.name.toUpperCase()}</span>`;

            const catColor = d.damage_class.name === 'physical' ? '#ff4400' : d.damage_class.name === 'special' ? '#2266cc' : '#999';
            const catTitle = d.damage_class.name.charAt(0).toUpperCase() + d.damage_class.name.slice(1);
            row.querySelector('.cat-cell').innerHTML = `<span title="${catTitle}" style="color:${catColor};font-size:18px;line-height:1">●</span>`;

            row.querySelector('.pwr-cell').textContent = d.power || '-';
            row.querySelector('.acc-cell').textContent = d.accuracy || '-';

            // TM number (best-effort via machine endpoint)
            if (method === 'machine') {
                const machineEntry = (d.machines || []).find(me => me?.version_group?.name === vg);
                const machineUrl = machineEntry?.machine?.url;
                if (machineUrl) {
                    const machineId = machineUrl.split('/').filter(Boolean).pop();
                    try {
                        const machine = machineDetailsCache[machineId] || await fetch(machineUrl).then(r => r.json());
                        machineDetailsCache[machineId] = machine;
                        const itemName = machine?.item?.name || '';
                        const match = itemName.match(/(tm|tr)(\d+)/i);
                        let tmText = itemName.toUpperCase();
                        if (match) {
                            const num = match[2];
                            // Keep leading zeros for display like PokémonDB
                            tmText = num.length >= 2 ? num : num.padStart(2, '0');
                        }
                        const tmCell = row.querySelector('.learnset-tm');
                        if (tmCell) tmCell.textContent = tmText;
                    } catch (e) {
                        // leave as '-'
                    }
                }
            }

            row.style.cursor = 'pointer';
            row.onclick = () => moveDetail(d.id);
        };

        if (moveDetailsCache[id]) {
            apply(moveDetailsCache[id]);
        } else {
            fetch(url).then(r => r.json()).then(d => {
                moveDetailsCache[id] = d;
                apply(d);
            }).catch(() => {});
        }
    }
}

async function init() {
    const subtitle = document.querySelector('.subtitle');
    const grid = document.getElementById('grid');
    if (subtitle) subtitle.textContent = 'Search and explore all 1,025 Pokémon';
    if (grid) grid.innerHTML = '<div class="loading">Loading Pokémon...</div>';
    allPokemon = await fetch(`${API}/pokemon?limit=1025`).then(r => r.json()).then(d => d.results.map((p, i) => ({ id: i + 1, name: p.name })));
    pokemon = [...allPokemon];
    
    // Check for URL parameters to auto-load a specific Pokedex
    const urlParams = new URLSearchParams(window.location.search);
    const dexId = urlParams.get('dex');
    const dexName = urlParams.get('dexName');
    
    if (dexId && dexName) {
        // Load the specified Pokedex
        await loadPokedex(dexId === 'all' ? 'all' : (isNaN(dexId) ? dexId : parseInt(dexId)), decodeURIComponent(dexName), null);
    } else {
        render();
    }
    
    setupTypes();
    setupDamageClasses();
}

async function loadPokedex(id, name, triggerEl) {
    // Handle highlighting
    if (triggerEl) {
        document.querySelectorAll('.sub-nav-item').forEach(el => el.classList.remove('active'));
        triggerEl.classList.add('active');
    }

  // Ensure we are on the pokedex page
  if (currentPage !== 'pokedex') {
    switchPage('pokedex');
  }
  
  const grid = document.getElementById('grid');
  const subtitle = document.querySelector('.subtitle');
  
  grid.innerHTML = `<div class="loading">Loading ${name}...</div>`;
  subtitle.textContent = `Exploring ${name}`;
  
  try {
    // Special case for "All Pokémon"
    if (id === 'all') {
      if (allPokemon.length === 0) {
         allPokemon = await fetch(`${API}/pokemon?limit=1025`).then(r => r.json()).then(d => d.results.map((p, i) => ({ id: i + 1, name: p.name })));
      }
      pokemon = [...allPokemon];
    } else {
      const data = await fetch(`${API}/pokedex/${id}`).then(r => r.json());
      pokemon = data.pokemon_entries.map(e => {
        const urlParts = e.pokemon_species.url.split('/');
        const speciesId = parseInt(urlParts[urlParts.length - 2]);
        return {
          id: speciesId,
          dexId: e.entry_number,
          name: e.pokemon_species.name
        };
      });
    }
    
    render();
  } catch (e) {
    console.error(e);
    grid.innerHTML = '<div class="empty">Error loading Pokédex</div>';
  }
}

function setupDamageClasses() {
    document.getElementById('categoryButtons').innerHTML = DAMAGE_CLASSES.map(c => 
        `<button class="type-btn ${c === 'all' ? 'active' : ''}" data-action="set-damage-class-filter" data-damage-class="${c}" type="button">${c.toUpperCase()}</button>`
    ).join('');
}

function togglePokedexMenu(triggerEl) {
  const menu = document.getElementById('pokedexSubMenu');
    const item = triggerEl;
  
  if (menu.style.display === 'none') {
    menu.style.display = 'block';
    item.classList.add('expanded');
  } else {
    menu.style.display = 'none';
    item.classList.remove('expanded');
  }
}

function toggleEggGroupMenu(triggerEl) {
  const menu = document.getElementById('eggGroupSubMenu');
    const item = triggerEl;
  
  if (menu.style.display === 'none') {
    menu.style.display = 'block';
    item.classList.add('expanded');
  } else {
    menu.style.display = 'none';
    item.classList.remove('expanded');
  }
}

let movesPage = 1;
const MOVES_PER_PAGE = 50;
let currentMovesSort = { field: 'name', dir: 'asc' };

async function switchPage(page, triggerEl) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if (triggerEl) {
        triggerEl.classList.add('active');
    }

  const grid = document.getElementById('grid');
  const searchInput = document.getElementById('search');
  const subtitle = document.querySelector('.subtitle');
  const categoryFilter = document.getElementById('categoryFilter');
  const typeChart = document.getElementById('typeChart');
  const movesList = document.getElementById('movesList');
  const empty = document.getElementById('empty');
  
  // Reset filters
  filter = 'all';
  damageClassFilter = 'all';
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  // Set 'all' active for both type and category
  document.querySelectorAll('.type-btn').forEach(b => {
    if (b.textContent === 'ALL') b.classList.add('active');
  });
  
  // Default visibility
  grid.style.display = 'grid';
  typeChart.style.display = 'none';
  if (movesList) movesList.style.display = 'none';
  empty.style.display = 'none';
  document.querySelector('.controls').style.display = 'flex';

  if (page === 'pokedex') {
    subtitle.textContent = 'Search and explore all 1,025 Pokémon';
    searchInput.placeholder = 'Search by name or ID...';
    searchInput.value = '';
    categoryFilter.style.display = 'none';
    pokemon = [...allPokemon];
    render();
  } else if (page === 'moves') {
    document.querySelector('.controls').style.display = 'none';
    grid.style.display = 'none';
    if (movesList) movesList.style.display = 'block';
    
    if (!allMoves.length) {
      if (movesList) movesList.innerHTML = '<div class="loading">Loading Moves...</div>';
      const data = await fetch(`${API}/move?limit=1000`).then(r => r.json());
      allMoves = data.results.map(m => ({
        name: m.name,
        id: parseInt(m.url.split('/').filter(Boolean).pop()),
        url: m.url
      }));
    }
    moves = [...allMoves];
    renderMovesPage();
  } else if (page === 'type-chart') {
    subtitle.textContent = 'Type Effectiveness Chart';
    document.querySelector('.controls').style.display = 'none';
    grid.style.display = 'none';
    typeChart.style.display = 'block';
    renderTypeChart();
  }
}

function renderMovesPage() {
  const container = document.getElementById('movesList');
  if (!container) return;
  
  // Initial render of structure if empty
  if (!container.querySelector('.moves-header')) {
    container.innerHTML = `
      <div class="moves-header">
        <div class="moves-title">Pokémon move list</div>
        <div class="moves-desc">
          This is a full list of every Pokémon move from all 9 generations of the game series. The power, accuracy and PP are listed along with any additional effects.
          Click a move name to see even more detailed information.
        </div>
        <div class="moves-key">
          <span>Category key:</span>
          <span class="key-item"><span title="Physical" style="color:#ff4400;font-size:18px;line-height:1">●</span> Physical</span>
          <span class="key-item"><span title="Special" style="color:#2266cc;font-size:18px;line-height:1">●</span> Special</span>
          <span class="key-item"><span title="Status" style="color:#999;font-size:18px;line-height:1">●</span> Status</span>
        </div>
        <div class="moves-filters">
          <div class="filter-group">
            <span class="filter-label">Name/Effect:</span>
            <input type="text" class="filter-input" id="moveSearch" placeholder="Search moves..." oninput="filterMoves()">
          </div>
          <div class="filter-group">
            <span class="filter-label">Type:</span>
            <select class="filter-select" id="moveTypeFilter" onchange="filterMoves()">
              <option value="all">- All -</option>
              ${TYPES.filter(t => t !== 'all').map(t => `<option value="${t}">${t.charAt(0).toUpperCase() + t.slice(1)}</option>`).join('')}
            </select>
          </div>
          <div class="filter-group">
            <span class="filter-label">Category:</span>
            <select class="filter-select" id="moveCatFilter" onchange="filterMoves()">
              <option value="all">- All -</option>
              <option value="physical">Physical</option>
              <option value="special">Special</option>
              <option value="status">Status</option>
            </select>
          </div>
        </div>
      </div>
      <div id="movesTableContainer"></div>
      <div class="pagination">
        <button class="page-btn" data-action="change-moves-page" data-delta="-1" type="button">Previous</button>
        <span id="pageInfo" style="align-self:center;color:#8b92a5">Page 1</span>
        <button class="page-btn" data-action="change-moves-page" data-delta="1" type="button">Next</button>
      </div>
    `;
  }
  
  filterMoves();
}

async function filterMoves() {
  const searchInput = document.getElementById('moveSearch');
  const typeFilter = document.getElementById('moveTypeFilter');
  const catFilter = document.getElementById('moveCatFilter');

  if (!searchInput || !typeFilter || !catFilter) return;

  const search = searchInput.value.toLowerCase();
  const type = typeFilter.value;
  const cat = catFilter.value;
  
  let filtered = allMoves;
  
  // Filter by name
  if (search) {
    filtered = filtered.filter(m => m.name.includes(search));
  }

  // If sorting by detail field (or filtering by type/cat), we need details
  if (currentMovesSort.field !== 'name' || type !== 'all' || cat !== 'all') {
    const missing = filtered.filter(m => !moveDetailsCache[m.id]);
    if (missing.length > 0) {
       const container = document.getElementById('movesTableContainer');
       if (container) container.innerHTML = `<div class="loading">Loading move details for sorting/filtering (${missing.length} remaining)...</div>`;
       await fetchMoveDetailsBatch(missing);
    }
  }

  // Filter by Type
  if (type !== 'all') {
    filtered = filtered.filter(m => {
        const d = moveDetailsCache[m.id];
        return d && d.type.name === type;
    });
  }

  // Filter by Category
  if (cat !== 'all') {
    filtered = filtered.filter(m => {
        const d = moveDetailsCache[m.id];
        return d && d.damage_class.name === cat;
    });
  }
  
  // Sort
  filtered.sort((a, b) => {
    let va = a[currentMovesSort.field];
    let vb = b[currentMovesSort.field];
    
    if (currentMovesSort.field !== 'name') {
      const da = moveDetailsCache[a.id];
      const db = moveDetailsCache[b.id];
      va = da ? da[currentMovesSort.field] : null;
      vb = db ? db[currentMovesSort.field] : null;
      
      if (va === null) return 1;
      if (vb === null) return -1;
    }
    
    if (va < vb) return currentMovesSort.dir === 'asc' ? -1 : 1;
    if (va > vb) return currentMovesSort.dir === 'asc' ? 1 : -1;
    return 0;
  });
  
  moves = filtered;
  renderMovesTable();
}

function changeMovesPage(delta) {
  const maxPage = Math.ceil(moves.length / MOVES_PER_PAGE);
  const newPage = movesPage + delta;
  if (newPage >= 1 && newPage <= maxPage) {
    movesPage = newPage;
    renderMovesTable();
  }
}

async function renderMovesTable() {
  const start = (movesPage - 1) * MOVES_PER_PAGE;
  const end = start + MOVES_PER_PAGE;
  const pageMoves = moves.slice(start, end);
  
  const pageInfo = document.getElementById('pageInfo');
  if (pageInfo) pageInfo.textContent = `Page ${movesPage} of ${Math.ceil(moves.length / MOVES_PER_PAGE)}`;
  
  const container = document.getElementById('movesTableContainer');
  if (!container) return;

  const html = `
    <table class="main-move-table">
      <thead>
        <tr>
          <th data-action="sort-moves" data-field="name">Name</th>
          <th data-action="sort-moves" data-field="type">Type</th>
          <th data-action="sort-moves" data-field="damage_class">Cat.</th>
          <th data-action="sort-moves" data-field="power">Power</th>
          <th data-action="sort-moves" data-field="accuracy">Acc.</th>
          <th data-action="sort-moves" data-field="pp">PP</th>
          <th>Effect</th>
          <th>Prob. (%)</th>
        </tr>
      </thead>
      <tbody>
        ${pageMoves.map(m => {
          const d = moveDetailsCache[m.id];
          if (!d) {
            // Trigger fetch
            fetchMoveDetails(m.id);
            return `
              <tr id="move-row-${m.id}">
                                <td><a class="move-name-link" href="move-detail.html?move=${m.id}">${formatName(m.name)}</a></td>
                <td colspan="7" style="color:#8b92a5;text-align:center;">Loading...</td>
              </tr>
            `;
          }
          return renderMoveRow(d);
        }).join('')}
      </tbody>
    </table>
  `;
  
  container.innerHTML = html;
}

function renderMoveRow(d) {
  const catColor = d.damage_class.name === 'physical' ? '#ff4400' : d.damage_class.name === 'special' ? '#2266cc' : '#999';
  const catTitle = d.damage_class.name.charAt(0).toUpperCase() + d.damage_class.name.slice(1);
  const effect = d.effect_entries.find(e => e.language.name === 'en')?.short_effect || d.flavor_text_entries.find(e => e.language.name === 'en')?.flavor_text || '-';
  
  return `
    <tr id="move-row-${d.id}">
            <td><a class="move-name-link" href="move-detail.html?move=${d.id}">${formatName(d.name)}</a></td>
      <td><span class="type-tag" style="background:${TYPE_COLORS[d.type.name]};font-size:10px;padding:2px 6px;">${d.type.name.toUpperCase()}</span></td>
      <td style="text-align:center"><span title="${catTitle}" style="color:${catColor};font-size:18px;line-height:1">●</span></td>
      <td style="text-align:center">${d.power || '-'}</td>
      <td style="text-align:center">${d.accuracy || '-'}</td>
      <td style="text-align:center">${d.pp}</td>
      <td class="move-effect">${effect.replace(/\$effect_chance/g, d.effect_chance)}</td>
      <td style="text-align:center">${d.effect_chance || '-'}</td>
    </tr>
  `;
}

async function fetchMoveDetails(id) {
  if (moveDetailsCache[id]) return;
  try {
    const d = await fetch(`${API}/move/${id}`).then(r => r.json());
    moveDetailsCache[id] = d;
    // Update row if visible
    const row = document.getElementById(`move-row-${id}`);
    if (row) {
      row.outerHTML = renderMoveRow(d);
    }
  } catch (e) {
    console.error(e);
  }
}

async function fetchMoveDetailsBatch(movesList) {
  const BATCH_SIZE = 20;
  for (let i = 0; i < movesList.length; i += BATCH_SIZE) {
    const batch = movesList.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(m => fetchMoveDetails(m.id)));
    
    const container = document.getElementById('movesTableContainer');
    if (container) {
        const remaining = movesList.length - Math.min(i + BATCH_SIZE, movesList.length);
        if (remaining > 0) {
            container.innerHTML = `<div class="loading">Loading move details... (${remaining} remaining)</div>`;
        }
    }
  }
}

function formatName(n) {
  return n.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function sortMoves(field) {
  if (currentMovesSort.field === field) {
    currentMovesSort.dir = currentMovesSort.dir === 'asc' ? 'desc' : 'asc';
  } else {
    currentMovesSort.field = field;
    currentMovesSort.dir = 'asc';
  }
  filterMoves();
}

function renderTypeChart() {
const container = document.getElementById('typeChart');
if (container.innerHTML) return; // Already rendered

let html = `
    <table class="type-chart-table">
    <tr>
        <th rowspan="2" colspan="2" style="border:none;">
        <div class="axis-label def-label">Defense →</div>
        <div class="axis-label atk-label">Attack →</div>
        </th>
        ${TYPE_ORDER.map(t => `<th class="type-header"><span class="type-header-row" style="color:${TYPE_COLORS[t]}">${t.substring(0,3).toUpperCase()}</span></th>`).join('')}
    </tr>
    <tr>
        <!-- Empty row for spacing if needed, or merged above -->
    </tr>
`;

TYPE_ORDER.forEach((attacker, i) => {
    html += `<tr>`;
    html += `<th style="text-align:right; padding-right:8px; color:${TYPE_COLORS[attacker]}">${attacker.substring(0,3).toUpperCase()}</th>`;
    
    TYPE_ORDER.forEach((defender, j) => {
    const eff = TYPE_CHART_DATA[i][j];
    let cellClass = 'eff-1';
    let cellText = '';
    
    if (eff === 2) { cellClass = 'eff-2'; cellText = '2'; }
    else if (eff === 0.5) { cellClass = 'eff-0-5'; cellText = '½'; }
    else if (eff === 0) { cellClass = 'eff-0'; cellText = '0'; }
    
    html += `<td class="${cellClass}" title="${attacker.toUpperCase()} vs ${defender.toUpperCase()}: ${eff}x">${cellText}</td>`;
    });
    
    html += `</tr>`;
});

html += `</table>`;
container.innerHTML = html;
}

function setupTypes() {
document.getElementById('typeButtons').innerHTML = TYPES.map(t => 
    `<button class="type-btn ${t === 'all' ? 'active' : ''}" data-action="set-type-filter" data-type="${t}" type="button">${t.toUpperCase()}</button>`
).join('');
}

async function setDamageClassFilter(c, triggerEl) {
damageClassFilter = c;
// Update active state for category buttons only
const buttons = document.getElementById('categoryButtons').querySelectorAll('.type-btn');
buttons.forEach(b => b.classList.remove('active'));
if (triggerEl) triggerEl.classList.add('active');

const grid = document.getElementById('grid');

if (c !== 'all' && !damageClassCache[c]) {
    grid.innerHTML = '<div class="loading">Fetching category data...</div>';
    const data = await fetch(`${API}/move-damage-class/${c}`).then(r => r.json());
    damageClassCache[c] = new Set(data.moves.map(m => m.name));
}

render();
}

async function render() {
const search = document.getElementById('search').value.toLowerCase();
const grid = document.getElementById('grid');

if (currentPage === 'pokedex') {
    let filtered = pokemon.filter(p => p.name.includes(search) || p.id.toString().includes(search));
    
    if (!filtered.length) {
    grid.innerHTML = '';
    document.getElementById('empty').style.display = 'block';
    return;
    }
    
    document.getElementById('empty').style.display = 'none';
    grid.innerHTML = filtered.map(p => `
    <div class="card" id="card-${p.id}" data-action="open-pokemon" data-pokemon-id="${p.id}">
        <div class="card-header">
        <div class="card-name">${p.name.charAt(0).toUpperCase() + p.name.slice(1)}</div>
        <div class="card-id">#${String(p.dexId || p.id).padStart(3, '0')}</div>
        </div>
        <div class="card-image">
        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png" alt="${p.name}" onerror="this.style.display='none'">
        </div>
        <div class="card-types">${p.types ? p.types.map(t => `<span class="type-tag" style="background: ${TYPE_COLORS[t]}">${t}</span>`).join('') : '<span class="loading-small" style="font-size:10px">...</span>'}</div>
    </div>
    `).join('');
    
    // Lazy load types for each card
    fetchPokedexTypes(filtered);
} else if (currentPage === 'moves') {
    let filtered = moves;
    
    // Apply damage class filter
    if (damageClassFilter !== 'all') {
    filtered = filtered.filter(m => damageClassCache[damageClassFilter].has(m.name));
    }
    
    // Apply search
    filtered = filtered.filter(m => m.name.includes(search));
    
    if (!filtered.length) {
    grid.innerHTML = '';
    document.getElementById('empty').style.display = 'block';
    return;
    }
    
    document.getElementById('empty').style.display = 'none';
    grid.innerHTML = filtered.map(m => `
    <div class="card" data-action="open-move" data-move-id="${m.id}" style="height: auto; min-height: 100px; display: flex; flex-direction: column; justify-content: center;">
        <div class="card-header" style="margin-bottom: 0;">
        <div class="card-name" style="font-size: 14px;">${m.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
        ${m.type ? `<span class="type-tag" style="background: ${TYPE_COLORS[m.type]}">${m.type}</span>` : ''}
        </div>
    </div>
    `).join('');
}
}

function fetchPokedexTypes(pokemonList) {
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const card = entry.target;
                const id = card.id.replace('card-', '');
                fetchPokemonTypeForCard(id, card);
                obs.unobserve(card);
            }
        });
    }, { rootMargin: '200px' }); // Preload 200px before view

    pokemonList.forEach(p => {
        if (!p.types) {  // Only observe if types aren't already loaded
            const card = document.getElementById(`card-${p.id}`);
            if (card) observer.observe(card);
        }
    });
}

async function fetchPokemonTypeForCard(id, card) {
    if (card.dataset.loaded) return;
    card.dataset.loaded = 'true';
    
    try {
        if (pokemonDetailsCache[id]) {
            renderTypes(card, pokemonDetailsCache[id].types);
            return;
        }

        const pData = await fetch(`${API}/pokemon/${id}`).then(r => r.json());
        pokemonDetailsCache[id] = pData; // Cache full data
        renderTypes(card, pData.types);
    } catch (e) {
        console.error(`Error fetching details for ${id}`, e);
        const typeContainer = card.querySelector('.card-types');
        if (typeContainer) typeContainer.innerHTML = '<span class="error">Err</span>';
    }
}

function moveDetail(id) {
    window.location.href = `move-detail.html?move=${id}`;
}

async function setFilter(t, triggerEl) {
filter = t;
// Update active state for type buttons only
const buttons = document.getElementById('typeButtons').querySelectorAll('.type-btn');
buttons.forEach(b => b.classList.remove('active'));
if (triggerEl) triggerEl.classList.add('active');

const grid = document.getElementById('grid');
grid.innerHTML = '<div class="loading">Fetching data...</div>';

if (currentPage === 'pokedex') {
    if (filter === 'all') {
    pokemon = [...allPokemon];
    } else {
    if (!typeCache[filter]) {
        const data = await fetch(`${API}/type/${filter}`).then(r => r.json());
        // Cache both pokemon and moves for this type
        typeCache[filter] = {
        pokemon: data.pokemon.map(p => ({
            id: parseInt(p.pokemon.url.split('/').filter(Boolean).pop()),
            name: p.pokemon.name
        })),
        moves: data.moves.map(m => ({
            name: m.name,
            type: filter // We know the type!
        }))
        };
    }
    pokemon = typeCache[filter].pokemon;
    }
} else if (currentPage === 'moves') {
    if (filter === 'all') {
    moves = [...allMoves];
    } else {
    if (!typeCache[filter]) {
        const data = await fetch(`${API}/type/${filter}`).then(r => r.json());
        typeCache[filter] = {
        pokemon: data.pokemon.map(p => ({
            id: parseInt(p.pokemon.url.split('/').filter(Boolean).pop()),
            name: p.pokemon.name
        })),
        moves: data.moves.map(m => ({
            name: m.name,
            type: filter
        }))
        };
    }
    moves = typeCache[filter].moves;
    }
}
render();
}

async function detail(id) {
const d = await fetch(`${API}/pokemon/${id}`).then(r => r.json());
const name = d.name.charAt(0).toUpperCase() + d.name.slice(1);
document.getElementById('modalTitle').textContent = name;

const statBars = d.stats.map(s => {
    const max = 150;
    const pct = (s.base_stat / max) * 100;
    return `
    <div class="stat-bar">
        <div class="stat-name">${s.stat.name}</div>
        <div class="stat-track"><div class="stat-fill" style="width: ${pct}%"></div></div>
        <div class="stat-num">${s.base_stat}</div>
    </div>
    `;
}).join('');

const abilities = d.abilities.map(a => `<span class="ability-tag" data-action="filter-by-ability" data-ability="${a.ability.name}" style="cursor: pointer;">${a.ability.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>`).join('');
const moves = d.moves.slice(0, 20).map(m => `<span class="move-tag">${m.move.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>`).join('');

// Conversions
const heightM = (d.height / 10).toFixed(1);
const totalInches = d.height * 3.93701;
const heightFt = Math.floor(totalInches / 12);
const heightIn = Math.round(totalInches % 12);

const weightKg = (d.weight / 10).toFixed(1);
const weightLbs = (d.weight / 10 * 2.20462).toFixed(1);

// Process Moves
currentPokemonMoves = {};
d.moves.forEach(m => {
    m.version_group_details.forEach(vgd => {
    const gen = VERSION_GROUP_TO_GEN[vgd.version_group.name];
    if (!gen) return;
    
    if (!currentPokemonMoves[gen]) currentPokemonMoves[gen] = {};
    
    const method = vgd.move_learn_method.name;
    if (!currentPokemonMoves[gen][method]) currentPokemonMoves[gen][method] = [];
    
    currentPokemonMoves[gen][method].push({
        name: m.move.name,
        url: m.move.url,
        level: vgd.level_learned_at
    });
    });
});

// Sort moves
Object.keys(currentPokemonMoves).forEach(gen => {
    Object.keys(currentPokemonMoves[gen]).forEach(method => {
    if (method === 'level-up') {
        currentPokemonMoves[gen][method].sort((a, b) => a.level - b.level);
    } else {
        currentPokemonMoves[gen][method].sort((a, b) => a.name.localeCompare(b.name));
    }
    });
});

document.getElementById('modalBody').innerHTML = `
    <div class="detail-image"><img src="${d.sprites.other['official-artwork'].front_default || d.sprites.front_default}" alt="${name}"></div>
    <div style="display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap;">
    ${d.types.map(t => `<span class="type-tag" style="background: ${TYPE_COLORS[t.type.name]}">${t.type.name}</span>`).join('')}
    </div>
    <div class="detail-grid">
    <div class="detail-item"><div class="detail-label">Height</div><div class="detail-value">${heightM}m <span style="font-size:0.7em; color:#8b92a5">(${heightFt}'${heightIn}")</span></div></div>
    <div class="detail-item"><div class="detail-label">Weight</div><div class="detail-value">${weightKg}kg <span style="font-size:0.7em; color:#8b92a5">(${weightLbs}lbs)</span></div></div>
    <div class="detail-item"><div class="detail-label">Base XP</div><div class="detail-value">${d.base_experience}</div></div>
    <div class="detail-item"><div class="detail-label">ID</div><div class="detail-value">#${String(d.id).padStart(3, '0')}</div></div>
    </div>
    
    <div class="stats-section">
    <div style="font-size: 12px; color: #8b92a5; font-weight: 600; text-transform: uppercase; margin-bottom: 12px;">Base Stats</div>
    ${statBars}
    </div>
    
    <div class="stats-section">
    <div class="section-title">Abilities</div>
    <div class="abilities-list">${abilities || '<span style="color: #8b92a5;">None</span>'}</div>
    </div>
    
    <div class="stats-section">
    <div class="section-title">Moves</div>
    <div id="move-tabs" class="move-tabs"></div>
    <div id="move-content" class="moves-container"></div>
    </div>
`;

renderMoveTabs();
document.getElementById('modal').classList.add('open');
}

function renderMoveTabs() {
const gens = Object.keys(currentPokemonMoves).sort((a, b) => b - a); // Descending
if (!gens.length) {
    document.getElementById('move-content').innerHTML = '<div style="padding:20px;text-align:center;color:#8b92a5">No move data available.</div>';
    return;
}

const tabsContainer = document.getElementById('move-tabs');
tabsContainer.innerHTML = gens.map(g => 
    `<button class="move-tab" data-action="switch-gen-tab" data-gen="${g}" type="button">Gen ${g}</button>`
).join('');

// Activate first tab (latest gen)
switchGenTab(gens[0]);
}

async function switchGenTab(gen) {
document.querySelectorAll('.move-tab').forEach(t => {
    t.classList.toggle('active', t.textContent === `Gen ${gen}`);
});

const container = document.getElementById('move-content');
const methods = currentPokemonMoves[gen];

let html = '';

// Order: level-up, machine, others
const methodOrder = ['level-up', 'machine', 'tutor', 'egg'];
const sortedMethods = Object.keys(methods).sort((a, b) => {
    const ia = methodOrder.indexOf(a);
    const ib = methodOrder.indexOf(b);
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
});

for (const method of sortedMethods) {
    const moves = methods[method];
    const title = method === 'level-up' ? 'Moves learnt by level up' : 
                method === 'machine' ? 'Moves learnt by TM' : 
                `Moves learnt by ${method.replace(/-/g, ' ')}`;
                
    html += `
    <div class="move-table-section">
        <div class="move-table-header">${title}</div>
        <table class="move-table">
        <thead>
            <tr>
            ${method === 'level-up' ? '<th style="width:50px">Lv.</th>' : ''}
            <th>Move</th>
            <th>Type</th>
            <th>Cat.</th>
            <th>Pwr.</th>
            <th>Acc.</th>
            </tr>
        </thead>
        <tbody>
            ${moves.map(m => `
            <tr class="move-row" data-url="${m.url}">
                ${method === 'level-up' ? `<td style="color:#8b92a5">${m.level}</td>` : ''}
                <td class="move-name-cell">${m.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</td>
                <td class="type-cell">-</td>
                <td class="cat-cell">-</td>
                <td class="pwr-cell">-</td>
                <td class="acc-cell">-</td>
            </tr>
            `).join('')}
        </tbody>
        </table>
    </div>
    `;
}

container.innerHTML = html;
loadMoveDetailsForTable(container);
}

async function loadMoveDetailsForTable(container) {
const rows = container.querySelectorAll('.move-row');

for (const row of rows) {
    const url = row.dataset.url;
    const id = url.split('/').filter(Boolean).pop();
    
    if (moveDetailsCache[id]) {
    updateRow(row, moveDetailsCache[id]);
    } else {
    fetch(url).then(r => r.json()).then(d => {
        moveDetailsCache[id] = d;
        updateRow(row, d);
    }).catch(e => console.error(e));
    }
}
}

function updateRow(row, d) {
row.querySelector('.type-cell').innerHTML = `<span class="type-tag" style="background:${TYPE_COLORS[d.type.name]};font-size:10px;padding:2px 6px;">${d.type.name.toUpperCase()}</span>`;

const catColor = d.damage_class.name === 'physical' ? '#ff4400' : d.damage_class.name === 'special' ? '#2266cc' : '#999';
const catTitle = d.damage_class.name.charAt(0).toUpperCase() + d.damage_class.name.slice(1);
row.querySelector('.cat-cell').innerHTML = `<span title="${catTitle}" style="color:${catColor};font-size:18px;line-height:1">●</span>`;

row.querySelector('.pwr-cell').textContent = d.power || '-';
row.querySelector('.acc-cell').textContent = d.accuracy || '-';

row.style.cursor = 'pointer';
row.onclick = () => moveDetail(d.id);
}

function closeModal() {
document.getElementById('modal').classList.remove('open');
}

async function filterByAbility(abilityName, event) {
if (event) event.stopPropagation();
closeModal();

const grid = document.getElementById('grid');
grid.innerHTML = `<div class="loading">Fetching Pokémon with ability: ${abilityName}...</div>`;

// Reset type buttons
document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));

try {
    const data = await fetch(`${API}/ability/${abilityName}`).then(r => r.json());
    pokemon = data.pokemon.map(p => {
    const id = parseInt(p.pokemon.url.split('/').filter(Boolean).pop());
    return { id: id, name: p.pokemon.name };
    });
    
    // Update subtitle to show active filter
    const subtitle = document.querySelector('.subtitle');
    const formattedAbility = abilityName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    subtitle.innerHTML = `Filtering by Ability: <span style="color:#3bd5ff">${formattedAbility}</span> (${pokemon.length} found) <a href="#" data-action="clear-ability-filter" style="color:#8b92a5; margin-left:10px; font-size:12px; text-decoration:underline;">Clear Filter</a>`;
        subtitle.innerHTML = `Filtering by Ability: <span style="color:#3bd5ff">${formattedAbility}</span> (${pokemon.length} found) <a href="#" data-action="clear-ability-filter" style="color:#8b92a5; margin-left:10px; font-size:12px; text-decoration:underline;">Clear Filter</a>`;
    setupActionDelegation();
    
    render();
} catch (e) {
    console.error(e);
    grid.innerHTML = '<div class="empty">Error loading ability data</div>';
}
}

const searchInput = document.getElementById('search');
if (searchInput) {
    searchInput.addEventListener('input', render);
}

function getInitialRouteFromHash() {
    const hash = (window.location.hash || '').replace(/^#/, '').trim();
    if (hash === 'moves') return 'moves';
    if (hash === 'type-chart' || hash === 'typechart') return 'type-chart';
    return null;
}

// Enable data-action click handling across all pages.
setupActionDelegation();

async function initPokedexPage() {
    await init();
    const route = getInitialRouteFromHash();
    if (route) {
        await switchPage(route);
    }
}

const detailContainer = document.getElementById('detailContainer');
const eggGroupList = document.getElementById('eggGroupList');
const eggGroupRoot = document.getElementById('eggPokemonGrid') || document.getElementById('eggGroupHeader');

if (detailContainer) {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
        loadPokemonDetails(id);
    } else {
        detailContainer.innerHTML = '<div class="error">No Pokémon ID specified.</div>';
    }
} else if (eggGroupList || eggGroupRoot) {
    initEggGroupPage();
} else if (window.location.pathname.includes('ability-detail.html')) {
    loadAbilityDetail();
} else if (window.location.pathname.includes('move-detail.html')) {
    loadMoveDetail();
} else if (window.location.pathname.includes('location-detail.html')) {
    initLocationsPage();
} else if (window.location.pathname.includes('locations.html')) {
    initLocationsGuidePage();
} else {
    // Default landing page is the main Pokédex app (Pokémon Database.html)
    initPokedexPage();
}

async function loadPokemonDetails(id) {
    const container = document.getElementById('detailContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div class="loading-container">
            <div class="pokeball-spinner"></div>
            <div>Loading Pokémon Data...</div>
        </div>
    `;

    try {
        const [pokemonData, speciesData] = await Promise.all([
            fetch(`${API}/pokemon/${id}`).then(r => r.json()),
            fetch(`${API}/pokemon-species/${id}`).then(r => r.json())
        ]);

        // Fill missing Gen 7–9 dex entries using GraphQL-Pokemon.
        // (PokeAPI is missing a lot of Gen 9 flavor texts.)
        try {
            const byGen = buildDexEntriesByGeneration(speciesData);
            const needsGql = !byGen[7] || !byGen[8] || !byGen[9];
            if (needsGql) {
                const gqlByVersion = await fetchGraphqlDexFlavorTextsByDexNumber(pokemonData?.id);
                if (gqlByVersion) speciesData.__gqlDexByVersion = gqlByVersion;
            }
        } catch (e) {
            // Non-fatal; dex entries will just remain as-is.
            console.warn('GraphQL-Pokemon dex fallback failed:', e);
        }

        const evolutionData = await fetch(speciesData.evolution_chain.url).then(r => r.json());
        
        // Fetch all varieties (forms) for this species
        const varieties = speciesData.varieties || [];
        const formsData = await Promise.all(
            varieties.map(v => fetch(v.pokemon.url).then(r => r.json()).catch(() => null))
        );
        
        renderPokemonDetail(pokemonData, speciesData, evolutionData, formsData.filter(f => f));
    } catch (e) {
        console.error(e);
        container.innerHTML = '<div class="error">Error loading Pokémon details.</div>';
    }
}

function renderPokemonDetail(p, species, evo, allForms = []) {
    const container = document.getElementById('detailContainer');
    
    // Filter forms to show: exclude base form, only show actual variants
    const relevantForms = allForms.filter(form => {
        const name = form.name.toLowerCase();
        const baseName = p.name.toLowerCase();
        
        // Exclude the exact base form (no variants)
        if (name === baseName) return false;
        
        // Include actual variant forms
        return name.includes('mega') || name.includes('gmax') || name.includes('gigantamax') || 
               name.includes('alola') || name.includes('galar') || name.includes('hisui') || 
               name.includes('paldea') || name.includes('ash') || name.includes('battle-bond') ||
               name.includes('origin') || name.includes('primal') || name.includes('therian') ||
               name.includes('sky') || name.includes('black') || name.includes('white') ||
               (name.includes('-') && name !== baseName); // Any form with a hyphen that's not exactly the base
    });
    
    // Build tabs HTML
    const formsTabsHtml = relevantForms.map((form, idx) => {
        let displayName = form.name.replace(p.name + '-', '').replace(/-/g, ' ');
        displayName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
        if (displayName.toLowerCase().includes('gmax')) displayName = 'Gigantamax';
        if (displayName.toLowerCase().includes('ash')) displayName = 'Ash';
        if (displayName.toLowerCase().includes('battle bond')) displayName = 'Battle Bond';
        return `<div class="tab" data-form-index="${idx + 1}">${displayName}</div>`;
    }).join('');
    
    // Flavor Text
    const flavorTextEntry = species.flavor_text_entries.find(f => f.language.name === 'en');
    const flavorText = flavorTextEntry ? flavorTextEntry.flavor_text.replace(/\f/g, ' ') : 'No description available.';

    // Dex entries (grouped by generation)
    const dexEntriesSectionHtml = renderDexEntriesSectionHtml(species);

    // Learnset (moves by generation/version group)
    const learnsetKeyMain = `learnset-${p.id}`;
    learnsetStore[learnsetKeyMain] = buildLearnsetData(p);
    const learnsetSectionHtmlMain = renderLearnsetSectionHtml(p, learnsetKeyMain);

    // Stats Calculation
    const statsHtml = p.stats.map(s => {
        const val = s.base_stat;
        const percent = Math.min((val / 255) * 100, 100);
        let color = '#ff5959';
        if (val >= 60) color = '#f5ac78';
        if (val >= 90) color = '#fae078';
        if (val >= 120) color = '#9db7f5';
        if (val >= 150) color = '#a7db8d';
        
        // Min/Max Calculation (Level 100)
        // HP: (2 * Base + 110) to (2 * Base + 204)
        // Others: (2 * Base + 5) * 0.9 to (2 * Base + 99) * 1.1
        let min, max;
        if (s.stat.name === 'hp') {
            min = (2 * val) + 110;
            max = (2 * val) + 204;
        } else {
            min = Math.floor(((2 * val) + 5) * 0.9);
            max = Math.floor(((2 * val) + 99) * 1.1);
        }

        return `
            <tr>
                <th>${formatStatName(s.stat.name)}</th>
                <td class="stat-val">${val}</td>
                <td class="stat-bar-cell">
                    <div class="stat-bar">
                        <div class="stat-fill" style="width: ${percent}%; background-color: ${color};"></div>
                    </div>
                </td>
                <td class="stat-minmax">${min}</td>
                <td class="stat-minmax">${max}</td>
            </tr>
        `;
    }).join('');

    // Type Defenses
    const defenses = calculateTypeDefenses(p.types);
    const defenseHtml = renderTypeDefenses(defenses);

    // Data Helpers
    const genus = species.genera.find(g => g.language.name === 'en')?.genus || '';
    const heightM = p.height / 10;
    const weightKg = p.weight / 10;
    const abilities = p.abilities.map(a => 
        `${a.is_hidden ? '<small class="text-muted">' : ''}${a.slot}. <a href="ability-detail.html?ability=${a.ability.name}" style="color:#3bd5ff;text-decoration:none">${a.ability.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</a>${a.is_hidden ? ' (hidden ability)</small>' : ''}`
    ).join('<br>');
    
    // Training Data
    const catchRate = species.capture_rate;
    const baseExp = p.base_experience;
    const growthRate = species.growth_rate.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Adjust Base Friendship: PokeAPI returns Gen 7 standard (70), but Gen 8+ standard is 50.
    let baseFriendship = species.base_happiness;
    if (baseFriendship === 70) baseFriendship = 50;
    
    // Friendship description
    let friendshipDesc = '(normal)';
    if (baseFriendship === 0) friendshipDesc = '(lower than normal)';
    else if (baseFriendship < 50) friendshipDesc = '(lower than normal)';
    else if (baseFriendship > 50) friendshipDesc = '(higher than normal)';

    const evYield = p.stats.filter(s => s.effort > 0).map(s => `${s.effort} ${formatStatName(s.stat.name)}`).join(', ');

    // Breeding Data
    const eggGroups = species.egg_groups.map(g => {
        // Map "no-eggs" to "undiscovered" for display consistency
        const apiName = g.name;
        const displayName = (apiName === 'no-eggs' ? 'undiscovered' : apiName)
            .replace(/-/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase());
        return `<a href="egg-group.html?group=${apiName}" style="color: #3bd5ff; text-decoration: none; cursor: pointer; border-bottom: 1px solid #3bd5ff;">${displayName}</a>`;
    }).join(', ');
    const genderRate = species.gender_rate;
    let genderText = '';
    if (genderRate === -1) {
        genderText = 'Genderless';
    } else {
        const femaleChance = (genderRate / 8) * 100;
        const maleChance = 100 - femaleChance;
        genderText = `<span style="color:#3bd5ff">${maleChance}% male</span>, <span style="color:#ff5959">${femaleChance}% female</span>`;
    }
    const eggCycles = species.hatch_counter;
    const steps = (eggCycles * 257).toLocaleString(); // Approx steps per cycle

    // Local Dex Numbers
    const localDex = species.pokedex_numbers
        .filter(entry => entry.pokedex.name !== 'national')
        .map(entry => {
            const dexName = entry.pokedex.name
                .replace(/-/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase());
            return `${String(entry.entry_number).padStart(4, '0')} <small style="color:#8b92a5">(${dexName})</small>`;
        });
    const localDexHtml = localDex.length > 0 ? localDex.join('<br>') : 'None';

    // Navigation Links
    const prevId = p.id > 1 ? p.id - 1 : 1025;
    const nextId = p.id < 1025 ? p.id + 1 : 1;
    
    // We need to fetch names for prev/next to display them
    // This is done asynchronously to not block rendering, but we need placeholders
    
    container.innerHTML = `
        <div class="detail-header-row">
            <div class="nav-link-container">
                ${p.id > 1 ? `<a href="pokemon.html?id=${prevId}" class="nav-link prev-link" id="prevLink">
                    <span class="nav-arrow">◀</span> #${String(prevId).padStart(4, '0')} <span class="nav-name">Loading...</span>
                </a>` : '<div></div>'}
            </div>
            <h1 class="detail-h1">${p.name.charAt(0).toUpperCase() + p.name.slice(1)}</h1>
            <div class="nav-link-container" style="justify-content: flex-end;">
                ${p.id < 1025 ? `<a href="pokemon.html?id=${nextId}" class="nav-link next-link" id="nextLink">
                    <span class="nav-name">Loading...</span> #${String(nextId).padStart(4, '0')} <span class="nav-arrow">▶</span>
                </a>` : '<div></div>'}
            </div>
        </div>

        <div class="tabs">
            <div class="tab active" data-form-index="0">${p.name.charAt(0).toUpperCase() + p.name.slice(1)}</div>
            ${formsTabsHtml}
        </div>

        <div id="formContent0"></div>
        ${relevantForms.map((form, idx) => {
            return `<div id="formContent${idx + 1}" style="display:none"></div>`;
        }).join('')}
    `;
    
    // Render form content asynchronously
    async function renderFormContentAsync() {
        // Render main form
        const evoHtml = await renderEvolutionChain(evo.chain);
        const mainContent = renderFormContent(p, species, evo, genus, localDexHtml, catchRate, baseExp, growthRate, baseFriendship, friendshipDesc, evYield, eggGroups, genderText, eggCycles, steps, abilities, heightM, weightKg, flavorText, dexEntriesSectionHtml, statsHtml, defenseHtml, evoHtml, learnsetSectionHtmlMain);
        const mainRoot = document.getElementById('formContent0');
        mainRoot.innerHTML = mainContent;
        setupDexEntryTabs(mainRoot);
        setupLearnsetSection(mainRoot);
        setupWhereToFindSection(mainRoot, p, species);
        
        // Render alternate forms
        relevantForms.forEach((form, idx) => {
            const formAbilities = form.abilities.map(a => 
                `${a.is_hidden ? '<small class="text-muted">' : ''}${a.slot}. <a href="ability-detail.html?ability=${a.ability.name}" style="color:#3bd5ff;text-decoration:none">${a.ability.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</a>${a.is_hidden ? ' (hidden ability)</small>' : ''}`
            ).join('<br>');
            const formEvYield = form.stats.filter(s => s.effort > 0).map(s => `${s.effort} ${formatStatName(s.stat.name)}`).join(', ') || 'None';
            const formStatsHtml = renderStatsForForm(form);
            const formDefenseHtml = renderTypeDefenses(calculateTypeDefenses(form.types));
            const formHeightM = form.height / 10;
            const formWeightKg = form.weight / 10;

            const learnsetKey = `learnset-${form.id}`;
            learnsetStore[learnsetKey] = buildLearnsetData(form);
            const learnsetSectionHtml = renderLearnsetSectionHtml(form, learnsetKey);
            
            const formContent = renderFormContent(form, species, evo, genus, localDexHtml, catchRate, form.base_experience || baseExp, growthRate, baseFriendship, friendshipDesc, formEvYield, eggGroups, genderText, eggCycles, steps, formAbilities, formHeightM, formWeightKg, flavorText, dexEntriesSectionHtml, formStatsHtml, formDefenseHtml, evoHtml, learnsetSectionHtml);
            const formRoot = document.getElementById(`formContent${idx + 1}`);
            formRoot.innerHTML = formContent;
            setupDexEntryTabs(formRoot);
            setupLearnsetSection(formRoot);
            setupWhereToFindSection(formRoot, form, species);
        });
    }
    
    // Call async function
    renderFormContentAsync().catch(err => console.error('Error rendering form content:', err));
    
    // Add click handlers for tabs
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const formIndex = tab.dataset.formIndex;
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('[id^="formContent"]').forEach(c => c.style.display = 'none');
            document.getElementById(`formContent${formIndex}`).style.display = 'block';
        });
    });
    
    // Setup navigation
    setupPokemonDetailNavigation(p);
}

function formatStatName(name) {
    const map = {
        'hp': 'HP',
        'attack': 'Attack',
        'defense': 'Defense',
        'special-attack': 'Sp. Atk',
        'special-defense': 'Sp. Def',
        'speed': 'Speed'
    };
    return map[name] || name;
}

function setupPokemonDetailNavigation(p) {
    const prevId = p.id > 1 ? p.id - 1 : 1025;
    const nextId = p.id < 1025 ? p.id + 1 : 1;
    
    const fetchName = async (id, elementId) => {
        try {
            const res = await fetch(`${API}/pokemon/${id}`);
            const data = await res.json();
            const el = document.querySelector(`#${elementId} .nav-name`);
            if (el) el.textContent = data.name.charAt(0).toUpperCase() + data.name.slice(1);
        } catch (e) {
            console.error('Error fetching nav name', e);
        }
    };

    if (p.id > 1) fetchName(prevId, 'prevLink');
    if (p.id < 1025) fetchName(nextId, 'nextLink');
}

function renderStatsForForm(form) {
    return form.stats.map(s => {
        const val = s.base_stat;
        const percent = Math.min((val / 255) * 100, 100);
        let color = '#ff5959';
        if (val >= 60) color = '#f5ac78';
        if (val >= 90) color = '#fae078';
        if (val >= 120) color = '#9db7f5';
        if (val >= 150) color = '#a7db8d';
        
        let min, max;
        if (s.stat.name === 'hp') {
            min = (2 * val) + 110;
            max = (2 * val) + 204;
        } else {
            min = Math.floor(((2 * val) + 5) * 0.9);
            max = Math.floor(((2 * val) + 99) * 1.1);
        }

        return `
            <tr>
                <th>${formatStatName(s.stat.name)}</th>
                <td class="stat-val">${val}</td>
                <td class="stat-bar-cell">
                    <div class="stat-bar">
                        <div class="stat-fill" style="width: ${percent}%; background-color: ${color};"></div>
                    </div>
                </td>
                <td class="stat-minmax">${min}</td>
                <td class="stat-minmax">${max}</td>
            </tr>
        `;
    }).join('');
}

function renderFormContent(p, species, evo, genus, localDexHtml, catchRate, baseExp, growthRate, baseFriendship, friendshipDesc, evYield, eggGroups, genderText, eggCycles, steps, abilities, heightM, weightKg, flavorText, dexEntriesSectionHtml, statsHtml, defenseHtml, evoHtml, learnsetSectionHtml) {
    // Get the best available image for this form
    let imageUrl = p.sprites.other?.['official-artwork']?.front_default;
    
    if (!imageUrl) {
        imageUrl = p.sprites.other?.home?.front_default;
    }
    
    if (!imageUrl) {
        imageUrl = p.sprites.other?.['dream-world']?.front_default;
    }
    
    if (!imageUrl && p.sprites.front_default) {
        imageUrl = p.sprites.front_default;
    }
    
    // If still no image, use constructed URL
    if (!imageUrl) {
        imageUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${p.id}.png`;
    }
    
    // Create unique ID for this image for fallback handling
    const imgId = `pokemon-img-${p.id}-${Date.now()}`;
    
    return `
        <div class="detail-grid">
            <div class="detail-left">
                <div class="main-image-container">
                    <img id="${imgId}" src="${imageUrl}" alt="${p.name}" class="main-image" onerror="handleImageError(this, ${p.id}, '${p.name}')">
                </div>
                <div style="padding: 15px; color: #f5f7ff; font-size: 14px; line-height: 1.6;">
                    ${flavorText}
                </div>
            </div>

            <div class="detail-middle">
                <h3 class="section-header" style="margin-top:0">Pokédex data</h3>
                <table class="data-table">
                    <tr>
                        <th>National №</th>
                        <td><strong>${String(species.id).padStart(4, '0')}</strong></td>
                    </tr>
                    <tr>
                        <th>Local №</th>
                        <td>${localDexHtml}</td>
                    </tr>
                    <tr>
                        <th>Type</th>
                        <td>
                            <div class="type-badges">
                                ${p.types.map(t => `<div class="type-badge" style="background: ${TYPE_COLORS[t.type.name]}">${t.type.name}</div>`).join('')}
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <th>Species</th>
                        <td>${genus}</td>
                    </tr>
                    <tr>
                        <th>Height</th>
                        <td>${heightM} m (${(heightM * 3.28084).toFixed(1)}′${Math.round(((heightM * 3.28084) % 1) * 12).toString().padStart(2, '0')}″)</td>
                    </tr>
                    <tr>
                        <th>Weight</th>
                        <td>${weightKg} kg (${(weightKg * 2.20462).toFixed(1)} lbs)</td>
                    </tr>
                    <tr>
                        <th>Abilities</th>
                        <td>${abilities}</td>
                    </tr>
                </table>
            </div>

            <div class="detail-right">
                <h3 class="section-header" style="margin-top:0">Training</h3>
                <table class="data-table">
                    <tr>
                        <th>EV yield</th>
                        <td>${evYield}</td>
                    </tr>
                    <tr>
                        <th>Catch rate</th>
                        <td>${catchRate} <small>(with PokéBall, full HP)</small></td>
                    </tr>
                    <tr>
                        <th>Base Friendship</th>
                        <td>${baseFriendship} <small>${friendshipDesc}</small></td>
                    </tr>
                    <tr>
                        <th>Base Exp.</th>
                        <td>${baseExp}</td>
                    </tr>
                    <tr>
                        <th>Growth Rate</th>
                        <td>${growthRate}</td>
                    </tr>
                </table>

                <h3 class="section-header">Breeding</h3>
                <table class="data-table">
                    <tr>
                        <th>Egg Groups</th>
                        <td>${eggGroups}</td>
                    </tr>
                    <tr>
                        <th>Gender</th>
                        <td>${genderText}</td>
                    </tr>
                    <tr>
                        <th>Egg cycles</th>
                        <td>${eggCycles} <small>(${steps} steps)</small></td>
                    </tr>
                </table>
            </div>
        </div>

        ${dexEntriesSectionHtml}

        <div class="detail-grid" style="grid-template-columns: 1.2fr 0.8fr;">
            <div>
                <h3 class="section-header">Base stats</h3>
                <table class="stats-table">
                    ${statsHtml}
                    <tr>
                        <th>Total</th>
                        <td class="stat-val">${p.stats.reduce((a, b) => a + b.base_stat, 0)}</td>
                        <td></td>
                        <td class="stat-minmax">Min</td>
                        <td class="stat-minmax">Max</td>
                    </tr>
                </table>
                <div style="font-size:12px; color:#8b92a5; margin-top:10px;">
                    The ranges shown on the right are for a level 100 Pokémon. Maximum values are based on a beneficial nature, 252 EVs, 31 IVs; minimum values are based on a hindering nature, 0 EVs, 0 IVs.
                </div>
            </div>
            <div>
                <h3 class="section-header">Type defenses</h3>
                <div style="font-size:13px; color:#f5f7ff; margin-bottom:10px;">The effectiveness of each type on <i>${p.name}</i>.</div>
                <div class="type-defense-container">
                    ${defenseHtml}
                </div>
            </div>
        </div>

        <div class="full-width-section">
            <h3 class="section-header">Evolution Chain</h3>
            <div class="evolution-container">
                ${evoHtml}
            </div>
        </div>

        ${learnsetSectionHtml}

        ${renderWhereToFindSectionPlaceholderHtml(p)}
    `;
}

function formatStatName_OLD(name) {
    const map = {
        'hp': 'HP',
        'attack': 'Attack',
        'defense': 'Defense',
        'special-attack': 'Sp. Atk',
        'special-defense': 'Sp. Def',
        'speed': 'Speed'
    };
    return map[name] || name;
}

function calculateTypeDefenses(types) {
    const multipliers = new Array(18).fill(1);
    const typeIndices = types.map(t => TYPE_ORDER.indexOf(t.type.name));
    
    typeIndices.forEach(defenderIndex => {
        TYPE_CHART_DATA.forEach((row, attackerIndex) => {
            multipliers[attackerIndex] *= row[defenderIndex];
        });
    });
    
    return multipliers;
}

function renderTypeDefenses(multipliers) {
    return multipliers.map((mult, i) => {
        const typeName = TYPE_ORDER[i];
        let className = '';
        let text = '';
        
        if (mult === 4) { className = 'eff-4'; text = '4'; }
        else if (mult === 2) { className = 'eff-2'; text = '2'; }
        else if (mult === 1) { className = 'eff-1'; text = ''; }
        else if (mult === 0.5) { className = 'eff-0-5'; text = '½'; }
        else if (mult === 0.25) { className = 'eff-0-25'; text = '¼'; }
        else if (mult === 0) { className = 'eff-0'; text = '0'; }
        
        return `
            <div class="td-box">
                <div class="td-type-label" style="background: ${TYPE_COLORS[typeName]}">${typeName.slice(0,3)}</div>
                <div class="td-multiplier ${className}">${text}</div>
            </div>
        `;
    }).join('');
}

function renderEvolutionChain(chain) {
    if (!chain) return '<div style="color: #8b92a5;">No evolution data available</div>';
    
    // Check if this is Eevee (species ID 133) - special radial layout
    const rootSpeciesId = chain.species.url.split('/').filter(Boolean).pop();
    const isEeveeChain = rootSpeciesId === '133';
    
    // Helper function to get evolution trigger text
    function getEvolutionDetails(evolutionDetails) {
        if (!evolutionDetails || evolutionDetails.length === 0) return '';
        
        // Collect all unique methods
        const methods = [];
        
        for (const detail of evolutionDetails) {
            if (!detail.trigger) continue;
            
            const trigger = detail.trigger.name;
            let methodText = '';
            
            if (trigger === 'use-item') {
                if (detail.item) {
                    const itemName = detail.item.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    methodText = `Use ${itemName}`;
                }
            } else if (trigger === 'level-up') {
                // Build condition text based on what's present
                if (detail.min_level) {
                    methodText = `Level ${detail.min_level}`;
                } else if (detail.min_happiness) {
                    methodText = `High Friendship`;
                    // Add time of day if present
                    if (detail.time_of_day) {
                        methodText += ` (${detail.time_of_day})`;
                    }
                } else if (detail.min_affection) {
                    methodText = `High Affection`;
                    // Check for known move type (Fairy-type for Sylveon)
                    if (detail.known_move_type) {
                        const typeName = detail.known_move_type.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        methodText += ` + ${typeName} move`;
                    } else if (detail.known_move) {
                        const moveName = detail.known_move.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                        methodText += ` + ${moveName}`;
                    }
                } else if (detail.min_beauty) {
                    methodText = `Beauty ${detail.min_beauty}+`;
                } else if (detail.time_of_day && !detail.min_happiness) {
                    methodText = `Level up (${detail.time_of_day})`;
                } else if (detail.location) {
                    const locName = detail.location.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    methodText = `Near ${locName}`;
                } else if (detail.known_move) {
                    const moveName = detail.known_move.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    methodText = `Level up with ${moveName}`;
                } else if (detail.known_move_type && !detail.min_affection) {
                    const typeName = detail.known_move_type.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    methodText = `Level up with ${typeName} move`;
                } else if (detail.needs_overworld_rain) {
                    methodText = 'Level up during rain';
                } else if (detail.turn_upside_down) {
                    methodText = 'Turn upside down';
                } else {
                    methodText = 'Level up';
                }
                
                // Add additional condition modifiers
                if (detail.gender && detail.gender === 1) methodText += ', Female';
                if (detail.gender && detail.gender === 2) methodText += ', Male';
                if (detail.relative_physical_stats === 1) methodText += ', Atk > Def';
                if (detail.relative_physical_stats === -1) methodText += ', Def > Atk';
                if (detail.relative_physical_stats === 0) methodText += ', Atk = Def';
                if (detail.party_species) {
                    const speciesName = detail.party_species.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    methodText += `, with ${speciesName}`;
                }
                if (detail.party_type) {
                    const typeName = detail.party_type.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    methodText += `, with ${typeName} type`;
                }
            } else if (trigger === 'trade') {
                if (detail.held_item) {
                    const itemName = detail.held_item.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    methodText = `Trade holding ${itemName}`;
                } else if (detail.trade_species) {
                    const speciesName = detail.trade_species.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                    methodText = `Trade for ${speciesName}`;
                } else {
                    methodText = 'Trade';
                }
            } else if (trigger === 'shed') {
                methodText = 'Level 20, empty slot';
            } else if (trigger === 'spin') {
                methodText = 'Spin with Sweet';
            } else if (trigger === 'tower-of-darkness') {
                methodText = 'Tower of Darkness';
            } else if (trigger === 'tower-of-waters') {
                methodText = 'Tower of Waters';
            } else if (trigger === 'three-critical-hits') {
                methodText = '3 critical hits';
            } else if (trigger === 'take-damage') {
                methodText = 'Take 49+ damage';
            } else if (trigger === 'agile-style-move') {
                methodText = 'Agile Style 20x';
            } else if (trigger === 'strong-style-move') {
                methodText = 'Strong Style 20x';
            } else if (trigger === 'recoil-damage') {
                methodText = '294+ recoil damage';
            }
            
            if (methodText && !methods.includes(methodText)) {
                methods.push(methodText);
            }
        }
        
        // Join multiple methods with "or"
        return methods.length > 0 ? `(${methods.join(' or ')})` : '';
    }
    
    // Helper to check if this is a regional variant form
    function isRegionalVariant(speciesName) {
        const lowerName = speciesName.toLowerCase();
        return lowerName.includes('-') && (
            lowerName.includes('alola') || 
            lowerName.includes('galar') || 
            lowerName.includes('hisui') ||
            lowerName.includes('paldea')
        );
    }
    
    // Get regional form prefix if exists
    function getRegionalPrefix(speciesName) {
        const lower = speciesName.toLowerCase();
        if (lower.includes('alola')) return 'Alolan';
        if (lower.includes('galar')) return 'Galarian';
        if (lower.includes('hisui')) return 'Hisuian';
        if (lower.includes('paldea')) return 'Paldean';
        return '';
    }
    
    // Recursive function to render evolution tree with detailed cards
    async function renderNode(node, isRoot = false, renderChildren = true) {
        const speciesName = node.species.name;
        const speciesId = node.species.url.split('/').filter(Boolean).pop();
        const displayName = speciesName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const regionalPrefix = getRegionalPrefix(speciesName);
        
        // Fetch Pokemon details for types
        let pokemonData = pokemonDetailsCache[speciesId];
        if (!pokemonData) {
            try {
                const response = await fetch(`${API}/pokemon/${speciesId}`);
                pokemonData = await response.json();
                pokemonDetailsCache[speciesId] = pokemonData;
            } catch (e) {
                console.error(`Error fetching pokemon ${speciesId}:`, e);
            }
        }
        

        
        const typesHtml = pokemonData && pokemonData.types ? pokemonData.types.map(t => {
            const typeName = t.type.name;
            return `<span class="evo-type-badge" style="background: ${TYPE_COLORS[typeName]}">${typeName}</span>`;
        }).join(' · ') : '';
        
        let html = `
            <div class="evo-pokemon-card">
                <div class="evo-card" data-action="open-pokemon" data-pokemon-id="${speciesId}" style="cursor: pointer;">
                    <div class="evo-card-image">
                        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${speciesId}.png" alt="${displayName}" class="evo-card-img" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${speciesId}.png'">
                    </div>
                    <div class="evo-card-number">#${String(speciesId).padStart(4, '0')}</div>
                    <div class="evo-card-name">${displayName}</div>
                    ${regionalPrefix ? `<div class="evo-card-variant">${regionalPrefix}</div>` : ''}
                    <div class="evo-card-types">${typesHtml}</div>
                </div>
            </div>
        `;
        
        if ((node.evolves_to && node.evolves_to.length > 0)) {
            if (renderChildren) {
                // Collect all evolutions including regional variants
                const allEvolutions = [];
                
                for (const evolution of (node.evolves_to || [])) {
                    const method = getEvolutionDetails(evolution.evolution_details);
                    allEvolutions.push({
                        node: evolution,
                        method: method,
                        isVariant: false
                    });
                    
                    // Check if this evolution has regional variants
                    const evolvedSpeciesName = evolution.species.name;
                    if (!isRegionalVariant(evolvedSpeciesName)) {
                        try {
                            const speciesResponse = await fetch(evolution.species.url);
                            const speciesData = await speciesResponse.json();
                            
                            // Check all varieties for regional forms
                            if (speciesData.varieties && speciesData.varieties.length > 1) {
                                for (const variety of speciesData.varieties) {
                                    const varietyName = variety.pokemon.name;
                                    if (isRegionalVariant(varietyName) && varietyName !== evolvedSpeciesName) {
                                        // Create a variant evolution entry
                                        allEvolutions.push({
                                            variantName: varietyName,
                                            method: method,
                                            isVariant: true,
                                            baseEvolution: evolution
                                        });
                                    }
                                }
                            }
                        } catch (e) {
                            console.error(`Error fetching species data for ${evolvedSpeciesName}:`, e);
                        }
                    }
                }
                
                const totalEvolutions = allEvolutions.length;
                
                // If multiple evolutions, use vertical branching layout
                if (totalEvolutions > 1) {
                    html += '<div class="evo-branches-vertical">';
                    
                    for (const evo of allEvolutions) {
                        if (evo.isVariant) {
                            // Render regional variant
                            try {
                                const variantResponse = await fetch(`${API}/pokemon/${evo.variantName}`);
                                const variantData = await variantResponse.json();
                                const variantId = variantData.id;
                                const variantDisplayName = evo.variantName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                                const variantPrefix = getRegionalPrefix(evo.variantName);
                                
                                const variantTypesHtml = variantData.types.map(t => {
                                    const typeName = t.type.name;
                                    return `<span class="evo-type-badge" style="background: ${TYPE_COLORS[typeName]}">${typeName}</span>`;
                                }).join(' · ');
                                
                                html += `
                                    <div class="evo-branch-row">
                                        <div class="evo-arrow-container evo-arrow-variant">
                                            <div class="evo-arrow-symbol">↘</div>
                                            ${evo.method ? `<div class="evo-method">${evo.method}, in Legends: Arceus</div>` : '<div class="evo-method">(in Legends: Arceus)</div>'}
                                        </div>
                                        <div class="evo-pokemon-card">
                                            <div class="evo-card" data-action="open-pokemon" data-pokemon-id="${variantId}" style="cursor: pointer;">
                                                <div class="evo-card-image">
                                                    <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${variantId}.png" alt="${variantDisplayName}" class="evo-card-img" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${variantId}.png'">
                                                </div>
                                                <div class="evo-card-number">#${String(variantId).padStart(4, '0')}</div>
                                                <div class="evo-card-name">${variantDisplayName}</div>
                                                <div class="evo-card-variant">${variantPrefix}</div>
                                                <div class="evo-card-types">${variantTypesHtml}</div>
                                            </div>
                                        </div>
                                    </div>
                                `;
                            } catch (e) {
                                console.error(`Error fetching variant ${evo.variantName}:`, e);
                            }
                        } else {
                            // Render normal evolution
                            html += `
                                <div class="evo-branch-row">
                                    <div class="evo-arrow-container">
                                        <div class="evo-arrow-symbol">↗</div>
                                        ${evo.method ? `<div class="evo-method">${evo.method}</div>` : ''}
                                    </div>
                                    ${await renderNode(evo.node, false)}
                                </div>
                            `;
                        }
                    }
                    
                    html += '</div>';
                } else {
                    // Single evolution - use horizontal layout
                    html += '<div class="evo-branches-grid">';
                    
                    const evo = allEvolutions[0];
                    html += `
                        <div class="evo-arrow-container">
                            <div class="evo-arrow-symbol">→</div>
                            ${evo.method ? `<div class="evo-method">${evo.method}</div>` : ''}
                        </div>
                        ${await renderNode(evo.node, false)}
                    `;
                    
                    html += '</div>';
                }
            }
        }
        
        return html;
    }
    
    // Special layout for Eevee - center with evolutions around (radial)
    if (isEeveeChain) {
        return new Promise(async (resolve) => {
            const eeveeHtml = await renderNode(chain, true, false);

            const evolutions = chain.evolves_to || [];
            const evolutionCards = [];

            for (const evolution of evolutions) {
                const method = getEvolutionDetails(evolution.evolution_details);
                const card = await renderNode(evolution, false, false);
                evolutionCards.push({ html: card, method });
            }

            // Layout tuning (percent-based for responsiveness)
            const n = Math.max(evolutionCards.length, 1);
            const radiusPct = 39;        // where cards sit
            const arrowEndPct = 28;      // where arrow head sits (before card)
            const arrowStartPct = 16;    // where arrow starts (outside center card)
            const labelPerpPct = 3;      // nudge labels off the arrow line

            // Build SVG arrows + HTML positioned cards/labels
            let svgLines = '';
            let cardsHtml = '';
            let labelsHtml = '';

            for (let i = 0; i < evolutionCards.length; i++) {
                const angle = (-Math.PI / 2) + (2 * Math.PI * i) / n;
                const dx = Math.cos(angle);
                const dy = Math.sin(angle);

                const cardLeft = 50 + radiusPct * dx;
                const cardTop = 50 + radiusPct * dy;

                const startLeft = 50 + arrowStartPct * dx;
                const startTop = 50 + arrowStartPct * dy;
                const endLeft = 50 + arrowEndPct * dx;
                const endTop = 50 + arrowEndPct * dy;

                // SVG is 0..1000 so 1% == 10 units
                const x1 = startLeft * 10;
                const y1 = startTop * 10;
                const x2 = endLeft * 10;
                const y2 = endTop * 10;

                svgLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="evo-eevee-arrow-line" marker-end="url(#evoArrow)" />`;

                cardsHtml += `<div class="evo-eevee-item" style="--left:${cardLeft}%;--top:${cardTop}%;">${evolutionCards[i].html}</div>`;

                if (evolutionCards[i].method) {
                    // Put the label at the midpoint of the arrow, slightly offset perpendicular to the line.
                    const midLeft = (startLeft + endLeft) / 2;
                    const midTop = (startTop + endTop) / 2;
                    // Perpendicular unit vector to (dx, dy) is (-dy, dx)
                    const labelLeft = midLeft + (labelPerpPct * -dy);
                    const labelTop = midTop + (labelPerpPct * dx);
                    labelsHtml += `<div class="evo-method evo-eevee-label" style="--left:${labelLeft}%;--top:${labelTop}%;">${evolutionCards[i].method}</div>`;
                }
            }

            const radialHtml = `
                <div class="evo-eevee-radial">
                    <svg class="evo-eevee-radial-svg" viewBox="0 0 1000 1000" aria-hidden="true" focusable="false">
                        <defs>
                            <marker id="evoArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto" markerUnits="strokeWidth">
                                <path d="M 0 0 L 8 4 L 0 8 z" class="evo-eevee-arrow-head" />
                            </marker>
                        </defs>
                        ${svgLines}
                    </svg>
                    <div class="evo-eevee-center">${eeveeHtml}</div>
                    ${labelsHtml}
                    ${cardsHtml}
                </div>
            `;

            resolve(`<div class="evo-chain-container">${radialHtml}</div>`);
        });
    }
    
    // Use async IIFE to handle async rendering
    return new Promise(async (resolve) => {
        const html = await renderNode(chain, true);
        resolve(`<div class="evo-chain-container">${html}</div>`);
    });
}

// Egg Group Page Logic
async function initEggGroupPage() {
    console.log('Initializing egg group page...');
    
    // Load list immediately (non-blocking)
    loadEggGroupList();
    
    // Load detail for current group
    const urlParams = new URLSearchParams(window.location.search);
    const group = urlParams.get('group') || 'monster';
    console.log('Loading group:', group);
    loadEggGroupDetail(group);
}

async function loadEggGroupList() {
    const listContainer = document.getElementById('eggGroupList');
    if (!listContainer) return;

    const currentGroup = new URLSearchParams(window.location.search).get('group') || 'monster';

    try {
        const data = await fetch(`${API}/egg-group`).then(r => r.json());
        
        // Sort alphabetically by display name
        const sorted = data.results.sort((a, b) => {
            const nameA = getEggGroupDisplayName(a.name);
            const nameB = getEggGroupDisplayName(b.name);
            return nameA.localeCompare(nameB);
        });
        
        // Render list immediately without counts
        listContainer.innerHTML = sorted.map(g => {
            const name = getEggGroupDisplayName(g.name);
            const isActive = currentGroup === g.name;
            return `<a href="egg-group.html?group=${g.name}" class="egg-group-item ${isActive ? 'active' : ''}" data-group="${g.name}">
                <span class="egg-group-name">${name}</span><span class="egg-group-count"> ...</span>
            </a>`;
        }).join('');
        
        // Fetch counts in background (don't block UI)
        sorted.forEach(async (g) => {
            try {
                const response = await fetch(`${API}/egg-group/${g.name}`, {
                    headers: { 'Cache-Control': 'no-cache' }
                });
                const groupData = await response.json();
                const count = groupData.pokemon_species ? groupData.pokemon_species.length : 0;
                
                // Update the count in the UI
                const link = listContainer.querySelector(`[data-group="${g.name}"] .egg-group-count`);
                if (link) link.textContent = ` (${count})`;
            } catch (e) {
                console.error(`Error fetching count for ${g.name}:`, e);
            }
        });
    } catch (e) {
        console.error(e);
        listContainer.innerHTML = '<div class="error">Error loading groups</div>';
    }
}

async function loadEggGroupDetail(groupName) {
    console.log('loadEggGroupDetail called with:', groupName);
    const apiGroupName = (groupName || '').toLowerCase().trim();

    const header = document.getElementById('eggGroupHeader');
    const desc = document.getElementById('eggGroupDescription');
    const grid = document.getElementById('eggPokemonGrid');
    
    // Bail out if required elements don't exist
    if (!header || !desc || !grid) {
        console.error('Egg group page elements not found', {header: !!header, desc: !!desc, grid: !!grid});
        return;
    }
    
    console.log('Rendering egg group:', apiGroupName);
    const titleText = getEggGroupDisplayName(apiGroupName);
    header.innerHTML = `<h1 class="egg-title">${titleText} <span>(egg group)</span></h1>`;
    desc.innerHTML = 'Loading details...';
    grid.innerHTML = '<div class="loading">Loading Pokémon...</div>';
    
    // Update active state in sidebar
    document.querySelectorAll('.egg-group-item, .egg-group-link').forEach(item => {
        const href = item.getAttribute('href') || '';
        if (href.includes(`group=${apiGroupName}`)) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    try {
        console.log('Fetching data for:', apiGroupName);
        const response = await fetch(`${API}/egg-group/${apiGroupName}`, {
            headers: { 'Cache-Control': 'no-cache' }
        });
        const data = await response.json();
        console.log('Received data for:', apiGroupName, 'count:', data.pokemon_species?.length);
        
        // Description
        const count = data.pokemon_species ? data.pokemon_species.length : 0;
        console.log(`Loaded ${apiGroupName}: ${count} pokemon_species`);
        const displayName = getEggGroupDisplayName(apiGroupName);
        
        // Get description text if available
        const description = EGG_GROUP_DESCRIPTIONS[apiGroupName] || '';
        const countText = `${displayName} Pokémon are in this group. There are ${count} Pokémon in this group.`;
        
        desc.innerHTML = description ? `${description}<br><br>${countText}` : countText;

        // Render Grid
        const speciesList = data.pokemon_species;
        
        // Sort by ID (url)
        speciesList.sort((a, b) => {
            const idA = parseInt(a.url.split('/').filter(Boolean).pop());
            const idB = parseInt(b.url.split('/').filter(Boolean).pop());
            return idA - idB;
        });

        grid.innerHTML = speciesList.map(s => {
            const id = parseInt(s.url.split('/').filter(Boolean).pop());
            const name = s.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
            return `
                <div class="card" id="card-${id}" data-action="open-pokemon" data-pokemon-id="${id}">
                    <div class="card-header">
                        <div class="card-name">${name}</div>
                        <div class="card-id">#${String(id).padStart(3, '0')}</div>
                    </div>
                    <div class="card-image">
                        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png" alt="${name}" onerror="this.style.display='none'">
                    </div>
                    <div class="card-types">
                        <span class="loading-small" style="font-size:10px">...</span>
                    </div>
                </div>
            `;
        }).join('');

        // Fetch details (Types) for each pokemon in the background
        // We use a larger batch size and don't await the entire process to block UI
        // But we do want to update the UI as we get data
        fetchEggGroupTypes(speciesList);

    } catch (e) {
        console.error(e);
        desc.innerHTML = '<div class="error">Error loading egg group details.</div>';
    }
}

function fetchEggGroupTypes(speciesList) {
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const card = entry.target;
                const id = card.id.replace('card-', '');
                fetchPokemonType(id, card);
                obs.unobserve(card);
            }
        });
    }, { rootMargin: '200px' }); // Preload 200px before view

    speciesList.forEach(s => {
        const id = parseInt(s.url.split('/').filter(Boolean).pop());
        const card = document.getElementById(`card-${id}`);
        if (card) observer.observe(card);
    });
}

async function fetchPokemonType(id, card) {
    if (card.dataset.loaded) return;
    card.dataset.loaded = 'true';
    
    try {
        if (pokemonDetailsCache[id]) {
             renderTypes(card, pokemonDetailsCache[id].types);
             return;
        }

        const pData = await fetch(`${API}/pokemon/${id}`).then(r => r.json());
        pokemonDetailsCache[id] = pData; // Cache full data
        renderTypes(card, pData.types);
    } catch (e) {
        console.error(`Error fetching details for ${id}`, e);
        const typeContainer = card.querySelector('.card-types');
        if (typeContainer) typeContainer.innerHTML = '<span class="error">Err</span>';
    }
}

function renderTypes(card, types) {
    const typeContainer = card.querySelector('.card-types');
    if (!typeContainer) return;
    
    const typesHtml = types.map(t => 
        `<span class="type-tag" style="background: ${TYPE_COLORS[t.type.name]}">${t.type.name}</span>`
    ).join('');
    typeContainer.innerHTML = typesHtml;
}

// ========== Abilities Page ==========
let allAbilities = [];
let currentSortColumn = 0;
let sortDirection = 'asc';

async function loadAbilitiesPage() {
    const tableBody = document.getElementById('abilitiesTableBody');
    if (!tableBody) return;

    try {
        tableBody.innerHTML = '<tr><td colspan="4" class="loading-cell">Loading abilities...</td></tr>';

        // Fetch all abilities
        const response = await fetch(`${API}/ability?limit=1000`);
        const data = await response.json();
        
        // Fetch details for each ability
        const abilitiesPromises = data.results.map(async ability => {
            const detailResponse = await fetch(ability.url);
            return detailResponse.json();
        });

        const abilitiesData = await Promise.all(abilitiesPromises);
        
        // Process abilities data
        allAbilities = abilitiesData
            .filter(ability => {
                // Filter out abilities with no effect or no Pokémon
                const effectEntry = ability.effect_entries.find(e => e.language.name === 'en');
                const hasEffect = effectEntry && effectEntry.short_effect && effectEntry.short_effect.trim().length > 0;
                const hasPokemon = ability.pokemon && ability.pokemon.length > 0;
                
                return hasEffect && hasPokemon;
            })
            .map(ability => {
            // Get English effect entry
            const effectEntry = ability.effect_entries.find(e => e.language.name === 'en');
            const effect = effectEntry ? effectEntry.short_effect : 'No description available';
            
            // Count unique Pokémon
            const pokemonCount = ability.pokemon.length;
            
            // Get generation - check various possible sources
            let generation = 0;
            
            if (ability.generation) {
                // Try to get from generation object
                if (typeof ability.generation === 'object' && ability.generation.name) {
                    const genMatch = ability.generation.name.match(/(\d+)/);
                    generation = genMatch ? parseInt(genMatch[1]) : 0;
                } else if (typeof ability.generation === 'string') {
                    const genMatch = ability.generation.match(/(\d+)/);
                    generation = genMatch ? parseInt(genMatch[1]) : 0;
                } else if (typeof ability.generation === 'number') {
                    generation = ability.generation;
                }
            }
            
            // Fallback: check the id to estimate generation
            if (generation === 0 && ability.id) {
                // Abilities introduced in different generations
                // Gen 1-2: N/A, Gen 3: 1-76, Gen 4: 77-126, Gen 5: 127-164, Gen 6: 165-188, Gen 7: 189-233, Gen 8: 234-265, Gen 9: 266+
                const id = ability.id;
                if (id <= 76) generation = 3;
                else if (id <= 126) generation = 4;
                else if (id <= 164) generation = 5;
                else if (id <= 188) generation = 6;
                else if (id <= 233) generation = 7;
                else if (id <= 265) generation = 8;
                else generation = 9;
            }
            
            return {
                name: ability.name,
                displayName: ability.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                pokemonCount: pokemonCount,
                effect: effect,
                generation: generation,
                id: ability.id
            };
        });

        // Sort by name initially
        allAbilities.sort((a, b) => a.displayName.localeCompare(b.displayName));
        
        renderAbilitiesTable();
        
    } catch (error) {
        console.error('Error loading abilities:', error);
        tableBody.innerHTML = '<tr><td colspan="4" class="loading-cell" style="color: #ff4444;">Error loading abilities. Please try again.</td></tr>';
    }
}

function renderAbilitiesTable(filteredAbilities = null) {
    const tableBody = document.getElementById('abilitiesTableBody');
    if (!tableBody) return;

    const abilities = filteredAbilities || allAbilities;
    
    if (abilities.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" class="loading-cell">No abilities found</td></tr>';
        return;
    }

    const rows = abilities.map(ability => `
        <tr data-gen="${ability.generation}">
            <td><a href="#" class="ability-name" data-action="show-ability-pokemon" data-ability="${ability.name}">${ability.displayName}</a></td>
            <td class="pokemon-count">${ability.pokemonCount}</td>
            <td>${ability.effect}</td>
            <td class="gen-badge">${ability.generation}</td>
        </tr>
    `).join('');

    tableBody.innerHTML = rows;
}

let currentDisplayedAbilities = null;

function sortAbilitiesTable(columnIndex) {
    const headers = document.querySelectorAll('.abilities-table th');
    if (!headers.length || allAbilities.length === 0) return;
    
    // Toggle direction if same column
    if (currentSortColumn === columnIndex) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        sortDirection = 'asc';
        currentSortColumn = columnIndex;
    }

    // Update arrows
    headers.forEach((header, idx) => {
        const arrow = header.querySelector('.sort-arrow');
        if (arrow) {
            if (idx === columnIndex) {
                arrow.textContent = sortDirection === 'asc' ? '▲' : '▼';
                header.classList.add('sorted');
            } else {
                arrow.textContent = '';
                header.classList.remove('sorted');
            }
        }
    });

    // Get the abilities to sort (either filtered or all)
    const genFilter = document.getElementById('genFilter');
    let abilitiesToSort = currentDisplayedAbilities || allAbilities;
    
    // Sort abilities
    abilitiesToSort.sort((a, b) => {
        let valA, valB;

        switch (columnIndex) {
            case 0: // Name
                valA = a.displayName;
                valB = b.displayName;
                return sortDirection === 'asc' 
                    ? valA.localeCompare(valB)
                    : valB.localeCompare(valA);
            
            case 1: // Pokémon count
                valA = a.pokemonCount;
                valB = b.pokemonCount;
                break;
            
            case 2: // Description
                valA = a.effect;
                valB = b.effect;
                return sortDirection === 'asc' 
                    ? valA.localeCompare(valB)
                    : valB.localeCompare(valA);
            
            case 3: // Generation
                valA = a.generation;
                valB = b.generation;
                break;
        }

        if (sortDirection === 'asc') {
            return valA - valB;
        } else {
            return valB - valA;
        }
    });

    renderAbilitiesTable(abilitiesToSort);
    currentDisplayedAbilities = abilitiesToSort;
}

async function showAbilityPokemon(abilityName, event) {
    if (event && typeof event.preventDefault === 'function') {
        event.preventDefault();
    }

    if (!abilityName) return;

    // Navigate to ability detail page
    window.location.href = `ability-detail.html?ability=${abilityName}`;
}

// Filter by generation
document.addEventListener('DOMContentLoaded', () => {
    const genFilter = document.getElementById('genFilter');
    
    if (genFilter) {
        genFilter.addEventListener('change', (e) => {
            const selectedGen = e.target.value;
            
            if (selectedGen === 'all') {
                currentDisplayedAbilities = null;
                renderAbilitiesTable();
            } else {
                const selectedGenNum = parseInt(selectedGen);
                const filtered = allAbilities.filter(ability => {
                    // Only filter if generation is not 0 (unknown)
                    if (ability.generation === 0) return true;
                    return ability.generation === selectedGenNum;
                });
                currentDisplayedAbilities = filtered;
                renderAbilitiesTable(filtered);
            }
        });
    }
});

// Initialize abilities page if on that page
if (window.location.pathname.includes('abilities.html') || document.getElementById('abilitiesTableBody')) {
    loadAbilitiesPage();
}

// ========== Ability Detail Page ==========
async function loadAbilityDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const abilityParam = urlParams.get('ability');
    
    if (!abilityParam) {
        const container = document.querySelector('.container');
        if (container) container.innerHTML = '<p style="color: #ff4444;">No ability specified</p>';
        return;
    }

    try {
        // Fetch ability data
        const response = await fetch(`${API}/ability/${abilityParam}`);
        const ability = await response.json();
        
        // Update title
        const displayName = ability.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        const titleEl = document.getElementById('abilityTitle');
        if (titleEl) titleEl.textContent = `${displayName} (ability)`;
        document.title = `${displayName} - Pokémon Database`;
        
        // Get English effect
        const effectEntry = ability.effect_entries.find(e => e.language.name === 'en');
        const effect = effectEntry ? effectEntry.effect : 'No description available';
        const effectText = document.getElementById('effectText');
        if (effectText) effectText.textContent = effect;
        
        // Get game descriptions
        const gameDescDiv = document.getElementById('gameDescriptions');
        const gameFlavorEntries = ability.flavor_text_entries || [];
        const gameDescsByGame = {};
        
        gameFlavorEntries.forEach(entry => {
            if (entry.language.name === 'en') {
                const game = entry.version_group?.name || 'Unknown';
                if (!gameDescsByGame[game]) {
                    gameDescsByGame[game] = entry.flavor_text;
                }
            }
        });
        
        if (gameDescDiv) {
            if (Object.keys(gameDescsByGame).length > 0) {
                const gameDescHtml = Object.entries(gameDescsByGame)
                    .map(([game, text]) => `
                        <div class="game-desc-item">
                            <div class="game-desc-game">${game.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                            <div class="game-desc-text">${text}</div>
                        </div>
                    `)
                    .join('');
                gameDescDiv.innerHTML = gameDescHtml;
            } else {
                gameDescDiv.innerHTML = '<p style="color: #8b92a5;">No game descriptions available</p>';
            }
        }
        
        // Get other languages
        const langDiv = document.getElementById('otherLanguages');
        const languages = {};
        
        ability.names?.forEach(name => {
            if (name.language.name !== 'en') {
                languages[name.language.name] = name.name;
            }
        });
        
        if (langDiv) {
            if (Object.keys(languages).length > 0) {
                const langHtml = Object.entries(languages)
                    .map(([lang, name]) => `
                        <div class="lang-row">
                            <div class="lang-label">${lang.charAt(0).toUpperCase() + lang.slice(1)}</div>
                            <div class="lang-value">${name}</div>
                        </div>
                    `)
                    .join('');
                langDiv.innerHTML = langHtml;
            } else {
                langDiv.innerHTML = '<p style="color: #8b92a5;">No translations available</p>';
            }
        }
        
        // Get Pokémon with this ability
        const pokemonDiv = document.getElementById('pokemonWithAbility');
        const hiddenPokemonDiv = document.getElementById('pokemonWithHiddenAbility');
        const hiddenSection = document.getElementById('hiddenAbilitySection');
        const regularTitle = document.getElementById('regularAbilityTitle');
        const hiddenTitle = document.getElementById('hiddenAbilityTitle');
        
        if (!pokemonDiv) {
            console.error('pokemonWithAbility element not found');
            return;
        }
        
        const abilityName = ability.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        const pokemonList = ability.pokemon || [];
        
        if (pokemonList.length > 0) {
            // Fetch Pokémon details
            const pokemonPromises = pokemonList.slice(0, 100).map(async p => {
                try {
                    const pokeResponse = await fetch(p.pokemon.url);
                    const pokeData = await pokeResponse.json();
                    
                    // Check if this ability is hidden for this Pokémon
                    const abilityInfo = pokeData.abilities.find(a => a.ability.name === ability.name);
                    return {
                        ...pokeData,
                        isHidden: abilityInfo?.is_hidden || false
                    };
                } catch (e) {
                    console.error('Error fetching pokemon:', e);
                    return null;
                }
            });
            
            const pokemonData = (await Promise.all(pokemonPromises)).filter(p => p !== null);
            
            // Split into regular and hidden
            const regularPokemon = pokemonData.filter(p => !p.isHidden);
            const hiddenPokemon = pokemonData.filter(p => p.isHidden);
            
            // Render regular Pokémon
            if (regularPokemon.length > 0) {
                if (regularTitle) regularTitle.textContent = `Pokémon with ${abilityName}`;
                const regularHtml = regularPokemon.map(poke => {
                    const typeTags = poke.types.map(t => {
                        const typeName = t.type.name;
                        const typeColor = TYPE_COLORS[typeName] || '#777';
                        return `<span class="pokemon-type-tag" style="background: ${typeColor}">${typeName}</span>`;
                    }).join('');
                    
                    return `
                    <a href="pokemon.html?id=${poke.id}" class="pokemon-card-ability">
                        <div class="pokemon-card-header">
                            <div class="pokemon-name-ability">${poke.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                            <div class="pokemon-dex-ability">#${String(poke.id).padStart(4, '0')}</div>
                        </div>
                        <div class="pokemon-img-ability">
                            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${poke.id}.png" alt="${poke.name}" onerror="this.style.display='none';">
                        </div>
                        <div class="pokemon-species-ability">${typeTags}</div>
                    </a>
                `;
                }).join('');
                pokemonDiv.innerHTML = regularHtml;
            } else {
                pokemonDiv.innerHTML = '<p class="loading-placeholder">No Pokémon with this ability</p>';
            }
            
            // Render hidden ability Pokémon
            if (hiddenPokemon.length > 0 && hiddenPokemonDiv && hiddenSection) {
                hiddenSection.style.display = 'block';
                if (hiddenTitle) hiddenTitle.textContent = `${abilityName} as a hidden ability`;
                const hiddenHtml = hiddenPokemon.map(poke => {
                    const typeTags = poke.types.map(t => {
                        const typeName = t.type.name;
                        const typeColor = TYPE_COLORS[typeName] || '#777';
                        return `<span class="pokemon-type-tag" style="background: ${typeColor}">${typeName}</span>`;
                    }).join('');
                    
                    return `
                    <a href="pokemon.html?id=${poke.id}" class="pokemon-card-ability">
                        <div class="pokemon-card-header">
                            <div class="pokemon-name-ability">${poke.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
                            <div class="pokemon-dex-ability">#${String(poke.id).padStart(4, '0')}</div>
                        </div>
                        <div class="pokemon-img-ability">
                            <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${poke.id}.png" alt="${poke.name}" onerror="this.style.display='none';">
                        </div>
                        <div class="pokemon-species-ability">${typeTags}</div>
                    </a>
                `;
                }).join('');
                hiddenPokemonDiv.innerHTML = hiddenHtml;
            } else if (hiddenSection) {
                hiddenSection.style.display = 'none';
            }
        } else {
            pokemonDiv.innerHTML = '<p class="loading-placeholder">No Pokémon with this ability</p>';
        }
        
    } catch (error) {
        console.error('Error loading ability detail:', error);
        const titleEl = document.getElementById('abilityTitle');
        const container = document.querySelector('.ability-two-column') || document.querySelector('.container');
        if (titleEl) titleEl.textContent = 'Error';
        if (container) {
            container.innerHTML = '<div class="detail-section"><p style="color: #ff4444;">Error loading ability details. Please check the console for more information.</p></div>';
        }
    }
}
// Initialize ability detail page if on that page
// (Ability detail init is handled by the dynamic page router above)

// ========== Move Detail Page ==========
async function loadMoveDetail() {
    const urlParams = new URLSearchParams(window.location.search);
    const moveParam = urlParams.get('move');

    if (!moveParam) {
        const container = document.querySelector('.container');
        if (container) container.innerHTML = '<p style="color: #ff4444;">No move specified</p>';
        return;
    }

    const titleEl = document.getElementById('moveTitle');
    const chipsEl = document.getElementById('moveChips');
    const dataEl = document.getElementById('moveDataTable');
    const effectEl = document.getElementById('moveEffectText');
    const gameEl = document.getElementById('moveGameDescriptions');
    const langsEl = document.getElementById('moveOtherLanguages');
    const learnedTitleEl = document.getElementById('learnedByTitle');
    const learnedNoteEl = document.getElementById('learnedByNote');
    const learnedByLevelUpTitleEl = document.getElementById('learnedByLevelUpTitle');
    const learnedByBreedingTitleEl = document.getElementById('learnedByBreedingTitle');
    const learnedByLevelUpEl = document.getElementById('learnedByLevelUp');
    const learnedByBreedingEl = document.getElementById('learnedByBreeding');

    try {
        const response = await fetch(`${API}/move/${moveParam}`);
        let move = null;
        if (response.ok) {
            move = await response.json();
        }

        // If PokeAPI doesn't have this move (or returns unusable data), try GraphQL-Pokemon.
        let gqlMove = null;
        if (!move || !move.name) {
            gqlMove = await fetchGraphqlMoveFallback(moveParam).catch(() => null);
            if (!gqlMove) throw new Error('Move not found in PokeAPI or GraphQL-Pokemon');

            const displayName = formatName(gqlMove.name || String(moveParam));
            if (titleEl) titleEl.textContent = `${displayName} (move)`;
            document.title = `${displayName} - Pokémon Database`;

            const typeName = (gqlMove.type || '').toLowerCase();
            const damageClass = (gqlMove.category || '').toLowerCase();

            if (chipsEl) {
                const typeChip = typeName && TYPE_COLORS[typeName]
                    ? `<span class="type-tag" style="background:${TYPE_COLORS[typeName]}">${typeName}</span>`
                    : (typeName ? `<span class="chip">${typeName}</span>` : '');
                const classChip = damageClass ? `<span class="chip">${damageClass}</span>` : '';
                chipsEl.innerHTML = `${typeChip}${classChip}`;
            }

            const effectText = gqlMove.desc || gqlMove.shortDesc || 'No description available.';
            if (effectEl) effectEl.textContent = effectText;

            const dataRows = [];
            dataRows.push(['Type', typeName && TYPE_COLORS[typeName]
                ? `<span class="type-tag" style="background:${TYPE_COLORS[typeName]}; font-size: 11px; padding: 3px 8px;">${typeName}</span>`
                : (typeName || '-')]);
            dataRows.push(['Category', damageClass ? formatName(damageClass) : '-']);
            dataRows.push(['Power', gqlMove.basePower ?? '-']);
            dataRows.push(['Accuracy', gqlMove.accuracy ?? '-']);
            dataRows.push(['PP', gqlMove.pp ?? '-']);
            dataRows.push(['Priority', gqlMove.priority ?? '-']);

            if (dataEl) {
                dataEl.innerHTML = dataRows.map(([label, value]) => `
                    <div class="data-row">
                        <div class="data-label">${label}</div>
                        <div class="data-value">${value}</div>
                    </div>
                `).join('');
            }

            if (gameEl) gameEl.innerHTML = '<p style="color: #8b92a5;">No game descriptions available</p>';
            if (langsEl) langsEl.innerHTML = '<p style="color: #8b92a5;">No translations available</p>';
            if (learnedTitleEl) learnedTitleEl.textContent = 'Learned by (–)';
            if (learnedNoteEl) learnedNoteEl.textContent = 'Learned-by lists are not available from GraphQL-Pokemon.';
            if (learnedByLevelUpTitleEl) learnedByLevelUpTitleEl.textContent = 'Learnt by level up (–)';
            if (learnedByBreedingTitleEl) learnedByBreedingTitleEl.textContent = 'Learnt by breeding (–)';
            if (learnedByLevelUpEl) learnedByLevelUpEl.innerHTML = '<p style="color: #8b92a5;">No data available.</p>';
            if (learnedByBreedingEl) learnedByBreedingEl.innerHTML = '<p style="color: #8b92a5;">No data available.</p>';
            return;
        }

        const displayName = formatName(move.name);
        if (titleEl) titleEl.textContent = `${displayName} (move)`;
        document.title = `${displayName} - Pokémon Database`;

        const typeName = move.type?.name;
        const damageClass = move.damage_class?.name;

        if (chipsEl) {
            const typeChip = typeName
                ? `<span class="type-tag" style="background:${TYPE_COLORS[typeName]}">${typeName}</span>`
                : '';
            const classChip = damageClass
                ? `<span class="chip">${damageClass}</span>`
                : '';
            const genChip = move.generation?.name
                ? `<span class="chip chip-subtle">${formatName(move.generation.name)}</span>`
                : '';
            chipsEl.innerHTML = `${typeChip}${classChip}${genChip}`;
        }

        const englishEffect = move.effect_entries?.find(e => e?.language?.name === 'en');
        let effectText = englishEffect?.effect || englishEffect?.short_effect || '';
        if (!effectText) {
            gqlMove = await fetchGraphqlMoveFallback(move.name).catch(() => null);
            effectText = gqlMove?.desc || gqlMove?.shortDesc || 'No description available.';
        }
        const formattedEffect = String(effectText).replace(/\$effect_chance/g, move.effect_chance);
        if (effectEl) effectEl.textContent = formattedEffect;

        const dataRows = [];
        dataRows.push(['Type', typeName ? `<span class="type-tag" style="background:${TYPE_COLORS[typeName]}; font-size: 11px; padding: 3px 8px;">${typeName}</span>` : '-']);
        dataRows.push(['Category', damageClass ? formatName(damageClass) : '-']);
        const power = move.power ?? gqlMove?.basePower ?? '-';
        const accuracy = move.accuracy ?? gqlMove?.accuracy ?? '-';
        const pp = move.pp ?? gqlMove?.pp ?? '-';
        const priority = move.priority ?? gqlMove?.priority ?? '-';
        dataRows.push(['Power', power]);
        dataRows.push(['Accuracy', accuracy]);
        dataRows.push(['PP', pp]);
        dataRows.push(['Priority', priority]);
        dataRows.push(['Effect chance', move.effect_chance ?? '-']);
        dataRows.push(['Target', move.target?.name ? formatName(move.target.name) : '-']);
        dataRows.push(['Generation', move.generation?.name ? formatName(move.generation.name) : '-']);
        dataRows.push(['Makes contact', move.meta?.contact ? 'Yes' : 'No']);

        if (dataEl) {
            dataEl.innerHTML = dataRows.map(([label, value]) => `
                <div class="data-row">
                    <div class="data-label">${label}</div>
                    <div class="data-value">${value}</div>
                </div>
            `).join('');
        }

        // Game descriptions (flavor text)
        if (gameEl) {
            const entries = (move.flavor_text_entries || [])
                .filter(e => e?.language?.name === 'en')
                .map(e => ({
                    game: e.version_group?.name || 'unknown',
                    text: normalizeFlavorText(e.flavor_text)
                }))
                .filter(e => e.text);

            const byGame = new Map();
            for (const e of entries) {
                if (!byGame.has(e.game)) byGame.set(e.game, e.text);
            }

            const html = [...byGame.entries()]
                .slice(0, 16)
                .map(([game, text]) => `
                    <div class="game-desc-item">
                        <div class="game-desc-game">${formatName(game)}</div>
                        <div class="game-desc-text">${text}</div>
                    </div>
                `)
                .join('');

            gameEl.innerHTML = html || '<p style="color: #8b92a5;">No game descriptions available</p>';
        }

        // Other languages
        if (langsEl) {
            const languages = (move.names || [])
                .filter(n => n?.language?.name && n.language.name !== 'en')
                .slice(0, 30);

            if (!languages.length) {
                langsEl.innerHTML = '<p style="color: #8b92a5;">No translations available</p>';
            } else {
                langsEl.innerHTML = languages.map(n => `
                    <div class="lang-row">
                        <div class="lang-label">${formatName(n.language.name)}</div>
                        <div class="lang-value">${n.name}</div>
                    </div>
                `).join('');
            }
        }

        // Learned by (Level up / Breeding)
        const learnedBy = move.learned_by_pokemon || [];
        if (learnedTitleEl) learnedTitleEl.textContent = `Learned by (${learnedBy.length})`;
        if (learnedNoteEl) learnedNoteEl.textContent = learnedBy.length ? 'Sorting uses Scarlet/Violet when available.' : '';

        if (learnedByLevelUpEl) learnedByLevelUpEl.innerHTML = '<div class="loading">Loading...</div>';
        if (learnedByBreedingEl) learnedByBreedingEl.innerHTML = '<div class="loading">Loading...</div>';

        const preferredVersionGroup = 'scarlet-violet';
        const learnData = await fetchMoveLearnDataForPokemonList(learnedBy, move.name, preferredVersionGroup, learnedNoteEl);

        const levelUp = learnData
            .filter(x => Number.isFinite(x.level))
            .sort((a, b) => (a.level - b.level) || a.name.localeCompare(b.name));

        const breeding = learnData
            .filter(x => x.egg === true)
            .sort((a, b) => a.name.localeCompare(b.name));

        if (learnedByLevelUpTitleEl) learnedByLevelUpTitleEl.textContent = `Learnt by level up (${levelUp.length})`;
        if (learnedByBreedingTitleEl) learnedByBreedingTitleEl.textContent = `Learnt by breeding (${breeding.length})`;

        if (learnedByLevelUpEl) {
            learnedByLevelUpEl.innerHTML = levelUp.length
                ? levelUp.map(renderLearnedCardWithLevel).join('')
                : '<p style="color: #8b92a5;">No level-up data found.</p>';
        }

        if (learnedByBreedingEl) {
            learnedByBreedingEl.innerHTML = breeding.length
                ? breeding.map(renderLearnedCardNoLevel).join('')
                : '<p style="color: #8b92a5;">No breeding data found.</p>';
        }
    } catch (error) {
        console.error('Error loading move detail:', error);
        if (titleEl) titleEl.textContent = 'Error';
        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = '<div class="detail-section"><p style="color: #ff4444;">Error loading move details. Please check the console for more information.</p></div>';
        }
    }
}

function getVersionGroupGen(vgName) {
    return VERSION_GROUP_TO_GEN[vgName] || 0;
}

function pickBestVersionGroupForMoveDetails(details, preferred) {
    if (!Array.isArray(details) || !details.length) return null;
    if (preferred && details.some(d => d?.version_group?.name === preferred)) return preferred;

    let best = null;
    let bestGen = -1;
    for (const d of details) {
        const name = d?.version_group?.name;
        if (!name) continue;
        const gen = getVersionGroupGen(name);
        if (gen > bestGen) {
            bestGen = gen;
            best = name;
        }
    }
    return best;
}

function extractLearnForMove(pokemonData, moveName, preferredVersionGroup) {
    const movesArr = pokemonData?.moves || [];
    const entry = movesArr.find(m => m?.move?.name === moveName);
    if (!entry) return { egg: false, level: null };

    const details = entry.version_group_details || [];
    const chosenVg = pickBestVersionGroupForMoveDetails(details, preferredVersionGroup);
    const scoped = chosenVg ? details.filter(d => d?.version_group?.name === chosenVg) : details;

    let egg = false;
    let level = null;

    for (const d of scoped) {
        const method = d?.move_learn_method?.name;
        if (method === 'egg') egg = true;
        if (method === 'level-up') {
            const lvl = d?.level_learned_at;
            if (Number.isFinite(lvl) && (level === null || lvl < level)) level = lvl;
        }
    }

    return { egg, level };
}

async function fetchMoveLearnDataForPokemonList(pokemonRefs, moveName, preferredVersionGroup, progressEl) {
    const list = (pokemonRefs || [])
        .map(p => {
            const id = parseInt((p?.url || '').split('/').filter(Boolean).pop());
            return {
                id: Number.isFinite(id) ? id : null,
                apiName: p?.name || ''
            };
        })
        .filter(x => x.id !== null);

    const results = [];
    const BATCH_SIZE = 20;

    for (let i = 0; i < list.length; i += BATCH_SIZE) {
        const batch = list.slice(i, i + BATCH_SIZE);
        if (progressEl) progressEl.textContent = `Loading learnsets… (${Math.min(i + BATCH_SIZE, list.length)}/${list.length})`;

        const batchResults = await Promise.all(batch.map(async item => {
            try {
                const cached = pokemonDetailsCache[item.id];
                const data = cached || await fetch(`${API}/pokemon/${item.id}`).then(r => r.json());
                if (!cached) pokemonDetailsCache[item.id] = data;

                const learn = extractLearnForMove(data, moveName, preferredVersionGroup);
                return {
                    id: item.id,
                    name: formatName(item.apiName || data.name),
                    egg: learn.egg,
                    level: learn.level
                };
            } catch (e) {
                console.error('Error fetching pokemon learnset', item, e);
                return null;
            }
        }));

        results.push(...batchResults.filter(Boolean));
    }

    if (progressEl) progressEl.textContent = '';
    return results;
}

function renderLearnedCardWithLevel(p) {
    const href = `pokemon.html?id=${p.id}`;
    const sprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`;
    return `
        <a class="learned-card" href="${href}">
            <div class="learned-sprite">
                <img src="${sprite}" alt="${p.name}" onerror="this.style.display='none'">
            </div>
            <div class="learned-text">
                <div class="learned-name">${p.name}</div>
                <div class="learned-level">Lv. ${p.level}</div>
                <div class="learned-id">#${String(p.id).padStart(4, '0')}</div>
            </div>
        </a>
    `;
}

function renderLearnedCardNoLevel(p) {
    const href = `pokemon.html?id=${p.id}`;
    const sprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`;
    return `
        <a class="learned-card" href="${href}">
            <div class="learned-sprite">
                <img src="${sprite}" alt="${p.name}" onerror="this.style.display='none'">
            </div>
            <div class="learned-text">
                <div class="learned-name">${p.name}</div>
                <div class="learned-id">#${String(p.id).padStart(4, '0')}</div>
            </div>
        </a>
    `;
}

// Image fallback handler for Pokémon forms
function handleImageError(imgElement, pokemonId, pokemonName) {
    // List of fallback image sources to try
    const fallbackSources = [
        // Sprite repositories
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`,
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${pokemonId}.png`,
        // PokéDB (often has good artwork)
        `https://img.pokemondb.net/artwork/${pokemonName.toLowerCase().replace(/ /g, '-')}.jpg`,
        // Bulbapedia
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemonId}.png`,
        // Generic placeholder
        `https://via.placeholder.com/200x200?text=${pokemonName}`
    ];
    
    // Get the current source that failed
    const currentSrc = imgElement.src;
    let currentIndex = fallbackSources.indexOf(currentSrc);
    
    // If current source is not in the list or is the last one, mark as unavailable
    if (currentIndex === -1 || currentIndex >= fallbackSources.length - 1) {
        imgElement.style.opacity = '0.5';
        imgElement.title = 'Image not available for this Pokémon form';
        imgElement.onerror = null; // Stop trying
        return;
    }
    
    // Try the next fallback source
    const nextSource = fallbackSources[currentIndex + 1];
    imgElement.src = nextSource;
}

// Dynamic navigation for detail pages
function navigateToPokedex(dexId, dexName, event) {
    if (event) event.preventDefault();
    
    // Get current context (pokemon ID or ability name)
    const urlParams = new URLSearchParams(window.location.search);
    const currentPage = window.location.pathname;
    
    // Build URL with preserved context
    let targetUrl = 'Pokémon Database.html';
    if (dexId !== 'all') {
        targetUrl += `?dex=${dexId}&dexName=${encodeURIComponent(dexName)}`;
    }
    
    // Navigate
    window.location.href = targetUrl;
}


