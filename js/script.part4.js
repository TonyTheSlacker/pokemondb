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
            return `<a href="${PAGES_PREFIX}egg-group.html?group=${g.name}" class="egg-group-item ${isActive ? 'active' : ''}" data-group="${g.name}">
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
    window.location.href = `${PAGES_PREFIX}ability-detail.html?ability=${abilityName}`;
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
                    <a href="${PAGES_PREFIX}pokemon-detail.html?id=${poke.id}" class="pokemon-card-ability">
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
                    <a href="${PAGES_PREFIX}pokemon-detail.html?id=${poke.id}" class="pokemon-card-ability">
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
    const href = `${PAGES_PREFIX}pokemon-detail.html?id=${p.id}`;
    const sprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`;
    const displayName = formatName(p.name);
    return `
        <a class="learned-card" href="${href}">
            <div class="learned-sprite">
                <img src="${sprite}" alt="${displayName}" onerror="this.style.display='none'">
            </div>
            <div class="learned-text">
                <div class="learned-name">${displayName}</div>
                <div class="learned-level">Lv. ${p.level}</div>
                <div class="learned-id">#${String(p.id).padStart(4, '0')}</div>
            </div>
        </a>
    `;
}

function renderLearnedCardNoLevel(p) {
    const href = `${PAGES_PREFIX}pokemon-detail.html?id=${p.id}`;
    const sprite = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${p.id}.png`;
    const displayName = formatName(p.name);
    return `
        <a class="learned-card" href="${href}">
            <div class="learned-sprite">
                <img src="${sprite}" alt="${displayName}" onerror="this.style.display='none'">
            </div>
            <div class="learned-text">
                <div class="learned-name">${displayName}</div>
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
    let targetUrl = `${ROOT_PREFIX}index.html`;
    if (dexId !== 'all') {
        targetUrl += `?dex=${dexId}&dexName=${encodeURIComponent(dexName)}`;
    }
    
    // Navigate
    window.location.href = targetUrl;
}


