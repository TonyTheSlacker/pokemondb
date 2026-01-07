const machineDetailsCache = {};
const pokemonDetailsCache = {};
const pokemonSpeciesCache = {};
const pokemonFormCache = {};
let currentPokemonMoves = {};

// Tracks the currently selected Pokédex so we can render per-game sprites in the grid.
let currentPokedexContext = { id: 'all', name: 'All Pokémon' };

function getPokedexSpritePreset(dexId, dexName) {
  const id = dexId;
  const name = String(dexName || '').toLowerCase();

  // Default / "All Pokémon": use latest (HOME) sprites.
  if (id === 'all' || name.includes('all pok')) return { kind: 'home' };

  // Gen 9
  if (id === 'paldea' || (name.includes('scarlet') && name.includes('violet'))) return { kind: 'home' };

  // Gen 8
  if (name.includes('brilliant diamond') && name.includes('shining pearl')) {
    return { kind: 'versions', gen: 'generation-viii', game: 'brilliant-diamond-shining-pearl' };
  }
  if (name.includes('sword') && name.includes('shield')) return { kind: 'versions', gen: 'generation-viii', game: 'icons' };
  if (name.includes('legends') && name.includes('arceus')) return { kind: 'versions', gen: 'generation-viii', game: 'icons' };

  // Gen 7
  if (name.includes("let's go")) return { kind: 'versions', gen: 'generation-vii', game: 'icons' };
  if (name.includes('ultra sun') && name.includes('ultra moon')) {
    return { kind: 'versions', gen: 'generation-vii', game: 'ultra-sun-ultra-moon' };
  }
  // PokeAPI sprite sets don't have a distinct "sun-moon" group for many mons; use USUM sprites as the closest match.
  if (name.includes('sun') && name.includes('moon')) return { kind: 'versions', gen: 'generation-vii', game: 'ultra-sun-ultra-moon' };

  // Gen 6
  if ((name.includes('x') && name.includes('y')) || name.includes('x & y')) return { kind: 'versions', gen: 'generation-vi', game: 'x-y' };
  if (name.includes('omega ruby') && name.includes('alpha sapphire')) {
    // Note: sprite group key is "omegaruby-alphasapphire" (no hyphens) in PokeAPI.
    return { kind: 'versions', gen: 'generation-vi', game: 'omegaruby-alphasapphire' };
  }

  // Gen 5
  if (name.includes('black') && name.includes('white')) return { kind: 'versions', gen: 'generation-v', game: 'black-white' };

  // Gen 4
  if (name.includes('heartgold') || name.includes('soulsilver')) return { kind: 'versions', gen: 'generation-iv', game: 'heartgold-soulsilver' };
  if (name.trim() === 'platinum') return { kind: 'versions', gen: 'generation-iv', game: 'platinum' };
  if (name.includes('diamond') && name.includes('pearl')) return { kind: 'versions', gen: 'generation-iv', game: 'diamond-pearl' };

  // Gen 3
  if (name.includes('firered') && name.includes('leafgreen')) return { kind: 'versions', gen: 'generation-iii', game: 'firered-leafgreen' };
  if (name.includes('emerald')) return { kind: 'versions', gen: 'generation-iii', game: 'emerald' };
  if (name.includes('ruby') && name.includes('sapphire')) return { kind: 'versions', gen: 'generation-iii', game: 'ruby-sapphire' };

  // Gen 2
  if (name.includes('crystal')) return { kind: 'versions', gen: 'generation-ii', game: 'crystal' };
  if (name.includes('gold')) return { kind: 'versions', gen: 'generation-ii', game: 'gold' };
  if (name.includes('silver')) return { kind: 'versions', gen: 'generation-ii', game: 'silver' };

  // Gen 1
  if (name.includes('yellow')) return { kind: 'versions', gen: 'generation-i', game: 'yellow' };
  if (name.includes('red') || name.includes('blue')) return { kind: 'versions', gen: 'generation-i', game: 'red-blue' };

  // Fallback: use latest (HOME) sprites.
  return { kind: 'home' };
}

function getPokedexSpriteUrl(pokemonId, dexContext) {
  const id = Number(pokemonId);
  const base = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
  if (!id || !Number.isFinite(id)) return '';

  const preset = getPokedexSpritePreset(dexContext?.id, dexContext?.name);
  if (!preset || preset.kind === 'default') return `${base}${id}.png`;
  if (preset.kind === 'home') return `${base}other/home/${id}.png`;
  if (preset.kind === 'versions') return `${base}versions/${preset.gen}/${preset.game}/${id}.png`;
  return `${base}${id}.png`;
}

// Regional dex rendering (e.g. Alola forms in Gen 7 dex listings)
const regionalVariantCache = new Map();

function getRegionalTagForDex(dexId) {
  // Normalize
  const id = (typeof dexId === 'string') ? dexId.toLowerCase() : dexId;

  // Gen 7 Alola dexes
  if (id === 16 || id === 21) return 'alola';

  // Gen 8 Galar / Hisui
  if (id === 27) return 'galar'; // Sword & Shield
  if (id === 30) return 'hisui'; // Legends: Arceus

  // Gen 9 Paldea
  if (id === 'paldea') return 'paldea'; // Scarlet & Violet

  return null;
}

function ensurePokedexMenuExpanded() {
  const menu = document.getElementById('pokedexSubMenu');
  if (menu) menu.style.display = 'block';
  const toggle = document.querySelector('[data-action="toggle-pokedex-menu"]');
  if (toggle) toggle.classList.add('expanded');
}

function isElementHidden(el) {
  if (!el) return true;
  // Prefer computed style since many pages don't set inline display styles.
  return window.getComputedStyle(el).display === 'none';
}

function setActiveDexInSidebar(dexId, triggerEl) {
  const items = document.querySelectorAll('.sub-nav-item');
  items.forEach(el => el.classList.remove('active'));

  if (triggerEl) {
    triggerEl.classList.add('active');
    return;
  }

  // When invoked via URL params, we don't have a clicked element; find it.
  const idStr = String(dexId);
  const match = document.querySelector(`.sub-nav-item[data-dex-id="${CSS.escape(idStr)}"]`);
  if (match) match.classList.add('active');
}

async function getRegionalVariantPokemonData(baseSpeciesName, tag) {
  const base = String(baseSpeciesName || '').toLowerCase();
  const t = String(tag || '').toLowerCase();
  if (!base || !t) return null;

  const cacheKey = `${t}:${base}`;
  if (regionalVariantCache.has(cacheKey)) return regionalVariantCache.get(cacheKey);

  try {
    const data = await fetchJsonWithTimeout(`${API}/pokemon/${encodeURIComponent(base)}-${encodeURIComponent(t)}`, 12000);
    const out = data && data.id ? { id: data.id, name: data.name } : null;
    regionalVariantCache.set(cacheKey, out);
    return out;
  } catch {
    regionalVariantCache.set(cacheKey, null);
    return null;
  }
}

async function applyRegionalFormsToDexEntries(entries, tag, subtitleEl) {
  const list = Array.isArray(entries) ? entries : [];
  if (!list.length || !tag) return list;

  const maxConcurrency = 12;
  let cursor = 0;
  const out = new Array(list.length);

  async function worker() {
    while (true) {
      const i = cursor++;
      if (i >= list.length) return;
      const e = list[i];
      const v = await getRegionalVariantPokemonData(e?.name, tag);
      out[i] = v ? { ...e, id: v.id, name: v.name } : e;
    }
  }

  if (subtitleEl) {
    const placeMap = { alola: 'Alola', galar: 'Galar', hisui: 'Hisui', paldea: 'Paldea' };
    const place = placeMap[tag] || tag;
    subtitleEl.textContent = `${subtitleEl.textContent} (showing ${place} forms)`;
  }

  const workers = [];
  for (let i = 0; i < Math.min(maxConcurrency, list.length); i++) workers.push(worker());
  await Promise.all(workers);
  return out;
}

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
  const pokemonDisplay = formatPokemonDisplayNameFromData(pokemonData);
    if (!gens.length) {
        return `
      <div class="detail-cards-row full learnset-section" data-learnset-key="${learnsetKey}" data-pokemon-display="${escapeHtmlAttr(pokemonDisplay)}">
        <div>
          <h3 class="section-header">Moves learned by ${pokemonDisplay}</h3>
          <div class="detail-card">
            <div class="learnset-empty">No move learnset data available.</div>
          </div>
        </div>
      </div>
        `;
    }

    const activeGen = Math.max(...gens);

    const genButtons = gens.map(g => {
        const active = g === activeGen ? ' active' : '';
        return `<button type="button" class="learnset-genbtn${active}" data-learnset-gen="${g}">${g}</button>`;
    }).join('');

    return `
      <div class="detail-cards-row full learnset-section" data-learnset-key="${learnsetKey}" data-active-gen="${activeGen}" data-pokemon-display="${escapeHtmlAttr(pokemonDisplay)}">
        <div>
          <h3 class="section-header">Moves learned by ${pokemonDisplay}</h3>
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

    const pokemonName = String(section.dataset.pokemonDisplay || (document.querySelector('.detail-h1')?.textContent || 'This Pokémon')).trim();
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

    // Render interactive controls immediately (even if data is still loading).
    try {
        setupTypes();
        setupDamageClasses();
    } catch {
        // ignore; controls may not exist on some pages
    }

    try {
        const d = await fetchJsonWithTimeout(`${API}/pokemon?limit=1025`, 15000);
        allPokemon = (d?.results || []).map((p, i) => ({ id: i + 1, name: p.name }));
        pokemon = [...allPokemon];
    } catch (e) {
        console.error(e);
        const isFile = window.location.protocol === 'file:';
        const title = isFile
            ? 'This site can\'t run reliably from file://'
            : 'Could not load Pokémon data';
        const hint = isFile
            ? 'Serve the folder with a local web server (e.g. VS Code Live Server, or run: <code>python -m http.server</code> and open <code>http://localhost:8000/</code>). Some browsers restrict network requests from <code>file://</code>.'
            : 'Check your internet connection, browser console, and any network/privacy blockers.';

        if (subtitle) subtitle.textContent = 'Error loading data';
        if (grid) {
            grid.innerHTML = `
                <div class="empty">
                    <div>${title}</div>
                    <div class="details-muted">${hint}</div>
                </div>
            `;
        }
        return;
    }
    
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
    
    // (Controls already set up above.)
}

async function loadPokedex(id, name, triggerEl) {
  currentPokedexContext = { id, name };

  // Always keep the Pokédex menu expanded and highlight the selected dex.
  ensurePokedexMenuExpanded();
  setActiveDexInSidebar(id, triggerEl);

  // Ensure we are on the pokedex page
  if (currentPage !== 'pokedex') {
    switchPage('pokedex');
  }
  
  const grid = document.getElementById('grid');
  const subtitle = document.querySelector('.subtitle');
  
  grid.innerHTML = `<div class="loading">Loading ${name}...</div>`;
  subtitle.textContent = `Exploring ${name}`;
  
  try {
    const regionalTag = getRegionalTagForDex(id);

    // Special case for "All Pokémon"
    if (id === 'all') {
      currentPokedexContext = { id: 'all', name: 'All Pokémon' };
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

      // Regional dex view: show regional forms (e.g. Alolan Rattata/Raichu) in this grid.
      if (regionalTag) {
          pokemon = await applyRegionalFormsToDexEntries(pokemon, regionalTag, subtitle);
      }
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
  if (!menu || !item) return;

  if (isElementHidden(menu)) {
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
  } else {
    // Called without a clicked element (e.g. hash routing on first load).
    // Try to find the matching sidebar entry so the active highlight is still correct.
    try {
      const match = document.querySelector(`.nav-item[data-action="switch-page"][data-page="${CSS.escape(String(page))}"]`);
      if (match) {
        match.classList.add('active');
      } else if (page === 'pokedex') {
        const pokedex = document.querySelector('.nav-item[data-action="toggle-pokedex-menu"]');
        if (pokedex) pokedex.classList.add('active');
      }
    } catch {
      // Non-fatal; keep going.
    }
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
    currentPokedexContext = { id: 'all', name: 'All Pokémon' };
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
                                                                <td><a class="move-name-link" href="${PAGES_PREFIX}move-detail.html?move=${m.id}">${formatName(m.name)}</a></td>
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
                        <td><a class="move-name-link" href="${PAGES_PREFIX}move-detail.html?move=${d.id}">${formatName(d.name)}</a></td>
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

const NAME_OVERRIDES = {
    'mr-mime': 'Mr. Mime',
    'mr-mime-galar': 'Mr. Mime (Galar)',
    'mr-rime': 'Mr. Rime',
    'mime-jr': 'Mime Jr.',
    'type-null': 'Type: Null',
    'ho-oh': 'Ho-Oh',
    'porygon-z': 'Porygon-Z',
    'eevee-starter': 'Partner Eevee',
    'jangmo-o': 'Jangmo-o',
    'hakamo-o': 'Hakamo-o',
    'kommo-o': 'Kommo-o',
    'farfetchd': "Farfetch'd",
    'sirfetchd': "Sirfetch'd",
    'nidoran-f': 'Nidoran♀',
    'nidoran-m': 'Nidoran♂',
    'flabebe': 'Flabébé'
};

function formatName(n) {
    const s = String(n || '').trim();
    if (!s) return '';
    if (NAME_OVERRIDES[s]) return NAME_OVERRIDES[s];

  // Keep Pikachu "cap" forms as suffix names (PokemonDB-style), not regional adjectives.
  if (/^pikachu-.*-cap$/i.test(s)) {
    return s.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }

  // Regional form names: prefer adjective prefix (Alolan Raichu) over suffix (Raichu Alola).
  const REGIONAL_ADJECTIVES = {
    alola: 'Alolan',
    galar: 'Galarian',
    hisui: 'Hisuian',
    paldea: 'Paldean'
  };

  const parts = s.toLowerCase().split('-').filter(Boolean);
  for (const tag of Object.keys(REGIONAL_ADJECTIVES)) {
    const idx = parts.indexOf(tag);
    if (idx === -1) continue;

    // Remove the regional tag segment; keep the rest as the base form name.
    const baseParts = parts.slice(0, idx).concat(parts.slice(idx + 1));
    const baseSlug = baseParts.join('-');
    if (!baseSlug) break;

    const adjective = REGIONAL_ADJECTIVES[tag];
    const baseDisplay = formatName(baseSlug);
    return `${adjective} ${baseDisplay}`;
  }

  return s.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function escapeHtmlAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Pokemon names sometimes need different display rules than moves/types.
// For forms, prefer "Species-Form" (e.g. Lycanroc-Dusk) everywhere.
function formatPokemonDisplayName(apiName, speciesName) {
  const raw = String(apiName || '').trim();
  if (!raw) return '';

  const species = String(speciesName || '').trim();
  const rawLower = raw.toLowerCase();
  const speciesLower = species.toLowerCase();

  if (species && rawLower.startsWith(speciesLower + '-')) {
    const suffix = raw.slice(species.length + 1);
    const suffixPretty = suffix
      .split('-')
      .filter(Boolean)
      .map(part => formatName(part))
      .join('-');
    return `${formatName(species)}-${suffixPretty}`;
  }

  // Default: keep existing PokemonDB-style formatting.
  return formatName(raw);
}

function formatPokemonDisplayNameFromData(pokemonData) {
  return formatPokemonDisplayName(pokemonData?.name, pokemonData?.species?.name);
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
    <div class="card" id="card-${p.id}" data-action="open-pokemon" data-pokemon-id="${p.id}" data-dex-id="${p.dexId || ''}">
        <div class="card-header">
      <div class="card-name">${formatName(getGridBaseSpeciesSlug(p) || p.name)}</div>
        <div class="card-id">#${String(p.dexId || p.id).padStart(3, '0')}</div>
        </div>
        <div class="card-image">
        <img src="${getPokedexSpriteUrl(p.id, currentPokedexContext)}" alt="${p.name}" onerror="this.onerror=null;this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png'">
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

// In the Pokédex grid, show the base species name (PokemonDB-style).
// The /pokemon list contains many form slugs (e.g. tornadus-incarnate), so we use a
// safe heuristic until the card is hydrated with full /pokemon/{id} data.
const FORM_NAME_TOKENS = new Set([
  // common form descriptors
  'normal', 'attack', 'defense', 'speed',
  'altered', 'origin',
  'incarnate', 'therian',
  'solo', 'school',
  'midday', 'midnight', 'dusk', 'dawn',
  'male', 'female',
  'ice', 'noice',
  'crowned', 'hero',
  'single', 'rapid', 'strike', 'style',
  'complete', 'construct',
  // regional / special tags
  'alola', 'galar', 'hisui', 'paldea',
  // breed / palette words for known cases
  'combat', 'blaze', 'aqua', 'breed',
  'plumage', 'green', 'blue', 'yellow', 'white',
  'red', 'orange', 'indigo', 'violet', 'meteor'
]);

function getGridBaseSpeciesSlug(p) {
  const raw = String(p?.name || '').toLowerCase();
  if (!raw) return '';

  // Prefer a known species name if the entry already has it.
  const speciesSlug = String(p?.speciesName || p?.species?.name || '').toLowerCase();
  if (speciesSlug) return speciesSlug;

  const parts = raw.split('-').filter(Boolean);
  if (parts.length <= 1) return raw;

  const tail = parts.slice(1);
  const looksLikeForm = tail.some(t => FORM_NAME_TOKENS.has(t));
  return looksLikeForm ? parts[0] : raw;
}

function updatePokedexCardHeaderFromPokemonData(card, pData) {
  if (!card || !pData) return;

  // Update display name to base species.
  const speciesSlug = pData?.species?.name;
  if (speciesSlug) {
    const nameEl = card.querySelector('.card-name');
    if (nameEl) nameEl.textContent = formatName(speciesSlug);
  }

  // For lists that come from /pokemon (forms), prefer the species id as the National Dex number.
  // Do NOT override regional dex entry numbers.
  const dexIdAttr = String(card.getAttribute('data-dex-id') || '').trim();
  if (!dexIdAttr) {
    const speciesUrl = String(pData?.species?.url || '');
    const m = speciesUrl.match(/\/pokemon-species\/(\d+)\/?$/);
    if (m) {
      const dexNum = parseInt(m[1], 10);
      if (Number.isFinite(dexNum)) {
        const idEl = card.querySelector('.card-id');
        if (idEl) idEl.textContent = `#${String(dexNum).padStart(3, '0')}`;
      }
    }
  }
}

async function fetchPokemonTypeForCard(id, card) {
    if (card.dataset.loaded) return;
    card.dataset.loaded = 'true';
    
    try {
        if (pokemonDetailsCache[id]) {
        const img = card.querySelector('img');
        if (img) img.src = getPokedexSpriteUrl(id, currentPokedexContext);
        updatePokedexCardHeaderFromPokemonData(card, pokemonDetailsCache[id]);
            renderTypes(card, pokemonDetailsCache[id].types);
            return;
        }

        const pData = await fetch(`${API}/pokemon/${id}`).then(r => r.json());
        pokemonDetailsCache[id] = pData; // Cache full data
        const img = card.querySelector('img');
        if (img) img.src = getPokedexSpriteUrl(id, currentPokedexContext);
        updatePokedexCardHeaderFromPokemonData(card, pData);
        renderTypes(card, pData.types);
    } catch (e) {
        console.error(`Error fetching details for ${id}`, e);
        const typeContainer = card.querySelector('.card-types');
        if (typeContainer) typeContainer.innerHTML = '<span class="error">Err</span>';
    }
}

function moveDetail(id) {
    window.location.href = `${PAGES_PREFIX}move-detail.html?move=${id}`;
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
const name = formatName(d.name);
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

