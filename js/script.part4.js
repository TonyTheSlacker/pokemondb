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

// ========== Items Page ==========
let allItems = [];
let currentItemsView = 'grid';
let itemCategoryByName = {};
let allItemCategories = [];
const itemDetailsCache = {};
const itemDetailsInFlight = {};
let itemDescObserver = null;

function getIdFromApiUrl(url) {
    const raw = String(url || '');
    const parts = raw.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    const n = parseInt(last, 10);
    return Number.isFinite(n) ? n : null;
}

function formatItemDisplayName(name) {
    return String(name || '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

function formatItemCategoryDisplayName(name) {
    return String(name || '')
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

function getItemSpriteUrl(itemName) {
    const n = String(itemName || '').toLowerCase();
    if (!n) return '';
    // Uses the PokeAPI sprites repository (fast, avoids N+1 item detail fetches).
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${encodeURIComponent(n)}.png`;
}

function getItemSpriteFallbackUrls(itemName) {
    const n = String(itemName || '').toLowerCase();
    if (!n) return [];

    const noHyphen = n.replace(/-/g, '');

    // Order matters: try the most “canonical” first.
    return [
        getItemSpriteUrl(n),

        // Pokémon Showdown has a very complete set of item icons.
        // Naming is usually without hyphens.
        `https://play.pokemonshowdown.com/sprites/itemicons/${encodeURIComponent(noHyphen)}.png`,
        `https://play.pokemonshowdown.com/sprites/itemicons/${encodeURIComponent(n)}.png`,
    ];
}

function handleItemImgError(imgEl) {
    try {
        const el = imgEl;
        const name = String(el?.dataset?.itemSpriteName || el?.dataset?.itemName || '').toLowerCase();
        const list = getItemSpriteFallbackUrls(name);
        if (!list.length) {
            el.style.visibility = 'hidden';
            return;
        }

        const idx = parseInt(el.dataset.fallbackIdx || '0', 10) || 0;
        const nextIdx = idx + 1;
        el.dataset.fallbackIdx = String(nextIdx);

        if (nextIdx < list.length) {
            // Try the next URL.
            el.src = list[nextIdx];
            return;
        }

        // All fallbacks failed; keep column alignment but hide the icon.
        el.style.visibility = 'hidden';
    } catch {
        // Defensive fallback.
        try { imgEl.style.visibility = 'hidden'; } catch { /* ignore */ }
    }
}

function setItemsView(view, triggerEl) {
    const v = (String(view || '').toLowerCase() === 'list') ? 'list' : 'grid';
    currentItemsView = v;

    try {
        window.localStorage.setItem('itemsView', v);
    } catch {
        // ignore
    }

    const grid = document.getElementById('itemsGrid');
    const list = document.getElementById('itemsList');
    if (grid) grid.style.display = (v === 'grid') ? '' : 'none';
    if (list) list.style.display = (v === 'list') ? '' : 'none';

    const btns = document.querySelectorAll('[data-action="set-items-view"]');
    btns.forEach(btn => {
        const isActive = String(btn.dataset.view || '').toLowerCase() === v;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });

    // If a specific trigger was clicked, ensure it gets the active state even if
    // the selector query above is scoped differently.
    if (triggerEl) {
        triggerEl.classList.add('active');
        triggerEl.setAttribute('aria-pressed', 'true');
    }

    // IMPORTANT: when switching from Grid -> List, the list may still be showing
    // the initial "Loading..." placeholder (because we only render the active view).
    // Re-render on view switch once data exists.
    if (Array.isArray(allItems) && allItems.length) {
        renderItems();
    }
}

function getItemsSearchQuery() {
    const input = document.getElementById('itemsSearch');
    return String(input?.value || '').trim().toLowerCase();
}

function getItemsCategoryFilter() {
    const sel = document.getElementById('itemsCategory');
    const v = String(sel?.value || 'all').toLowerCase();
    return v || 'all';
}

function getEnglishItemDescription(itemDetail) {
    const d = itemDetail || {};

    const effect = Array.isArray(d.effect_entries)
        ? d.effect_entries.find(e => e?.language?.name === 'en')
        : null;
    const shortEffect = String(effect?.short_effect || '').trim();
    if (shortEffect) return shortEffect.replace(/\s+/g, ' ');

    const flavor = Array.isArray(d.flavor_text_entries)
        ? d.flavor_text_entries.find(e => e?.language?.name === 'en')
        : null;
    const flavorText = String(flavor?.text || '').trim();
    if (flavorText) return flavorText.replace(/[\f\n\r\t]+/g, ' ').replace(/\s+/g, ' ');

    return '';
}

async function fetchItemDetailByName(itemName) {
    const name = String(itemName || '').toLowerCase();
    if (!name) return null;
    if (itemDetailsCache[name]) return itemDetailsCache[name];
    if (itemDetailsInFlight[name]) return itemDetailsInFlight[name];

    itemDetailsInFlight[name] = (async () => {
        try {
            const res = await fetch(`${API}/item/${encodeURIComponent(name)}`);
            if (!res.ok) throw new Error(`HTTP ${res.status} for item/${name}`);
            const detail = await res.json();
            itemDetailsCache[name] = detail;
            return detail;
        } catch (e) {
            console.warn('Item detail fetch failed:', name, e);
            itemDetailsCache[name] = null;
            return null;
        } finally {
            delete itemDetailsInFlight[name];
        }
    })();

    return itemDetailsInFlight[name];
}

function ensureItemDescObserver() {
    if (itemDescObserver) return itemDescObserver;

    itemDescObserver = new IntersectionObserver(async (entries, obs) => {
        for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const row = entry.target;
            const name = row?.dataset?.itemName;
            if (!name) {
                obs.unobserve(row);
                continue;
            }

            // Avoid refetching if we already have description.
            const cached = itemDetailsCache[String(name).toLowerCase()];
            if (cached && getEnglishItemDescription(cached)) {
                obs.unobserve(row);
                continue;
            }

            const detail = await fetchItemDetailByName(name);
            const desc = detail ? getEnglishItemDescription(detail) : '';

            // Update all visible rows with this item name (in case of re-renders)
            document.querySelectorAll(`.item-row[data-item-name="${CSS.escape(String(name).toLowerCase())}"] .item-desc`).forEach(el => {
                el.textContent = desc || '—';
                el.classList.remove('loading');
            });

            obs.unobserve(row);
        }
    }, { rootMargin: '400px' });

    return itemDescObserver;
}

async function loadItemCategoryMap() {
    // Build a name -> category map using item-category endpoints.
    // This avoids N+1 item detail requests just to get categories.
    const res = await fetch(`${API}/item-category?limit=1000`);
    if (!res.ok) throw new Error(`HTTP ${res.status} while loading item categories`);
    const data = await res.json();
    const cats = Array.isArray(data?.results) ? data.results : [];

    const byName = {};
    const catList = [];

    const maxConcurrency = 10;
    let cursor = 0;
    async function worker() {
        while (true) {
            const i = cursor++;
            if (i >= cats.length) return;
            const c = cats[i];
            const catName = String(c?.name || '').toLowerCase();
            const url = c?.url;
            if (!catName || !url) continue;

            try {
                const detailRes = await fetch(url);
                if (!detailRes.ok) continue;
                const detail = await detailRes.json();
                catList.push({ name: catName, display: formatItemCategoryDisplayName(catName) });

                const items = Array.isArray(detail?.items) ? detail.items : [];
                for (const it of items) {
                    const n = String(it?.name || '').toLowerCase();
                    if (n) byName[n] = catName;
                }
            } catch {
                // ignore one-off category errors
            }
        }
    }

    const workers = [];
    for (let i = 0; i < Math.min(maxConcurrency, cats.length); i++) workers.push(worker());
    await Promise.all(workers);

    catList.sort((a, b) => String(a.display).localeCompare(String(b.display)));
    return { byName, categories: catList };
}

function populateItemsCategorySelect() {
    const sel = document.getElementById('itemsCategory');
    if (!sel) return;

    const current = String(sel.value || 'all').toLowerCase();
    const options = ['<option value="all">All Categories</option>'].concat(
        allItemCategories.map(c => `<option value="${c.name}">${c.display}</option>`)
    );
    sel.innerHTML = options.join('');
    sel.value = current;
}

function renderItems() {
    const grid = document.getElementById('itemsGrid');
    const list = document.getElementById('itemsList');
    const empty = document.getElementById('itemsEmpty');
    if (!grid || !list) return;

    const q = getItemsSearchQuery();
    const cat = getItemsCategoryFilter();

    const items = (q || (cat && cat !== 'all'))
        ? allItems.filter(it => {
            const name = String(it.name || '').toLowerCase();
            if (q && !name.includes(q)) return false;
            if (cat && cat !== 'all') return String(it.category || '').toLowerCase() === cat;
            return true;
        })
        : allItems;

    if (empty) empty.style.display = items.length ? 'none' : '';

    // Render grid
    if (currentItemsView === 'grid') {
        grid.innerHTML = items.map(it => {
            const name = formatItemDisplayName(it.name);
            const id = it.id != null ? it.id : '';
            const sprite = getItemSpriteUrl(it.name);
            const catName = it.categoryDisplay || '';
            return `
                <div class="card item-card" data-action="open-item" data-item-name="${String(it.name || '').toLowerCase()}">
                    <div class="item-card-top">
                        <div class="item-name">${name}</div>
                        <div class="item-id">${id ? ('#' + id) : ''}</div>
                    </div>
                    <div style="display:flex;justify-content:center;align-items:center;min-height:56px;">
                        <img class="item-icon" data-item-sprite-name="${String(it.name || '').toLowerCase()}" src="${sprite}" alt="${name}" onerror="handleItemImgError(this)">
                    </div>
                    ${catName ? `<div class="item-id">${catName}</div>` : ''}
                </div>
            `;
        }).join('');
    }

    // Render list
    if (currentItemsView === 'list') {
        const header = `
            <div class="items-list-header">
                <div class="muted">&nbsp;</div>
                <div>Name</div>
                <div>Category</div>
                <div>Description</div>
            </div>
        `;

        const rows = items.map(it => {
            const rawName = String(it.name || '').toLowerCase();
            const name = formatItemDisplayName(rawName);
            const sprite = getItemSpriteUrl(rawName);
            const category = it.categoryDisplay || '—';

            const cached = itemDetailsCache[rawName];
            const desc = cached ? (getEnglishItemDescription(cached) || '—') : 'Loading...';
            const descClass = cached ? 'item-desc' : 'item-desc loading';

            return `
                <div class="item-row" data-action="open-item" data-item-name="${rawName}">
                    <img class="item-icon" data-item-sprite-name="${rawName}" src="${sprite}" alt="" onerror="handleItemImgError(this)">
                    <div class="item-name">${name}</div>
                    <div class="item-category">${category}</div>
                    <div class="${descClass}">${desc}</div>
                </div>
            `;
        }).join('');

        list.innerHTML = header + rows;

        // Lazy-load descriptions for visible rows.
        const obs = ensureItemDescObserver();
        list.querySelectorAll('.item-row').forEach(row => {
            const n = row.dataset.itemName;
            if (!n) return;
            const cached = itemDetailsCache[String(n).toLowerCase()];
            const hasDesc = cached && getEnglishItemDescription(cached);
            if (!hasDesc) obs.observe(row);
        });
    }
}

// ========== Item Detail Page ==========
function getItemParam() {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get('item') || params.get('name') || params.get('id') || '';
    return String(raw || '').trim();
}

function getEnglishEffect(itemDetail) {
    const effect = Array.isArray(itemDetail?.effect_entries)
        ? itemDetail.effect_entries.find(e => e?.language?.name === 'en')
        : null;
    const shortEffect = String(effect?.short_effect || '').trim();
    if (shortEffect) return shortEffect.replace(/\s+/g, ' ');
    const longEffect = String(effect?.effect || '').trim();
    if (longEffect) return longEffect.replace(/\s+/g, ' ');
    return '';
}

function getLanguageDisplayName(code) {
    const c = String(code || '').trim();
    if (!c) return '';

    // PokeAPI language codes are mostly ISO-ish with some special cases.
    const map = {
        en: 'English',
        fr: 'French',
        de: 'German',
        es: 'Spanish',
        it: 'Italian',
        ja: 'Japanese',
        'ja-Hrkt': 'Japanese',
        ko: 'Korean',
        'zh-Hans': 'Chinese (Simplified)',
        'zh-Hant': 'Chinese (Traditional)',
        ru: 'Russian',
        pt: 'Portuguese',
        nl: 'Dutch',
    };

    return map[c] || c;
}

function languageSortRank(code) {
    const c = String(code || '').trim();
    const rank = {
        en: 0,
        ja: 1,
        'ja-Hrkt': 2,
        de: 3,
        fr: 4,
        it: 5,
        es: 6,
        ko: 7,
        'zh-Hans': 8,
        'zh-Hant': 9,
    };
    return (c in rank) ? rank[c] : 50;
}

function getEnglishName(itemDetail) {
    const entry = Array.isArray(itemDetail?.names)
        ? itemDetail.names.find(n => n?.language?.name === 'en')
        : null;
    return String(entry?.name || itemDetail?.name || '').trim();
}

function normalizeItemKey(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    // If it's a number, PokeAPI supports /item/{id}
    if (/^\d+$/.test(s)) return s;
    return s.toLowerCase();
}

function buildItemFlavorByVersionGroup(itemDetail) {
    const entries = Array.isArray(itemDetail?.flavor_text_entries) ? itemDetail.flavor_text_entries : [];
    const map = {};
    for (const e of entries) {
        if (e?.language?.name !== 'en') continue;
        const vg = e?.version_group?.name;
        const text = String(e?.text || '').trim();
        if (!vg || !text) continue;
        const cleaned = text.replace(/[\f\n\r\t]+/g, ' ').replace(/\s+/g, ' ');
        // Keep first occurrence for a version_group.
        if (!map[vg]) map[vg] = cleaned;
    }

    // Sort by generation if mapping exists.
    const vgs = Object.keys(map);
    vgs.sort((a, b) => {
        const ga = VERSION_GROUP_TO_GEN[a] || 0;
        const gb = VERSION_GROUP_TO_GEN[b] || 0;
        if (ga !== gb) return ga - gb;
        return getVersionGroupDisplayName(a).localeCompare(getVersionGroupDisplayName(b));
    });

    return vgs.map(vg => ({
        vg,
        game: getVersionGroupDisplayName(vg),
        text: map[vg]
    }));
}

function renderItemDetail(itemDetail) {
    const root = document.getElementById('itemDetail');
    if (!root) return;

    const enName = getEnglishName(itemDetail);
    const displayName = enName ? enName : formatItemDisplayName(itemDetail?.name);
    const category = String(itemDetail?.category?.name || '').toLowerCase();
    const categoryLabel = category ? formatItemCategoryDisplayName(category) : '';
    const sprite = itemDetail?.sprites?.default || getItemSpriteUrl(itemDetail?.name);
    const effect = getEnglishEffect(itemDetail);
    const flavor = buildItemFlavorByVersionGroup(itemDetail);

    const cost = Number(itemDetail?.cost) || 0;
    const flingPower = (itemDetail?.fling_power != null) ? Number(itemDetail.fling_power) : null;
    const flingEffect = String(itemDetail?.fling_effect?.name || '').toLowerCase();
    const attributes = Array.isArray(itemDetail?.attributes) ? itemDetail.attributes : [];
    const attrNames = attributes
        .map(a => String(a?.name || '').toLowerCase())
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));

    const heldBy = Array.isArray(itemDetail?.held_by_pokemon) ? itemDetail.held_by_pokemon : [];
    const heldByNames = heldBy
        .map(h => String(h?.pokemon?.name || '').toLowerCase())
        .filter(Boolean)
        .slice(0, 10);

    // Other languages
    const names = Array.isArray(itemDetail?.names) ? itemDetail.names : [];
    const seenLangLabels = new Set();
    const langRows = names
        .filter(n => n?.language?.name && n?.name)
        .map(n => {
            const code = String(n.language.name || '').trim();
            return {
                langCode: code,
                langLabel: getLanguageDisplayName(code),
                name: String(n.name || '').trim()
            };
        })
        .sort((a, b) => {
            const ra = languageSortRank(a.langCode);
            const rb = languageSortRank(b.langCode);
            if (ra !== rb) return ra - rb;
            return a.langLabel.localeCompare(b.langLabel);
        })
        .filter(r => {
            // Collapse duplicates like ja + ja-Hrkt when they represent the same label.
            if (!r.langLabel) return false;
            if (seenLangLabels.has(r.langLabel)) return false;
            seenLangLabels.add(r.langLabel);
            return true;
        });

    document.title = `${displayName} (item) - Pokémon Database`;

    const heroPills = [
        ...(categoryLabel ? [categoryLabel] : []),
        ...(cost ? [`Cost: ${cost}`] : []),
        ...(flingPower != null ? [`Fling: ${flingPower}`] : []),
    ];

    root.innerHTML = `
        <div class="item-hero">
            <img class="item-hero-icon" data-item-sprite-name="${escapeHtml(String(itemDetail?.name || '').toLowerCase())}" src="${sprite}" alt="" onerror="handleItemImgError(this)">
            <div>
                <div class="item-hero-title">${escapeHtml(displayName)} <span class="item-muted">(item)</span></div>
                <div class="item-hero-sub">
                    ${heroPills.map(p => `<span class="item-pill">${escapeHtml(p)}</span>`).join('')}
                </div>
            </div>
        </div>

        <div class="item-detail-grid">
            <div class="item-card">
                <h3>Effects</h3>
                <div class="item-desc-text">${effect ? escapeHtml(effect) : '<span class="item-muted">No effect text available from PokeAPI.</span>'}</div>

                <div style="height:14px"></div>
                <h3>Game descriptions</h3>
                ${flavor.length ? `
                    <table class="item-desc-table">
                        <tbody>
                            ${flavor.map(row => `
                                <tr>
                                    <td class="item-desc-game">${escapeHtml(row.game)}</td>
                                    <td class="item-desc-text">${escapeHtml(row.text)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                ` : `<div class="item-muted">No game descriptions available from PokeAPI.</div>`}
            </div>

            <div style="display:flex;flex-direction:column;gap:18px;">
                <div class="item-card">
                    <h3>Quick facts</h3>
                    <div class="facts">
                        <div class="fact-row">
                            <div class="fact-key">Category</div>
                            <div class="fact-val">${categoryLabel ? escapeHtml(categoryLabel) : '<span class="item-muted">—</span>'}</div>
                        </div>
                        <div class="fact-row">
                            <div class="fact-key">Cost</div>
                            <div class="fact-val">${cost ? escapeHtml(String(cost)) : '<span class="item-muted">—</span>'}</div>
                        </div>
                        <div class="fact-row">
                            <div class="fact-key">Fling</div>
                            <div class="fact-val">
                                ${flingPower != null ? escapeHtml(String(flingPower)) : '<span class="item-muted">—</span>'}
                                ${flingEffect ? `<span class="fact-sub">${escapeHtml(formatItemDisplayName(flingEffect))}</span>` : ''}
                            </div>
                        </div>
                        <div class="fact-row">
                            <div class="fact-key">Attributes</div>
                            <div class="fact-val">
                                ${attrNames.length ? `<div class="tag-row">${attrNames.map(a => `<span class="tag">${escapeHtml(formatItemDisplayName(a))}</span>`).join('')}</div>` : '<span class="item-muted">—</span>'}
                            </div>
                        </div>
                        <div class="fact-row">
                            <div class="fact-key">Held by</div>
                            <div class="fact-val">
                                ${heldBy.length ? `<div class="fact-sub">${escapeHtml(String(heldBy.length))} Pokémon</div>` : '<span class="item-muted">—</span>'}
                                ${heldByNames.length ? `<div class="tag-row">${heldByNames.map(n => `<span class="tag">${escapeHtml(formatItemDisplayName(n))}</span>`).join('')}</div>` : ''}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="item-card">
                    <h3>Other languages</h3>
                    ${langRows.length ? `
                        <table class="lang-table">
                            <tbody>
                                ${langRows.map(r => `
                                    <tr>
                                        <td class="lang-name">${escapeHtml(r.langLabel)}</td>
                                        <td class="lang-value">${escapeHtml(r.name)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : `<div class="item-muted">No translations available.</div>`}
                </div>
            </div>
        </div>
    `;
}

async function initItemDetailPage() {
    const root = document.getElementById('itemDetail');
    if (!root) return;

    const param = getItemParam();
    if (!param) {
        root.innerHTML = '<div class="empty">No item specified.</div>';
        return;
    }

    const key = normalizeItemKey(param);
    root.innerHTML = '<div class="empty">Loading item...</div>';

    try {
        const res = await fetch(`${API}/item/${encodeURIComponent(key)}`);
        if (!res.ok) throw new Error(`HTTP ${res.status} while loading item`);
        const detail = await res.json();
        renderItemDetail(detail);
    } catch (e) {
        console.error(e);
        root.innerHTML = `<div class="empty">Failed to load item: ${escapeHtml(String(e?.message || e))}</div>`;
    }
}

// Simple HTML escaper for detail rendering.
function escapeHtml(s) {
    return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function initItemsPage() {
    const grid = document.getElementById('itemsGrid');
    const list = document.getElementById('itemsList');
    if (!grid || !list) return;

    // Restore view preference
    try {
        const saved = window.localStorage.getItem('itemsView');
        if (saved) currentItemsView = (saved === 'list') ? 'list' : 'grid';
    } catch {
        // ignore
    }
    setItemsView(currentItemsView);

    const input = document.getElementById('itemsSearch');
    if (input && !input.__itemsSearchBound) {
        input.__itemsSearchBound = true;
        input.addEventListener('input', () => renderItems());
    }

    const catSel = document.getElementById('itemsCategory');
    if (catSel && !catSel.__itemsCategoryBound) {
        catSel.__itemsCategoryBound = true;
        catSel.addEventListener('change', () => renderItems());
    }

    grid.innerHTML = '<div class="empty">Loading items...</div>';
    list.innerHTML = '<div class="empty">Loading items...</div>';

    try {
        const [itemsRes, catMapRes] = await Promise.all([
            fetch(`${API}/item?limit=5000`),
            loadItemCategoryMap()
        ]);

        if (!itemsRes.ok) throw new Error(`HTTP ${itemsRes.status} while loading items`);
        const data = await itemsRes.json();

        itemCategoryByName = catMapRes.byName || {};
        allItemCategories = Array.isArray(catMapRes.categories) ? catMapRes.categories : [];
        populateItemsCategorySelect();

        allItems = (data?.results || []).map(it => {
            const name = String(it?.name || '').toLowerCase();
            const category = itemCategoryByName[name] || '';
            return {
                name,
                url: it?.url,
                id: getIdFromApiUrl(it?.url),
                category,
                categoryDisplay: category ? formatItemCategoryDisplayName(category) : ''
            };
        }).filter(it => it.name);

        // Stable sorting: by name, then id.
        allItems.sort((a, b) => {
            const an = String(a.name).localeCompare(String(b.name));
            if (an !== 0) return an;
            return (a.id || 0) - (b.id || 0);
        });

        renderItems();
    } catch (e) {
        console.error(e);
        const msg = (e && e.message) ? e.message : 'Error loading items.';
        grid.innerHTML = `<div class="empty">${msg}</div>`;
        list.innerHTML = `<div class="empty">${msg}</div>`;
    }
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
function formatVersionGroupLabel(versionGroup) {
    const key = String(versionGroup || '').trim().toLowerCase();
    if (!key) return '';

    const labels = {
        'scarlet-violet': 'Scarlet & Violet',
        'legends-arceus': 'Legends: Arceus',
        'brilliant-diamond-shining-pearl': 'Brilliant Diamond & Shining Pearl',
        'sword-shield': 'Sword & Shield',
        'lets-go-pikachu-lets-go-eevee': "Let's Go Pikachu & Let's Go Eevee",
        'ultra-sun-ultra-moon': 'Ultra Sun & Ultra Moon',
        'sun-moon': 'Sun & Moon',
        'omega-ruby-alpha-sapphire': 'Omega Ruby & Alpha Sapphire',
        'x-y': 'X & Y',
        'black-2-white-2': 'Black 2 & White 2',
        'black-white': 'Black & White',
        'heartgold-soulsilver': 'HeartGold & SoulSilver',
        'platinum': 'Platinum',
        'diamond-pearl': 'Diamond & Pearl',
        'firered-leafgreen': 'FireRed & LeafGreen',
        'emerald': 'Emerald',
        'ruby-sapphire': 'Ruby & Sapphire',
        'gold-silver': 'Gold & Silver',
        'crystal': 'Crystal',
        'red-blue': 'Red & Blue',
        'yellow': 'Yellow'
    };

    return labels[key] || formatName(key);
}

function versionGroupBadgeMeta(versionGroup) {
    const key = String(versionGroup || '').trim().toLowerCase();
    const meta = {
        'scarlet-violet': { badge: 'SV', color: TYPE_COLORS.fire },
        'legends-arceus': { badge: 'LA', color: TYPE_COLORS.psychic },
        'brilliant-diamond-shining-pearl': { badge: 'BDSP', color: TYPE_COLORS.rock },
        'sword-shield': { badge: 'SWSH', color: TYPE_COLORS.steel },
        'lets-go-pikachu-lets-go-eevee': { badge: 'LGPE', color: TYPE_COLORS.electric },
        'ultra-sun-ultra-moon': { badge: 'USUM', color: TYPE_COLORS.dragon },
        'sun-moon': { badge: 'SM', color: TYPE_COLORS.grass },
        'omega-ruby-alpha-sapphire': { badge: 'ORAS', color: TYPE_COLORS.water },
        'x-y': { badge: 'XY', color: TYPE_COLORS.fairy },
        'black-2-white-2': { badge: 'B2W2', color: TYPE_COLORS.dark },
        'black-white': { badge: 'BW', color: TYPE_COLORS.dark },
        'heartgold-soulsilver': { badge: 'HGSS', color: TYPE_COLORS.steel },
        'platinum': { badge: 'PLAT', color: TYPE_COLORS.ghost },
        'diamond-pearl': { badge: 'DP', color: TYPE_COLORS.rock },
        'firered-leafgreen': { badge: 'FRLG', color: TYPE_COLORS.fire },
        'ruby-sapphire': { badge: 'RS', color: TYPE_COLORS.water },
        'emerald': { badge: 'E', color: TYPE_COLORS.water },
        'gold-silver': { badge: 'GS', color: TYPE_COLORS.electric },
        'crystal': { badge: 'C', color: TYPE_COLORS.ice },
        'red-blue': { badge: 'RB', color: TYPE_COLORS.normal },
        'yellow': { badge: 'Y', color: TYPE_COLORS.electric }
    };
    return meta[key] || null;
}

function pickPokemonSpriteForAbilityCard(pokeData) {
    // Prefer the latest, consistent sprite set (Pokémon HOME).
    const home = pokeData?.sprites?.other?.home?.front_default;
    if (home) return home;

    const official = pokeData?.sprites?.other?.['official-artwork']?.front_default;
    if (official) return official;

    const front = pokeData?.sprites?.front_default;
    if (front) return front;

    const id = pokeData?.id;
    if (id) return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${id}.png`;
    return '';
}

function getSpeciesIdFromUrl(url) {
    const m = String(url || '').match(/\/(\d+)\/?$/);
    return m ? parseInt(m[1], 10) : null;
}

function isTotemFormApiName(name) {
    const n = String(name || '').toLowerCase();
    // PokeAPI uses names like "gumshoos-totem", "mimikyu-totem-disguised", etc.
    return n.includes('-totem');
}

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
                    gameDescsByGame[game] = normalizeFlavorText(entry.flavor_text);
                }
            }
        });
        
        if (gameDescDiv) {
            if (Object.keys(gameDescsByGame).length > 0) {
                const rows = Object.entries(gameDescsByGame)
                    .map(([game, text]) => {
                        const gen = VERSION_GROUP_TO_GEN?.[game];
                        return { game, text, gen: Number.isFinite(gen) ? gen : null };
                    })
                    .sort((a, b) => {
                        const ga = a.gen ?? -1;
                        const gb = b.gen ?? -1;
                        // Newer games first, then name
                        if (gb !== ga) return gb - ga;
                        return String(a.game).localeCompare(String(b.game));
                    });

                gameDescDiv.innerHTML = rows
                    .map(({ game, text, gen }) => {
                        const badgeMeta = versionGroupBadgeMeta(game);
                        const icon = badgeMeta
                            ? `<span class="game-desc-icon" style="background:${badgeMeta.color}" title="Gen ${gen || '?'}">${badgeMeta.badge}</span>`
                            : '';

                        const label = formatVersionGroupLabel(game);

                        return `
                            <div class="game-desc-item">
                                <div class="game-desc-head">
                                    ${icon}
                                    <div class="game-desc-game">${label}</div>
                                </div>
                                <div class="game-desc-text">${text}</div>
                            </div>
                        `;
                    })
                    .join('') || '<p style="color: #8b92a5;">No game descriptions available</p>';
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
            const pokemonPromises = pokemonList
                .slice(0, 100)
                // Don’t show Totem forms in ability listings
                .filter(p => !isTotemFormApiName(p?.pokemon?.name))
                .map(async p => {
                try {
                    const pokeResponse = await fetch(p.pokemon.url);
                    const pokeData = await pokeResponse.json();

                    // Safety net: also filter Totem forms based on fetched name
                    if (isTotemFormApiName(pokeData?.name)) return null;
                    
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
                    const spriteUrl = pickPokemonSpriteForAbilityCard(poke);
                    const speciesName = poke?.species?.name || poke.name;
                    const speciesId = getSpeciesIdFromUrl(poke?.species?.url) || poke.id;
                    const typeTags = poke.types.map(t => {
                        const typeName = t.type.name;
                        const typeColor = TYPE_COLORS[typeName] || '#777';
                        return `<span class="pokemon-type-tag" style="background: ${typeColor}">${typeName}</span>`;
                    }).join('');
                    
                    return `
                    <a href="${PAGES_PREFIX}pokemon-detail.html?id=${encodeURIComponent(speciesName)}" class="pokemon-card-ability">
                        <div class="pokemon-card-header">
                            <div class="pokemon-name-ability">${formatName(poke.name)}</div>
                            <div class="pokemon-dex-ability">#${String(speciesId).padStart(4, '0')}</div>
                        </div>
                        <div class="pokemon-img-ability">
                            <img src="${spriteUrl}" alt="${poke.name}" onerror="this.style.display='none';">
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
                    const spriteUrl = pickPokemonSpriteForAbilityCard(poke);
                    const speciesName = poke?.species?.name || poke.name;
                    const speciesId = getSpeciesIdFromUrl(poke?.species?.url) || poke.id;
                    const typeTags = poke.types.map(t => {
                        const typeName = t.type.name;
                        const typeColor = TYPE_COLORS[typeName] || '#777';
                        return `<span class="pokemon-type-tag" style="background: ${typeColor}">${typeName}</span>`;
                    }).join('');
                    
                    return `
                    <a href="${PAGES_PREFIX}pokemon-detail.html?id=${encodeURIComponent(speciesName)}" class="pokemon-card-ability">
                        <div class="pokemon-card-header">
                            <div class="pokemon-name-ability">${formatName(poke.name)}</div>
                            <div class="pokemon-dex-ability">#${String(speciesId).padStart(4, '0')}</div>
                        </div>
                        <div class="pokemon-img-ability">
                            <img src="${spriteUrl}" alt="${poke.name}" onerror="this.style.display='none';">
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

            const rows = [...byGame.entries()]
                .map(([game, text]) => {
                    const gen = VERSION_GROUP_TO_GEN?.[game];
                    return { game, text, gen: Number.isFinite(gen) ? gen : null };
                })
                .sort((a, b) => {
                    const ga = a.gen ?? -1;
                    const gb = b.gen ?? -1;
                    if (gb !== ga) return gb - ga;
                    return String(a.game).localeCompare(String(b.game));
                })
                .slice(0, 16);

            const html = rows
                .map(({ game, text, gen }) => {
                    const badgeMeta = versionGroupBadgeMeta(game);
                    const icon = badgeMeta
                        ? `<span class="game-desc-icon" style="background:${badgeMeta.color}" title="Gen ${gen || '?'}">${badgeMeta.badge}</span>`
                        : '';
                    const label = formatVersionGroupLabel(game);

                    return `
                        <div class="game-desc-item">
                            <div class="game-desc-head">
                                ${icon}
                                <div class="game-desc-game">${label}</div>
                            </div>
                            <div class="game-desc-text">${text}</div>
                        </div>
                    `;
                })
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

    function buildPokemonDisplayName(species, formApiName) {
        const speciesName = String(species || '').trim();
        const formName = String(formApiName || '').trim();
        if (!speciesName) return formatName(formName || speciesName);

        const speciesPretty = formatName(speciesName);
        if (!formName || formName.toLowerCase() === speciesName.toLowerCase()) return speciesPretty;

        // Prefer PokemonDB-style "Species-Form" everywhere.
        const prefix = speciesName.toLowerCase() + '-';
        const lowerForm = formName.toLowerCase();
        if (lowerForm.startsWith(prefix)) {
            const suffix = formName.slice(speciesName.length + 1);
            const suffixPretty = String(suffix)
                .split('-')
                .filter(Boolean)
                .map(part => formatName(part))
                .join('-');
            return `${speciesPretty}-${suffixPretty}`;
        }

        return formatName(formName);
    }

    for (let i = 0; i < list.length; i += BATCH_SIZE) {
        const batch = list.slice(i, i + BATCH_SIZE);
        if (progressEl) progressEl.textContent = `Loading learnsets… (${Math.min(i + BATCH_SIZE, list.length)}/${list.length})`;

        const batchResults = await Promise.all(batch.map(async item => {
            try {
                const cached = pokemonDetailsCache[item.id];
                const data = cached || await fetch(`${API}/pokemon/${item.id}`).then(r => r.json());
                if (!cached) pokemonDetailsCache[item.id] = data;

                // Exclude Mega forms from learned-by lists.
                // (PokeAPI uses names like "heracross-mega", "charizard-mega-x", etc.)
                const apiName = String(item.apiName || data?.name || '').toLowerCase();
                if (apiName.includes('-mega')) return null;

                const learn = extractLearnForMove(data, moveName, preferredVersionGroup);

                const speciesName = data?.species?.name || item.apiName || data?.name || '';
                const speciesId = getSpeciesIdFromUrl(data?.species?.url) || data?.id || item.id;
                const spriteUrl = pickPokemonSpriteForAbilityCard(data);

                const formApiName = item.apiName || data?.name || '';
                const displayName = buildPokemonDisplayName(speciesName, formApiName);
                const isDefaultForm = !!speciesName && String(data?.name || '').toLowerCase() === String(speciesName).toLowerCase();
                return {
                    id: item.id,
                    name: displayName,
                    speciesName,
                    speciesId,
                    spriteUrl,
                    egg: learn.egg,
                    level: learn.level,
                    isDefaultForm
                };
            } catch (e) {
                console.error('Error fetching pokemon learnset', item, e);
                return null;
            }
        }));

        results.push(...batchResults.filter(Boolean));
    }

    if (progressEl) progressEl.textContent = '';

    // Dedupe only when the move-learning signature matches.
    // This collapses cosmetic forms (colors) but keeps distinct learnsets separate (e.g., Lycanroc forms).
    const bySignature = new Map();
    for (const r of results) {
        const speciesKey = r?.speciesName || String(r?.speciesId || r?.id || '');
        if (!speciesKey) continue;

        const lvl = (r.level == null) ? '' : String(r.level);
        const sig = `${speciesKey}|egg:${r.egg ? '1' : '0'}|lvl:${lvl}`;

        const existing = bySignature.get(sig);
        if (!existing) {
            bySignature.set(sig, { ...r });
            continue;
        }

        // When merging (same signature), display should collapse to the base species.
        existing.name = formatName(existing.speciesName || existing.name);

        // Prefer default form sprite/id when available.
        if (!existing.isDefaultForm && r.isDefaultForm) {
            existing.id = r.id;
            existing.spriteUrl = r.spriteUrl;
            existing.isDefaultForm = true;
        }
    }

    return Array.from(bySignature.values());
}

function renderLearnedCardWithLevel(p) {
    const href = `${PAGES_PREFIX}pokemon-detail.html?id=${encodeURIComponent(p.speciesName || p.id)}`;
    const sprite = p.spriteUrl || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${p.id}.png`;
    const displayName = formatName(p.name);
    const dexNo = p.speciesId || p.id;
    return `
        <a href="${href}" class="pokemon-card-ability">
            <div class="pokemon-card-header">
                <div class="pokemon-name-ability">${displayName}</div>
                <div class="pokemon-dex-ability">#${String(dexNo).padStart(4, '0')}</div>
            </div>
            <div class="pokemon-img-ability">
                <img src="${sprite}" alt="${displayName}" onerror="this.style.display='none'">
            </div>
            <div class="pokemon-species-ability">
                <span class="learned-tag">Lv. ${p.level}</span>
            </div>
        </a>
    `;
}

function renderLearnedCardNoLevel(p) {
    const href = `${PAGES_PREFIX}pokemon-detail.html?id=${encodeURIComponent(p.speciesName || p.id)}`;
    const sprite = p.spriteUrl || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/${p.id}.png`;
    const displayName = formatName(p.name);
    const dexNo = p.speciesId || p.id;
    return `
        <a href="${href}" class="pokemon-card-ability">
            <div class="pokemon-card-header">
                <div class="pokemon-name-ability">${displayName}</div>
                <div class="pokemon-dex-ability">#${String(dexNo).padStart(4, '0')}</div>
            </div>
            <div class="pokemon-img-ability">
                <img src="${sprite}" alt="${displayName}" onerror="this.style.display='none'">
            </div>
            <div class="pokemon-species-ability">
                <span class="learned-tag">Egg</span>
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


