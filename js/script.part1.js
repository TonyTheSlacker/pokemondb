const API = 'https://pokeapi.co/api/v2';

// Boot markers so HTML can detect when JS didn't load / init didn't run.
window.__APP_BOOTSTRAPPED__ = true;
window.__APP_ACTIONS_INSTALLED__ = false;
window.__APP_INIT_STARTED__ = false;
window.__APP_INIT_FINISHED__ = false;

function showFatalError(err) {
    try {
        const msg = String(err?.message || err || 'Unknown error');
        const grid = document.getElementById('grid');
        const container = grid || document.querySelector('.container');
        if (!container) return;
        container.innerHTML = `
            <div class="empty">
                <div>Something went wrong while starting the app.</div>
                <div class="details-muted">${msg}</div>
            </div>
        `;
    } catch {
        // If even rendering fails, fall back to nothing.
    }
}

window.addEventListener('error', (e) => {
    // Avoid noisy script error messages when we can.
    showFatalError(e?.error || e?.message || 'Script error');
});

window.addEventListener('unhandledrejection', (e) => {
    showFatalError(e?.reason || 'Unhandled promise rejection');
});

// Ensure the main app initializes even if later routing logic is skipped.
document.addEventListener('DOMContentLoaded', () => {
    try {
        decorateNativePokedexBadges();
    } catch {
        // Non-critical UI enhancement; ignore.
    }

    const isIndex = !!document.getElementById('grid') && !!document.getElementById('typeButtons');
    const isDetail = !!document.getElementById('detailContainer');
    const isEgg = !!document.getElementById('eggGroupList') || !!document.getElementById('eggPokemonGrid') || !!document.getElementById('eggGroupHeader');
    const isOtherPage = isDetail || isEgg || /abilities\.html|ability-detail\.html|move-detail\.html|location-detail\.html|locations\.html/.test(window.location.pathname);

    if (isIndex && !isOtherPage && !window.__APP_INIT_STARTED__) {
        try {
            setupActionDelegation();
            initPokedexPage();
        } catch (e) {
            showFatalError(e);
        }
    }
});

function decorateNativePokedexBadges() {
    const groups = document.querySelectorAll('.nav-sub-menu .sub-menu-group');
    if (!groups || groups.length === 0) return;

    const dexMetaByName = {
        'scarlet & violet': { badge: 'SV', color: TYPE_COLORS.fire },
        'legends: arceus': { badge: 'LA', color: TYPE_COLORS.psychic },
        'brilliant diamond & shining pearl': { badge: 'BDSP', color: TYPE_COLORS.rock },
        'sword & shield': { badge: 'SWSH', color: TYPE_COLORS.steel },
        "let's go pikachu & eevee": { badge: 'LGPE', color: TYPE_COLORS.electric },
        'ultra sun & ultra moon': { badge: 'USUM', color: TYPE_COLORS.dragon },
        'sun & moon': { badge: 'SM', color: TYPE_COLORS.grass },
        'omega ruby & alpha sapphire': { badge: 'ORAS', color: TYPE_COLORS.water },
        'x & y': { badge: 'XY', color: TYPE_COLORS.fairy },
        'black 2 & white 2': { badge: 'B2W2', color: TYPE_COLORS.dark },
        'black & white': { badge: 'BW', color: TYPE_COLORS.dark },
        'heartgold & soulsilver': { badge: 'HGSS', color: TYPE_COLORS.steel },
        'platinum': { badge: 'PLAT', color: TYPE_COLORS.ghost },
        'diamond & pearl': { badge: 'DP', color: TYPE_COLORS.rock },
        'firered & leafgreen': { badge: 'FRLG', color: TYPE_COLORS.fire },
        'ruby, sapphire & emerald': { badge: 'RSE', color: TYPE_COLORS.water },
        'gold, silver & crystal': { badge: 'GSC', color: TYPE_COLORS.electric },
        'red, blue & yellow': { badge: 'RBY', color: TYPE_COLORS.normal }
    };

    function normalizeName(name) {
        return String(name || '').trim().toLowerCase();
    }

    function ensureLabelSpan(link) {
        const existing = link.querySelector(':scope > .sub-nav-label');
        if (existing) return existing;

        const label = document.createElement('span');
        label.className = 'sub-nav-label';
        label.textContent = link.textContent;
        link.textContent = '';
        link.appendChild(label);
        return label;
    }

    function isLightHex(hex) {
        if (!hex || typeof hex !== 'string' || !/^#?[0-9a-fA-F]{6}$/.test(hex)) return false;
        const h = hex.startsWith('#') ? hex.slice(1) : hex;
        const r = parseInt(h.slice(0, 2), 16);
        const g = parseInt(h.slice(2, 4), 16);
        const b = parseInt(h.slice(4, 6), 16);
        // Perceived luminance
        const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        return lum > 0.62;
    }

    for (const group of groups) {
        const titleEl = group.querySelector('.sub-menu-title');
        const title = normalizeName(titleEl?.textContent);
        if (title !== 'native pokédexes' && title !== 'native pokedexes') continue;

        const links = group.querySelectorAll('a.sub-nav-item[data-dex-name]');
        for (const link of links) {
            if (link.querySelector(':scope > .dex-badge')) continue;

            const dexName = link.getAttribute('data-dex-name') || link.textContent;
            const meta = dexMetaByName[normalizeName(dexName)];
            if (!meta) continue;

            ensureLabelSpan(link);

            const badge = document.createElement('span');
            badge.className = 'dex-badge';
            badge.textContent = meta.badge;
            badge.title = dexName;
            badge.style.backgroundColor = meta.color;
            badge.style.borderColor = 'rgba(255, 255, 255, 0.16)';
            badge.style.color = isLightHex(meta.color) ? '#0a0e1a' : '#f5f7ff';
            link.appendChild(badge);
        }
    }
}

async function fetchJsonWithTimeout(url, timeoutMs = 15000) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
        return await res.json();
    } finally {
        window.clearTimeout(timer);
    }
}

// When opened via file://, relative URLs resolve from the current page folder.
// We keep `index.html` at repo root and other pages under `pages/`.
const IS_PAGES_DIR = /\/pages\/|\\pages\\/.test(window.location.pathname);
const ROOT_PREFIX = IS_PAGES_DIR ? '../' : '';
const PAGES_PREFIX = IS_PAGES_DIR ? '' : 'pages/';
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

// Map version groups (used in move learnsets) to the specific game versions that have dex flavor texts.
// This is also a good proxy for "which games does this form exist in" when pokemon.game_indices is empty.
const VERSION_GROUP_TO_VERSIONS = {
    // Gen I
    'red-blue': ['red', 'blue'],
    'yellow': ['yellow'],

    // Gen II
    'gold-silver': ['gold', 'silver'],
    'crystal': ['crystal'],

    // Gen III
    'ruby-sapphire': ['ruby', 'sapphire'],
    'emerald': ['emerald'],
    'firered-leafgreen': ['firered', 'leafgreen'],

    // Gen IV
    'diamond-pearl': ['diamond', 'pearl'],
    'platinum': ['platinum'],
    'heartgold-soulsilver': ['heartgold', 'soulsilver'],

    // Gen V
    'black-white': ['black', 'white'],
    'black-2-white-2': ['black-2', 'white-2'],

    // Gen VI
    'x-y': ['x', 'y'],
    'omega-ruby-alpha-sapphire': ['omega-ruby', 'alpha-sapphire'],

    // Gen VII
    'sun-moon': ['sun', 'moon'],
    'ultra-sun-ultra-moon': ['ultra-sun', 'ultra-moon'],
    'lets-go-pikachu-lets-go-eevee': ['lets-go-pikachu', 'lets-go-eevee'],

    // Gen VIII
    'sword-shield': ['sword', 'shield'],
    'brilliant-diamond-shining-pearl': ['brilliant-diamond', 'shining-pearl'],
    'legends-arceus': ['legends-arceus'],

    // Gen IX
    'scarlet-violet': ['scarlet', 'violet']
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

// Targeted per-form dex entry overrides for cases where upstream APIs only expose a single
// species-level flavor text (but PokemonDB displays per-form variations).
//
// Keys are PokeAPI pokemon names (not species names).
const DEX_ENTRY_OVERRIDES = {
    // Squawkabilly: PokeAPI has a single species endpoint (931) and Violet text mentions "Green-feathered".
    // PokemonDB displays the same entry per plumage color, so we adjust the leading color word.
    'squawkabilly-blue-plumage': {
        violet: (t) => String(t || '').replace(/^Green-feathered\b/i, 'Blue-feathered')
    },
    'squawkabilly-yellow-plumage': {
        violet: (t) => String(t || '').replace(/^Green-feathered\b/i, 'Yellow-feathered')
    },
    'squawkabilly-white-plumage': {
        violet: (t) => String(t || '').replace(/^Green-feathered\b/i, 'White-feathered')
    },

    // Paldean Tauros breeds: PokemonDB shows distinct Scarlet/Violet entries per breed.
    // PokeAPI does not expose per-form species flavor texts, so we provide explicit overrides.
    'tauros-paldea-combat-breed': {
        scarlet: 'This Pokémon has a muscular body and excels at close-quarters combat. It uses its short horns to strike the opponent’s weak spots.',
        violet: 'This kind of Tauros, known as the Combat Breed, is distinguished by its thick, powerful muscles and its fierce disposition.'
    },
    'tauros-paldea-blaze-breed': {
        scarlet: 'When heated by fire energy, its horns can get hotter than 1,800 degrees Fahrenheit. Those gored by them will suffer both wounds and burns.',
        violet: 'People call this kind of Tauros the Blaze Breed due to the hot air it snorts from its nostrils. Its three tails are intertwined.'
    },
    'tauros-paldea-aqua-breed': {
        scarlet: 'This Pokémon blasts water from holes on the tips of its horns—the high-pressure jets pierce right through Tauros’s enemies.',
        violet: 'It swims by jetting water from its horns. The most notable characteristic of the Aqua Breed is its high body fat, which allows it to float easily.'
    }
};

function applyDexEntryOverrides(pokemonName, byVersion) {
    if (!pokemonName || !(byVersion instanceof Map)) return;
    const key = String(pokemonName).trim().toLowerCase();
    if (!key) return;
    const overrides = DEX_ENTRY_OVERRIDES[key];
    if (!overrides || typeof overrides !== 'object') return;

    for (const [versionKey, rule] of Object.entries(overrides)) {
        if (!versionKey) continue;

        const hasExisting = byVersion.has(versionKey);
        const current = hasExisting ? byVersion.get(versionKey) : '';

        let next = current;
        if (typeof rule === 'function') {
            // Only transform when we have a source string.
            if (!hasExisting) continue;
            next = rule(current);
        } else if (typeof rule === 'string') {
            // Allow explicit override strings to insert missing versions.
            next = rule;
        } else {
            continue;
        }

        const normalized = normalizeFlavorText(next);
        if (normalized) byVersion.set(versionKey, normalized);
    }
}

function buildDexEntriesByGeneration(species, allowedVersions, pokemonName) {
    const byVersion = new Map();
    const entries = (species?.flavor_text_entries || []).filter(e => e?.language?.name === 'en');

    for (const entry of entries) {
        const versionName = entry?.version?.name;
        if (!versionName) continue;
        if (!MAINLINE_VERSION_META[versionName]) continue;
        if (allowedVersions && allowedVersions instanceof Set && !allowedVersions.has(versionName)) continue;
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
            if (allowedVersions && allowedVersions instanceof Set && !allowedVersions.has(versionKey)) continue;
            byVersion.set(versionKey, text);
        }
    }

    // Apply targeted per-form overrides after all sources have been collected.
    applyDexEntryOverrides(pokemonName, byVersion);

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

function renderDexEntriesSectionHtml(species, allowedVersions, pokemonName) {
    const byGen = buildDexEntriesByGeneration(species, allowedVersions, pokemonName);

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
        <div class="detail-cards-row full">
            <div>
                <h3 class="section-header">Pokédex entries</h3>
                <div class="dex-tabs" role="tablist">${tabs}</div>
                <div class="dex-panels">${panels}</div>
            </div>
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
    window.__APP_ACTIONS_INSTALLED__ = true;

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
                window.location.href = `${PAGES_PREFIX}pokemon-detail.html?id=${el.dataset.pokemonId}`;
                return;
            case 'open-move':
                moveDetail(el.dataset.moveId);
                return;
            case 'open-item':
                window.location.href = `${PAGES_PREFIX}item-detail.html?item=${encodeURIComponent(el.dataset.itemName || '')}`;
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
            case 'artwork-prev':
                artworkNavigate(-1, el);
                return;
            case 'artwork-next':
                artworkNavigate(1, el);
                return;
            case 'set-items-view':
                if (typeof setItemsView === 'function') setItemsView(el.dataset.view, el);
                return;
            default:
                return;
        }
    });
}

function setupArtworkSwitchers(root) {
    const scope = root || document;
    const switchers = scope.querySelectorAll?.('[data-artwork-switcher][data-art-sources]') || [];
    switchers.forEach(sw => {
        if (sw.__artworkInit) return;
        sw.__artworkInit = true;

        const img = sw.querySelector('[data-artwork-img]');
        const label = sw.parentElement?.querySelector?.('[data-artwork-label]');
        const prevBtn = sw.parentElement?.querySelector?.('[data-action="artwork-prev"]');
        const nextBtn = sw.parentElement?.querySelector?.('[data-action="artwork-next"]');
        if (!img) return;

        let sources = [];
        try {
            sources = JSON.parse(decodeURIComponent(sw.getAttribute('data-art-sources') || ''));
        } catch {
            sources = [];
        }

        sw.__artSources = Array.isArray(sources) ? sources : [];
        sw.dataset.artIndex = sw.dataset.artIndex || '0';

        const updateUi = () => {
            const list = sw.__artSources;
            const count = list.length;
            const idx = parseInt(sw.dataset.artIndex || '0', 10) || 0;
            const safeIdx = count ? ((idx % count) + count) % count : 0;
            sw.dataset.artIndex = String(safeIdx);

            if (label) {
                const item = list[safeIdx];
                const caption = count
                    ? `${item?.label || 'Artwork'} (${safeIdx + 1}/${count})`
                    : 'Artwork';
                label.textContent = caption;
            }

            const disabled = count <= 1;
            if (prevBtn) prevBtn.disabled = disabled;
            if (nextBtn) nextBtn.disabled = disabled;
        };

        const setIndex = (idx) => {
            const list = sw.__artSources;
            if (!list.length) {
                updateUi();
                return;
            }
            const count = list.length;
            const safeIdx = ((idx % count) + count) % count;
            sw.dataset.artIndex = String(safeIdx);
            const item = list[safeIdx];
            if (item?.url) {
                img.onerror = () => {
                    // If a source fails, drop it and try the next one.
                    const cur = parseInt(sw.dataset.artIndex || '0', 10) || 0;
                    sw.__artSources.splice(cur, 1);
                    setIndex(cur);
                };
                img.src = item.url;
            }
            updateUi();
        };

        // Initialize label/buttons state.
        updateUi();
        // Ensure image matches index 0 if we have sources.
        if (sw.__artSources.length) setIndex(parseInt(sw.dataset.artIndex || '0', 10) || 0);
    });
}

function artworkNavigate(delta, triggerEl) {
    const nav = triggerEl?.closest?.('[data-artwork-nav]') || triggerEl?.parentElement;
    const sw = nav?.previousElementSibling?.matches?.('[data-artwork-switcher]')
        ? nav.previousElementSibling
        : nav?.parentElement?.querySelector?.('[data-artwork-switcher]');
    if (!sw || !sw.__artSources) return;
    const idx = parseInt(sw.dataset.artIndex || '0', 10) || 0;
    const next = idx + (Number(delta) || 0);
    // Use the same setIndex logic by reusing setup function's behavior.
    // If not initialized (e.g., very early click), initialize now.
    if (!sw.__artworkInit) setupArtworkSwitchers(sw.parentElement);
    const count = sw.__artSources.length;
    if (!count) return;
    sw.dataset.artIndex = String(((next % count) + count) % count);
    const img = sw.querySelector('[data-artwork-img]');
    const item = sw.__artSources[parseInt(sw.dataset.artIndex, 10) || 0];
    if (img && item?.url) img.src = item.url;
    const label = sw.parentElement?.querySelector?.('[data-artwork-label]');
    if (label) label.textContent = `${item?.label || 'Artwork'} (${(parseInt(sw.dataset.artIndex, 10) || 0) + 1}/${count})`;
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

function formatWhereToFindLocationTitle(locationSlug) {
    const parts = getLocationNameParts(locationSlug);
    const normalizeNums = (s) => String(s || '').replace(/\b0+(\d+)\b/g, (_, n) => String(parseInt(n, 10)));
    // Match PokémonDB-ish naming: only prefix newer-region routes/areas where names collide.
    const needsRegionPrefix = ['alola', 'galar', 'hisui', 'paldea'].includes(parts.region);
    const title = normalizeNums(parts.title);
    return needsRegionPrefix && parts.regionTitle ? `${parts.regionTitle} ${title}` : title;
}

// PokeDB encounter fallback (https://pokedb.org/data-export)
// Used only when PokeAPI returns empty encounter tables for Gen 8/9 regions.
const POKEDB_ENCOUNTERS_INDEX_URL = `${ROOT_PREFIX}data/pokedb-encounters-g8g9.json`;
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
    // PokémonDB splits SwSh DLC into separate rows.
    // These are pseudo-versions handled specially in rendering.
    { gen: 8, labels: ['The Isle of Armor'], versions: ['isle-of-armor'] },
    { gen: 8, labels: ['The Crown Tundra'], versions: ['crown-tundra'] },
    { gen: 8, labels: ['Brilliant Diamond', 'Shining Pearl'], versions: ['brilliant-diamond', 'shining-pearl'] },
    { gen: 8, labels: ['Legends: Arceus'], versions: ['legends-arceus'] },
    { gen: 9, labels: ['Scarlet', 'Violet'], versions: ['scarlet', 'violet'] },
    { gen: 9, labels: ['Legends: Z-A'], versions: ['legends-z-a'] }
];

function getPokeDbLocationRegion(locationSlug) {
    const idx = window.__POKEDB_ENCOUNTERS_G8G9__;
    const map = idx?.locationRegions;
    if (!map) return null;
    return map?.[locationSlug] || null;
}

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
        <div class="detail-cards-row full wherefind-section" data-pokemon-id="${pokemon?.id}" data-pokemon-slug="${pokemon?.name}">
            <div>
                <h3 class="section-header">Where to find ${displayName}</h3>
                <div class="wherefind-body">
                    <div class="learnset-empty">Loading location data...</div>
                </div>
            </div>
        </div>
    `;
}

function expandWhereToFindGroupsToRows(groups) {
    const out = [];
    const list = Array.isArray(groups) ? groups : [];
    for (const g of list) {
        const versions = Array.isArray(g?.versions) ? g.versions : [];
        const labels = Array.isArray(g?.labels) ? g.labels : [];
        for (let i = 0; i < versions.length; i++) {
            const version = versions[i];
            if (!version) continue;
            const label = labels[i] || slugToTitle(version);
            out.push({ gen: g?.gen || null, version, label });
        }
    }
    return out;
}

function getEvolutionAncestorsFromChain(chainNode, targetSpeciesName) {
    const target = String(targetSpeciesName || '').toLowerCase();
    if (!chainNode || !target) return [];

    let found = null;
    const walk = (node, path) => {
        if (!node || found) return;
        const name = String(node?.species?.name || '').toLowerCase();
        if (!name) return;
        if (name === target) {
            found = path.slice();
            return;
        }
        const nextPath = path.concat([name]);
        const kids = Array.isArray(node?.evolves_to) ? node.evolves_to : [];
        for (const k of kids) walk(k, nextPath);
    };

    walk(chainNode, []);
    return Array.isArray(found) ? found : [];
}

function renderWhereToFindRowsHtml(rows, byVersion, species, evoAncestors) {
    const isSpecial = !!(species?.is_mythical || species?.is_legendary);
    const introGen = getSpeciesIntroducedGen(species);
    const ancestors = Array.isArray(evoAncestors) ? evoAncestors : [];

    // Process all rows and compute their location content
    const processedRows = (Array.isArray(rows) ? rows : []).map(r => {
        const genTooEarly = introGen && r.gen && r.gen < introGen;

        const isSwShBase = r.version === 'sword' || r.version === 'shield';
        const isSwShDlc = r.version === 'isle-of-armor' || r.version === 'crown-tundra';

        let locations = byVersion.get(r.version) || new Set();

        // For DLC pseudo-rows, union Sword+Shield and filter by location region.
        if (isSwShDlc) {
            const union = new Set();
            for (const loc of (byVersion.get('sword') || [])) union.add(loc);
            for (const loc of (byVersion.get('shield') || [])) union.add(loc);
            const filtered = new Set();
            for (const loc of union) {
                const region = getPokeDbLocationRegion(loc);
                if (region === r.version) filtered.add(loc);
            }
            locations = filtered;
        }

        // For Sword/Shield base rows, hide DLC locations so they don't inflate the main list.
        if (isSwShBase && locations.size) {
            const filtered = new Set();
            for (const loc of locations) {
                const region = getPokeDbLocationRegion(loc);
                if (region === 'isle-of-armor' || region === 'crown-tundra') continue;
                filtered.add(loc);
            }
            locations = filtered;
        }

        let rightHtml = '';

        if (genTooEarly) {
            rightHtml = `<span class="details-muted">Not available in this game</span>`;
        } else if (r.version === 'legends-z-a') {
            rightHtml = `<span class="details-muted">Location data not yet available</span>`;
        } else if (locations.size) {
            const locList = Array.from(locations).sort((a, b) => String(a).localeCompare(String(b)));
            const links = locList
                .map(loc => `<a class="wherefind-link" href="${PAGES_PREFIX}location-detail.html?location=${encodeURIComponent(loc)}">${formatWhereToFindLocationTitle(loc)}</a>`)
                .join(', ');
            rightHtml = `${links}`;
        } else if (isSpecial) {
            rightHtml = `Trade/migrate from another game`;
        } else if (ancestors.length) {
            const links = ancestors
                .map(name => {
                    const title = formatName(name);
                    return `<a class="wherefind-link" href="${PAGES_PREFIX}pokemon-detail.html?id=${encodeURIComponent(name)}">${title}</a>`;
                })
                .join('/');
            rightHtml = `Evolve ${links}`;
        } else {
            rightHtml = `<span class="details-muted">Not available in this game</span>`;
        }

        return { ...r, rightHtml };
    });

    // Group rows: within the same generation group, merge rows with matching rightHtml
    const outputRows = [];
    let i = 0;
    while (i < processedRows.length) {
        const current = processedRows[i];
        const group = [current];
        
        // Look ahead for rows in same gen with same rightHtml
        let j = i + 1;
        while (j < processedRows.length) {
            const next = processedRows[j];
            // Same gen and same content?
            if (next.gen === current.gen && next.rightHtml === current.rightHtml) {
                group.push(next);
                j++;
            } else {
                break;
            }
        }
        
        // Combine labels from group
        const labels = group.map(r => r.label).join(', ');
        outputRows.push({
            labels,
            rightHtml: current.rightHtml
        });
        
        i = j;
    }

    const list = outputRows.map(row => `
        <div class="wherefind-row">
            <div class="wherefind-games">${row.labels}</div>
            <div class="wherefind-note">${row.rightHtml}</div>
        </div>
    `).join('');

    return list || `<div class="learnset-empty">No location data available.</div>`;
}

async function setupWhereToFindSection(root, pokemon, species, evo) {
    const section = root?.querySelector(`.wherefind-section[data-pokemon-id="${pokemon?.id}"]`);
    if (!section) return;

    const body = section.querySelector('.wherefind-body');
    if (!body) return;

    const introGen = getSpeciesIntroducedGen(species);
    const groups = WHERE_TO_FIND_GROUPS.filter(g => !introGen || g.gen >= introGen);
    const rows = expandWhereToFindGroupsToRows(groups);

    const byVersion = await buildWhereToFindByVersion(pokemon?.id, pokemon?.name);

    const targetSpeciesName = species?.name || pokemon?.species?.name || pokemon?.name;
    const evoAncestors = getEvolutionAncestorsFromChain(evo?.chain, targetSpeciesName);

    body.innerHTML = renderWhereToFindRowsHtml(rows, byVersion, species, evoAncestors);
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
        .then(idx => {
            if (idx && !window.__POKEDB_ENCOUNTERS_G8G9__) window.__POKEDB_ENCOUNTERS_G8G9__ = idx;
            return idx;
        })
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

        // If PokeAPI provides no encounters (or the location is not present in PokeAPI),
        // fall back to a compact local index generated from PokeDB Data Export.
        let usedPokeDbFallback = false;
        if (!rows.length) {
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
                                    <a class="poke-link" href="${PAGES_PREFIX}pokemon-detail.html?id=${r.pokemonId}">${displayName}</a>
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
            return `<a class="location-link" href="${PAGES_PREFIX}location-detail.html?location=${encodeURIComponent(slug)}">${label}</a>`;
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
