// --- DICTIONNAIRE CSS ---
const cssSchema = {
    'display': ['block', 'flex', 'grid', 'inline-block', 'none', 'inline-flex', 'table', 'inline-grid'],
    'position': ['static', 'relative', 'absolute', 'fixed', 'sticky'],
    'flex-direction': ['row', 'column', 'row-reverse', 'column-reverse'],
    'justify-content': ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'],
    'align-items': ['stretch', 'center', 'flex-start', 'flex-end', 'baseline'],
    'align-content': ['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'stretch'],
    'flex-wrap': ['nowrap', 'wrap', 'wrap-reverse'],
    'box-sizing': ['content-box', 'border-box'],
    'overflow': ['visible', 'hidden', 'scroll', 'auto'],
    'visibility': ['visible', 'hidden', 'collapse'],
    'z-index': ['auto', '0', '1', '10', '100', '-1'],
    'text-align': ['left', 'right', 'center', 'justify'],
    'text-transform': ['none', 'capitalize', 'uppercase', 'lowercase'],
    'text-decoration': ['none', 'underline', 'overline', 'line-through'],
    'font-style': ['normal', 'italic'],
    'font-weight': ['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900'],
    'background-repeat': ['repeat', 'repeat-x', 'repeat-y', 'no-repeat'],
    'background-attachment': ['scroll', 'fixed'],
    'background-size': ['auto', 'cover', 'contain'],
    'border-style': ['none', 'solid', 'dashed', 'dotted', 'double'],
    'cursor': ['default', 'pointer', 'text', 'move', 'not-allowed', 'grab', 'grabbing'],
    'pointer-events': ['auto', 'none'],
    'user-select': ['auto', 'none', 'text', 'all'],
    'object-fit': ['fill', 'contain', 'cover', 'none'],
    'mix-blend-mode': ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten']
};

// --- DATA ---
let library = [];

let currentEditId = null;
let currentTab = 'html';
let initialEditorState = {};

const grid = document.getElementById('grid');
const searchInput = document.getElementById('search-input');
const modal = document.getElementById('modal-overlay');
const modalPreview = document.getElementById('modal-preview-host');
const tweaksPanel = document.getElementById('tweaks-panel');

const inputs = {
    title: document.getElementById('edit-title'),
    tags: document.getElementById('edit-tags'),
    html: document.getElementById('code-html'),
    css: document.getElementById('code-css'),
    js: document.getElementById('code-js'),
    notes: document.getElementById('code-notes')
};

// --- INIT ---
// --- INIT ---
async function init() {
    try {
        // Try fetching local JSON first
        const res = await fetch('csslib/csslib.json');
        if (res.ok) {
            library = await res.json();
        } else {
            throw new Error("File not found or network error");
        }
    } catch (e) {
        console.warn("Could not load csslib.json (likely due to file:// protocol restriction or missing file). Falling back to localStorage.", e);
        library = JSON.parse(localStorage.getItem('ultimaLibData')) || [];
    }

    // Ensure DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => renderGrid());
    } else {
        renderGrid();
    }
}

// Call init only if we are in a browser environment
if (typeof window !== 'undefined') {
    init();
}

// --- CORE RENDER ---
function renderGrid(data = library) {
    grid.innerHTML = '';
    if (data.length === 0) {
        grid.innerHTML = '<div style="color:#555; grid-column: 1/-1; text-align:center; padding-top:50px;">Aucun résultat trouvé 🕵️‍♂️</div>';
        return;
    }
    data.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';

        const tagsHtml = (item.tags && item.tags.length)
            ? item.tags.map(t => `<span class="tag-pill">${t.trim()}</span>`).join('')
            : '';

        card.innerHTML = `
            <div class="card-preview" id="preview-${item.id}"></div>
            <div class="card-info">
                <div class="card-header-row"><div class="card-title">${item.title}</div></div>
                <div class="tags-container">${tagsHtml}</div>
                <div class="card-actions">
                    <button class="btn-icon" onclick="copyCode(${item.id}, 'css')">CSS</button>
                    <button class="btn-icon" onclick="copyCode(${item.id}, 'html')">HTML</button>
                    <button class="btn-icon" onclick="openEditor(${item.id})">✎</button>
                    <button class="btn-icon delete" onclick="deleteItem(${item.id})">🗑</button>
                </div>
            </div>
        `;
        grid.appendChild(card);
        renderShadow(document.getElementById(`preview-${item.id}`), item);
    });
}

function renderShadow(container, item) {
    if (!container.shadowRoot) container.attachShadow({ mode: 'open' });
    container.shadowRoot.innerHTML = `
        <style>
            :host { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; box-sizing: border-box; }
            * { box-sizing: border-box; }
            ${item.css}
        </style>
        ${item.html}
    `;
    try { if (item.js) new Function(item.js.replace(/document\./g, 'this.shadowRoot.')).call(container); } catch (e) { }
}

function filterGrid() {
    const term = searchInput.value.toLowerCase();
    const filtered = library.filter(item =>
        item.title.toLowerCase().includes(term) ||
        (item.tags || []).some(t => t.toLowerCase().includes(term))
    );
    renderGrid(filtered);
}

// --- EDITOR LOGIC ---
function openEditor(id = null) {
    currentEditId = id;
    modal.classList.add('active');
    if (id) {
        const item = library.find(x => x.id === id);
        inputs.title.value = item.title;
        inputs.tags.value = item.tags ? item.tags.join(', ') : '';
        inputs.notes.value = item.notes || '';
        inputs.html.value = item.html;
        inputs.css.value = item.css;
        inputs.js.value = item.js;
    } else {
        inputs.title.value = ''; inputs.tags.value = ''; inputs.notes.value = ''; inputs.js.value = '';
        inputs.html.value = '<div class="box">New Item</div>';
        inputs.css.value = '.box { padding: 20px; background: linear-gradient(45deg, #ff0000, #0000ff); color: white; border-radius: 8px; }';
    }
    initialEditorState = {
        title: inputs.title.value, tags: inputs.tags.value, html: inputs.html.value,
        css: inputs.css.value, js: inputs.js.value, notes: inputs.notes.value
    };
    switchTab('css');
    updatePreview();
}

function closeEditor() {
    modal.classList.remove('active');
    currentEditId = null;
}

function resetEditor() {
    if (!confirm("Remettre à l'état initial ?")) return;
    inputs.title.value = initialEditorState.title;
    inputs.tags.value = initialEditorState.tags;
    inputs.html.value = initialEditorState.html;
    inputs.css.value = initialEditorState.css;
    inputs.js.value = initialEditorState.js;
    inputs.notes.value = initialEditorState.notes;
    updatePreview();
    if (currentTab === 'css') generateSmartTweaks();
    showToast("Réinitialisé");
}

function onCodeChange(type) {
    updatePreview();
    if (type === 'css') generateSmartTweaks();
}

function updatePreview() {
    if (!modalPreview.shadowRoot) modalPreview.attachShadow({ mode: 'open' });
    modalPreview.shadowRoot.innerHTML = `
        <style>
            :host { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background-image: radial-gradient(#333 1px, transparent 1px); background-size: 20px 20px; overflow: hidden; position: relative; }
            ${inputs.css.value}
        </style>
        ${inputs.html.value}
    `;
    try { new Function(inputs.js.value.replace(/document\./g, 'this.shadowRoot.')).call(modalPreview); } catch (e) { }
}

function switchTab(type, ev) {
    currentTab = type;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    if (ev) ev.target.classList.add('active');
    document.querySelectorAll('.code-area').forEach(area => area.classList.remove('active'));
    inputs[type].classList.add('active');
    if (type === 'css') {
        tweaksPanel.classList.add('active');
        generateSmartTweaks();
    } else {
        tweaksPanel.classList.remove('active');
    }
}

// ---------- ROBUST PARSER ENGINE ----------

function colorToHex(color) {
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.fillStyle = color;
    return ctx.fillStyle;
}

function extractColorsFromValue(value) {
    const ignored = ['none', 'auto', 'transparent', 'inherit', 'initial', 'unset', 'currentColor', 'transparent'];
    const regex = /(#[0-9a-fA-F]{3,8}|rgba?\([\s\d,/.%]+\)|hsla?\([\s\d,/.%]+\)|[a-zA-Z]{3,})/g;
    const matches = [];
    let match;
    while ((match = regex.exec(value)) !== null) {
        const str = match[0];
        if (!ignored.includes(str.toLowerCase())) {
            const hex = colorToHex(str);
            if (hex && hex.startsWith('#')) {
                matches.push({ original: str, hex: hex, index: match.index });
            }
        }
    }
    return matches;
}

function generateSmartTweaks() {
    const css = inputs.css.value || '';
    tweaksPanel.innerHTML = '';

    // Regex améliorée : capture prop: val même sans point-virgule final si fin de bloc ou fichier
    const re = /([a-zA-Z-]+)\s*:\s*([^;{}]+?)\s*(?:;|(?=\})|$)/g;
    let m;

    // IMPORTANT FIX V10: Compteur par propriété pour matcher getDeclaration
    const occurrences = {};

    const categories = {
        layout: { title: "Layout & Structure", items: [] },
        colors: { title: "Colors & Gradients", items: [] },
        dims: { title: "Dimensions & Units", items: [] },
        misc: { title: "Misc", items: [] }
    };

    while ((m = re.exec(css)) !== null) {
        const prop = m[1].toLowerCase().trim();
        const rawVal = m[2].trim();

        // Correction Indexation V10
        if (!occurrences[prop]) occurrences[prop] = 0;
        const occ = occurrences[prop];
        occurrences[prop]++;

        if (cssSchema[prop]) {
            const cleanVal = rawVal.split('!')[0].trim();
            const options = cssSchema[prop].map(opt =>
                `<option value="${opt}" ${cleanVal === opt ? 'selected' : ''}>${opt}</option>`
            ).join('');
            categories.layout.items.push(`
                <div class="tweak-item">
                    <div class="tweak-header"><span class="tweak-label">${prop}</span></div>
                    <select class="tweak-select" data-prop="${prop}" data-occ="${occ}" onchange="handleSelectChange(this)">
                        ${options}
                    </select>
                </div>
            `);
            continue;
        }

        const foundColors = extractColorsFromValue(rawVal);
        if (foundColors.length > 0) {
            let colorsHtml = foundColors.map((c, idx) => `
                <div class="color-wrapper" title="${c.original}">
                    <div class="color-dot" style="background:${c.hex}"></div>
                    <input type="color" value="${c.hex}" 
                           data-prop="${prop}" data-occ="${occ}" data-color-idx="${idx}"
                           oninput="handleMultiColorChange(this)">
                </div>
            `).join('');

            categories.colors.items.push(`
                <div class="tweak-item">
                    <div class="tweak-header">
                        <span class="tweak-label">${prop}</span>
                        <span class="tweak-value-display" style="font-size:0.7em">${foundColors.length} color(s)</span>
                    </div>
                    <div class="multi-color-container">
                        ${colorsHtml}
                    </div>
                </div>
            `);
        }

        const numMatch = rawVal.match(/^(-?\d*\.?\d+)(px|%|em|rem|s|deg|vw|vh|fr|)$/);
        if (numMatch) {
            const val = parseFloat(numMatch[1]);
            const unit = numMatch[2];
            let min = 0, max = 100, step = 1;
            if (unit === 'px') max = Math.max(val * 2, 500);
            else if (unit === 's') { max = 10; step = 0.1; }
            else if (unit === 'deg') { min = 0; max = 360; }

            categories.dims.items.push(`
                <div class="tweak-item">
                    <div class="tweak-header">
                        <span class="tweak-label">${prop}</span>
                        <span class="tweak-value-display">${val}${unit}</span>
                    </div>
                    <input type="range" min="${min}" max="${max}" step="${step}" value="${val}"
                           data-prop="${prop}" data-occ="${occ}" data-unit="${unit}"
                           oninput="handleNumberChange(this)">
                </div>
            `);
        }
    }

    [categories.layout, categories.colors, categories.dims].forEach(cat => {
        if (cat.items.length) {
            const div = document.createElement('div');
            div.innerHTML = `<div class="tweak-section-title">${cat.title}</div>` + cat.items.join('');
            tweaksPanel.appendChild(div);
        }
    });
    if (tweaksPanel.innerHTML === '') tweaksPanel.innerHTML = '<div style="padding:20px;text-align:center;color:#666">Aucune propriété détectée</div>';
}

// --- UPDATE HANDLERS (Robust) ---

function getDeclaration(prop, occIndex) {
    const css = inputs.css.value;
    // Même regex robuste que le générateur
    const re = /([a-zA-Z-]+)\s*:\s*([^;{}]+?)\s*(?:;|(?=\})|$)/g;
    let m;
    let count = -1;
    while ((m = re.exec(css)) !== null) {
        if (m[1].toLowerCase().trim() === prop) {
            count++;
            if (count === occIndex) {
                return {
                    fullMatch: m[0],
                    rawVal: m[2],
                    index: m.index,
                    // Index précis où commence la valeur (pour insertion chirurgicale)
                    valIndex: m.index + m[0].indexOf(m[2])
                };
            }
        }
    }
    return null;
}

// Remplace toute la ligne de déclaration
function replaceInCss(dec, newValue) {
    const css = inputs.css.value;
    // On reconstruit la ligne. On ajoute un ; par sécurité si ce n'est pas déjà un bloc
    const newLine = `${dec.fullMatch.split(':')[0]}: ${newValue};`;

    // Remplacement dans le gros string CSS
    const newCss = css.substring(0, dec.index) + newLine + css.substring(dec.index + dec.fullMatch.length);

    inputs.css.value = newCss;
    updatePreview();
}

function handleSelectChange(el) {
    const dec = getDeclaration(el.dataset.prop, parseInt(el.dataset.occ));
    if (dec) replaceInCss(dec, el.value);
}

function handleNumberChange(el) {
    const dec = getDeclaration(el.dataset.prop, parseInt(el.dataset.occ));
    if (dec) {
        const val = el.value + el.dataset.unit;
        replaceInCss(dec, val);
        el.previousElementSibling.children[1].innerText = val;
    }
}

function handleMultiColorChange(el) {
    const prop = el.dataset.prop;
    const occ = parseInt(el.dataset.occ);
    const colorIdx = parseInt(el.dataset.colorIdx);
    const newHex = el.value;

    el.previousElementSibling.style.background = newHex;

    // 1. Récupérer la ligne actuelle (fraîche, car l'utilisateur a peut-être déjà bougé un autre slider)
    const dec = getDeclaration(prop, occ);
    if (!dec) return;

    // 2. Extraire les couleurs de la valeur ACTUELLE du CSS
    const currentVal = dec.rawVal;
    const colors = extractColorsFromValue(currentVal);

    if (colors[colorIdx]) {
        const target = colors[colorIdx];

        // 3. Reconstruction chirurgicale de la valeur
        const before = currentVal.substring(0, target.index);
        const after = currentVal.substring(target.index + target.original.length);
        const newVal = before + newHex + after;

        replaceInCss(dec, newVal);
    }
}

// --- EXPORT/IMPORT/SAVE ---
function saveItem() {
    const data = {
        id: currentEditId || Date.now(),
        title: inputs.title.value || "Sans Titre",
        tags: inputs.tags.value.split(',').map(t => t.trim()).filter(t => t),
        notes: inputs.notes.value,
        html: inputs.html.value, css: inputs.css.value, js: inputs.js.value
    };
    if (currentEditId) library[library.findIndex(x => x.id === currentEditId)] = data;
    else library.push(data);
    saveToStorage(); closeEditor(); filterGrid(); showToast("Sauvegardé !");
}
function deleteItem(id) { if (confirm('Supprimer ?')) { library = library.filter(x => x.id !== id); saveToStorage(); filterGrid(); } }
function saveToStorage() { localStorage.setItem('ultimaLibData', JSON.stringify(library)); }
function showToast(msg) { const t = document.getElementById('toast'); t.innerText = msg; t.className = "show"; setTimeout(() => t.className = "", 3000); }
function copyCode(id, type) {
    const item = library.find(x => x.id === id);
    if (item) navigator.clipboard.writeText(item[type]).then(() => showToast("Copié!"));
}

// Imports (Simplified logic from prev versions)
function importDataReplace(input) { parseImport(input, true); }
function importDataAppend(input) { parseImport(input, false); }
function parseImport(input, replace) {
    const file = input.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = e => {
        try {
            const json = JSON.parse(e.target.result);
            if (replace) library = json; else library = library.concat(json);
            saveToStorage(); renderGrid(); showToast("Importé");
        } catch (e) { alert("Erreur JSON"); }
    };
    r.readAsText(file); input.value = '';
}
function exportData() {
    const b = new Blob([JSON.stringify(library, null, 2)], { type: "application/json" });
    const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = "ultima-lib.json";
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key === 's' && modal.classList.contains('active')) { e.preventDefault(); saveItem(); } });
