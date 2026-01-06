// Enable data-action click handling across all pages.
// (Guarded + deferred because different pages rely on functions declared in later parts.)
if (typeof setupActionDelegation === 'function') {
    setupActionDelegation();
}

function normalizePathname(path) {
    return String(path || '').replace(/\\/g, '/').toLowerCase();
}

function resolveHref(href) {
    const raw = String(href || '').trim();
    if (!raw || raw === '#') return null;
    try {
        const url = new URL(raw, window.location.href);
        return { pathname: normalizePathname(url.pathname), hash: String(url.hash || '').toLowerCase() };
    } catch {
        return null;
    }
}

function setSidebarActiveFromLocation() {
    const sidebar = document.querySelector('.sidebar-nav');
    if (!sidebar) return;

    const currentPath = normalizePathname(window.location.pathname);
    const currentHash = String(window.location.hash || '').toLowerCase();

    // Clear only top-level active state. (Do not touch .sub-nav-item.active, since dex/egg-group selection uses it.)
    sidebar.querySelectorAll('.nav-item.active').forEach(el => el.classList.remove('active'));

    const isIndex = /\/index\.html$/.test(currentPath) || currentPath.endsWith('/');

    // Helper: pick a .nav-item by resolved href
    function activateByHref(predicate) {
        const items = Array.from(sidebar.querySelectorAll('a.nav-item[href]'));
        for (const a of items) {
            const res = resolveHref(a.getAttribute('href'));
            if (!res) continue;
            if (predicate(res, a)) {
                a.classList.add('active');
                return true;
            }
        }
        return false;
    }

    // Index routing (single-page sections)
    if (isIndex) {
        const route = (typeof getInitialRouteFromHash === 'function') ? getInitialRouteFromHash() : null;
        if (route === 'moves') {
            const el = sidebar.querySelector('.nav-item[data-action="switch-page"][data-page="moves"]');
            if (el) el.classList.add('active');
            return;
        }
        if (route === 'type-chart') {
            const el = sidebar.querySelector('.nav-item[data-action="switch-page"][data-page="type-chart"]');
            if (el) el.classList.add('active');
            return;
        }
        // Default: Pokédex
        const pokedex = sidebar.querySelector('.nav-item[data-action="toggle-pokedex-menu"]');
        if (pokedex) pokedex.classList.add('active');
        return;
    }

    // Detail pages: map to their “section” nav entry
    if (currentPath.endsWith('/move-detail.html')) {
        // Matches ../index.html#moves
        if (activateByHref((u) => u.pathname.endsWith('/index.html') && u.hash === '#moves')) return;
    }
    if (currentPath.endsWith('/ability-detail.html') || currentPath.endsWith('/abilities.html')) {
        if (activateByHref((u) => u.pathname.endsWith('/abilities.html'))) return;
    }
    if (currentPath.endsWith('/locations.html') || currentPath.endsWith('/location-detail.html')) {
        if (activateByHref((u) => u.pathname.endsWith('/locations.html'))) return;
    }
    if (currentPath.endsWith('/egg-group.html')) {
        const egg = sidebar.querySelector('.nav-item[data-action="toggle-egg-group-menu"]');
        if (egg) egg.classList.add('active');
        return;
    }
    if (currentPath.endsWith('/pokemon-detail.html')) {
        const pokedex = sidebar.querySelector('.nav-item[data-action="toggle-pokedex-menu"]');
        if (pokedex) pokedex.classList.add('active');
        return;
    }

    // Fallback: try to match exact pathname to a nav-item href.
    activateByHref((u) => u.pathname === currentPath);
}

async function initPokedexPage() {
    window.__APP_INIT_STARTED__ = true;
    await init();
    window.__APP_INIT_FINISHED__ = true;
    const route = getInitialRouteFromHash();
    if (route) {
        await switchPage(route);
    }

    // Ensure sidebar highlight matches the active in-app route.
    setSidebarActiveFromLocation();
}

document.addEventListener('DOMContentLoaded', () => {
    setSidebarActiveFromLocation();

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
        return;
    }

    // Pages whose loaders live in other parts (script.part4.js)
    if (eggGroupList || eggGroupRoot) {
        if (typeof initEggGroupPage === 'function') initEggGroupPage();
        return;
    }
    if (window.location.pathname.includes('ability-detail.html')) {
        if (typeof loadAbilityDetail === 'function') loadAbilityDetail();
        return;
    }
    if (window.location.pathname.includes('move-detail.html')) {
        if (typeof loadMoveDetail === 'function') loadMoveDetail();
        return;
    }
    if (window.location.pathname.includes('location-detail.html')) {
        if (typeof initLocationsPage === 'function') initLocationsPage();
        return;
    }
    if (window.location.pathname.includes('locations.html')) {
        if (typeof initLocationsGuidePage === 'function') initLocationsGuidePage();
        return;
    }

    // Default landing page is the main Pokédex app (index.html)
    if (!window.__APP_INIT_STARTED__) {
        initPokedexPage();
    }
});

// Keep index.html section routing + highlight in sync when a user lands on / changes the hash.
window.addEventListener('hashchange', () => {
    const isIndex = !!document.getElementById('grid') && !!document.getElementById('typeButtons');
    if (isIndex && typeof getInitialRouteFromHash === 'function' && typeof switchPage === 'function') {
        const route = getInitialRouteFromHash();
        if (route) {
            switchPage(route);
        } else {
            switchPage('pokedex');
        }
    }
    setSidebarActiveFromLocation();
});

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
        const pokemonRes = await fetch(`${API}/pokemon/${id}`);
        if (!pokemonRes.ok) throw new Error(`Pokemon not found: ${id}`);
        const pokemonData = await pokemonRes.json();

        // IMPORTANT: pokemon "id" and species "id" diverge for alternate forms.
        // Always resolve species from the pokemon payload.
        const speciesUrl = pokemonData?.species?.url;
        if (!speciesUrl) throw new Error('Species URL missing');

        const speciesRes = await fetch(speciesUrl);
        if (!speciesRes.ok) throw new Error('Species not found');
        const speciesData = await speciesRes.json();

        // Fill missing Gen 7–9 dex entries using GraphQL-Pokemon.
        // (PokeAPI is missing a lot of Gen 9 flavor texts.)
        try {
            const byGen = buildDexEntriesByGeneration(speciesData);
            const needsGql = !byGen[7] || !byGen[8] || !byGen[9];
            if (needsGql) {
                // GraphQL endpoint expects National Dex number, which matches species id.
                const dexNo = Number(speciesData?.id) || getSpeciesIdFromUrl(speciesUrl) || null;
                if (dexNo) {
                    const gqlByVersion = await fetchGraphqlDexFlavorTextsByDexNumber(dexNo);
                    if (gqlByVersion) speciesData.__gqlDexByVersion = gqlByVersion;
                }
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

function setupTypeDefenseAbilityTabs(root) {
    const scope = root || document;
    const blocks = scope.querySelectorAll?.('[data-type-defense-block]') || [];
    blocks.forEach(block => {
        if (block.__typeDefenseTabsInit) return;
        block.__typeDefenseTabsInit = true;

        const tabs = Array.from(block.querySelectorAll('[data-td-tab]'));
        const panels = Array.from(block.querySelectorAll('[data-td-panel]'));
        if (!tabs.length || !panels.length) return;

        function activate(key) {
            tabs.forEach(t => {
                const isActive = t.dataset.tdTab === key;
                t.classList.toggle('active', isActive);
                t.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });
            panels.forEach(p => {
                const isActive = p.dataset.tdPanel === key;
                p.classList.toggle('active', isActive);
                p.hidden = !isActive;
            });
        }

        tabs.forEach(t => {
            t.addEventListener('click', () => activate(t.dataset.tdTab));
        });

        // Ensure exactly one active.
        const initial = tabs.find(t => t.classList.contains('active'))?.dataset?.tdTab || tabs[0].dataset.tdTab;
        activate(initial);
    });
}

function renderPokemonDetail(p, species, evo, allForms = []) {
    const container = document.getElementById('detailContainer');

    const speciesBaseName = String(species?.name || p?.species?.name || '').toLowerCase();
    const mainDisplayName = (typeof formatPokemonDisplayName === 'function')
        ? formatPokemonDisplayName(p?.name, speciesBaseName)
        : formatName(p?.name);

    function getFormTabLabel(apiName, speciesBase, hasForms) {
        const raw = String(apiName || '').toLowerCase();
        const base = String(speciesBase || '').toLowerCase();
        if (!raw) return '';

        const isSuffixForm = base && raw.startsWith(base + '-');
        const suffix = isSuffixForm ? raw.slice(base.length + 1) : '';
        if (!suffix) return hasForms ? 'Normal Form' : formatName(base || raw);

        if (suffix === 'starter') return 'Partner';

        const REGIONAL_FORM = {
            alola: 'Alolan Form',
            galar: 'Galarian Form',
            hisui: 'Hisuian Form',
            paldea: 'Paldean Form'
        };
        if (REGIONAL_FORM[suffix]) return REGIONAL_FORM[suffix];

        if (suffix === 'gmax' || suffix === 'gigantamax') return 'Gigantamax';

        if (suffix.startsWith('mega')) {
            const rest = suffix.replace(/^mega-?/, '').trim();
            return rest ? `Mega ${formatName(rest)}` : 'Mega';
        }

        // Rockruff special casing: PokemonDB shows "Own Tempo" (not "Own Tempo Form").
        if (base === 'rockruff' && suffix === 'own-tempo') return 'Own Tempo';

        return `${formatName(suffix)} Form`;
    }

    const headerDisplayName = formatName(speciesBaseName || p?.name);

    const currentSlug = String(p?.name || '').toLowerCase();

    // Filter forms to show: exclude the current form and the plain species base name.
    const relevantForms = (() => {
        const baseName = speciesBaseName || currentSlug;
        const filtered = (Array.isArray(allForms) ? allForms : []).filter(form => {
            const name = String(form?.name || '').toLowerCase();

            // Never show the currently-viewed form as a second tab.
            if (name && currentSlug && name === currentSlug) return false;

            // Exclude the exact base species entry (no variants).
            if (name && baseName && name === baseName) return false;

            // Include actual variant forms
            return name.includes('mega') || name.includes('gmax') || name.includes('gigantamax') ||
                name.includes('alola') || name.includes('galar') || name.includes('hisui') ||
                name.includes('paldea') || name.includes('ash') || name.includes('battle-bond') ||
                name.includes('origin') || name.includes('primal') || name.includes('therian') ||
                name.includes('sky') || name.includes('black') || name.includes('white') ||
                (name.includes('-') && name !== baseName);
        });

        // Global safety: de-dupe by form name so we never render repeated tabs.
        const seen = new Set();
        const out = [];
        for (const f of filtered) {
            const k = String(f?.name || '').toLowerCase();
            if (!k || seen.has(k)) continue;
            seen.add(k);
            out.push(f);
        }
        return out;
    })();

    const hasForms = relevantForms.length > 0;
    const activeTabLabel = getFormTabLabel(p?.name, speciesBaseName, hasForms);
    
    // Build tabs HTML
    const formsTabsHtml = relevantForms.map((form, idx) => {
        const rawSuffix = speciesBaseName && form.name.toLowerCase().startsWith(speciesBaseName + '-')
            ? form.name.slice(speciesBaseName.length + 1)
            : form.name;
        // Let's Go partner forms are named "*-starter" in PokeAPI; display as "Partner".
        if (String(rawSuffix || '').toLowerCase() === 'starter') {
            return `<div class="tab" data-form-index="${idx + 1}">Partner</div>`;
        }

        const label = getFormTabLabel(form?.name, speciesBaseName, true) || ((typeof formatPokemonDisplayName === 'function')
            ? formatPokemonDisplayName(form?.name, speciesBaseName)
            : formatName(form?.name));
        return `<div class="tab" data-form-index="${idx + 1}">${label}</div>`;
    }).join('');
    
    function getAllowedDexVersionsForPokemon(pokemonData) {
        const out = new Set();

        // IMPORTANT: pokemon.game_indices is incomplete for many Pokémon (e.g. Tauros only lists up to Gen 5),
        // so we must NOT use it as an early-return "source of truth".
        // Our best availability signal is the move version groups present for the Pokémon/form.

        const vgToVersions = (typeof VERSION_GROUP_TO_VERSIONS === 'object' && VERSION_GROUP_TO_VERSIONS) ? VERSION_GROUP_TO_VERSIONS : null;

        const moves = pokemonData?.moves;
        if (vgToVersions && Array.isArray(moves) && moves.length) {
            for (const m of moves) {
                const details = m?.version_group_details;
                if (!Array.isArray(details)) continue;
                for (const d of details) {
                    const vg = d?.version_group?.name;
                    if (!vg) continue;
                    const versions = vgToVersions[vg];
                    if (!Array.isArray(versions)) continue;
                    for (const v of versions) out.add(String(v));
                }
            }
        }

        // Add whatever we can from game_indices as an additional (often incomplete) hint.
        const list = pokemonData?.game_indices;
        if (Array.isArray(list) && list.length) {
            for (const gi of list) {
                const v = gi?.version?.name;
                if (v) out.add(String(v));
            }
        }

        return out.size ? out : null;
    }

    function buildSpeciesDerived(speciesData, pokemonData) {
        const s = speciesData || {};

        const flavorTextEntry = (s.flavor_text_entries || []).find(f => f?.language?.name === 'en');
        const flavorText = flavorTextEntry ? String(flavorTextEntry.flavor_text || '').replace(/\f/g, ' ') : 'No description available.';

        const allowed = getAllowedDexVersionsForPokemon(pokemonData);
        const dexEntriesSectionHtml = renderDexEntriesSectionHtml(s, allowed || undefined, pokemonData?.name);

        const genus = (s.genera || []).find(g => g?.language?.name === 'en')?.genus || '';

        const catchRate = s.capture_rate;
        const growthRate = String(s.growth_rate?.name || '').replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        // Adjust Base Friendship: PokeAPI returns Gen 7 standard (70), but Gen 8+ standard is 50.
        let baseFriendship = s.base_happiness;
        if (baseFriendship === 70) baseFriendship = 50;

        let friendshipDesc = '(normal)';
        if (baseFriendship === 0) friendshipDesc = '(lower than normal)';
        else if (baseFriendship < 50) friendshipDesc = '(lower than normal)';
        else if (baseFriendship > 50) friendshipDesc = '(higher than normal)';

        const eggGroups = (s.egg_groups || []).map(g => {
            const apiName = g.name;
            const displayName = (apiName === 'no-eggs' ? 'undiscovered' : apiName)
                .replace(/-/g, ' ')
                .replace(/\b\w/g, l => l.toUpperCase());
            return `<a href="${PAGES_PREFIX}egg-group.html?group=${apiName}" style="color: #3bd5ff; text-decoration: none; cursor: pointer; border-bottom: 1px solid #3bd5ff;">${displayName}</a>`;
        }).join(', ');

        const genderRate = s.gender_rate;
        let genderText = '';
        if (genderRate === -1) {
            genderText = 'Genderless';
        } else {
            const femaleChance = (genderRate / 8) * 100;
            const maleChance = 100 - femaleChance;
            genderText = `<span style="color:#3bd5ff">${maleChance}% male</span>, <span style="color:#ff5959">${femaleChance}% female</span>`;
        }

        const eggCycles = s.hatch_counter;
        const steps = (eggCycles * 257).toLocaleString();

        const localDex = (s.pokedex_numbers || [])
            .filter(entry => entry?.pokedex?.name !== 'national')
            .map(entry => {
                const dexName = entry.pokedex.name
                    .replace(/-/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase());
                return `${String(entry.entry_number).padStart(4, '0')} <small style="color:#8b92a5">(${dexName})</small>`;
            });
        const localDexHtml = localDex.length > 0 ? localDex.join('<br>') : 'None';

        return {
            flavorText,
            dexEntriesSectionHtml,
            genus,
            localDexHtml,
            catchRate,
            growthRate,
            baseFriendship,
            friendshipDesc,
            eggGroups,
            genderText,
            eggCycles,
            steps
        };
    }

    // Species-derived values for the currently-viewed Pokémon (main tab)
    const mainSpeciesDerived = buildSpeciesDerived(species, p);

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
    const defenseHtml = renderTypeDefensesByAbility(p.types, p.abilities);

    // Data Helpers
    const genus = mainSpeciesDerived.genus;
    const heightM = p.height / 10;
    const weightKg = p.weight / 10;
    const abilities = p.abilities.map(a => 
        `${a.is_hidden ? '<small class="text-muted">' : ''}${a.slot}. <a href="${PAGES_PREFIX}ability-detail.html?ability=${a.ability.name}" style="color:#3bd5ff;text-decoration:none">${a.ability.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</a>${a.is_hidden ? ' (hidden ability)</small>' : ''}`
    ).join('<br>');
    
    // Training Data
    const catchRate = mainSpeciesDerived.catchRate;
    const baseExp = p.base_experience;
    const growthRate = mainSpeciesDerived.growthRate;
    
    // Adjust Base Friendship: PokeAPI returns Gen 7 standard (70), but Gen 8+ standard is 50.
    let baseFriendship = mainSpeciesDerived.baseFriendship;
    
    // Friendship description
    let friendshipDesc = mainSpeciesDerived.friendshipDesc;

    const evYield = p.stats.filter(s => s.effort > 0).map(s => `${s.effort} ${formatStatName(s.stat.name)}`).join(', ');

    // Breeding Data
    const eggGroups = mainSpeciesDerived.eggGroups;
    let genderText = mainSpeciesDerived.genderText;
    const eggCycles = mainSpeciesDerived.eggCycles;
    const steps = mainSpeciesDerived.steps; // Approx steps per cycle

    // Local Dex Numbers
    const localDexHtml = mainSpeciesDerived.localDexHtml;

    // Navigation Links
    const prevId = p.id > 1 ? p.id - 1 : 1025;
    const nextId = p.id < 1025 ? p.id + 1 : 1;
    
    // We need to fetch names for prev/next to display them
    // This is done asynchronously to not block rendering, but we need placeholders
    
    container.innerHTML = `
        <div class="detail-header-row">
            <div class="nav-link-container">
                ${p.id > 1 ? `<a href="${PAGES_PREFIX}pokemon-detail.html?id=${prevId}" class="nav-link prev-link" id="prevLink">
                    <span class="nav-arrow">◀</span> #${String(prevId).padStart(4, '0')} <span class="nav-name">Loading...</span>
                </a>` : '<div></div>'}
            </div>
            <h1 class="detail-h1">${headerDisplayName}</h1>
            <div class="nav-link-container" style="justify-content: flex-end;">
                ${p.id < 1025 ? `<a href="${PAGES_PREFIX}pokemon-detail.html?id=${nextId}" class="nav-link next-link" id="nextLink">
                    <span class="nav-name">Loading...</span> #${String(nextId).padStart(4, '0')} <span class="nav-arrow">▶</span>
                </a>` : '<div></div>'}
            </div>
        </div>

        <div class="tabs">
            <div class="tab active" data-form-index="0">${activeTabLabel}</div>
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
        const mainContent = renderFormContent(
            p,
            species,
            evo,
            genus,
            localDexHtml,
            catchRate,
            baseExp,
            growthRate,
            baseFriendship,
            friendshipDesc,
            evYield,
            eggGroups,
            genderText,
            eggCycles,
            steps,
            abilities,
            heightM,
            weightKg,
            mainSpeciesDerived.flavorText,
            mainSpeciesDerived.dexEntriesSectionHtml,
            statsHtml,
            defenseHtml,
            evoHtml,
            learnsetSectionHtmlMain
        );
        const mainRoot = document.getElementById('formContent0');
        mainRoot.innerHTML = mainContent;
        setupDexEntryTabs(mainRoot);
        setupTypeDefenseAbilityTabs(mainRoot);
        setupLearnsetSection(mainRoot);
        setupWhereToFindSection(mainRoot, p, species, evo);
        setupArtworkSwitchers(mainRoot);
        
        // Render alternate forms
        async function hydrateSpeciesForPokemon(pokemonData) {
            const url = pokemonData?.species?.url;
            if (!url) return null;
            const res = await fetch(url);
            if (!res.ok) return null;
            const speciesData = await res.json();

            // Ensure Gen 7-9 entries are filled for this species (same approach as loadPokemonDetails).
            try {
                const byGen = buildDexEntriesByGeneration(speciesData);
                const needsGql = !byGen[7] || !byGen[8] || !byGen[9];
                if (needsGql) {
                    const dexNo = Number(speciesData?.id) || getSpeciesIdFromUrl(url) || null;
                    if (dexNo) {
                        const gqlByVersion = await fetchGraphqlDexFlavorTextsByDexNumber(dexNo);
                        if (gqlByVersion) speciesData.__gqlDexByVersion = gqlByVersion;
                    }
                }
            } catch (e) {
                console.warn('GraphQL-Pokemon dex fallback failed (form species):', e);
            }

            return speciesData;
        }

        for (let idx = 0; idx < relevantForms.length; idx++) {
            const form = relevantForms[idx];
            const formSpecies = (await hydrateSpeciesForPokemon(form)) || species;
            const formDerived = buildSpeciesDerived(formSpecies, form);

            const formAbilities = form.abilities.map(a => 
                `${a.is_hidden ? '<small class="text-muted">' : ''}${a.slot}. <a href="${PAGES_PREFIX}ability-detail.html?ability=${a.ability.name}" style="color:#3bd5ff;text-decoration:none">${a.ability.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</a>${a.is_hidden ? ' (hidden ability)</small>' : ''}`
            ).join('<br>');
            const formEvYield = form.stats.filter(s => s.effort > 0).map(s => `${s.effort} ${formatStatName(s.stat.name)}`).join(', ') || 'None';
            const formStatsHtml = renderStatsForForm(form);
            const formDefenseHtml = renderTypeDefensesByAbility(form.types, form.abilities);
            const formHeightM = form.height / 10;
            const formWeightKg = form.weight / 10;

            const learnsetKey = `learnset-${form.id}`;
            learnsetStore[learnsetKey] = buildLearnsetData(form);
            const learnsetSectionHtml = renderLearnsetSectionHtml(form, learnsetKey);

            const formContent = renderFormContent(
                form,
                formSpecies,
                evo,
                formDerived.genus || genus,
                formDerived.localDexHtml,
                formDerived.catchRate,
                form.base_experience || baseExp,
                formDerived.growthRate || growthRate,
                formDerived.baseFriendship,
                formDerived.friendshipDesc,
                formEvYield,
                formDerived.eggGroups,
                formDerived.genderText,
                formDerived.eggCycles,
                formDerived.steps,
                formAbilities,
                formHeightM,
                formWeightKg,
                formDerived.flavorText,
                formDerived.dexEntriesSectionHtml,
                formStatsHtml,
                formDefenseHtml,
                evoHtml,
                learnsetSectionHtml
            );
            const formRoot = document.getElementById(`formContent${idx + 1}`);
            formRoot.innerHTML = formContent;
            setupDexEntryTabs(formRoot);
            setupTypeDefenseAbilityTabs(formRoot);
            setupLearnsetSection(formRoot);
            setupWhereToFindSection(formRoot, form, formSpecies, evo);
            setupArtworkSwitchers(formRoot);
        }
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
            if (el) {
                el.textContent = formatName(data?.species?.name || data?.name);
            }
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
    const formSlug = String(p?.name || '').toLowerCase();
    const isLetsGoStarter = /^(pikachu|eevee)-starter$/.test(formSlug);

    const abilitiesCell = isLetsGoStarter ? '-' : abilities;
    const eggGroupsCell = isLetsGoStarter ? '-' : eggGroups;

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
    
    const artCandidates = [
        { label: 'Official artwork', url: p.sprites.other?.['official-artwork']?.front_default },
        { label: 'Home', url: p.sprites.other?.home?.front_default },
        { label: 'Dream World', url: p.sprites.other?.['dream-world']?.front_default },
        { label: 'Sprite', url: p.sprites.front_default },
        { label: 'Sprite (back)', url: p.sprites.back_default },
        { label: 'PokéDB artwork', url: `https://img.pokemondb.net/artwork/${String(p.name || '').toLowerCase()}.jpg` }
    ].filter(x => x && x.url);

    const uniqueArts = [];
    const seen = new Set();
    for (const a of artCandidates) {
        const u = String(a.url);
        if (!u || seen.has(u)) continue;
        seen.add(u);
        uniqueArts.push({ label: a.label, url: u });
    }

    const artData = encodeURIComponent(JSON.stringify(uniqueArts));
    
    return `
        <div class="detail-grid">
            <div class="detail-left">
                <div class="main-image-container" data-artwork-switcher data-art-sources="${artData}">
                    <img src="${imageUrl}" alt="${formatName(p.name)}" class="main-image" data-artwork-img>
                </div>
                <div class="artwork-nav" data-artwork-nav>
                    <button type="button" class="nav-link" data-action="artwork-prev" aria-label="Previous artwork">
                        <span class="nav-arrow">◀</span>
                    </button>
                    <div class="artwork-label" data-artwork-label>Artwork</div>
                    <button type="button" class="nav-link" data-action="artwork-next" aria-label="Next artwork">
                        <span class="nav-arrow">▶</span>
                    </button>
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
                                ${p.types.map(t => `<div class="type-badge" style="background: ${TYPE_COLORS[t.type.name]}">${formatName(t.type.name)}</div>`).join('')}
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
                        <td>${abilitiesCell}</td>
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
                        <td>${eggGroupsCell}</td>
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
                ${defenseHtml}
            </div>
        </div>

        <div class="full-width-section">
            <h3 class="section-header">Evolution chart</h3>
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

function applyAbilityToTypeDefenses(baseMultipliers, abilityName, defenderTypes) {
    const multipliers = Array.isArray(baseMultipliers) ? baseMultipliers.slice() : new Array(18).fill(1);
    const a = String(abilityName || '').toLowerCase();
    if (!a) return multipliers;

    const hasDefenderType = (typeName) => {
        const types = defenderTypes || [];
        return types.some(t => (t?.type?.name || t) === typeName);
    };

    const idx = (type) => TYPE_ORDER.indexOf(type);
    const setImmune = (type) => {
        const i = idx(type);
        if (i >= 0) multipliers[i] = 0;
    };
    const scale = (type, factor) => {
        const i = idx(type);
        if (i >= 0) multipliers[i] *= factor;
    };
    const removeWeakness = (type) => {
        const i = idx(type);
        if (i >= 0 && multipliers[i] > 1) multipliers[i] = 1;
    };

    // Pure type-based modifiers / immunities (PokémonDB-style).
    if (a === 'thick-fat') { scale('fire', 0.5); scale('ice', 0.5); }
    if (a === 'heatproof') { scale('fire', 0.5); }
    if (a === 'water-bubble') { scale('fire', 0.5); }
    if (a === 'fluffy') { scale('fire', 2); }
    if (a === 'dry-skin') { setImmune('water'); scale('fire', 1.25); }
    if (a === 'purifying-salt') { scale('ghost', 0.5); }

    // Weather-abilities that effectively nullify a type.
    if (a === 'primordial-sea') setImmune('fire');
    if (a === 'desolate-land') setImmune('water');

    // Common immunities.
    if (a === 'flash-fire' || a === 'well-baked-body') setImmune('fire');
    if (a === 'levitate') setImmune('ground');
    if (a === 'earth-eater') setImmune('ground');
    if (a === 'lightning-rod' || a === 'motor-drive' || a === 'volt-absorb') setImmune('electric');
    if (a === 'water-absorb' || a === 'storm-drain') setImmune('water');
    if (a === 'sap-sipper') setImmune('grass');

    // Delta Stream removes Flying weaknesses (Electric/Ice/Rock) while active.
    if (a === 'delta-stream' && hasDefenderType('flying')) {
        removeWeakness('electric');
        removeWeakness('ice');
        removeWeakness('rock');
    }

    // Reduce super-effective damage.
    if (a === 'filter' || a === 'solid-rock' || a === 'prism-armor') {
        for (let i = 0; i < multipliers.length; i++) {
            if (multipliers[i] > 1) multipliers[i] *= 0.75;
        }
    }

    // Wonder Guard: only super-effective moves deal damage.
    if (a === 'wonder-guard') {
        for (let i = 0; i < multipliers.length; i++) {
            if (multipliers[i] <= 1) multipliers[i] = 0;
        }
    }

    return multipliers;
}

function renderTypeDefensesByAbility(types, abilitiesList) {
    const base = calculateTypeDefenses(types);
    const abilities = (abilitiesList || [])
        .map(a => a?.ability?.name)
        .filter(Boolean);
    const unique = Array.from(new Set(abilities));

    // If we don't have ability data, fall back to base defenses.
    if (!unique.length) return renderTypeDefenses(base);

    if (unique.length === 1) {
        const m = applyAbilityToTypeDefenses(base, unique[0], types);
        return renderTypeDefenses(m);
    }

    const tabsHtml = unique.map((a, idx) => {
        const label = `${formatName(a)}`;
        const active = idx === 0 ? ' active' : '';
        return `<button type="button" class="td-ability-tab${active}" data-td-tab="${a}" role="tab" aria-selected="${idx === 0 ? 'true' : 'false'}">${label}</button>`;
    }).join('');

    const panelsHtml = unique.map((a, idx) => {
        const m = applyAbilityToTypeDefenses(base, a, types);
        const active = idx === 0 ? ' active' : '';
        const hidden = idx === 0 ? '' : ' hidden';
        return `<div class="td-ability-panel${active}" data-td-panel="${a}" role="tabpanel"${hidden}>${renderTypeDefenses(m)}</div>`;
    }).join('');

    return `
        <div class="td-ability-block" data-type-defense-block>
            <div class="td-ability-tabs" role="tablist">${tabsHtml}</div>
            ${panelsHtml}
        </div>
    `;
}

function renderTypeDefenses(multipliers) {
    const boxesHtml = multipliers.map((mult, i) => {
        const typeName = TYPE_ORDER[i];
        let className = '';
        let text = '';

        const m = Number(mult);
        const eps = 1e-9;
        const is = (x) => Math.abs(m - x) < eps;

        if (is(0)) {
            className = 'eff-0';
            text = '0';
        } else if (is(1)) {
            className = 'eff-1';
            text = '';
        } else {
            // Bucket colors using existing classes, but show exact multiplier text.
            if (m >= 4 - eps) className = 'eff-4';
            else if (m > 1 + eps) className = 'eff-2';
            else if (m <= 0.25 + eps) className = 'eff-0-25';
            else className = 'eff-0-5';

            const rounded = Math.round(m * 100) / 100;
            text = String(rounded).replace(/\.0+$/, '').replace(/(\.[0-9]*?)0+$/, '$1');
        }
        
        return `
            <div class="td-box">
                <div class="td-type-label" style="background: ${TYPE_COLORS[typeName]}">${typeName.slice(0,3)}</div>
                <div class="td-multiplier ${className}">${text}</div>
            </div>
        `;
    }).join('');

    return `<div class="type-defense-container">${boxesHtml}</div>`;
}

function renderEvolutionChain(chain) {
    if (!chain) return '<div style="color: #8b92a5;">No evolution data available</div>';

    const REGIONAL_TAGS = {
        alola: 'Alolan',
        galar: 'Galarian',
        hisui: 'Hisuian',
        paldea: 'Paldean'
    };

    const REGIONAL_PLACES = {
        alola: 'Alola',
        galar: 'Galar',
        hisui: 'Hisui',
        paldea: 'Paldea'
    };

    function getPlaceFromVersionGroup(vg) {
        const s = String(vg || '').toLowerCase();
        if (s === 'sun-moon' || s === 'ultra-sun-ultra-moon') return 'Alola';
        if (s === 'sword-shield') return 'Galar';
        if (s === 'legends-arceus') return 'Hisui';
        if (s === 'scarlet-violet') return 'Paldea';
        return '';
    }

    async function getPokemonFormByIdentifier(identifier) {
        if (identifier == null) return null;
        const key = String(identifier);
        if (pokemonFormCache && pokemonFormCache[key]) return pokemonFormCache[key];
        try {
            const res = await fetch(`${API}/pokemon-form/${encodeURIComponent(key)}`);
            if (!res.ok) return null;
            const data = await res.json();
            if (pokemonFormCache) pokemonFormCache[key] = data;
            return data;
        } catch {
            return null;
        }
    }

    async function getRegionPlaceForForm(identifier, tagFallback) {
        const form = await getPokemonFormByIdentifier(identifier);
        const vg = form?.version_group?.name;
        const place = getPlaceFromVersionGroup(vg);
        return place || (REGIONAL_PLACES[tagFallback] || '');
    }

    function appendRegionToMethod(method, place) {
        const p = String(place || '');
        if (!p) return String(method || '');

        const m = String(method || '');
        if (!m) return `(in ${p})`;

        const inner = m.replace(/^\(/, '').replace(/\)$/, '');
        if (new RegExp(`\\bin\\s+${p}\\b`, 'i').test(inner)) return m;
        return `(${inner}, in ${p})`;
    }

    // Regional forms that evolve into a different species than the default chain.
    // (PokeAPI evolution chains are species-based and omit several form-specific evolutions.)
    const REGIONAL_EVOLUTION_OVERRIDES = {
        'yamask:galar': { nextPokemon: 'runerigus', method: '(Take 49+ damage)' },
        'wooper:paldea': { nextPokemon: 'clodsire', method: '(Level 20)' },
        'meowth:galar': { nextPokemon: 'perrserker', method: '(Level 28)' },
        'farfetchd:galar': { nextPokemon: 'sirfetchd', method: '(3 critical hits)' },
        'mr-mime:galar': { nextPokemon: 'mr-rime', method: '(Level 42)' },
        'corsola:galar': { nextPokemon: 'cursola', method: '(Level 38)' },
        'linoone:galar': { nextPokemon: 'obstagoon', method: '(Level 35)' },
        'qwilfish:hisui': { nextPokemon: 'overqwil', method: '(Strong Style 20x)' },
        'sneasel:hisui': { nextPokemon: 'sneasler', method: '(Use Razor Claw)' }
    };

    // Form-specific methods where PokeAPI evolution_details mix multiple methods into one list
    // (e.g. Vulpix shows Fire Stone + Ice Stone because the chain is species-based).
    // Key: `${baseSlug}:${tagOrBase}:${nextSlug}` where tagOrBase is 'base' or a regional tag.
    const FORM_METHOD_OVERRIDES = {
        // Vulpix / Ninetales
        'vulpix:base:ninetales': '(Use Fire Stone)',
        'vulpix:alola:ninetales': '(Use Ice Stone)',

        // Sandshrew / Sandslash
        'sandshrew:base:sandslash': '(Level 22)',
        'sandshrew:alola:sandslash': '(Use Ice Stone)',
    };

    function detectRegionalTag(pokemonName) {
        const s = String(pokemonName || '').toLowerCase();

        // Pikachu "cap" forms (e.g. pikachu-alola-cap) are special costumes, not regional forms.
        // Don't treat them as regional tags or they incorrectly affect evolution rendering.
        if (/^pikachu-.*-cap$/.test(s)) return null;

        if (/(^|-)alola($|-)/.test(s)) return 'alola';
        if (/(^|-)galar($|-)/.test(s)) return 'galar';
        if (/(^|-)hisui($|-)/.test(s)) return 'hisui';
        if (/(^|-)paldea($|-)/.test(s)) return 'paldea';
        return null;
    }

    function formatEvolutionName(pokemonName) {
        const raw = String(pokemonName || '');
        const lower = raw.toLowerCase();
        const tag = detectRegionalTag(lower);

        if (!tag) return formatName(raw);

        // Remove a single "-tag" occurrence then format base name.
        const base = lower.replace(new RegExp(`(^|-)${tag}($|-)`), '$1').replace(/--+/g, '-').replace(/^-|-$/g, '');
        const adjective = REGIONAL_TAGS[tag] || '';
        const baseDisplay = formatName(base);
        return adjective ? `${adjective} ${baseDisplay}` : baseDisplay;
    }

    // Helper function to get evolution trigger text
    function getEvolutionDetails(evolutionDetails) {
        if (!evolutionDetails || evolutionDetails.length === 0) return '';

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
                if (detail.min_level) {
                    methodText = `Level ${detail.min_level}`;
                    if (detail.time_of_day) methodText += ` at ${detail.time_of_day}`;
                } else if (detail.min_happiness) {
                    methodText = `High Friendship`;
                    if (detail.time_of_day) methodText += ` at ${detail.time_of_day}`;
                } else if (detail.min_affection) {
                    methodText = `High Affection`;
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
                    methodText = `Level up at ${detail.time_of_day}`;
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

        return methods.length > 0 ? `(${methods.join(' or ')})` : '';
    }

    // Eevee special radial layout (PokemonDB-style)
    const rootSpeciesId = chain?.species?.url?.split('/')?.filter(Boolean)?.pop();
    const isEeveeChain = rootSpeciesId === '133';
    if (isEeveeChain) {
        return new Promise(async (resolve) => {
            const eeveeId = rootSpeciesId;

            const eeveeData = await getPokemonByIdentifier(eeveeId);
            const evolutions = chain.evolves_to || [];

            function renderRadialCard(pokemonData) {
                if (!pokemonData) return '';
                const id = pokemonData.id;
                const speciesId = getSpeciesIdFromUrl(pokemonData?.species?.url) || id;
                const name = (typeof formatPokemonDisplayName === 'function')
                    ? formatPokemonDisplayName(pokemonData?.name, pokemonData?.species?.name)
                    : formatEvolutionName(pokemonData.name);
                const typesHtml = (pokemonData.types || []).map(t => {
                    const typeName = t.type.name;
                    return `<span class="evo-type-badge" style="background: ${TYPE_COLORS[typeName]}">${formatName(typeName)}</span>`;
                }).join(' · ');

                return `
                    <div class="evo-pokemon-card">
                        <div class="evo-card" data-action="open-pokemon" data-pokemon-id="${pokemonData.name}" style="cursor: pointer;">
                            <div class="evo-card-image">
                                <img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png" alt="${name}" class="evo-card-img" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${speciesId}.png'">
                            </div>
                            <div class="evo-card-number">#${String(speciesId).padStart(4, '0')}</div>
                            <div class="evo-card-name">${name}</div>
                            <div class="evo-card-types">${typesHtml}</div>
                        </div>
                    </div>
                `;
            }

            const eeveeHtml = renderRadialCard(eeveeData);
            const evolutionCards = [];
            for (const evolution of evolutions) {
                const method = getEvolutionDetails(evolution.evolution_details);
                const evoSpeciesId = evolution?.species?.url?.split('/')?.filter(Boolean)?.pop();
                const evoData = await getPokemonByIdentifier(evoSpeciesId);
                evolutionCards.push({ html: renderRadialCard(evoData), method });
            }

            const n = Math.max(evolutionCards.length, 1);
            const radiusPct = 39;
            const arrowEndPct = 28;
            const arrowStartPct = 16;
            const labelPerpPct = 3;

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

                const x1 = startLeft * 10;
                const y1 = startTop * 10;
                const x2 = endLeft * 10;
                const y2 = endTop * 10;

                svgLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="evo-eevee-arrow-line" marker-end="url(#evoArrow)" />`;
                cardsHtml += `<div class="evo-eevee-item" style="--left:${cardLeft}%;--top:${cardTop}%;">${evolutionCards[i].html}</div>`;

                if (evolutionCards[i].method) {
                    const midLeft = (startLeft + endLeft) / 2;
                    const midTop = (startTop + endTop) / 2;
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

    function collectPaths(node, stages, steps, outPaths) {
        const evolves = node.evolves_to || [];
        if (evolves.length === 0) {
            outPaths.push({ stages, steps });
            return;
        }

        for (const child of evolves) {
            const method = getEvolutionDetails(child.evolution_details);
            collectPaths(child, [...stages, child], [...steps, method], outPaths);
        }
    }

    async function getPokemonForNode(node) {
        const speciesId = node.species.url.split('/').filter(Boolean).pop();
        if (!speciesId) return null;

        let pokemonData = pokemonDetailsCache[speciesId];
        if (!pokemonData) {
            try {
                const response = await fetch(`${API}/pokemon/${speciesId}`);
                pokemonData = await response.json();
                pokemonDetailsCache[speciesId] = pokemonData;
            } catch (e) {
                console.error(`Error fetching pokemon ${speciesId}:`, e);
                return null;
            }
        }

        return pokemonData;
    }

    async function getPokemonByIdentifier(identifier) {
        if (identifier == null) return null;
        const key = String(identifier);
        const cached = pokemonDetailsCache[key];
        if (cached) return cached;
        try {
            const response = await fetch(`${API}/pokemon/${encodeURIComponent(key)}`);
            const data = await response.json();
            pokemonDetailsCache[key] = data;
            return data;
        } catch (e) {
            console.error(`Error fetching pokemon ${key}:`, e);
            return null;
        }
    }

    async function getRegionalVarietiesForStage(node) {
        const speciesId = node?.species?.url?.split('/')?.filter(Boolean)?.pop();
        if (!speciesId) return {};

        if (pokemonSpeciesCache[speciesId]) return pokemonSpeciesCache[speciesId];

        try {
            const res = await fetch(node.species.url);
            const speciesData = await res.json();
            const out = {};
            for (const v of (speciesData.varieties || [])) {
                const name = v?.pokemon?.name;
                if (!name) continue;
                const tag = detectRegionalTag(name);
                if (!tag) continue;
                out[tag] = name;
            }
            pokemonSpeciesCache[speciesId] = out;
            return out;
        } catch (e) {
            console.error(`Error fetching species for ${speciesId}:`, e);
            pokemonSpeciesCache[speciesId] = {};
            return {};
        }
    }

    const CAP_FORM_RE = /^pikachu-.*-cap$/i;
    const pikachuCapsBySpeciesUrl = new Map();

    async function getPikachuCapFormsForSpeciesUrl(speciesUrl) {
        const url = String(speciesUrl || '');
        if (!url) return [];
        if (pikachuCapsBySpeciesUrl.has(url)) return pikachuCapsBySpeciesUrl.get(url);

        try {
            const res = await fetch(url);
            if (!res.ok) {
                pikachuCapsBySpeciesUrl.set(url, []);
                return [];
            }
            const speciesData = await res.json();
            const caps = (speciesData.varieties || [])
                .map(v => v?.pokemon?.name)
                .filter(Boolean)
                .filter(n => CAP_FORM_RE.test(String(n)));
            // Stable ordering (PokemonDB-like: alphabetical is fine here)
            caps.sort((a, b) => String(a).localeCompare(String(b)));
            pikachuCapsBySpeciesUrl.set(url, caps);
            return caps;
        } catch {
            pikachuCapsBySpeciesUrl.set(url, []);
            return [];
        }
    }

    function renderStage(pokemonData) {
        if (!pokemonData) {
            return `<div class="evo-stage evo-stage-missing"><div class="evo-name">Unknown</div></div>`;
        }

        const id = pokemonData.id;
        const speciesId = getSpeciesIdFromUrl(pokemonData?.species?.url) || id;

        const speciesSlug = String(pokemonData?.species?.name || '').toLowerCase();
        const apiSlug = String(pokemonData?.name || '').toLowerCase();
        const baseName = formatName(speciesSlug || apiSlug);
        let formLabel = '';
        if (speciesSlug && apiSlug.startsWith(speciesSlug + '-')) {
            const suffix = apiSlug.slice(speciesSlug.length + 1);

            const REGIONAL_FORM = {
                alola: 'Alolan Form',
                galar: 'Galarian Form',
                hisui: 'Hisuian Form',
                paldea: 'Paldean Form'
            };

            if (speciesSlug === 'rockruff' && suffix === 'own-tempo') {
                formLabel = 'Own Tempo';
            } else if (suffix === 'starter') {
                formLabel = 'Partner';
            } else if (REGIONAL_FORM[suffix]) {
                formLabel = REGIONAL_FORM[suffix];
            } else if (suffix === 'gmax' || suffix === 'gigantamax') {
                formLabel = 'Gigantamax';
            } else if (suffix.startsWith('mega')) {
                const rest = suffix.replace(/^mega-?/, '').trim();
                formLabel = rest ? `Mega ${formatName(rest)}` : 'Mega';
            } else {
                formLabel = `${formatName(suffix)} Form`;
            }
        }

        const altText = formLabel ? `${baseName} - ${formLabel}` : baseName;
        const typesHtml = (pokemonData.types || []).map(t => {
            const typeName = t.type.name;
            return `<span class="evo-type-badge" style="background: ${TYPE_COLORS[typeName]}">${formatName(typeName)}</span>`;
        }).join('');

        return `
            <div class="evo-stage" data-action="open-pokemon" data-pokemon-id="${pokemonData.name}">
                <div class="evo-card-image">
                    <img class="evo-card-img" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png" alt="${altText}" onerror="this.src='https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${speciesId}.png'">
                </div>
                <div class="evo-no">#${String(speciesId).padStart(4, '0')}</div>
                <div class="evo-name">${baseName}</div>
                ${formLabel ? `<div class="evo-form">${formLabel}</div>` : ''}
                <div class="evo-types">${typesHtml}</div>
            </div>
        `;
    }

    function renderStep(method) {
        return `
            <div class="evo-step">
                <div class="evo-arrow">→</div>
                ${method ? `<div class="evo-condition">${method}</div>` : ''}
            </div>
        `;
    }

    return new Promise(async (resolve) => {
        const paths = [];
        collectPaths(chain, [chain], [], paths);

        if (paths.length === 0) {
            resolve('<div style="color: #8b92a5;">No evolution data available</div>');
            return;
        }

        const rowDefs = [];
        const rowDefBySignature = new Map();

        // Build a lookup of base-species -> set(next-species) that are form-only evolutions.
        // This lets us suppress incorrect "base" rows like Wooper -> Clodsire or Meowth -> Perrserker.
        const formOnlyNextByBase = new Map();
        for (const [key, v] of Object.entries(REGIONAL_EVOLUTION_OVERRIDES)) {
            const baseSlug = String(key || '').split(':')[0];
            const nextSlug = v?.nextPokemon;
            if (!baseSlug || !nextSlug) continue;
            if (!formOnlyNextByBase.has(baseSlug)) formOnlyNextByBase.set(baseSlug, new Set());
            formOnlyNextByBase.get(baseSlug).add(String(nextSlug));
        }

        function isRegionalIdentifier(identifier) {
            return !!detectRegionalTag(String(identifier || '').toLowerCase());
        }

        function mergeMethodText(a, b) {
            const left = String(a || '');
            const right = String(b || '');
            if (!left) return right;
            if (!right) return left;
            if (left === right) return left;
            // Merge option lists inside parentheses when possible.
            const strip = (s) => String(s || '').replace(/^\(/, '').replace(/\)$/, '');
            const opts = new Set();
            for (const part of strip(left).split(/\s+or\s+/)) {
                const t = part.trim();
                if (t) opts.add(t);
            }
            for (const part of strip(right).split(/\s+or\s+/)) {
                const t = part.trim();
                if (t) opts.add(t);
            }
            const merged = Array.from(opts);
            return merged.length ? `(${merged.join(' or ')})` : left;
        }

        function selectMethodForTag(method, tag) {
            const m = String(method || '');
            if (!m) return m;
            if (!/\sor\s/i.test(m)) return m;

            const inner = m.replace(/^\(/, '').replace(/\)$/, '');
            const parts = inner.split(/\s+or\s+/).map(s => s.trim()).filter(Boolean);
            if (parts.length < 2) return m;

            const hasFriendship = parts.some(p => /friendship|affection/i.test(p));
            const hasLevel = parts.some(p => /^level\b|^level\s+up\b/i.test(p));
            if (hasFriendship && hasLevel) {
                // Prefer the concrete Level-based method over Friendship when both are listed.
                const pick = parts.find(p => /^level\b|^level\s+up\b/i.test(p));
                return pick ? `(${pick})` : m;
            }

            // Time-of-day duplicates: prefer the simpler unqualified method for base rows,
            // and prefer the time-qualified one for regional rows (e.g., Alolan Rattata/Cubone 'at night').
            const timeQualified = parts.filter(p => /\b(at\s+night|at\s+day|night|day)\b/i.test(p));
            const timeUnqualified = parts.filter(p => !/\b(at\s+night|at\s+day|night|day)\b/i.test(p));
            if (timeQualified.length && timeUnqualified.length) {
                if (tag) {
                    const night = timeQualified.find(p => /night/i.test(p));
                    const pick = night || timeQualified[0];
                    return pick ? `(${pick})` : m;
                }
                const pick = timeUnqualified[0];
                return pick ? `(${pick})` : m;
            }

            return m;
        }

        async function pushRowFromIdentifiers(identifiers, methods, tag) {
            const sigTag = tag ? String(tag) : '';
            const signature = `${sigTag}||${identifiers.join('>')}`;
            let normalizedMethods = (methods || []).map(m => selectMethodForTag(m, tag));

            // Region-only form evolutions: if the destination becomes a regional form but the source is not,
            // append "in <Region>" using pokemon-form.version_group.
            // Heuristic: only do this for item-based evolutions ("Use <Item>") to avoid inventing
            // region requirements for plain level-up evolutions (PokeAPI usually doesn't encode them).
            if (sigTag) {
                for (let i = 0; i < identifiers.length - 1; i++) {
                    const src = identifiers[i];
                    const dst = identifiers[i + 1];
                    const dstTag = detectRegionalTag(dst);
                    if (!dstTag || dstTag !== sigTag) continue;
                    const srcTag = detectRegionalTag(src);
                    if (srcTag === sigTag) continue;

                    const methodHere = String(normalizedMethods[i] || '');
                    const inner = methodHere.replace(/^\(/, '').replace(/\)$/, '');
                    if (!/\buse\b\s+/i.test(inner)) continue;

                    const place = await getRegionPlaceForForm(dst, sigTag);
                    normalizedMethods[i] = appendRegionToMethod(normalizedMethods[i], place);
                }
            }

            const existing = rowDefBySignature.get(signature);
            if (existing) {
                const mergedMethods = [];
                const n = Math.max(existing.methods.length, normalizedMethods.length);
                for (let i = 0; i < n; i++) {
                    mergedMethods[i] = mergeMethodText(existing.methods[i], normalizedMethods[i]);
                }
                existing.methods = mergedMethods;
                return;
            }

            const row = { identifiers, methods: normalizedMethods, tag: sigTag, signature };
            rowDefBySignature.set(signature, row);
            rowDefs.push(row);
        }

        // Render each base path + derived regional-variant rows.
        const seenExtraRows = new Set();
        for (const path of paths) {
            const stageNodes = path.stages;
            const baseMethods = path.steps;

            // Base identifiers use species IDs (default forms).
            const baseIdentifiers = stageNodes.map(n => n.species.url.split('/').filter(Boolean).pop());

            // Form-specific evolution overrides (species-based chains often omit form identifiers).
            // Lycanroc: pick the correct form based on time-of-day.
            for (let i = 1; i < stageNodes.length; i++) {
                const dstSlug = String(stageNodes[i]?.species?.name || '').toLowerCase();
                if (dstSlug !== 'lycanroc') continue;

                const method = String(baseMethods[i - 1] || '').toLowerCase();
                const tod = [];
                if (method.includes(' at day')) tod.push('day');
                if (method.includes(' at night')) tod.push('night');
                if (method.includes(' at dusk')) tod.push('dusk');
                if (tod.length !== 1) continue;

                const pick = tod[0] === 'day' ? 'lycanroc-midday'
                    : (tod[0] === 'night' ? 'lycanroc-midnight' : 'lycanroc-dusk');
                baseIdentifiers[i] = pick;
            }

            // If the chain includes a known form-only evolution as an extra stage (e.g. Linoone -> Obstagoon),
            // truncate the base row before that stage so the "default" row stays correct.
            let truncateBaseAtEdgeIndex = null;
            for (let i = 0; i < stageNodes.length - 1; i++) {
                const baseSlug = stageNodes[i]?.species?.name;
                const nextSlug = stageNodes[i + 1]?.species?.name;
                if (!baseSlug || !nextSlug) continue;
                const s = formOnlyNextByBase.get(baseSlug);
                if (s && s.has(nextSlug)) {
                    truncateBaseAtEdgeIndex = i;
                    break;
                }
            }

            // Apply form-method overrides for the base row.
            const baseMethodsAdjusted = baseMethods.slice();
            for (let i = 0; i < stageNodes.length - 1; i++) {
                const baseSlug = stageNodes[i]?.species?.name;
                const nextSlug = stageNodes[i + 1]?.species?.name;
                if (!baseSlug || !nextSlug) continue;
                const k = `${baseSlug}:base:${nextSlug}`;
                if (FORM_METHOD_OVERRIDES[k]) baseMethodsAdjusted[i] = FORM_METHOD_OVERRIDES[k];
            }

            // Pikachu cap forms: they do NOT evolve, and nothing evolves into them.
            // Still show them in the chart as standalone entries (no arrows), PokemonDB-style.
            {
                const pikachuStageIndex = stageNodes.findIndex(n => String(n?.species?.name || '').toLowerCase() === 'pikachu');
                if (pikachuStageIndex >= 0) {
                    const pikachuNode = stageNodes[pikachuStageIndex];
                    const caps = await getPikachuCapFormsForSpeciesUrl(pikachuNode?.species?.url);
                    for (const capName of caps) {
                        const sig = `cap||${String(capName)}`;
                        if (seenExtraRows.has(sig)) continue;
                        seenExtraRows.add(sig);
                        await pushRowFromIdentifiers([String(capName)], [], null);
                    }
                }
            }

            if (truncateBaseAtEdgeIndex === null) {
                await pushRowFromIdentifiers(baseIdentifiers, baseMethodsAdjusted, null);
            } else if (truncateBaseAtEdgeIndex >= 1) {
                const truncatedIdentifiers = baseIdentifiers.slice(0, truncateBaseAtEdgeIndex + 1);
                const truncatedMethods = baseMethodsAdjusted.slice(0, truncateBaseAtEdgeIndex);
                await pushRowFromIdentifiers(truncatedIdentifiers, truncatedMethods, null);
            }

            // Collect regional varieties available at each stage.
            const variantsByStage = [];
            const unionTags = new Set();
            for (const node of stageNodes) {
                const map = await getRegionalVarietiesForStage(node);
                variantsByStage.push(map);
                for (const k of Object.keys(map || {})) unionTags.add(k);
            }

            // For each region tag, build a row that swaps in the regional form when available.
            for (const tag of Array.from(unionTags)) {
                // Find earliest stage that actually has this regional form.
                let firstIndex = -1;
                for (let i = 0; i < variantsByStage.length; i++) {
                    if (variantsByStage[i] && variantsByStage[i][tag]) { firstIndex = i; break; }
                }
                if (firstIndex === -1) continue;

                const identifiers = baseIdentifiers.slice();
                for (let i = firstIndex; i < identifiers.length; i++) {
                    if (variantsByStage[i] && variantsByStage[i][tag]) {
                        identifiers[i] = variantsByStage[i][tag];
                    }
                }

                // Apply any known form-specific evolution override (e.g. Galarian Yamask -> Runerigus).
                // If applied, truncate the row at the overridden evolution.
                let methods = baseMethods.slice();
                for (let i = firstIndex; i < stageNodes.length; i++) {
                    const baseSlug = stageNodes[i]?.species?.name;
                    if (!baseSlug) continue;

                    const key = `${baseSlug}:${tag}`;
                    const override = REGIONAL_EVOLUTION_OVERRIDES[key];
                    if (!override) continue;

                    const nextBaseSlug = stageNodes[i + 1]?.species?.name || null;

                    // Always apply the method override for this edge when present.
                    if (override.method) {
                        methods[i] = override.method;
                    }

                    if (nextBaseSlug !== override.nextPokemon) {
                        identifiers.splice(i + 1);
                        identifiers.push(override.nextPokemon);
                        methods.splice(i + 1);
                        break;
                    }
                }

                // Apply form-method overrides for this regional row (covers cases like Alolan Vulpix).
                for (let i = 0; i < stageNodes.length - 1; i++) {
                    const baseSlug = stageNodes[i]?.species?.name;
                    const nextSlug = stageNodes[i + 1]?.species?.name;
                    if (!baseSlug || !nextSlug) continue;
                    const k = `${baseSlug}:${tag}:${nextSlug}`;
                    if (FORM_METHOD_OVERRIDES[k]) methods[i] = FORM_METHOD_OVERRIDES[k];
                }

                await pushRowFromIdentifiers(identifiers, methods, tag);
            }
        }

        // Merge rows that only differ in the final stage into a single split-arrow row.
        // Example: Quilava -> Typhlosion vs Quilava -> Hisuian Typhlosion
        const used = new Set();
        const merged = [];
        const groups = new Map();

        for (const row of rowDefs) {
            if (!row.identifiers || row.identifiers.length < 2) continue;
            if (!row.methods || row.methods.length !== row.identifiers.length - 1) continue;

            const prefixIds = row.identifiers.slice(0, -1);
            const prefixMethods = row.methods.slice(0, -1);
            const key = `${prefixIds.join('>')}||${prefixMethods.join('>')}`;
            if (!groups.has(key)) {
                groups.set(key, { prefixIds, prefixMethods, variants: [], rows: [] });
            }
            const g = groups.get(key);
            g.rows.push(row);
            g.variants.push({ id: row.identifiers[row.identifiers.length - 1], method: row.methods[row.methods.length - 1] || '' });
        }

        for (const g of groups.values()) {
            const unique = new Map();
            for (const v of g.variants) {
                unique.set(String(v.id), v);
            }

            if (unique.size < 2) continue;

            // Prefer base form first, then regional forms.
            const variants = Array.from(unique.values()).sort((a, b) => {
                const ar = isRegionalIdentifier(a.id) ? 1 : 0;
                const br = isRegionalIdentifier(b.id) ? 1 : 0;
                if (ar !== br) return ar - br;
                return String(a.id).localeCompare(String(b.id));
            });

            // Only render the "split" UI for up to 2 variants (PokemonDB-style).
            if (variants.length !== 2) continue;

            for (const r of g.rows) used.add(r.signature);
            merged.push({
                type: 'split-last',
                prefixIds: g.prefixIds,
                prefixMethods: g.prefixMethods,
                variants
            });
        }

        // Add any remaining rows that weren't merged.
        for (const row of rowDefs) {
            if (used.has(row.signature)) continue;
            merged.push({ type: 'row', identifiers: row.identifiers, methods: row.methods });
        }

        async function renderRow(def) {
            const stageData = [];
            for (const id of def.identifiers) {
                stageData.push(await getPokemonByIdentifier(id));
            }

            let rowHtml = '<div class="evo-row">';
            for (let i = 0; i < stageData.length; i++) {
                rowHtml += renderStage(stageData[i]);
                if (i < def.methods.length) {
                    rowHtml += renderStep(def.methods[i]);
                }
            }
            rowHtml += '</div>';
            return rowHtml;
        }

        async function renderSplitLast(def) {
            const prefixData = [];
            for (const id of def.prefixIds) {
                prefixData.push(await getPokemonByIdentifier(id));
            }
            const targetData = [];
            for (const v of def.variants) {
                targetData.push(await getPokemonByIdentifier(v.id));
            }

            let rowHtml = '<div class="evo-row evo-row-split">';

            for (let i = 0; i < prefixData.length; i++) {
                rowHtml += renderStage(prefixData[i]);
                if (i < def.prefixMethods.length) {
                    rowHtml += renderStep(def.prefixMethods[i]);
                }
            }

            const top = def.variants[0];
            const bottom = def.variants[1];

            rowHtml += `
                <div class="evo-split">
                    <div class="evo-split-item">
                        <div class="evo-arrow evo-arrow-diag">↗</div>
                        ${top.method ? `<div class="evo-condition">${top.method}</div>` : ''}
                    </div>
                    <div class="evo-split-item">
                        <div class="evo-arrow evo-arrow-diag">↘</div>
                        ${bottom.method ? `<div class="evo-condition">${bottom.method}</div>` : ''}
                    </div>
                </div>
                <div class="evo-split-targets">
                    ${renderStage(targetData[0])}
                    ${renderStage(targetData[1])}
                </div>
            `;

            rowHtml += '</div>';
            return rowHtml;
        }

        const htmlRows = [];
        for (const def of merged) {
            if (def.type === 'split-last') {
                htmlRows.push(await renderSplitLast(def));
            } else {
                htmlRows.push(await renderRow(def));
            }
        }

        resolve(`<div class="evo-table">${htmlRows.join('')}</div>`);
    });
}

