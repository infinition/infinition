/**
 * STARTX — bureau retro branche sur le vrai site.
 *
 * Chaque fenetre "reelle" ne duplique aucun contenu : ouvrir une icone
 * deplace la vraie .view-section de la page (#repos-view, #papers-view, ...)
 * dans le corps de la fenetre et appelle exactement la meme fonction d'init
 * que navigateTo() aurait appelee (initRepos, initPapers, ...). Fermer la
 * fenetre redepose la section dans <body> : le reste du site n'a jamais
 * connaissance de startx et continue de fonctionner normalement apres coup.
 * Le terminal suit le meme principe : c'est #terminal-dropdown lui-meme qui
 * se deplace dans sa fenetre, pas une copie.
 *
 * Les fichiers/dossiers crees depuis le bureau (clic droit ou appui long)
 * vivent dans js/vfs.js, le meme stockage que touch/mkdir/vi au terminal.
 */
window.STARTX = (function () {
    const WINDOWS = [
        { id: 'repos', section: 'repos-view', title: 'REPOS — ~/repos', accent: 'green', init: () => initRepos() },
        { id: 'blog', section: 'blog-view', title: 'DATA_LOGS — /var/log', accent: 'blue', init: () => runScanSimulation() },
        { id: 'kb', section: 'kb-view', title: 'KNOWLEDGE — /mnt/kb', accent: 'purple', init: () => initKB() },
        { id: 'music', section: 'music-view', title: 'AUDIO_FREQ — /dev/snd', accent: 'orange', init: null },
        { id: 'photos', section: 'photos-view', title: 'PHOTOS — /media', accent: 'red', init: () => initPhotos() },
        { id: 'art', section: 'art-view', title: 'ARTSTATION — /mnt/art', accent: 'purple', init: () => initArtStation() },
        { id: 'papers', section: 'papers-view', title: 'PAPERS — arxiv://', accent: 'blue', init: () => initPapers() },
        { id: 'portfolio', section: 'portfolio-view', title: '0xPOLLY — ~/whoami', accent: 'green', init: null },
        {
            id: 'hackers', section: 'hackers-view', title: 'GIBSON — root@mainframe', accent: 'red', init: () => {
                const f = document.getElementById('hackers-iframe');
                if (f && !String(f.getAttribute('src') || '').includes('hackers')) f.src = 'hackers/index.html';
            }
        },
        {
            id: 'terminal', section: 'terminal-dropdown', title: 'TERMINAL — bash', accent: 'green',
            init: () => {
                terminal.isOpen = true;
                terminal.container.classList.add('active');
                terminal.updatePrompt();
                setTimeout(() => terminal.input && terminal.input.focus(), 60);
            },
            onClose: () => {
                terminal.isOpen = false;
                terminal.container.classList.remove('active');
            }
        }
    ];

    const BOOT_LINES = [
        'INFINITION_OS — startx boot sequence',
        '[ OK ] mounting <b>/repos</b> — github api snapshot',
        '[ OK ] mounting <b>/data_logs</b> — articles + kb, git-dated',
        '[ OK ] mounting <b>/papers</b> — arxiv sync',
        '[ OK ] mounting <b>/photos</b> — derivatives only, originals sealed',
        '[ OK ] mounting <b>/artstation</b> — rss fallback engaged',
        '[ OK ] starting X — display :0'
    ];

    const SHUTDOWN_LINES = [
        'root@infinition:~# exit',
        '[ .. ] closing windows',
        '[ .. ] unmounting /repos /data_logs /papers /photos /artstation',
        '[ OK ] stopping X — display :0',
        'INFINITION_OS — session closed'
    ];

    const ICON_POS_KEY = 'infinition-startx-icon-pos';

    const state = {};
    let active = false;
    let zTop = 40;
    let openCount = 0;

    function reduceMotion() {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function shortTitle(cfg) { return cfg.title.split('—')[0].trim(); }

    /* ---------- resolution d'une fenetre : app reelle ou item virtuel ---------- */
    function cfgFor(id) {
        const found = WINDOWS.find(c => c.id === id);
        if (found) return found;
        if (id.startsWith('vfsfile:')) {
            const name = id.slice(8);
            return { id, title: `${name} — ~/`, accent: 'orange', virtual: true, render: (body) => renderFileEditor(body, name) };
        }
        if (id.startsWith('vfsdir:')) {
            const name = id.slice(7);
            return { id, title: `${name} — ~/`, accent: 'purple', virtual: true, render: (body) => renderFolderView(body, name) };
        }
        return null;
    }

    function renderFileEditor(body, name) {
        body.innerHTML = '';
        body.style.display = 'flex';
        body.style.flexDirection = 'column';

        const bar = document.createElement('div');
        bar.style.cssText = 'padding:6px 10px;border-bottom:1px solid #1c2b20;color:#5b7a63;' +
            'font-family:JetBrains Mono,monospace;font-size:11px;display:flex;justify-content:space-between;flex:none;';
        const nameEl = document.createElement('span');
        nameEl.textContent = '~/' + name;
        const status = document.createElement('span');
        status.textContent = 'saved';
        bar.appendChild(nameEl);
        bar.appendChild(status);

        const ta = document.createElement('textarea');
        ta.value = VFS.files[name] || '';
        ta.spellcheck = false;
        ta.style.cssText = 'flex:1;width:100%;background:#05070a;color:#cdeed8;border:none;outline:none;' +
            'resize:none;padding:12px;font-family:JetBrains Mono,monospace;font-size:13px;line-height:1.5;box-sizing:border-box;';

        let saveTimer = null;
        ta.addEventListener('input', () => {
            status.textContent = 'editing…';
            clearTimeout(saveTimer);
            saveTimer = setTimeout(() => {
                VFS.setFile(name, ta.value);
                status.textContent = 'saved';
            }, 400);
        });

        body.appendChild(bar);
        body.appendChild(ta);
        setTimeout(() => ta.focus(), 50);
    }

    function renderFolderView(body, name) {
        body.innerHTML =
            '<div style="padding:24px;color:#5b7a63;font-family:JetBrains Mono,monospace;font-size:13px;">' +
            `<div style="color:var(--neon-purple);margin-bottom:10px;">~/${escapeHtml(name)}</div>` +
            'This folder is empty.<br>Right-click (or long-press) the desktop to add a file.</div>';
    }

    /* ---------- boot / shutdown ---------- */
    function playBoot(onDone) {
        const power = document.getElementById('startx-power');
        const desktop = document.getElementById('startx-desktop');

        if (reduceMotion()) {
            power.hidden = true;
            desktop.classList.add('show');
            onDone();
            return;
        }

        power.hidden = false;
        power.classList.remove('leaving');
        desktop.classList.remove('show');
        power.innerHTML = BOOT_LINES.map(l => `<div class="dim">${l}</div>`).join('') +
            '<div class="dim">root@infinition:~# <span id="startx-bootcmd"></span><span class="startx-caret"></span></div>';

        const cmdEl = document.getElementById('startx-bootcmd');
        const cmd = 'startx';
        let i = 0;
        const typer = setInterval(() => {
            cmdEl.textContent += cmd[i] || '';
            i++;
            if (i > cmd.length) {
                clearInterval(typer);
                setTimeout(() => {
                    power.classList.add('leaving');
                    desktop.classList.add('show');
                    setTimeout(() => { power.hidden = true; onDone(); }, 450);
                }, 400);
            }
        }, 85);
    }

    function playShutdown(onDone) {
        const power = document.getElementById('startx-power');
        const desktop = document.getElementById('startx-desktop');

        if (reduceMotion()) {
            desktop.classList.remove('show');
            power.hidden = true;
            onDone();
            return;
        }

        power.hidden = false;
        power.classList.remove('leaving');
        desktop.classList.remove('show');
        power.innerHTML = SHUTDOWN_LINES.map(l => `<div class="dim">${l}</div>`).join('');

        setTimeout(() => {
            power.classList.add('leaving');
            setTimeout(() => { power.hidden = true; onDone(); }, 400);
        }, 650);
    }

    /* ---------- menu contextuel generique ---------- */
    let ctxMenuEl = null;

    function hideContextMenu() {
        if (ctxMenuEl) { ctxMenuEl.remove(); ctxMenuEl = null; }
    }

    function showContextMenu(x, y, items) {
        hideContextMenu();
        const desktop = document.getElementById('startx-desktop');
        const menu = document.createElement('div');
        menu.className = 'startx-ctxmenu';

        items.forEach(item => {
            if (item === '-') {
                const sep = document.createElement('div');
                sep.className = 'startx-ctxmenu-sep';
                menu.appendChild(sep);
                return;
            }
            const b = document.createElement('button');
            b.textContent = item.label;
            if (item.danger) b.classList.add('danger');
            b.addEventListener('click', (e) => {
                e.stopPropagation();
                hideContextMenu();
                item.action();
            });
            menu.appendChild(b);
        });

        desktop.appendChild(menu);
        const deskRect = desktop.getBoundingClientRect();
        let lx = x - deskRect.left, ly = y - deskRect.top;
        menu.style.left = lx + 'px';
        menu.style.top = ly + 'px';

        const mr = menu.getBoundingClientRect();
        if (mr.right > deskRect.right) menu.style.left = Math.max(0, lx - mr.width) + 'px';
        if (mr.bottom > deskRect.bottom) menu.style.top = Math.max(0, ly - mr.height) + 'px';

        ctxMenuEl = menu;
    }

    document.addEventListener('click', hideContextMenu);
    document.addEventListener('scroll', hideContextMenu, true);

    /* Declenche handler(x, y) sur clic droit ET sur appui long (tactile ou
       clic gauche maintenu) : la page n'a pas de vrai clic droit mobile. */
    function bindContextTrigger(el, handler, shouldSkip) {
        el.addEventListener('contextmenu', (e) => {
            if (shouldSkip && shouldSkip(e)) return;
            e.preventDefault();
            e.stopPropagation();
            handler(e.clientX, e.clientY);
        });

        let timer = null, longPressed = false, sx = 0, sy = 0;
        const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };

        el.addEventListener('pointerdown', (e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            if (shouldSkip && shouldSkip(e)) return;
            sx = e.clientX; sy = e.clientY;
            longPressed = false;
            timer = setTimeout(() => {
                longPressed = true;
                handler(e.clientX, e.clientY);
            }, 550);
        });
        el.addEventListener('pointermove', (e) => {
            if (timer && (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8)) cancel();
        });
        el.addEventListener('pointerup', cancel);
        el.addEventListener('pointerleave', cancel);
        el.addEventListener('click', (e) => {
            if (longPressed) { e.preventDefault(); e.stopPropagation(); longPressed = false; }
        }, true);
    }

    /* ---------- window DOM ---------- */
    function buildWindowEl(cfg) {
        const win = document.createElement('div');
        win.className = 'startx-window';
        win.id = 'startx-win-' + cfg.id;
        win.hidden = true;
        win.style.setProperty('--win-accent', 'var(--neon-' + cfg.accent + ')');
        win.innerHTML =
            '<div class="startx-win-title">' +
            '<span class="startx-win-dot"></span>' +
            '<span class="t">' + escapeHtml(cfg.title) + '</span>' +
            '<button class="startx-win-btn" data-act="min" title="Minimize" aria-label="Minimize">_</button>' +
            '<button class="startx-win-btn" data-act="max" title="Maximize" aria-label="Maximize"><i class="fas fa-expand"></i></button>' +
            '<button class="startx-win-btn" data-act="close" title="Close" aria-label="Close">×</button>' +
            '</div>' +
            '<div class="startx-win-body"></div>' +
            '<div class="startx-resize-handle" title="Resize"></div>';
        return win;
    }

    function wireWindow(entry) {
        const { el, cfg } = entry;
        const bar = el.querySelector('.startx-win-title');

        el.addEventListener('mousedown', () => focusWindow(cfg.id));
        bar.addEventListener('dblclick', (e) => {
            if (e.target.closest('.startx-win-btn')) return;
            toggleMaximize(cfg.id);
        });
        el.querySelector('[data-act="min"]').addEventListener('click', (e) => { e.stopPropagation(); minimizeWindow(cfg.id); });
        el.querySelector('[data-act="max"]').addEventListener('click', (e) => { e.stopPropagation(); toggleMaximize(cfg.id); });
        el.querySelector('[data-act="close"]').addEventListener('click', (e) => { e.stopPropagation(); closeWindow(cfg.id); });

        let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
        bar.addEventListener('pointerdown', (e) => {
            if (e.target.closest('.startx-win-btn') || entry.maximized) return;
            dragging = true;
            sx = e.clientX; sy = e.clientY;
            const deskRect = document.getElementById('startx-desktop').getBoundingClientRect();
            const r = el.getBoundingClientRect();
            ox = r.left - deskRect.left; oy = r.top - deskRect.top;
            el.style.left = ox + 'px';
            el.style.top = oy + 'px';
            bar.setPointerCapture(e.pointerId);
            focusWindow(cfg.id);
        });
        bar.addEventListener('pointermove', (e) => {
            if (!dragging) return;
            const nx = ox + (e.clientX - sx);
            const ny = Math.max(0, oy + (e.clientY - sy));
            el.style.left = nx + 'px';
            el.style.top = ny + 'px';
        });
        bar.addEventListener('pointerup', () => { dragging = false; });

        /* Poignee de redimensionnement, coin bas-droit. Elle reste visible
           en plein ecran: tirer dessus fait simplement sortir la fenetre
           de cet etat en gardant la taille qu'elle avait a l'ecran, comme
           n'importe quel gestionnaire de fenetres. */
        const handle = el.querySelector('.startx-resize-handle');
        let resizing = false, rsx = 0, rsy = 0, rsw = 0, rsh = 0;
        handle.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
            if (entry.maximized) unmaximizeInPlace(cfg.id);
            resizing = true;
            rsx = e.clientX; rsy = e.clientY;
            const r = el.getBoundingClientRect();
            rsw = r.width; rsh = r.height;
            handle.setPointerCapture(e.pointerId);
            focusWindow(cfg.id);
        });
        handle.addEventListener('pointermove', (e) => {
            if (!resizing) return;
            el.style.width = Math.max(280, rsw + (e.clientX - rsx)) + 'px';
            el.style.height = Math.max(180, rsh + (e.clientY - rsy)) + 'px';
        });
        handle.addEventListener('pointerup', () => { resizing = false; });

        bindContextTrigger(bar, (x, y) => showWinTitleMenu(cfg.id, x, y), (e) => !!e.target.closest('.startx-win-btn'));
    }

    /* Sortie du plein ecran sans rendre sa taille d'avant: la fenetre
       garde exactement ce qu'elle occupe a l'ecran, ce qui permet
       d'enchainer sur un redimensionnement sans saut. */
    function unmaximizeInPlace(id) {
        const entry = state[id];
        if (!entry || !entry.maximized) return;
        const r = entry.el.getBoundingClientRect();
        const deskRect = document.getElementById('startx-desktop').getBoundingClientRect();
        entry.maximized = false;
        entry.el.classList.remove('maximized');
        entry.el.style.left = (r.left - deskRect.left) + 'px';
        entry.el.style.top = (r.top - deskRect.top) + 'px';
        entry.el.style.width = r.width + 'px';
        entry.el.style.height = r.height + 'px';
        const icon = entry.el.querySelector('[data-act="max"] i');
        if (icon) icon.className = 'fas fa-expand';
    }

    function showWinTitleMenu(id, x, y) {
        const entry = state[id];
        if (!entry) return;
        showContextMenu(x, y, [
            { label: entry.minimized ? 'Restore' : 'Minimize', action: () => entry.minimized ? restoreWindow(id) : minimizeWindow(id) },
            { label: entry.maximized ? 'Restore Size' : 'Maximize', action: () => toggleMaximize(id) },
            '-',
            { label: 'Close', danger: true, action: () => closeWindow(id) }
        ]);
    }

    function ensureWindow(id) {
        if (state[id]) return state[id];
        const cfg = cfgFor(id);
        if (!cfg) return null;
        const el = buildWindowEl(cfg);
        document.getElementById('startx-windows').appendChild(el);
        const entry = { el, cfg, body: el.querySelector('.startx-win-body'), opened: false, minimized: false, maximized: false, prevRect: null, taskBtn: null };
        wireWindow(entry);
        state[id] = entry;
        return entry;
    }

    /* ---------- contenu de la fenetre : vraie section deplacee, ou rendu virtuel ---------- */
    function mountContent(entry) {
        if (entry.cfg.virtual) { entry.cfg.render(entry.body); return; }
        const section = document.getElementById(entry.cfg.section);
        if (!section) return;
        entry.body.appendChild(section);
        if (typeof entry.cfg.init === 'function') entry.cfg.init();
    }

    function unmountContent(entry) {
        if (entry.cfg.virtual) return;
        const section = document.getElementById(entry.cfg.section);
        if (section && section.parentNode !== document.body) document.body.appendChild(section);
        if (typeof entry.cfg.onClose === 'function') entry.cfg.onClose();
    }

    /* ---------- taskbar ---------- */
    function taskbarBtn(id, label) {
        const b = document.createElement('button');
        b.className = 'startx-task';
        b.dataset.win = id;
        b.textContent = label;
        b.addEventListener('click', () => {
            const entry = state[id];
            if (!entry) return;
            if (!entry.el.hidden && isTop(id)) minimizeWindow(id);
            else restoreWindow(id);
        });
        bindContextTrigger(b, (x, y) => showWinTitleMenu(id, x, y));
        return b;
    }

    function isTop(id) {
        const entry = state[id];
        return !!entry && parseInt(entry.el.style.zIndex || 0, 10) === zTop;
    }

    function focusWindow(id) {
        const entry = state[id];
        if (!entry) return;
        zTop += 1;
        entry.el.style.zIndex = zTop;
        document.querySelectorAll('.startx-task').forEach(t => t.classList.toggle('active', t.dataset.win === id));
    }

    /* ---------- public window actions ---------- */
    function openWindow(id) {
        const entry = ensureWindow(id);
        if (!entry) return;

        if (!entry.opened) {
            entry.opened = true;
            openCount += 1;
            const off = openCount % 5;
            entry.el.style.left = (6 + off * 3) + '%';
            entry.el.style.top = (6 + off * 4) + '%';
            mountContent(entry);
            entry.taskBtn = taskbarBtn(id, shortTitle(entry.cfg));
            document.getElementById('startx-tasks').appendChild(entry.taskBtn);
        }

        entry.el.hidden = false;
        entry.minimized = false;
        focusWindow(id);
    }

    function closeWindow(id) {
        const entry = state[id];
        if (!entry) return;
        if (entry.taskBtn) entry.taskBtn.remove();
        unmountContent(entry);
        entry.el.remove();
        delete state[id];
    }

    function minimizeWindow(id) {
        const entry = state[id];
        if (!entry) return;
        entry.el.hidden = true;
        entry.minimized = true;
        document.querySelectorAll('.startx-task').forEach(t => t.classList.remove('active'));
    }

    function restoreWindow(id) {
        const entry = state[id];
        if (!entry) return;
        entry.el.hidden = false;
        entry.minimized = false;
        focusWindow(id);
    }

    function toggleMaximize(id) {
        const entry = state[id];
        if (!entry) return;
        const icon = entry.el.querySelector('[data-act="max"] i');

        if (!entry.maximized) {
            entry.prevRect = {
                left: entry.el.style.left, top: entry.el.style.top,
                width: entry.el.style.width, height: entry.el.style.height
            };
            entry.maximized = true;
            entry.el.classList.add('maximized');
            if (icon) icon.className = 'fas fa-compress';
        } else {
            entry.maximized = false;
            entry.el.classList.remove('maximized');
            if (entry.prevRect) {
                entry.el.style.left = entry.prevRect.left;
                entry.el.style.top = entry.prevRect.top;
                entry.el.style.width = entry.prevRect.width;
                entry.el.style.height = entry.prevRect.height;
            }
            if (icon) icon.className = 'fas fa-expand';
        }
        focusWindow(id);
    }

    function closeAllWindows() {
        Object.keys(state).forEach(closeWindow);
    }

    /* ---------- bureau : icones VFS, glisser-deposer, creation ---------- */
    function loadIconPos() {
        try { return JSON.parse(localStorage.getItem(ICON_POS_KEY) || '{}'); } catch (e) { return {}; }
    }
    function saveIconPos(target, left, top) {
        const pos = loadIconPos();
        pos[target] = { left, top };
        try { localStorage.setItem(ICON_POS_KEY, JSON.stringify(pos)); } catch (e) { /* prive/quota */ }
    }
    function applyIconPos(btn) {
        const p = loadIconPos()[btn.dataset.target];
        if (p) {
            btn.classList.add('free');
            btn.style.left = p.left + 'px';
            btn.style.top = p.top + 'px';
        }
    }
    function resetIconLayout() {
        document.querySelectorAll('.startx-icon.free').forEach(el => {
            el.classList.remove('free');
            el.style.left = ''; el.style.top = '';
        });
        try { localStorage.removeItem(ICON_POS_KEY); } catch (e) { /* ignore */ }
    }

    function wireIconInteractions(btn) {
        const container = document.getElementById('startx-icons');
        let dragging = false, moved = false, downX = 0, downY = 0;

        btn.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            downX = e.clientX; downY = e.clientY;
            moved = false;
            const startRect = btn.getBoundingClientRect();
            const contRect = container.getBoundingClientRect();
            const offX = startRect.left - contRect.left;
            const offY = startRect.top - contRect.top;

            const onMove = (ev) => {
                const dx = ev.clientX - downX, dy = ev.clientY - downY;
                if (!moved && Math.hypot(dx, dy) < 6) return;
                if (!moved) {
                    moved = true;
                    dragging = true;
                    btn.classList.add('free');
                    btn.style.left = offX + 'px';
                    btn.style.top = offY + 'px';
                }
                btn.style.left = (offX + dx) + 'px';
                btn.style.top = Math.max(0, offY + dy) + 'px';
            };
            const onUp = () => {
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', onUp);
                if (dragging) {
                    saveIconPos(btn.dataset.target, parseFloat(btn.style.left), parseFloat(btn.style.top));
                }
                setTimeout(() => { dragging = false; }, 0);
            };
            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
        });

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (moved) { moved = false; return; }
            const target = btn.dataset.target;
            if (target === 'startx-noop') return;
            openWindow(target);
        });

        bindContextTrigger(btn, (x, y) => showIconContextMenu(btn, x, y));
    }

    function showIconContextMenu(btn, x, y) {
        const target = btn.dataset.target;
        const items = [{ label: 'Open', action: () => openWindow(target) }];
        if (btn.dataset.vfs) {
            items.push('-', { label: 'Delete', danger: true, action: () => deleteVfsIcon(target) });
        }
        showContextMenu(x, y, items);
    }

    function deleteVfsIcon(target) {
        if (target.startsWith('vfsdir:')) VFS.deleteDir(target.slice(7));
        else if (target.startsWith('vfsfile:')) VFS.deleteFile(target.slice(8));
        closeWindow(target);
        const pos = loadIconPos();
        delete pos[target];
        try { localStorage.setItem(ICON_POS_KEY, JSON.stringify(pos)); } catch (e) { /* ignore */ }
    }

    function buildDesktopIcon(target, label, kind, accent) {
        const btn = document.createElement('button');
        btn.className = 'startx-icon';
        btn.dataset.target = target;
        btn.dataset.vfs = '1';
        btn.style.color = 'var(--neon-' + accent + ')';
        const svg = kind === 'folder'
            ? '<svg viewBox="0 0 24 20" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1 4h7l2 2h13v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4z"/></svg>'
            : '<svg viewBox="0 0 24 20" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 1h10l5 5v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1z"/><path d="M14 1v5h5"/></svg>';
        btn.innerHTML = svg + `<span class="lbl">${escapeHtml(label)}</span>`;
        wireIconInteractions(btn);
        applyIconPos(btn);
        return btn;
    }

    function renderVfsIcons() {
        const container = document.getElementById('startx-icons');
        container.querySelectorAll('.startx-icon[data-vfs]').forEach(el => el.remove());
        Object.keys(VFS.dirs).forEach(name => container.appendChild(buildDesktopIcon('vfsdir:' + name, name, 'folder', 'purple')));
        Object.keys(VFS.files).forEach(name => container.appendChild(buildDesktopIcon('vfsfile:' + name, name, 'file', 'orange')));
    }

    document.addEventListener('vfs:change', renderVfsIcons);

    function createDesktopItem(kind) {
        const label = kind === 'dir' ? 'Folder name:' : 'File name:';
        const fallback = kind === 'dir' ? 'New Folder' : 'New File.txt';
        let name = window.prompt(label, fallback);
        if (!name) return;
        name = name.trim();
        if (!name) return;
        if (kind === 'dir') {
            if (VFS.hasDir(name)) { window.alert('A folder with that name already exists.'); return; }
            VFS.makeDir(name);
        } else {
            if (VFS.hasFile(name)) { window.alert('A file with that name already exists.'); return; }
            VFS.setFile(name, '');
        }
    }

    function showDesktopMenu(x, y) {
        showContextMenu(x, y, [
            { label: '+ New Folder', action: () => createDesktopItem('dir') },
            { label: '+ New Text File', action: () => createDesktopItem('file') },
            '-',
            { label: 'Arrange Icons', action: resetIconLayout }
        ]);
    }

    /* ---------- lifecycle, called from navigateTo() ---------- */
    function enter() {
        if (active) return;
        active = true;
        renderVfsIcons();
        playBoot(() => { });
    }

    function requestExit(viewId, keepScroll) {
        /* Coupee tout de suite : la fausse sortie qui suit rappelle
           navigateTo(), et la garde plus bas ne doit pas la reintercepter. */
        active = false;
        const menu = document.getElementById('startx-menu');
        if (menu) menu.hidden = true;
        playShutdown(() => {
            closeAllWindows();
            navigateTo(viewId, keepScroll);
        });
    }

    function toggle() {
        if (active) navigateTo('portal');
        else navigateTo('startx');
    }

    /* ---------- chrome wiring ---------- */
    function wireChrome() {
        document.querySelectorAll('.startx-icon').forEach(btn => {
            wireIconInteractions(btn);
            applyIconPos(btn);
        });

        const desktop = document.getElementById('startx-desktop');
        bindContextTrigger(desktop, showDesktopMenu, (e) =>
            !!(e.target.closest('.startx-icon') || e.target.closest('.startx-window') || e.target.closest('.startx-taskbar')));

        const startBtn = document.getElementById('startx-start-btn');
        const menu = document.getElementById('startx-menu');
        if (menu) {
            menu.innerHTML =
                '<div style="padding:8px 12px;border-bottom:1px solid #1c2b20;color:var(--neon-green);">0xPOLLY' +
                '<br><small style="color:#5b7a63;font-size:10px;letter-spacing:.05em;">root@infinition</small></div>' +
                WINDOWS.map(c => `<button data-target="${c.id}">${escapeHtml(shortTitle(c))}</button>`).join('') +
                '<button data-action="shutdown" style="color:var(--neon-red);border-top:1px solid #1c2b20;">⏻ SHUTDOWN</button>';

            menu.querySelectorAll('button[data-target]').forEach(b => {
                b.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openWindow(b.dataset.target);
                    menu.hidden = true;
                });
            });
            const shutdownBtn = menu.querySelector('[data-action="shutdown"]');
            if (shutdownBtn) shutdownBtn.addEventListener('click', () => { menu.hidden = true; navigateTo('portal'); });

            if (startBtn) {
                startBtn.addEventListener('click', (e) => { e.stopPropagation(); menu.hidden = !menu.hidden; });
            }
            document.addEventListener('click', (e) => {
                if (!menu.hidden && !menu.contains(e.target) && e.target !== startBtn) menu.hidden = true;
            });
        }

        setInterval(() => {
            const el = document.getElementById('startx-clock');
            if (!el) return;
            const d = new Date();
            const p = n => String(n).padStart(2, '0');
            el.textContent = p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
        }, 1000);
    }

    document.addEventListener('DOMContentLoaded', wireChrome);

    return {
        enter, requestExit, toggle, openWindow,
        get active() { return active; }
    };
})();
