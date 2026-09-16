/**
 * Terminal Logic for Infinition Portal
 * Handles commands, input processing, and display.
 */

/* Distance d'edition entre deux commandes, pour suggerer la plus proche
   quand la saisie ne correspond a rien ("Did you mean...?"). */
function levenshtein(a, b) {
    const m = a.length, n = b.length;
    const d = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
    for (let j = 0; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            d[i][j] = a[i - 1] === b[j - 1]
                ? d[i - 1][j - 1]
                : 1 + Math.min(d[i - 1][j - 1], d[i - 1][j], d[i][j - 1]);
        }
    }
    return d[m][n];
}

const terminal = {
    isOpen: false,
    history: [],
    historyIndex: -1,
    container: null,
    input: null,
    output: null,

    currentPath: "/home/visitor",
    user: "visitor",
    waitingForPassword: false,
    passwordCallback: null,
    bootTime: Date.now(),
    _lastLogList: null,
    maximized: false,

    // Command definitions
    commands: {
        help: {
            desc: "List available commands",
            action: () => {
                terminal.print("AVAILABLE COMMANDS:", "term-info");
                terminal.print("  help        - Show this help message");
                terminal.print("  whoami      - Display current user info");
                terminal.print("  contact     - Show contact information");
                terminal.print("  clear       - Clear the terminal screen");
                terminal.print("  date        - Show current system date");
                terminal.print("  music       - Navigate to Audio Frequency");
                terminal.print("  kb          - Navigate to Knowledge Base");
                terminal.print("  portfolio   - Navigate to Profile/Portfolio");
                terminal.print("  photos [tag]- Navigate to the Photo Gallery, optional tag");
                terminal.print("  log [n|q]   - Data Logs: list, or open entry by number/title");
                terminal.print("  root        - Navigate to Root/Portal");
                terminal.print("  startx      - Launch the StartX desktop");
                terminal.print("  papers [q]  - Navigate to the Library, optional filter");
                terminal.print("  art         - Navigate to the ArtStation Gallery");
                terminal.print("  repos [q]   - Navigate to Repos Grid, optional filter");
                terminal.print("  cd [dir]    - Change directory (nav simulation)");
                terminal.print("  ls / ll     - List directories");
                terminal.print("  pwd         - Print working directory");
                terminal.print("  cat [file]  - Read file content");
                terminal.print("  more/less   - Read file content (alias)");
                terminal.print("  head/tail   - Show first/last lines, -n N");
                terminal.print("  touch [f]   - Create an empty file");
                terminal.print("  mkdir [d]   - Create a directory");
                terminal.print("  rm [f]      - Remove a file or directory");
                terminal.print("  vi/vim [f]  - Edit a file (:w :q :q! :wq)");
                terminal.print("  man [cmd]   - Show the manual for a command");
                terminal.print("  echo [text] - Print text");
                terminal.print("  uname [-a]  - System info");
                terminal.print("  id          - Show user identity");
                terminal.print("  open [dest] - Open an external link (linkedin, github, ...)");
                terminal.print("  neofetch    - Show system & session info");
                terminal.print("  history     - Show command history");
                terminal.print("  ifconfig    - Show network info");
                terminal.print("  agent       - Show User Agent");
                terminal.print("  su          - Switch user");
                terminal.print("  search      - Launch global search");
                terminal.print("  find        - Alias for search");
                terminal.print("  exit / :q   - Close terminal");
                terminal.print("");
                terminal.print("Tip: press ` (backtick) anywhere on the site to toggle this terminal.", "term-purple");
            }
        },
        search: {
            desc: "Launch global search",
            action: (args) => {
                const query = args.join(' ');
                terminal.print(query ? `Searching for: ${query}...` : "Launching search protocol...", "term-warn");
                setTimeout(() => {
                    const modal = document.getElementById('search-modal');
                    const input = document.getElementById('global-search-input');
                    if (modal && input) {
                        modal.classList.add('active');
                        if (query) {
                            input.value = query;
                            // Trigger the input event to refresh results immediately
                            input.dispatchEvent(new Event('input'));
                        }
                        input.focus();
                    }
                    terminal.toggle();
                }, 500);
            }
        },
        find: {
            desc: "Alias for search",
            action: (args) => {
                terminal.commands.search.action(args);
            }
        },
        whoami: {
            desc: "Display user info",
            action: () => {
                const user = terminal.user || "visitor";
                terminal.print(`User: ${user}@infinition.net`, "term-success");
                if (user === "root") {
                    terminal.print("Role: Superuser / Administrator");
                    terminal.print("Access Level: Unrestricted");
                } else {
                    terminal.print("Role: Guest / Observer");
                    terminal.print("Access Level: Restricted (Read-Only)");
                }
            }
        },
        contact: {
            desc: "Show contact info",
            action: () => {
                terminal.print("CONTACT CHANNELS:", "term-purple");
                terminal.print("  LinkedIn: linkedin.com/in/fabienpolly");
                terminal.print("  GitHub:   github.com/infinition");
                terminal.print("  Discord:  Available on request");
            }
        },
        open: {
            desc: "Open an external link in a new tab",
            action: (args) => {
                const target = (args[0] || '').toLowerCase();
                const social = (typeof CONFIG !== 'undefined' && CONFIG.social) || {};
                const map = {
                    linkedin: social.linkedin,
                    github: social.github,
                    reddit: social.reddit,
                    discord: social.discord,
                    artstation: social.artstation,
                    art: social.artstation
                };
                const url = map[target];

                if (!target) {
                    terminal.print("Usage: open <linkedin|github|reddit|discord|artstation>", "term-info");
                    return;
                }
                if (!url) {
                    terminal.print(`open: unknown target '${target}'`, "term-error");
                    return;
                }
                terminal.print(`Opening ${target}...`, "term-warn");
                window.open(url, '_blank', 'noopener');
            }
        },
        clear: {
            desc: "Clear screen",
            action: () => {
                terminal.output.innerHTML = "";
            }
        },
        date: {
            desc: "Show date",
            action: () => {
                terminal.print(new Date().toString());
            }
        },
        exit: {
            desc: "Close terminal",
            action: () => {
                terminal.toggle();
            }
        },
        ":q": {
            desc: "Close terminal",
            action: () => {
                terminal.toggle();
            }
        },
        music: {
            desc: "Go to Music",
            action: () => {
                terminal.print("Navigating to Audio Subsystem...", "term-warn");
                setTimeout(() => {
                    navigateTo('music');
                    terminal.toggle();
                }, 500);
            }
        },
        kb: {
            desc: "Go to Knowledge Base",
            action: () => {
                terminal.print("Navigating to Knowledge Base...", "term-warn");
                setTimeout(() => {
                    navigateTo('kb');
                    terminal.toggle();
                }, 500);
            }
        },
        photos: {
            desc: "Go to the Photo Gallery",
            action: (args) => {
                const tag = (args && args.length) ? args.join(' ') : '';
                terminal.print(tag
                    ? `Opening the gallery, tag: ${tag}...`
                    : "Opening the photo gallery...", "term-warn");
                setTimeout(() => {
                    navigateTo('photos');
                    terminal.toggle();
                    if (tag && typeof PHOTOS !== 'undefined') {
                        // La grille se peuple en asynchrone, filtre applique apres.
                        setTimeout(() => PHOTOS.focusTag(tag), 600);
                    }
                }, 500);
            }
        },
        photo: {
            desc: "Go to the Photo Gallery (Alias)",
            action: (args) => {
                terminal.commands.photos.action(args);
            }
        },
        pics: {
            desc: "Go to the Photo Gallery (Alias)",
            action: (args) => {
                terminal.commands.photos.action(args);
            }
        },
        log: {
            desc: "Go to Data Logs, or open an entry by number/title",
            action: async (args) => {
                const query = (args && args.length) ? args.join(' ').trim() : '';

                // Un numero fait reference a la derniere liste affichee (pleine
                // liste ou resultats d'une recherche precedente), sans refaire
                // d'appel reseau.
                const idx = parseInt(query, 10);
                if (query && !isNaN(idx) && terminal._lastLogList && terminal._lastLogList[idx - 1]) {
                    terminal._openLogEntry(terminal._lastLogList[idx - 1]);
                    return;
                }

                if (!query) {
                    terminal.print("Accessing Data Logs...", "term-warn");
                    setTimeout(() => {
                        navigateTo('blog');
                        terminal.toggle();
                    }, 500);
                    return;
                }

                terminal.print(`Searching data logs for: ${query}...`, "term-warn");
                const articles = await fetchLocalDataLogs();
                if (!articles || !articles.length) {
                    terminal.print("No entries found.", "term-error");
                    return;
                }

                const q = query.toLowerCase();
                const matches = articles.filter(a => a.title.toLowerCase().includes(q));

                if (matches.length === 0) {
                    terminal.print(`log: no entry matching '${query}'`, "term-error");
                } else if (matches.length === 1) {
                    terminal._openLogEntry(matches[0]);
                } else {
                    terminal._lastLogList = matches;
                    terminal.print(`${matches.length} matches — 'log <n>' to open:`, "term-info");
                    matches.slice(0, 10).forEach((a, i) => terminal.print(`  [${i + 1}] ${a.title}`, "term-success"));
                }
            }
        },
        logs: {
            desc: "Go to Data Logs, or open an entry (Alias)",
            action: (args) => {
                terminal.commands.log.action(args);
            }
        },
        read: {
            desc: "Go to Data Logs, or open an entry (Alias)",
            action: (args) => {
                terminal.commands.log.action(args);
            }
        },
        root: {
            desc: "Go to Root",
            action: () => {
                terminal.print("Returning to Root...", "term-warn");
                setTimeout(() => {
                    navigateTo('portal');
                    terminal.toggle();
                }, 500);
            }
        },
        startx: {
            desc: "Launch the StartX desktop",
            action: () => {
                terminal.print("Starting X — display :0...", "term-warn");
                setTimeout(() => {
                    navigateTo('startx');
                    terminal.toggle();
                }, 500);
            }
        },
        papers: {
            desc: "Go to the Library",
            action: (args) => {
                const term = (args && args.length) ? args.join(' ') : '';
                terminal.print(term
                    ? `Opening the archive, filter: ${term}...`
                    : "Opening the library...", "term-warn");
                setTimeout(() => {
                    navigateTo('papers');
                    terminal.toggle();
                    if (term && typeof PAPERS !== 'undefined') {
                        // Le rayonnage se peuple en asynchrone, filtre applique apres.
                        setTimeout(() => PAPERS.focusFilter(term), 600);
                    }
                }, 500);
            }
        },
        paper: {
            desc: "Go to the Library (Alias)",
            action: (args) => {
                terminal.commands.papers.action(args);
            }
        },
        arxiv: {
            desc: "Go to the Library (Alias)",
            action: (args) => {
                terminal.commands.papers.action(args);
            }
        },
        library: {
            desc: "Go to the Library (Alias)",
            action: (args) => {
                terminal.commands.papers.action(args);
            }
        },
        art: {
            desc: "Go to the ArtStation Gallery",
            action: () => {
                terminal.print("Opening the ArtStation gallery...", "term-warn");
                setTimeout(() => {
                    navigateTo('art');
                    terminal.toggle();
                }, 500);
            }
        },
        artstation: {
            desc: "Go to the ArtStation Gallery (Alias)",
            action: () => {
                terminal.commands.art.action();
            }
        },
        gallery: {
            desc: "Go to the ArtStation Gallery (Alias)",
            action: () => {
                terminal.commands.art.action();
            }
        },
        repos: {
            desc: "Go to Repos Grid",
            action: (args) => {
                const term = (args && args.length) ? args.join(' ') : '';
                terminal.print(term
                    ? `Mounting repository grid, filter: ${term}...`
                    : "Mounting repository grid...", "term-warn");
                setTimeout(() => {
                    navigateTo('repos');
                    terminal.toggle();
                    if (term && typeof REPOS !== 'undefined') {
                        // La grille se peuple en asynchrone, on applique le filtre apres.
                        setTimeout(() => REPOS.focusFilter(term), 600);
                    }
                }, 500);
            }
        },
        repo: {
            desc: "Go to Repos Grid (Alias)",
            action: (args) => {
                terminal.commands.repos.action(args);
            }
        },
        cd: {
            desc: "Change directory",
            action: (args) => {
                // Un dossier cree depuis le bureau peut avoir un nom a
                // plusieurs mots ("New Folder") : on recolle tout l'argument
                // plutot que de ne garder que le premier mot.
                const target = args.join(' ');

                // cd with no args -> go to home
                if (!target || target === "~") {
                    terminal.currentPath = "/home/visitor";
                    return;
                }

                if (target === "..") {
                    if (terminal.currentPath !== "/home/visitor") {
                        terminal.currentPath = "/home/visitor";
                    } else {
                        terminal.commands.root.action();
                    }
                } else if (target === "secrets") {
                    if (terminal.user !== "root") {
                        terminal.print("bash: cd: secrets: Permission denied", "term-error");
                        return;
                    }
                    terminal.currentPath = "/home/visitor/secrets";
                } else if (target === "music" || target === "audio") {
                    terminal.commands.music.action();
                } else if (target === "photos" || target === "photo" || target === "pics") {
                    terminal.commands.photos.action([]);
                } else if (target === "log" || target === "logs" || target === "blog") {
                    terminal.commands.log.action();
                } else if (target === "kb") {
                    terminal.commands.kb.action();
                } else if (target === "portfolio" || target === "profile" || target === "profil") {
                    terminal.commands.portfolio.action();
                } else if (target === "papers" || target === "paper" || target === "arxiv" || target === "library") {
                    terminal.commands.papers.action([]);
                } else if (target === "art" || target === "artstation" || target === "gallery") {
                    terminal.commands.art.action();
                } else if (target === "repos" || target === "repo" || target === "git") {
                    terminal.commands.repos.action([]);
                } else if (target === "startx" || target === "gui") {
                    terminal.commands.startx.action();
                } else if (VFS.hasDir(target)) {
                    terminal.currentPath = "/home/visitor/" + target;
                } else {
                    terminal.print(`cd: ${target}: No such directory`, "term-error");
                }
            }
        },
        portfolio: {
            desc: "Go to Portfolio",
            action: () => {
                terminal.print("Accessing User Profile...", "term-warn");
                setTimeout(() => {
                    navigateTo('portfolio');
                    terminal.toggle();
                }, 500);
            }
        },
        profile: {
            desc: "Go to Portfolio (Alias)",
            action: () => {
                terminal.commands.portfolio.action();
            }
        },
        profil: {
            desc: "Go to Portfolio (Alias)",
            action: () => {
                terminal.commands.portfolio.action();
            }
        },
        ls: {
            desc: "List directories",
            action: (args) => {
                const isLong = args.includes('-la') || args.includes('-l');

                if (terminal.currentPath === "/home/visitor/secrets") {
                    if (isLong) {
                        terminal.print("-r--------  1 root root 32 Nov 30 00:00 flag.txt", "term-info");
                    } else {
                        terminal.print("flag.txt", "term-info");
                    }
                    return;
                }

                // Un dossier cree via mkdir/le bureau est plat : rien a lister
                // dedans, comme un vrai dossier tout juste cree.
                if (VFS.hasDir(terminal.currentPath.split('/').pop()) && terminal.currentPath !== "/home/visitor") {
                    terminal.print(isLong ? "total 0" : "", "term-info");
                    return;
                }

                const vfsDirs = Object.keys(VFS.dirs);
                const vfsFiles = Object.keys(VFS.files);

                if (isLong) {
                    ["music", "photos", "logs", "kb", "portfolio", "papers", "art", "repos", "startx"].forEach(d =>
                        terminal.print(`drwxr-xr-x  2 visitor visitor 4096 Nov 30 00:00 ${d}`, "term-info"));
                    vfsDirs.forEach(d => terminal.print(`drwxr-xr-x  2 visitor visitor 4096 Nov 30 00:00 ${d}`, "term-info"));
                    terminal.print("drwx------  2 root    root    4096 Nov 30 00:00 secrets", "term-info");
                    terminal.print("-rw-r--r--  1 visitor visitor 1024 Nov 30 00:00 README.md", "term-info");
                    vfsFiles.forEach(f =>
                        terminal.print(`-rw-r--r--  1 visitor visitor ${String(VFS.files[f].length).padStart(4, ' ')} Nov 30 00:00 ${f}`, "term-info"));
                } else {
                    const all = ["music", "photos", "logs", "kb", "portfolio", "papers", "art", "repos", "startx", ...vfsDirs, "secrets", "README.md", ...vfsFiles];
                    terminal.print(all.join("  "), "term-info");
                }
            }
        },
        ll: {
            desc: "List directories (long)",
            action: () => {
                terminal.commands.ls.action(['-l']);
            }
        },
        pwd: {
            desc: "Print working directory",
            action: () => {
                terminal.print(terminal.currentPath);
            }
        },
        cat: {
            desc: "Read file content",
            action: (args) => {
                const file = args.join(' ');
                if (!file) {
                    terminal.print("Usage: cat [file]");
                    return;
                }
                const lines = terminal._fileContent(file);
                if (!lines) {
                    terminal.print(`cat: ${file}: No such file or directory`, "term-error");
                    return;
                }
                const isFlag = terminal.currentPath === "/home/visitor/secrets" && file === "flag.txt";
                lines.forEach(l => terminal.print(l, isFlag ? "term-success" : ""));
            }
        },
        more: {
            desc: "Read file content, page by page (alias)",
            action: (args) => terminal.commands.cat.action(args)
        },
        less: {
            desc: "Read file content (alias)",
            action: (args) => terminal.commands.cat.action(args)
        },
        head: {
            desc: "Show the first lines of a file",
            action: (args) => terminal._headTail(args, true)
        },
        tail: {
            desc: "Show the last lines of a file",
            action: (args) => terminal._headTail(args, false)
        },
        man: {
            desc: "Show the manual page for a command",
            action: (args) => {
                const name = (args[0] || '').toLowerCase();
                if (!name) {
                    terminal.print("What manual page do you want?", "term-info");
                    return;
                }
                const cmd = terminal.commands[name];
                if (!cmd) {
                    terminal.print(`No manual entry for ${name}`, "term-error");
                    return;
                }
                terminal.print("NAME", "term-purple");
                terminal.print(`    ${name} — ${cmd.desc}`);
                terminal.print("");
                terminal.print("SYNOPSIS", "term-purple");
                terminal.print(`    ${name}`);
            }
        },
        echo: {
            desc: "Display a line of text",
            action: (args) => terminal.print(args.join(' '))
        },
        uname: {
            desc: "Print system information",
            action: (args) => {
                terminal.print(args.includes('-a')
                    ? "Linux infinition 6.9.1-hyperblade #1 SMP PREEMPT_DYNAMIC x86_64 GNU/Linux"
                    : "Linux");
            }
        },
        id: {
            desc: "Show user identity",
            action: () => {
                terminal.print(terminal.user === "root"
                    ? "uid=0(root) gid=0(root) groups=0(root)"
                    : "uid=1000(visitor) gid=1000(visitor) groups=1000(visitor)");
            }
        },
        touch: {
            desc: "Create an empty file",
            action: (args) => {
                const name = args.join(' ');
                if (!name) { terminal.print("Usage: touch [file]"); return; }
                if (!VFS.hasFile(name)) VFS.setFile(name, '');
                terminal.print(`touch: '${name}' ready`, "term-success");
            }
        },
        mkdir: {
            desc: "Create a new directory",
            action: (args) => {
                const name = args.join(' ');
                if (!name) { terminal.print("Usage: mkdir [dir]"); return; }
                if (VFS.hasDir(name)) {
                    terminal.print(`mkdir: cannot create directory '${name}': File exists`, "term-error");
                    return;
                }
                VFS.makeDir(name);
                terminal.print(`mkdir: created directory '${name}'`, "term-success");
            }
        },
        rm: {
            desc: "Remove a file or empty directory",
            action: (args) => {
                const name = (args || []).filter(a => !a.startsWith('-')).join(' ');
                if (!name) { terminal.print("Usage: rm [file]"); return; }
                if (VFS.hasFile(name)) {
                    VFS.deleteFile(name);
                    terminal.print(`removed '${name}'`, "term-success");
                } else if (VFS.hasDir(name)) {
                    VFS.deleteDir(name);
                    terminal.print(`removed directory '${name}'`, "term-success");
                } else if (name === 'README.md' || name === 'flag.txt') {
                    terminal.print(`rm: cannot remove '${name}': Permission denied`, "term-error");
                } else {
                    terminal.print(`rm: cannot remove '${name}': No such file or directory`, "term-error");
                }
            }
        },
        vi: {
            desc: "Edit a text file (:w :q :q! :wq)",
            action: (args) => {
                const name = args.join(' ');
                if (!name) { terminal.print("Usage: vi [file]"); return; }
                terminal._enterVi(name);
            }
        },
        vim: {
            desc: "Edit a text file (alias)",
            action: (args) => terminal.commands.vi.action(args)
        },
        ifconfig: {
            desc: "Show network info",
            action: () => {
                terminal.print("eth0      Link encap:Ethernet  HWaddr 00:0C:29:28:FD:4C");
                // Try to get IP from the UI if available
                const ipElem = document.querySelector(".sys-id");
                const ip = ipElem ? ipElem.textContent.replace("ID: ", "") : "192.168.1.42";
                terminal.print(`          inet addr:${ip}  Bcast:192.168.1.255  Mask:255.255.255.0`);
                terminal.print("          UP BROADCAST RUNNING MULTICAST  MTU:1500  Metric:1");
                terminal.print("          RX packets:124 errors:0 dropped:0 overruns:0 frame:0");
                terminal.print("          TX packets:89 errors:0 dropped:0 overruns:0 carrier:0");
                terminal.print("          collisions:0 txqueuelen:1000");
                terminal.print("          RX bytes:14230 (13.8 KiB)  TX bytes:9820 (9.5 KiB)");
            }
        },
        agent: {
            desc: "Show User Agent",
            action: () => {
                terminal.print("USER AGENT:", "term-purple");
                terminal.print(navigator.userAgent);
            }
        },
        neofetch: {
            desc: "Show system & session info",
            action: () => {
                const ipElem = document.querySelector('.sys-id');
                const ip = ipElem ? ipElem.textContent.replace('ID: ', '') : 'unknown';
                const uptimeS = Math.max(0, Math.floor((Date.now() - terminal.bootTime) / 1000));
                const uptime = uptimeS < 60 ? `${uptimeS}s` : `${Math.floor(uptimeS / 60)}m ${uptimeS % 60}s`;

                terminal.print("INFINITION // SYSTEM STATUS", "term-purple");
                terminal.print("─────────────────────────────", "term-purple");
                const rows = [
                    ["user", `${terminal.user}@infinition.net`],
                    ["view", terminal._currentView()],
                    ["browser", terminal._browserName()],
                    ["platform", navigator.platform || "unknown"],
                    ["viewport", `${window.innerWidth}x${window.innerHeight}`],
                    ["language", navigator.language || "unknown"],
                    ["ip", ip],
                    ["session", uptime]
                ];
                rows.forEach(([k, v]) => terminal.print(`  ${k.padEnd(9)}: ${v}`, "term-info"));
            }
        },
        history: {
            desc: "Show command history",
            action: () => {
                if (!terminal.history.length) {
                    terminal.print("No history yet.", "term-info");
                    return;
                }
                terminal.history.slice(-50).forEach((cmd, i) => terminal.print(`  ${i + 1}  ${cmd}`));
            }
        },
        su: {
            desc: "Switch user",
            action: (args) => {
                if (terminal.user === "root") {
                    terminal.print("Already root.");
                    return;
                }
                // terminal.print("Password: "); // Handled by prompt update
                terminal.waitingForPassword = true;
                terminal.passwordCallback = (password) => {
                    if (password === "admin" || password === "root" || password === "toor" || password === "god") {
                        terminal.user = "root";
                        terminal.print("Authentication successful.", "term-success");
                        terminal.print("You are now root.");
                    } else {
                        terminal.print("su: Authentication failure", "term-error");
                    }
                };
            }
        },
        "hack-the-planet": {
            desc: "???",
            action: () => {
                if (terminal.user !== "root") {
                    terminal.print("Access denied. You need root privileges to hack the planet.", "term-error");
                    return;
                }
                terminal.print("INITIATING GLOBAL OVERRIDE...", "term-warn");
                terminal.print("PENETRATING GIBSON MAINFRAME...", "term-success");
                
                const iframe = document.getElementById('hackers-iframe');
                if (iframe && (iframe.getAttribute('src') === "" || !iframe.src.includes('hackers'))) {
                    iframe.src = 'hackers/index.html';
                }

                setTimeout(() => {
                    navigateTo('hackers');
                    terminal.toggle();
                }, 1500);
            }
        },
        gibson: {
            desc: "???",
            action: () => {
                terminal.commands["hack-the-planet"].action();
            }
        },
        god: {
            desc: "???",
            action: () => {
                terminal.commands["hack-the-planet"].action();
            }
        }
    },

    init: function () {
        this.container = document.getElementById('terminal-dropdown');
        this.input = document.getElementById('term-input');
        this.output = document.getElementById('term-output');

        if (!this.container || !this.input) return;

        this._loadHistory();

        // Event Listeners
        this.input.addEventListener('keydown', (e) => this.handleInput(e));

        // Global shortcut to close (Ctrl+C handled in handleInput if focused, or global)
        document.addEventListener('keydown', (e) => {
            if (this.isOpen && e.key === 'c' && e.ctrlKey) {
                this.print("^C");
                this.toggle();
            }
        });

        // Backtick toggles the terminal from anywhere on the site, except
        // while actually typing text into some other field.
        document.addEventListener('keydown', (e) => {
            if (e.key !== '`' || e.ctrlKey || e.altKey || e.metaKey) return;
            const active = document.activeElement;
            const isTypingElsewhere = active && active !== this.input &&
                (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable);
            if (isTypingElsewhere) return;
            e.preventDefault();
            this.toggle();
        });

        this.print("Infinition Terminal [Version 1.1.0]", "term-info");
        this.print("Type 'help' for a list of commands. Press ` anywhere to toggle.");
        this.print("");

        this.updatePrompt();

        // Top Bar Click Trigger
        const sysBar = document.querySelector('.sys-bar');
        if (sysBar) {
            sysBar.addEventListener('click', (e) => {
                // Check if clicked on interactive elements
                if (e.target.closest('button') || e.target.closest('.back-btn') || e.target.closest('a')) {
                    return; // Do nothing if clicked on a button or link
                }

                this.toggle();
            });
        }

        // Close on click outside
        document.addEventListener('click', (e) => {
            /* Dans sa fenetre StartX, le terminal n'est plus un dropdown a
               refermer au clic exterieur : cliquer une autre fenetre appelait
               toggle() -> le garde de toggle() le rouvrait aussitot, ce qui
               le ramenait au premier plan a chaque clic ailleurs sur la page. */
            if (this.container.parentElement && this.container.parentElement.classList.contains('startx-win-body')) return;

            if (this.isOpen) {
                // If click is NOT inside the terminal container
                if (!this.container.contains(e.target)) {
                    // And if click is NOT on a trigger (like the icon or the sys-bar)
                    if (!e.target.closest('.music-trigger') && !e.target.closest('.sys-bar')) {
                        this.toggle();
                    }
                }
            }
        });

        // Auto-focus input when clicking anywhere in terminal
        this.container.addEventListener('click', (e) => {
            // Don't focus if selecting text (optional check, but simple focus is usually fine)
            const selection = window.getSelection();
            if (selection.toString().length === 0) {
                this.input.focus();
            }
        });
    },

    toggle: function () {
        /* Le terminal vit dans sa propre fenetre StartX : le sortir de la
           il n'a plus de position de dropdown a animer. On se contente de
           (re)donner le focus a cette fenetre. */
        if (this.container.parentElement && this.container.parentElement.classList.contains('startx-win-body')) {
            if (window.STARTX) STARTX.openWindow('terminal');
            return;
        }

        this.isOpen = !this.isOpen;
        this.container.classList.toggle('active', this.isOpen);

        if (this.isOpen) {
            setTimeout(() => {
                this.input?.focus();
                this.input?.select();
            }, 50);
        }
    },

    toggleMaximize: function () {
        this.maximized = !this.maximized;
        this.container.classList.toggle('maximized', this.maximized);

        const btn = document.getElementById('term-max-btn');
        if (btn) {
            const icon = btn.querySelector('i');
            if (icon) icon.className = this.maximized ? 'fas fa-compress' : 'fas fa-expand';
            const label = this.maximized ? 'Restore terminal' : 'Maximize terminal';
            btn.title = label;
            btn.setAttribute('aria-label', label);
        }

        this.scrollToBottom();
        this.input?.focus();
    },

    print: function (text, className = "") {
        const line = document.createElement('div');
        line.className = `term-line ${className}`;
        line.textContent = text;
        this.output.appendChild(line);
        this.scrollToBottom();
    },

    scrollToBottom: function () {
        const body = this.container.querySelector('.term-body');
        body.scrollTop = body.scrollHeight;
    },

    updatePrompt: function () {
        const promptElem = this.container.querySelector('.term-prompt');
        if (!promptElem) return;

        if (this.viMode) {
            this.input.type = "text";
            promptElem.textContent = "";
        } else if (this.waitingForPassword) {
            promptElem.textContent = "Password: ";
            this.input.type = "password";
        } else {
            this.input.type = "text";
            const user = this.user || "visitor";
            const symbol = user === "root" ? "#" : "$";
            const path = this.currentPath === "/home/visitor"
                ? "~"
                : "~/" + this.currentPath.replace("/home/visitor/", "");
            promptElem.textContent = `${user}@infinition:${path}${symbol} `;
        }
    },

    handleInput: function (e) {
        if (this.viMode) { this._viKeydown(e); return; }

        if (e.key === 'Enter') {
            const rawInput = this.input.value; // Don't trim yet for password? actually trim is fine.

            if (this.waitingForPassword) {
                // Handle password input
                if (this.passwordCallback) {
                    this.passwordCallback(rawInput);
                }
                this.waitingForPassword = false;
                this.passwordCallback = null;
                this.input.value = "";
                this.updatePrompt();
                return;
            }

            const trimmedInput = rawInput.trim();
            if (trimmedInput) {
                this.history.push(trimmedInput);
                this.historyIndex = this.history.length;
                this._saveHistory();

                // Print the command in history with current prompt
                const promptElem = this.container.querySelector('.term-prompt');
                const currentPrompt = promptElem ? promptElem.textContent : "visitor@infinition:~$ ";
                this.print(`${currentPrompt}${trimmedInput}`);

                this.execute(trimmedInput);
            } else {
                // Empty enter
                const promptElem = this.container.querySelector('.term-prompt');
                const currentPrompt = promptElem ? promptElem.textContent : "visitor@infinition:~$ ";
                this.print(currentPrompt);
            }
            this.input.value = "";
            this.updatePrompt();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (this.historyIndex > 0) {
                this.historyIndex--;
                this.input.value = this.history[this.historyIndex];
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (this.historyIndex < this.history.length - 1) {
                this.historyIndex++;
                this.input.value = this.history[this.historyIndex];
            } else {
                this.historyIndex = this.history.length;
                this.input.value = "";
            }
        } else if (e.key === 'Tab') {
            e.preventDefault();
            const raw = this.input.value;
            const firstSpace = raw.search(/\s/);

            if (firstSpace === -1) {
                // Rien tape apres la commande : on complete la commande elle-meme.
                const currentInput = raw.trim().toLowerCase();
                if (!currentInput) return;
                const matches = Object.keys(this.commands).filter(cmd => cmd.startsWith(currentInput));
                if (matches.length === 1) this.input.value = matches[0];
                return;
            }

            // Un argument est en cours : on complete contre les cibles connues
            // de cette commande (fichiers pour cat/vi, dossiers pour cd, ...).
            const cmd = raw.slice(0, firstSpace).trim().toLowerCase();
            const candidates = this._argCandidates(cmd);
            if (!candidates) return;

            /* Tout ce qui suit la commande est l'argument en cours, espaces
               compris : un nom cree depuis le bureau ("New Folder", "my
               notes.txt") doit se completer meme apres plusieurs mots tapes,
               pas seulement sur le dernier. On ne coupe donc plus sur le
               dernier espace, on remplace tout le reste de la ligne. */
            const argStart = firstSpace + 1;
            const partial = raw.slice(argStart).toLowerCase();
            const matches = candidates.filter(c => c.toLowerCase().startsWith(partial));
            if (matches.length === 1) {
                this.input.value = raw.slice(0, argStart) + matches[0];
            } else if (matches.length > 1) {
                // Plus court prefixe commun a tous les candidats restants,
                // comme un vrai shell : "New " -> complete jusqu'a "New " si
                // "New Folder" et "New Notes.txt" partagent ce debut.
                let common = matches[0];
                matches.slice(1).forEach(m => {
                    let i = 0;
                    while (i < common.length && i < m.length && common[i].toLowerCase() === m[i].toLowerCase()) i++;
                    common = common.slice(0, i);
                });
                if (common.length > partial.length) {
                    this.input.value = raw.slice(0, argStart) + common;
                }
            }
        }
    },

    // Cibles de completion par commande : fichiers/dossiers reels (statiques
    // + VFS) plutot qu'une liste figee, pour que "cat READM"<Tab> retrouve
    // aussi bien README.md qu'un fichier cree via touch/vi.
    _argCandidates: function (cmd) {
        const vfsFiles = typeof VFS !== 'undefined' ? Object.keys(VFS.files) : [];
        const vfsDirs = typeof VFS !== 'undefined' ? Object.keys(VFS.dirs) : [];
        switch (cmd) {
            case 'cat': case 'more': case 'less': case 'head': case 'tail': case 'vi': case 'vim': case 'rm':
                if (this.currentPath === "/home/visitor/secrets") return ['flag.txt'];
                return ['README.md', ...vfsFiles, ...vfsDirs];
            case 'cd':
                return ['music', 'photos', 'logs', 'kb', 'portfolio', 'papers', 'art', 'repos', 'startx', 'secrets', ...vfsDirs, '..', '~'];
            case 'mkdir':
            case 'touch':
                return [];
            case 'open':
                return ['linkedin', 'github', 'reddit', 'discord', 'artstation'];
            case 'man':
                return Object.keys(this.commands);
            default:
                return null;
        }
    },

    execute: function (rawInput) {
        const parts = rawInput.split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        if (this.commands[cmd]) {
            this.commands[cmd].action(args);
            return;
        }

        this.print(`Command not found: ${cmd}. Type 'help' for available commands.`, "term-error");
        const suggestion = this._closestCommand(cmd);
        if (suggestion) this.print(`Did you mean '${suggestion}'?`, "term-info");
    },

    // Meilleure commande existante a distance d'edition <= 2, sinon rien :
    // en dessous d'un certain seuil la suggestion fait plus de bruit que d'aide.
    _closestCommand: function (cmd) {
        let best = null, bestDist = Infinity;
        for (const name of Object.keys(this.commands)) {
            const d = levenshtein(cmd, name);
            if (d < bestDist) { bestDist = d; best = name; }
        }
        return (bestDist > 0 && bestDist <= 2) ? best : null;
    },

    _loadHistory: function () {
        try {
            const raw = localStorage.getItem('infinition-term-history');
            this.history = raw ? JSON.parse(raw) : [];
        } catch (e) {
            this.history = [];
        }
        this.historyIndex = this.history.length;
    },

    _saveHistory: function () {
        try {
            localStorage.setItem('infinition-term-history', JSON.stringify(this.history.slice(-300)));
        } catch (e) {
            // Storage indisponible (navigation privee, quota) : l'historique
            // reste utilisable pour la session en cours, tant pis pour la suite.
        }
    },

    _currentView: function () {
        const active = document.querySelector('.view-section.active');
        return active ? active.id.replace('-view', '') : 'portal';
    },

    _browserName: function () {
        const ua = navigator.userAgent;
        const version = (re) => (ua.match(re) || [])[1];
        if (/Edg\//.test(ua)) return `Edge ${version(/Edg\/([\d.]+)/)}`;
        if (/OPR\//.test(ua)) return `Opera ${version(/OPR\/([\d.]+)/)}`;
        if (/Firefox\//.test(ua)) return `Firefox ${version(/Firefox\/([\d.]+)/)}`;
        if (/Chrome\//.test(ua)) return `Chrome ${version(/Chrome\/([\d.]+)/)}`;
        if (/Safari\//.test(ua)) return `Safari ${version(/Version\/([\d.]+)/)}`;
        return 'Unknown';
    },

    // Ouvre une entree des Data Logs depuis le terminal : bascule sur la vue
    // blog puis reutilise le lecteur d'article existant (js/ui.js).
    _openLogEntry: function (entry) {
        this.print(`Opening: ${entry.title}`, "term-success");
        setTimeout(() => {
            navigateTo('blog');
            this.toggle();
            setTimeout(() => openArticle(entry), 300);
        }, 400);
    },

    // Contenu d'un fichier lisible par cat/more/less/head/tail/vi : les deux
    // fichiers statiques du faux systeme, puis le VFS (touch/vi/bureau).
    _fileContent: function (file) {
        if (this.currentPath === "/home/visitor/secrets" && file === "flag.txt") {
            return ["CTF{W3lc0m3_T0_Th3_M4tr1x_N30}"];
        }
        if (file === "README.md") {
            return [
                "# Infinition Portal",
                "Welcome to the interactive terminal.",
                "Explore the system using standard commands."
            ];
        }
        if (typeof VFS !== 'undefined' && VFS.hasFile(file)) {
            const content = VFS.files[file];
            return content.length ? content.split('\n') : [''];
        }
        return null;
    },

    _headTail: function (args, fromStart) {
        args = args.slice();
        let n = 3;
        const nIdx = args.indexOf('-n');
        if (nIdx !== -1 && args[nIdx + 1]) {
            n = parseInt(args[nIdx + 1], 10) || n;
            args.splice(nIdx, 2);
        }
        const file = args.join(' ');
        const label = fromStart ? 'head' : 'tail';
        if (!file) { this.print(`Usage: ${label} [-n N] [file]`); return; }
        const lines = this._fileContent(file);
        if (!lines) { this.print(`${label}: ${file}: No such file or directory`, "term-error"); return; }
        (fromStart ? lines.slice(0, n) : lines.slice(-n)).forEach(l => this.print(l));
    },

    /* ---------- vi : un sous-ensemble credible de vim, pas une reimplementation ----------
       Modes NORMAL / INSERT / COMMAND, assez pour i, Echap, :w :q :q! :wq :x.
       Le fichier vit dans le VFS partage avec le bureau (js/vfs.js). */
    _enterVi: function (name) {
        const staticContent = this._fileContent(name);
        const readonly = !VFS.hasFile(name) && !!staticContent;
        const content = VFS.hasFile(name) ? VFS.files[name] : (staticContent ? staticContent.join('\n') : '');

        this.viMode = true;
        this.viState = {
            file: name,
            lines: content.length ? content.split('\n') : [''],
            mode: 'normal',
            cmdBuffer: '',
            dirty: false,
            readonly
        };
        this.input.value = '';
        this._renderVi();
        this.updatePrompt();
    },

    _renderVi: function () {
        const st = this.viState;
        this.output.innerHTML = '';
        st.lines.forEach((l, i) => {
            this.print(`${String(i + 1).padStart(3, ' ')}  ${l}`, 'term-info');
        });
        this.print('', '');
        let status;
        let cls = 'term-purple';
        if (st.mode === 'command') { status = `:${st.cmdBuffer}`; cls = 'term-warn'; }
        else if (st.mode === 'insert') status = '-- INSERT --';
        else status = `"${st.file}"${st.readonly ? ' [readonly]' : ''}${st.dirty ? ' [+]' : ''} — i: insert · Esc: normal · :w :q :q! :wq`;
        this.print(status, cls);
        this.scrollToBottom();
    },

    _viKeydown: function (e) {
        const st = this.viState;

        if (st.mode === 'insert') {
            if (e.key === 'Escape') {
                e.preventDefault();
                st.mode = 'normal';
                this.input.value = '';
                this._renderVi();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                st.lines.push(this.input.value);
                st.dirty = true;
                this.input.value = '';
                this._renderVi();
            }
            return;
        }

        if (st.mode === 'command') {
            if (e.key === 'Escape') {
                e.preventDefault();
                st.mode = 'normal';
                st.cmdBuffer = '';
                this._renderVi();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                this._viExec(st.cmdBuffer);
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                st.cmdBuffer = st.cmdBuffer.slice(0, -1);
                this._renderVi();
            } else if (e.key.length === 1) {
                e.preventDefault();
                st.cmdBuffer += e.key;
                this._renderVi();
            }
            return;
        }

        // NORMAL
        e.preventDefault();
        if (e.key === 'i') {
            st.mode = 'insert';
            this.input.value = '';
            this._renderVi();
        } else if (e.key === ':') {
            st.mode = 'command';
            st.cmdBuffer = '';
            this._renderVi();
        }
    },

    _viExec: function (raw) {
        const st = this.viState;
        const cmd = raw.trim();
        const content = st.lines.join('\n');

        const write = () => {
            if (st.readonly) {
                this.print(`E45: 'readonly' option is set (add ! to override)`, 'term-error');
                return false;
            }
            VFS.setFile(st.file, content);
            st.dirty = false;
            return true;
        };
        const quit = () => {
            this.viMode = false;
            this.viState = null;
            this.output.innerHTML = '';
            this.print(`Infinition Terminal [Version 1.1.0]`, 'term-info');
            this.print(`"${st.file}" closed.`);
            this.updatePrompt();
        };

        if (cmd === 'w') {
            if (write()) this.print(`"${st.file}" written`, 'term-success');
            st.mode = 'normal'; st.cmdBuffer = ''; this._renderVi();
        } else if (cmd === 'q') {
            if (st.dirty) {
                this.print('E37: No write since last change (add ! to override)', 'term-error');
                st.mode = 'normal'; st.cmdBuffer = ''; this._renderVi();
            } else quit();
        } else if (cmd === 'q!') {
            quit();
        } else if (cmd === 'wq' || cmd === 'x') {
            if (write()) quit();
            else { st.mode = 'normal'; st.cmdBuffer = ''; this._renderVi(); }
        } else {
            this.print(`E492: Not an editor command: ${cmd}`, 'term-error');
            st.mode = 'normal'; st.cmdBuffer = ''; this._renderVi();
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    terminal.init();
});
