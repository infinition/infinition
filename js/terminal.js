/**
 * Terminal Logic for Infinition Portal
 * Handles commands, input processing, and display.
 */

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
                terminal.print("  css         - Navigate to CSS Library");
                terminal.print("  log         - Navigate to Data Logs");
                terminal.print("  root        - Navigate to Root/Portal");
                terminal.print("  acidpages   - Navigate to Acid Pages");
                terminal.print("  scan [user] - Scan GitHub Pages for user");
                terminal.print("  cd [dir]    - Change directory (nav simulation)");
                terminal.print("  ls / ll     - List directories");
                terminal.print("  pwd         - Print working directory");
                terminal.print("  cat [file]  - Read file content");
                terminal.print("  ifconfig    - Show network info");
                terminal.print("  agent       - Show User Agent");
                terminal.print("  su          - Switch user");
                terminal.print("  search      - Launch global search");
                terminal.print("  find        - Alias for search");
                terminal.print("  exit / :q   - Close terminal");
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
        css: {
            desc: "Go to CSS Lib",
            action: () => {
                terminal.print("Navigating to CSS Library...", "term-warn");
                setTimeout(() => {
                    navigateTo('csslib');
                    terminal.toggle();
                }, 500);
            }
        },
        log: {
            desc: "Go to Logs",
            action: () => {
                terminal.print("Accessing Data Logs...", "term-warn");
                setTimeout(() => {
                    navigateTo('blog');
                    terminal.toggle();
                }, 500);
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
        acidpages: {
            desc: "Go to Acid Pages",
            action: () => {
                terminal.print("Accessing Acid Pages Mainframe...", "term-warn");
                setTimeout(() => {
                    navigateTo('acid-pages');
                    terminal.toggle();
                }, 500);
            }
        },
        scan: {
            desc: "Scan GitHub Pages",
            action: (args) => {
                const user = args[0] || "infinition";
                terminal.print(`Initiating scan protocol for target: ${user}...`, "term-warn");
                navigateTo('acid-pages');
                terminal.toggle();

                // Wait for view to load then trigger scan
                setTimeout(() => {
                    const input = document.getElementById('acid-search-input');
                    const btn = document.getElementById('acid-search-btn');
                    if (input && btn) {
                        input.value = user;
                        btn.click();
                    }
                }, 800);
            }
        },
        cd: {
            desc: "Change directory",
            action: (args) => {
                const target = args[0];

                // cd with no args -> go to home
                if (!target || target === "~") {
                    terminal.currentPath = "/home/visitor";
                    return;
                }

                if (target === "..") {
                    if (terminal.currentPath === "/home/visitor/secrets") {
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
                } else if (target === "css" || target === "csslib") {
                    terminal.commands.css.action();
                } else if (target === "log" || target === "logs" || target === "blog") {
                    terminal.commands.log.action();
                } else if (target === "kb") {
                    terminal.commands.kb.action();
                } else if (target === "portfolio" || target === "profile" || target === "profil") {
                    terminal.commands.portfolio.action();
                } else if (target === "acidpages" || target === "acid") {
                    terminal.commands.acidpages.action();
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

                if (isLong) {
                    terminal.print("drwxr-xr-x  2 visitor visitor 4096 Nov 30 00:00 music", "term-info");
                    terminal.print("drwxr-xr-x  2 visitor visitor 4096 Nov 30 00:00 csslib", "term-info");
                    terminal.print("drwxr-xr-x  2 visitor visitor 4096 Nov 30 00:00 logs", "term-info");
                    terminal.print("drwxr-xr-x  2 visitor visitor 4096 Nov 30 00:00 kb", "term-info");
                    terminal.print("drwxr-xr-x  2 visitor visitor 4096 Nov 30 00:00 kb", "term-info");
                    terminal.print("drwxr-xr-x  2 visitor visitor 4096 Nov 30 00:00 portfolio", "term-info");
                    terminal.print("drwxr-xr-x  2 visitor visitor 4096 Nov 30 00:00 acidpages", "term-info");
                    terminal.print("drwx------  2 root    root    4096 Nov 30 00:00 secrets", "term-info");
                    terminal.print("-rw-r--r--  1 visitor visitor 1024 Nov 30 00:00 README.md", "term-info");
                } else {
                    terminal.print("music  csslib  logs  kb  portfolio  acidpages  secrets  README.md", "term-info");
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
                const file = args[0];
                if (!file) {
                    terminal.print("Usage: cat [file]");
                    return;
                }

                if (terminal.currentPath === "/home/visitor/secrets" && file === "flag.txt") {
                    terminal.print("CTF{W3lc0m3_T0_Th3_M4tr1x_N30}", "term-success");
                } else if (file === "README.md") {
                    terminal.print("# Infinition Portal");
                    terminal.print("Welcome to the interactive terminal.");
                    terminal.print("Explore the system using standard commands.");
                } else {
                    terminal.print(`cat: ${file}: No such file or directory`, "term-error");
                }
            }
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
                    if (password === "admin" || password === "root" || password === "toor") {
                        terminal.user = "root";
                        terminal.print("Authentication successful.", "term-success");
                        terminal.print("You are now root.");
                    } else {
                        terminal.print("su: Authentication failure", "term-error");
                    }
                };
            }
        }
    },

    init: function () {
        this.container = document.getElementById('terminal-dropdown');
        this.input = document.getElementById('term-input');
        this.output = document.getElementById('term-output');

        if (!this.container || !this.input) return;

        // Event Listeners
        this.input.addEventListener('keydown', (e) => this.handleInput(e));

        // Global shortcut to close (Ctrl+C handled in handleInput if focused, or global)
        document.addEventListener('keydown', (e) => {
            if (this.isOpen && e.key === 'c' && e.ctrlKey) {
                this.print("^C");
                this.toggle();
            }
        });

        this.print("Infinition Terminal [Version 1.0.4]", "term-info");
        this.print("Type 'help' for a list of commands.");
        this.print("");

        this.updatePrompt();

        // Top Bar Click Trigger (only if not on portal and not clicking buttons)
        const sysBar = document.querySelector('.sys-bar');
        if (sysBar) {
            sysBar.addEventListener('click', (e) => {
                // Check if we are on portal view (home)
                const portalView = document.getElementById('portal-view');
                if (portalView && portalView.style.display !== 'none' && portalView.classList.contains('active')) {
                    return; // Do nothing on home page
                }

                // Check if clicked on interactive elements
                if (e.target.closest('button') || e.target.closest('.back-btn') || e.target.closest('a')) {
                    return; // Do nothing if clicked on a button or link
                }

                this.toggle();
            });
        }

        // Close on click outside
        document.addEventListener('click', (e) => {
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
        this.isOpen = !this.isOpen;
        this.container.classList.toggle('active', this.isOpen);

        if (this.isOpen) {
            setTimeout(() => this.input.focus(), 100);
        }
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

        if (this.waitingForPassword) {
            promptElem.textContent = "Password: ";
            this.input.type = "password";
        } else {
            this.input.type = "text";
            const user = this.user || "visitor";
            const symbol = user === "root" ? "#" : "$";
            let path = "~";
            if (this.currentPath === "/home/visitor/secrets") path = "~/secrets";
            promptElem.textContent = `${user}@infinition:${path}${symbol} `;
        }
    },

    handleInput: function (e) {
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
            const currentInput = this.input.value.trim();
            if (!currentInput) return;

            const availableCommands = Object.keys(this.commands);
            const matches = availableCommands.filter(cmd => cmd.startsWith(currentInput.toLowerCase()));

            if (matches.length === 1) {
                this.input.value = matches[0];
            } else if (matches.length > 1) {
                // Optional: Show available matches if multiple
                // this.print(matches.join("  "), "term-info");
                // this.print(`visitor@infinition:~$ ${currentInput}`); // Reprint prompt
            }
        }
    },

    execute: function (rawInput) {
        const parts = rawInput.split(' ');
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);

        if (this.commands[cmd]) {
            this.commands[cmd].action(args);
        } else {
            this.print(`Command not found: ${cmd}. Type 'help' for available commands.`, "term-error");
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    terminal.init();
});
