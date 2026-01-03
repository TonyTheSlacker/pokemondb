const API = 'https://pokeapi.co/api/v2';
const TYPES = ['all', 'normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];
const TYPE_COLORS = {
normal: '#A8A878', fire: '#F08030', water: '#6890F0', grass: '#78C850', electric: '#F8D030',
ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0', ground: '#E0C068', flying: '#A890F0',
psychic: '#F85888', bug: '#A8B820', rock: '#B8A038', ghost: '#705898', dragon: '#7038F8',
dark: '#705848', steel: '#B8B8D0', fairy: '#EE99AC'
};

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

const moveDetailsCache = {};
let currentPokemonMoves = {};

async function init() {
    document.querySelector('.subtitle').textContent = 'Search and explore all 1,025 Pokémon';
    document.getElementById('grid').innerHTML = '<div class="loading">Loading Pokémon...</div>';
    allPokemon = await fetch(`${API}/pokemon?limit=1025`).then(r => r.json()).then(d => d.results.map((p, i) => ({ id: i + 1, name: p.name })));
    pokemon = [...allPokemon];
    render();
    setupTypes();
    setupDamageClasses();
}

function setupDamageClasses() {
    document.getElementById('categoryButtons').innerHTML = DAMAGE_CLASSES.map(c => 
        `<button class="type-btn ${c === 'all' ? 'active' : ''}" onclick="setDamageClassFilter('${c}')">${c.toUpperCase()}</button>`
    ).join('');
}

async function switchPage(page) {
currentPage = page;
document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
event.target.classList.add('active');

const grid = document.getElementById('grid');
const searchInput = document.getElementById('search');
const subtitle = document.querySelector('.subtitle');
const categoryFilter = document.getElementById('categoryFilter');
const typeChart = document.getElementById('typeChart');
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
    subtitle.textContent = 'Search and explore all moves';
    searchInput.placeholder = 'Search moves...';
    searchInput.value = '';
    categoryFilter.style.display = 'flex';
    
    if (!allMoves.length) {
    grid.innerHTML = '<div class="loading">Loading Moves...</div>';
    const data = await fetch(`${API}/move?limit=1000`).then(r => r.json());
    allMoves = data.results.map(m => ({
        name: m.name,
        id: parseInt(m.url.split('/').filter(Boolean).pop())
    }));
    }
    moves = [...allMoves];
    render();
} else if (page === 'type-chart') {
    subtitle.textContent = 'Type Effectiveness Chart';
    document.querySelector('.controls').style.display = 'none';
    grid.style.display = 'none';
    typeChart.style.display = 'block';
    renderTypeChart();
}
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
    <div class="card" onclick="detail(${p.id})">
        <div class="card-header">
        <div class="card-name">${p.name.charAt(0).toUpperCase() + p.name.slice(1)}</div>
        <div class="card-id">#${String(p.id).padStart(3, '0')}</div>
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

document.getElementById('search').addEventListener('input', render);
init();
