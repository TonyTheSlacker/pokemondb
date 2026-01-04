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
const pokemonDetailsCache = {};
let currentPokemonMoves = {};

async function init() {
    document.querySelector('.subtitle').textContent = 'Search and explore all 1,025 Pokémon';
    document.getElementById('grid').innerHTML = '<div class="loading">Loading Pokémon...</div>';
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

async function loadPokedex(id, name, event) {
  // Handle highlighting
  if (event) {
    event.preventDefault();
    document.querySelectorAll('.sub-nav-item').forEach(el => el.classList.remove('active'));
    event.currentTarget.classList.add('active');
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
        `<button class="type-btn ${c === 'all' ? 'active' : ''}" onclick="setDamageClassFilter('${c}')">${c.toUpperCase()}</button>`
    ).join('');
}

function togglePokedexMenu(event) {
  event.preventDefault();
  const menu = document.getElementById('pokedexSubMenu');
  const item = event.currentTarget;
  
  if (menu.style.display === 'none') {
    menu.style.display = 'block';
    item.classList.add('expanded');
  } else {
    menu.style.display = 'none';
    item.classList.remove('expanded');
  }
}

function toggleEggGroupMenu(event) {
  event.preventDefault();
  const menu = document.getElementById('eggGroupSubMenu');
  const item = event.currentTarget;
  
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

async function switchPage(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    // switchPage can be called from inline onclick (which provides a global `event`)
    // or programmatically (no event available).
    if (typeof event !== 'undefined' && event && event.target) {
        event.target.classList.add('active');
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
        <button class="page-btn" onclick="changeMovesPage(-1)">Previous</button>
        <span id="pageInfo" style="align-self:center;color:#8b92a5">Page 1</span>
        <button class="page-btn" onclick="changeMovesPage(1)">Next</button>
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
          <th onclick="sortMoves('name')">Name</th>
          <th onclick="sortMoves('type')">Type</th>
          <th onclick="sortMoves('damage_class')">Cat.</th>
          <th onclick="sortMoves('power')">Power</th>
          <th onclick="sortMoves('accuracy')">Acc.</th>
          <th onclick="sortMoves('pp')">PP</th>
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
                <td><a class="move-name-link" onclick="moveDetail(${m.id})">${formatName(m.name)}</a></td>
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
      <td><a class="move-name-link" onclick="moveDetail(${d.id})">${formatName(d.name)}</a></td>
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
    `<button class="type-btn ${t === 'all' ? 'active' : ''}" onclick="setFilter('${t}')">${t.toUpperCase()}</button>`
).join('');
}

async function setDamageClassFilter(c) {
damageClassFilter = c;
// Update active state for category buttons only
const buttons = document.getElementById('categoryButtons').querySelectorAll('.type-btn');
buttons.forEach(b => b.classList.remove('active'));
event.target.classList.add('active');

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
    <div class="card" onclick="window.location.href='pokemon.html?id=${p.id}'">
        <div class="card-header">
        <div class="card-name">${p.name.charAt(0).toUpperCase() + p.name.slice(1)}</div>
        <div class="card-id">#${String(p.dexId || p.id).padStart(3, '0')}</div>
        </div>
        <div class="card-image">
        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png" alt="${p.name}" onerror="this.style.display='none'">
        </div>
        <div class="card-types">${p.types ? p.types.map(t => `<span class="type-tag" style="background: ${TYPE_COLORS[t]}">${t}</span>`).join('') : ''}</div>
    </div>
    `).join('');
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
    <div class="card" onclick="moveDetail(${m.id})" style="height: auto; min-height: 100px; display: flex; flex-direction: column; justify-content: center;">
        <div class="card-header" style="margin-bottom: 0;">
        <div class="card-name" style="font-size: 14px;">${m.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</div>
        ${m.type ? `<span class="type-tag" style="background: ${TYPE_COLORS[m.type]}">${m.type}</span>` : ''}
        </div>
    </div>
    `).join('');
}
}

async function moveDetail(id) {
const d = await fetch(`${API}/move/${id}`).then(r => r.json());
const name = d.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
document.getElementById('modalTitle').textContent = name;

const effect = d.effect_entries.find(e => e.language.name === 'en')?.effect || 'No description available.';
const flavor = d.flavor_text_entries.find(e => e.language.name === 'en')?.flavor_text || '';

document.getElementById('modalBody').innerHTML = `
    <div style="margin-bottom: 20px; font-size: 16px; color: #f5f7ff; line-height: 1.5;">
    ${flavor}
    </div>
    
    <div style="display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap;">
    <span class="type-tag" style="background: ${TYPE_COLORS[d.type.name]}">${d.type.name}</span>
    <span class="type-tag" style="background: #333; border: 1px solid #555;">${d.damage_class.name.toUpperCase()}</span>
    </div>
    
    <div class="detail-grid">
    <div class="detail-item"><div class="detail-label">Power</div><div class="detail-value">${d.power || '-'}</div></div>
    <div class="detail-item"><div class="detail-label">Accuracy</div><div class="detail-value">${d.accuracy || '-'}</div></div>
    <div class="detail-item"><div class="detail-label">PP</div><div class="detail-value">${d.pp}</div></div>
    <div class="detail-item"><div class="detail-label">Priority</div><div class="detail-value">${d.priority}</div></div>
    </div>
    
    <div class="stats-section">
    <div class="section-title">Effect</div>
    <div style="font-size: 14px; color: #ccc; line-height: 1.6;">${effect.replace(/\$effect_chance/g, d.effect_chance)}</div>
    </div>
    
    <div class="stats-section">
    <div class="section-title">Target</div>
    <div style="font-size: 14px; color: #3bd5ff;">${d.target.name.replace(/-/g, ' ')}</div>
    </div>
`;
document.getElementById('modal').classList.add('open');
}

async function setFilter(t) {
filter = t;
// Update active state for type buttons only
const buttons = document.getElementById('typeButtons').querySelectorAll('.type-btn');
buttons.forEach(b => b.classList.remove('active'));
event.target.classList.add('active');

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

const abilities = d.abilities.map(a => `<span class="ability-tag" onclick="filterByAbility('${a.ability.name}', event)" style="cursor: pointer;">${a.ability.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>`).join('');
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
    `<button class="move-tab" onclick="switchGenTab(${g})">Gen ${g}</button>`
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
event.stopPropagation();
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
    subtitle.innerHTML = `Filtering by Ability: <span style="color:#3bd5ff">${formattedAbility}</span> (${pokemon.length} found) <a href="#" onclick="init(); return false;" style="color:#8b92a5; margin-left:10px; font-size:12px; text-decoration:underline;">Clear Filter</a>`;
    
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

    // Evolution
    const evoHtml = renderEvolutionChain(evo.chain);

    // Data Helpers
    const genus = species.genera.find(g => g.language.name === 'en')?.genus || '';
    const heightM = p.height / 10;
    const weightKg = p.weight / 10;
    const abilities = p.abilities.map(a => 
        `${a.is_hidden ? '<small class="text-muted">' : ''}${a.slot}. <a href="#" style="color:#3bd5ff;text-decoration:none">${a.ability.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</a>${a.is_hidden ? ' (hidden ability)</small>' : ''}`
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

        <div id="formContent0">${renderFormContent(p, species, evo, genus, localDexHtml, catchRate, baseExp, growthRate, baseFriendship, friendshipDesc, evYield, eggGroups, genderText, eggCycles, steps, abilities, heightM, weightKg, flavorText, statsHtml, defenseHtml, evoHtml)}</div>
        ${relevantForms.map((form, idx) => {
            // Calculate form-specific data
            const formAbilities = form.abilities.map(a => 
                `${a.is_hidden ? '<small class="text-muted">' : ''}${a.slot}. <a href="#" style="color:#3bd5ff;text-decoration:none">${a.ability.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</a>${a.is_hidden ? ' (hidden ability)</small>' : ''}`
            ).join('<br>');
            const formEvYield = form.stats.filter(s => s.effort > 0).map(s => `${s.effort} ${formatStatName(s.stat.name)}`).join(', ') || 'None';
            const formStatsHtml = renderStatsForForm(form);
            const formDefenseHtml = renderTypeDefenses(calculateTypeDefenses(form.types));
            const formHeightM = form.height / 10;
            const formWeightKg = form.weight / 10;
            
            return `<div id="formContent${idx + 1}" style="display:none">${renderFormContent(form, species, evo, genus, localDexHtml, catchRate, form.base_experience || baseExp, growthRate, baseFriendship, friendshipDesc, formEvYield, eggGroups, genderText, eggCycles, steps, formAbilities, formHeightM, formWeightKg, flavorText, formStatsHtml, formDefenseHtml, evoHtml)}</div>`;
        }).join('')}
    `;
    
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

function renderFormContent(p, species, evo, genus, localDexHtml, catchRate, baseExp, growthRate, baseFriendship, friendshipDesc, evYield, eggGroups, genderText, eggCycles, steps, abilities, heightM, weightKg, flavorText, statsHtml, defenseHtml, evoHtml) {
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
    let html = '';
    let current = chain;
    
    while (current) {
        const speciesName = current.species.name;
        const speciesId = current.species.url.split('/').filter(Boolean).pop();
        
        html += `
            <div class="evo-stage" onclick="window.location.href='pokemon.html?id=${speciesId}'" style="cursor: pointer;">
                <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${speciesId}.png" alt="${speciesName}" class="evo-img">
                <div class="evo-name">${speciesName.charAt(0).toUpperCase() + speciesName.slice(1)}</div>
            </div>
        `;
        
        if (current.evolves_to.length > 0) {
            html += `<div class="evo-arrow">→</div>`;
            current = current.evolves_to[0]; 
        } else {
            current = null;
        }
    }
    return html;
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
                <div class="card" id="card-${id}" onclick="window.location.href='pokemon.html?id=${id}'">
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
            <td><a href="#" class="ability-name" onclick="showAbilityPokemon('${ability.name}', event)">${ability.displayName}</a></td>
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
    event.preventDefault();
    
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
    const abilityName = urlParams.get('ability');
    
    if (!abilityName) {
        document.querySelector('.container').innerHTML = '<p style="color: #ff4444;">No ability specified</p>';
        return;
    }

    try {
        // Fetch ability data
        const response = await fetch(`${API}/ability/${abilityName}`);
        const ability = await response.json();
        
        // Update title
        const displayName = ability.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        document.getElementById('abilityTitle').textContent = `${displayName} (ability)`;
        document.title = `${displayName} - Pokémon Database`;
        
        // Get English effect
        const effectEntry = ability.effect_entries.find(e => e.language.name === 'en');
        const effect = effectEntry ? effectEntry.effect : 'No description available';
        document.getElementById('effectText').textContent = effect;
        
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
        
        // Get other languages
        const langDiv = document.getElementById('otherLanguages');
        const languages = {};
        
        ability.names?.forEach(name => {
            if (name.language.name !== 'en') {
                languages[name.language.name] = name.name;
            }
        });
        
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
        
        // Get Pokémon with this ability
        const pokemonDiv = document.getElementById('pokemonWithAbility');
        const pokemonList = ability.pokemon || [];
        
        if (pokemonList.length > 0) {
            // Fetch Pokémon details
            const pokemonPromises = pokemonList.slice(0, 50).map(async p => {
                const pokeResponse = await fetch(p.pokemon.url);
                return pokeResponse.json();
            });
            
            const pokemonData = await Promise.all(pokemonPromises);
            
            const pokemonHtml = pokemonData.map(poke => `
                <a href="pokemon.html?id=${poke.id}" class="pokemon-card-ability" onclick="return true;">
                    <div class="pokemon-img-ability">
                        <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${poke.id}.png" alt="${poke.name}" onerror="this.style.display='none';">
                    </div>
                    <div class="pokemon-dex-ability">#${String(poke.id).padStart(4, '0')}</div>
                    <a href="pokemon.html?id=${poke.id}" class="pokemon-name-ability" onclick="event.preventDefault(); window.location.href='pokemon.html?id=${poke.id}'">${poke.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</a>
                    <div class="pokemon-species-ability">${poke.types.map(t => t.type.name).join('/')}</div>
                </a>
            `).join('');
            
            pokemonDiv.innerHTML = pokemonHtml || '<p class="loading-placeholder">No Pokémon found</p>';
        } else {
            pokemonDiv.innerHTML = '<p class="loading-placeholder">No Pokémon with this ability</p>';
        }
        
    } catch (error) {
        console.error('Error loading ability detail:', error);
        document.querySelector('.container').innerHTML = '<p style="color: #ff4444;">Error loading ability details. Please try again.</p>';
    }
}

// Initialize ability detail page if on that page
if (window.location.pathname.includes('ability-detail.html')) {
    loadAbilityDetail();
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


