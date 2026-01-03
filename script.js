const API = 'https://pokeapi.co/api/v2';
const TYPES = ['all', 'normal', 'fire', 'water', 'grass', 'electric', 'ice', 'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'];
const TYPE_COLORS = {
  normal: '#A8A878', fire: '#F08030', water: '#6890F0', grass: '#78C850', electric: '#F8D030',
  ice: '#98D8D8', fighting: '#C03028', poison: '#A040A0', ground: '#E0C068', flying: '#A890F0',
  psychic: '#F85888', bug: '#A8B820', rock: '#B8A038', ghost: '#705898', dragon: '#7038F8',
  dark: '#705848', steel: '#B8B8D0', fairy: '#EE99AC'
};

let pokemon = [];
let filter = 'all';

async function init() {
  document.getElementById('grid').innerHTML = '<div class="loading">Loading Pokémon...</div>';
  pokemon = await fetch(`${API}/pokemon?limit=1025`).then(r => r.json()).then(d => d.results.map((p, i) => ({ id: i + 1, name: p.name })));
  render();
  setupTypes();
}

function setupTypes() {
  document.getElementById('typeButtons').innerHTML = TYPES.map(t => 
    `<button class="type-btn ${t === 'all' ? 'active' : ''}" onclick="setFilter('${t}')">${t.toUpperCase()}</button>`
  ).join('');
}

async function render() {
  const search = document.getElementById('search').value.toLowerCase();
  let filtered = pokemon.filter(p => p.name.includes(search) || p.id.toString().includes(search));
  
  if (filter !== 'all') {
    filtered = await Promise.all(filtered.map(async p => {
      if (!p.types) {
        const d = await fetch(`${API}/pokemon/${p.id}`).then(r => r.json());
        p.types = d.types.map(t => t.type.name);
      }
      return p;
    }));
    filtered = filtered.filter(p => p.types.includes(filter));
  }
  
  const grid = document.getElementById('grid');
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
}

function setFilter(t) {
  filter = t;
  document.querySelectorAll('.type-btn').forEach(b => b.classList.remove('active'));
  event.target.classList.add('active');
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
  
  document.getElementById('modalBody').innerHTML = `
    <div class="detail-image"><img src="${d.sprites.other['official-artwork'].front_default || d.sprites.front_default}" alt="${name}"></div>
    <div style="display: flex; gap: 6px; margin-bottom: 16px; flex-wrap: wrap;">
      ${d.types.map(t => `<span class="type-tag" style="background: ${TYPE_COLORS[t.type.name]}">${t.type.name}</span>`).join('')}
    </div>
    <div class="detail-grid">
      <div class="detail-item"><div class="detail-label">Height</div><div class="detail-value">${(d.height / 10).toFixed(1)}m</div></div>
      <div class="detail-item"><div class="detail-label">Weight</div><div class="detail-value">${(d.weight / 10).toFixed(1)}kg</div></div>
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
      <div class="section-title">Known Moves (First 20)</div>
      <div class="moves-list">${moves || '<span style="color: #8b92a5;">None</span>'}</div>
    </div>
  `;
  document.getElementById('modal').classList.add('open');
}

function closeModal() {
  document.getElementById('modal').classList.remove('open');
}

async function filterByAbility(abilityName, event) {
  event.stopPropagation();
  closeModal();
  
  const allPokemon = await fetch(`${API}/pokemon?limit=1025`).then(r => r.json()).then(d => d.results.map((p, i) => ({ id: i + 1, name: p.name })));
  
  const filtered = await Promise.all(allPokemon.map(async p => {
    const d = await fetch(`${API}/pokemon/${p.id}`).then(r => r.json());
    const hasAbility = d.abilities.some(a => a.ability.name === abilityName);
    return hasAbility ? { ...p, types: d.types.map(t => t.type.name) } : null;
  }));
  
  pokemon = filtered.filter(p => p !== null);
  
  const titleEl = document.querySelector('.modal-title');
  titleEl.textContent = 'Pokémon Database';
  
  document.getElementById('grid').innerHTML = pokemon.map(p => `
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
  
  document.getElementById('empty').style.display = 'none';
}

document.getElementById('search').addEventListener('input', render);
init();
