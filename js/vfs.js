/**
 * VFS — petit systeme de fichiers virtuel partage entre le terminal (vi,
 * touch, mkdir, cat...) et le bureau StartX (icones "New Folder"/"New Text
 * File"). Un seul niveau : pas de dossier dans un dossier, les dossiers ne
 * sont pour l'instant qu'un regroupement visuel sur le bureau.
 *
 * Persiste dans localStorage ; emet 'vfs:change' sur tout changement pour
 * que le bureau puisse se re-rendre sans que ce fichier connaisse StartX.
 */
const VFS = (function () {
    const KEY = 'infinition-vfs-v1';

    function load() {
        try {
            const raw = localStorage.getItem(KEY);
            const data = raw ? JSON.parse(raw) : null;
            if (data && typeof data === 'object') {
                return { files: data.files || {}, dirs: data.dirs || {} };
            }
        } catch (e) { /* quota, navigation privee : on repart a vide */ }
        return { files: {}, dirs: {} };
    }

    let state = load();

    function persist() {
        try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
        document.dispatchEvent(new CustomEvent('vfs:change'));
    }

    return {
        get files() { return state.files; },
        get dirs() { return state.dirs; },
        hasFile: (name) => Object.prototype.hasOwnProperty.call(state.files, name),
        hasDir: (name) => Object.prototype.hasOwnProperty.call(state.dirs, name),
        setFile: (name, content) => { state.files[name] = content; persist(); },
        deleteFile: (name) => { delete state.files[name]; persist(); },
        makeDir: (name) => { if (!state.dirs[name]) { state.dirs[name] = true; persist(); } },
        deleteDir: (name) => { delete state.dirs[name]; persist(); }
    };
})();
