/* =============================================================
   HACKERS (1995) - THREE.JS EXPERIENCE
   Main Script - All modules consolidated & commented
   STANDALONE VERSION (no backend, local audio, localStorage)

   Table of Contents:
   1.  Imports (Three.js CDN via importmap)
   2.  Data Texture Generator (building face code patterns)
   3.  Circuit Texture Generator (floor PCB pattern)
   4.  Garbage Texture Generator (secret file menu)
   5.  Shaders (DataFlow, Floor, Garbage)
   6.  Music Player (Local HTML5 Audio)
   7.  Timing helpers
   8.  Scene Setup (Camera, Renderer, Lighting)
   9.  Controls (Mouse, Touch, Keyboard, Joystick)
   10. City Grid Generation (Buildings, Garbage Column)
   11. Post Processing (Bloom)
   12. App State Machine (Loading, Menu, Intro, Running)
   13. Garbage Modal, Decrypt & Dossier
   14. Animation Loop
   ============================================================= */


/* =============================================================
   1. IMPORTS (Three.js from CDN via importmap in index.html)
   ============================================================= */

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";


/* =============================================================
   2. DATA TEXTURE GENERATOR
   Generates a canvas texture with hacker-style code patterns
   (hex dumps, functions, process tables, crypto keys, etc.)
   Used on the building faces to simulate scrolling data.
   Colors are encoded in R/G/B channels for shader remapping.
   ============================================================= */

function createDataTexture() {
    const canvas = document.createElement('canvas');
    const width = 2048;
    const height = 4096;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    const fontSize = 50;
    const lineHeight = fontSize * 1.2;
    ctx.font = `bold ${fontSize}px "Courier New", monospace`;
    ctx.fillStyle = '#ffffff';

    const numColumns = 2;
    const columnWidth = width / numColumns;
    const paddingX = 40;
    const charWidth = fontSize * 0.6;
    const charsPerCol = Math.floor((columnWidth - paddingX * 2) / charWidth);

    const vocabulary = [
        "void", "int", "return", "if", "else", "while", "for", "include", "pragma",
        "MOV", "JMP", "PUSH", "POP", "EAX", "ECX", "EDX", "EBX", "ESP", "EBP", "ESI", "EDI",
        "0x00", "0xFF", "0xA1", "0xC0", "0x0F", "0x80", "0x7F", "0xB0", "0x1A", "0x2F",
        "std::cout", "buffer", "stack", "heap", "segment", "fault", "null", "ptr", "alloc", "free",
        "class", "struct", "public", "private", "virtual", "static", "override", "const", "volatile",
        "CONNECT", "TRACE", "PING", "ENCRYPT", "DECRYPT", "AUTH", "TOKEN", "SESSION", "HANDSHAKE",
        "ROOT", "ADMIN", "SUDO", "CHMOD", "GREP", "SSH", "FTP", "TELNET", "SMTP", "HTTP", "DNS",
        "MATRIX", "CYBER", "NET", "WEB", "DATA", "BASE", "QUERY", "inject", "payload", "backdoor",
        "SELECT", "FROM", "WHERE", "UPDATE", "DELETE", "INSERT", "INTO", "VALUES", "JOIN", "UNION",
        "kernel", "boot", "mount", "dev", "sys", "proc", "tmp", "var", "opt", "bin", "user",
        "PID", "TTY", "TIME", "CMD", "CPU", "MEM", "SWAP", "DISK", "IO", "NET", "IPC",
        "rsa", "sha256", "md5", "aes", "cipher", "hash", "salt", "iv", "key", "cert", "pem",
        "brute", "force", "scan", "crack", "hack", "bypass", "exploit", "vuln", "patch", "zero",
        "ACCESS", "DENIED", "GRANTED", "LOCKED", "OPEN", "SECURE", "UNSAFE", "WARNING", "ERROR",
        "SYSTEM", "FAIL", "CRASH", "REBOOT", "HALT", "PANIC", "CORE", "DUMP", "LOG", "AUDIT"
    ];

    const uppercase = vocabulary.filter(w => w === w.toUpperCase());

    // Color channels for shader remapping
    const C_PRIMARY   = '#FF0000';
    const C_SECONDARY = '#00FF00';
    const C_TERTIARY  = '#0000FF';
    ctx.fillStyle = C_PRIMARY;

    // --- Block Drawing Functions ---

    function drawFunction(startX, startY) {
        let lines = [];
        lines.push(`void ${vocabulary[Math.floor(Math.random() * vocabulary.length)]}_${Math.floor(Math.random()*99)}() {`);
        const bodyLines = Math.floor(Math.random() * 6) + 4;
        for (let i = 0; i < bodyLines; i++) {
            let indent = "  ";
            if (Math.random() > 0.5) indent += "  ";
            let content = "";
            while (content.length < 20) {
                content += vocabulary[Math.floor(Math.random() * vocabulary.length)] + "(";
                content += Math.floor(Math.random() * 999) + "); ";
            }
            lines.push(indent + content);
        }
        lines.push("}");
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    function drawBorderedList(startX, startY) {
        const w = charsPerCol - 4;
        let lines = [];
        const border = "+" + "-".repeat(w - 2) + "+";
        lines.push(border);
        const title = " " + uppercase[Math.floor(Math.random() * uppercase.length)] + " STATUS ";
        lines.push("|" + title + " ".repeat(w - 2 - title.length) + "|");
        lines.push(border);
        const count = Math.floor(Math.random() * 6) + 4;
        for (let i = 0; i < count; i++) {
            const item = uppercase[Math.floor(Math.random() * uppercase.length)];
            const val = Math.random() > 0.5 ? "OK" : "ERR";
            const row = ` ${item}: ${val}`;
            lines.push("|" + row + " ".repeat(w - 2 - row.length) + "|");
        }
        lines.push(border);
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    function drawHexDump(startX, startY) {
        let lines = [];
        const count = Math.floor(Math.random() * 8) + 4;
        for (let i = 0; i < count; i++) {
            let l = "0x" + Math.floor(Math.random() * 65535).toString(16).toUpperCase().padStart(4, '0') + ": ";
            for (let j = 0; j < 8; j++) {
                l += Math.floor(Math.random() * 255).toString(16).toUpperCase().padStart(2, '0') + " ";
            }
            lines.push(l);
        }
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    function drawAlert(startX, startY) {
        ctx.save();
        ctx.font = `bold ${fontSize + 10}px "Courier New", monospace`;
        const word = uppercase[Math.floor(Math.random() * uppercase.length)];
        ctx.fillText(`>> ${word} <<`, startX, startY);
        ctx.fillText(`DETECTED...`, startX, startY + lineHeight * 1.2);
        ctx.fillText(`[ ${Math.floor(Math.random() * 100)}% ]`, startX, startY + lineHeight * 2.4);
        ctx.restore();
        return 4;
    }

    function drawConnectionTable(startX, startY) {
        let lines = [];
        lines.push("NET_active_connections:");
        lines.push("PROTO  LOCAL_ADDR      STATE");
        const count = Math.floor(Math.random() * 5) + 3;
        for (let i = 0; i < count; i++) {
            const proto = Math.random() > 0.3 ? "TCP" : "UDP";
            const ip = `192.168.0.${Math.floor(Math.random() * 255)}`;
            const port = Math.floor(Math.random() * 9000) + 1000;
            const state = Math.random() > 0.5 ? "ESTAB" : "LISTEN";
            lines.push(`${proto}    ${ip}:${port}   ${state}`);
        }
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    function drawProgressBar(startX, startY) {
        let currentLine = 0;
        ctx.fillStyle = C_PRIMARY;
        ctx.fillText("MEMORY_HEAP:", startX, startY);
        currentLine++;
        const count = Math.floor(Math.random() * 4) + 3;
        for (let i = 0; i < count; i++) {
            const y = startY + currentLine * lineHeight;
            ctx.fillStyle = C_PRIMARY;
            ctx.fillText("[", startX, y);
            const barStartX = startX + charWidth * 1.5;
            const barWidth = charWidth * 20;
            const barHeight = fontSize * 0.6;
            const barY = y - fontSize * 0.7;
            const grad = ctx.createLinearGradient(barStartX, 0, barStartX + barWidth, 0);
            grad.addColorStop(0, '#FF00FF');
            grad.addColorStop(1, '#FFFFFF');
            ctx.fillStyle = grad;
            ctx.fillRect(barStartX, barY, barWidth, barHeight);
            ctx.fillStyle = C_PRIMARY;
            ctx.fillText("] " + Math.floor(Math.random() * 100) + "%", barStartX + barWidth + charWidth * 0.5, y);
            currentLine++;
        }
        return currentLine;
    }

    function drawSqlLog(startX, startY) {
        let lines = [];
        const tables = ["users", "logs", "transactions", "auth_keys", "system_config"];
        const actions = ["SELECT * FROM", "UPDATE", "DELETE FROM", "INSERT INTO"];
        const count = Math.floor(Math.random() * 4) + 3;
        for (let i = 0; i < count; i++) {
            lines.push(`> ${actions[Math.floor(Math.random() * actions.length)]} ${tables[Math.floor(Math.random() * tables.length)]}`);
            lines.push(`  Query took ${Math.floor(Math.random() * 50)}ms... OK`);
        }
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    function drawDirList(startX, startY) {
        let lines = [];
        lines.push("root@sys:/var/log# ls -la");
        const count = Math.floor(Math.random() * 5) + 3;
        for (let i = 0; i < count; i++) {
            lines.push(`-rwxr-xr-x root ${Math.floor(Math.random() * 9999)} ${vocabulary[Math.floor(Math.random() * vocabulary.length)]}.log`);
        }
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    function drawProcessTable(startX, startY) {
        let lines = [];
        lines.push("PID  PR  NI  VIRT  RES  SHR  S  %CPU  %MEM  TIME+  COMMAND");
        const count = Math.floor(Math.random() * 8) + 5;
        for (let i = 0; i < count; i++) {
            const pid = Math.floor(Math.random() * 99999).toString().padEnd(5);
            const s = Math.random() > 0.1 ? "S" : "R";
            const cpu = (Math.random() * 90).toFixed(1).padStart(4);
            const mem = (Math.random() * 20).toFixed(1).padStart(4);
            const cmd = vocabulary[Math.floor(Math.random() * vocabulary.length)].toLowerCase();
            lines.push(`${pid} 20 0 ${Math.floor(Math.random() * 200000)} ${Math.floor(Math.random() * 20000)} ${Math.floor(Math.random() * 5000)} ${s} ${cpu} ${mem} ${Math.floor(Math.random() * 99)}:${Math.floor(Math.random() * 59)}.00 ${cmd}`);
        }
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    function drawCryptoBlock(startX, startY) {
        let lines = [];
        lines.push("-----BEGIN RSA PRIVATE KEY-----");
        const count = Math.floor(Math.random() * 8) + 6;
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        for (let i = 0; i < count; i++) {
            let line = "";
            for (let j = 0; j < charsPerCol + 5; j++) line += chars.charAt(Math.floor(Math.random() * chars.length));
            lines.push(line);
        }
        lines.push("-----END RSA PRIVATE KEY-----");
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    function drawBootSeq(startX, startY) {
        let lines = [];
        lines.push("INIT: version 2.88 booting");
        const steps = ["Mounting local filesystems", "Activating swapfile swap", "Cleaning /tmp /var/run", "Setting up networking", "Starting system message bus", "Starting OpenBSD Secure Shell server", "Starting Apache httpd web server"];
        const count = Math.floor(Math.random() * 5) + 3;
        for (let i = 0; i < count; i++) lines.push(`[ OK ] ${steps[Math.floor(Math.random() * steps.length)]}`);
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    function drawJson(startX, startY) {
        let lines = [];
        lines.push("{");
        const count = Math.floor(Math.random() * 8) + 4;
        for (let i = 0; i < count; i++) {
            const key = vocabulary[Math.floor(Math.random() * vocabulary.length)];
            const r = Math.random();
            let val = r < 0.3 ? Math.floor(Math.random() * 9999) : r < 0.6 ? `"${vocabulary[Math.floor(Math.random() * vocabulary.length)]}"` : r < 0.8 ? "true" : "null";
            lines.push(`  "${key}": ${val}${i < count - 1 ? "," : ""}`);
        }
        lines.push("}");
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    function drawDiagnostics(startX, startY) {
        let lines = [];
        lines.push("Running diagnostics...");
        const systems = ["Core 0", "Core 1", "Core 2", "GPU", "RAM", "Cooling", "Network"];
        const count = Math.floor(Math.random() * 5) + 3;
        for (let i = 0; i < count; i++) {
            const temp = Math.floor(Math.random() * 40) + 40;
            lines.push(`${systems[Math.floor(Math.random() * systems.length)]}: ${temp}C [${temp > 75 ? "WARN" : "OK"}]`);
        }
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    function drawBinary(startX, startY) {
        let lines = [];
        const count = Math.floor(Math.random() * 6) + 3;
        for (let i = 0; i < count; i++) {
            let line = "";
            for (let j = 0; j < 24; j++) { line += Math.random() > 0.5 ? "1" : "0"; if (j % 8 === 7) line += " "; }
            lines.push(line);
        }
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    function drawCoordinates(startX, startY) {
        let lines = ["TRACKING TARGET:",
            `LAT: ${(Math.random() * 180 - 90).toFixed(4)} N`,
            `LON: ${(Math.random() * 360 - 180).toFixed(4)} E`,
            `ALT: ${Math.floor(Math.random() * 30000)} FT`,
            `VEL: ${Math.floor(Math.random() * 500)} KTS`];
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    /* Two blocks that exist purely to be read: the towers are supposed to
       be somebody's dirty archive, and a wall of hex never says that.
       Every name below is invented - the worms, the ransomware and the
       filing cabinets alike. Column width is 31 characters, so keep the
       lines short or they spill into the neighbouring column. */
    const CLASSIFIED_FILES = [
        "ROSWELL_47_REEL3.mpg  [CORRUPT]",
        "AREA51_HANGAR18.key   [1 BYTE]",
        "MJ12_MINUTES_52.doc   [REDACTED]",
        "PRISM_SCREENSAVER.scr [SIGNED]",
        "EPSTEIN_FLIGHTS.xls   [PG47 GONE]",
        "SNOWDEN_BACKUP.iso    [MIRRORED]",
        "BIGFOOT_final2.avi    [BLURRY]",
        "MOONLANDING_NG.mov    [OUTTAKES]",
        "DENVER_APT_SUB7.dwg   [LEVEL -7]",
        "BERMUDA_CLAIMS.pdf    [DENIED]",
        "NESSIE_SONAR_98.wav   [EEL?]",
        "CHEMTRAIL_RECIPE.txt  [FLOUR]",
        "TICTAC_UAP_2004.mp4   [SHAKY]",
        "GARBAGE_FILE.tmp      [DO NOT RM]",
        "ELLINGSON_PAYROLL.db  [+1.7M]",
        "DAVINCI_VIRUS.exe     [ARMED]",
        "COLDFUSION_2001.pdf   [PENDING]",
        "LIZARD_HR_ONBOARD.xls [SCALY]",
        "FLATEARTH_ROUTES.csv  [REROUTED]",
        "JFK_FRAME_313.jpg     [ENHANCED]",
        "YETI_TAXES_1994.pdf   [AUDITED]",
        "ATLANTIS_DEED.scan    [WET]",
        "TESLA_NOTEBOOK_7.pdf  [FBI COPY]",
        "HAARP_WEATHER.cfg     [SUNNY]",
        "MKULTRA_PLAYLIST.m3u  [TRIPPY]",
        "ALIEN_TAX_RETURN.xls  [NON-RES]",
        "PYRAMID_PLANS.dwg     [NO RAMPS]",
        "BLACKCOPTER_ROTA.log  [NOISY]",
        "NUMBERS_STATION.mp3   [4 8 15 16]",
        "WOW_SIGNAL_1977.dat   [72 SEC]",
        "PHOBOS_MONOLITH.tif   [SHADOW]",
        "COINTELPRO_MEMES.zip  [DANK]",
        "SKINWALKER_CAM.mkv    [GOAT?]",
        "NIBIRU_ETA_2029.ics   [RESCHED]",
        "CEREAL_BOX_CODES.txt  [DECODER]",
        "SUBMARINE_KARAOKE.wav [GOLDEN]",
        "DYATLOV_TENT_SCAN.png [CUT OPEN]",
        "VOYNICH_TRANSLATE.doc [GIBBERISH]",
        "STONEHENGE_IKEA.pdf   [MISSING 1]",
        "OUMUAMUA_INVOICE.xls  [UNPAID]",
        "DB_COOPER_SEATMAP.gif [ROW 18C]",
        "SHADOW_BROKERS.torrent [SEEDING]",
        "Y2K_PATCH_NOTES.txt   [WORKED]",
        "CLIPPER_CHIP_KEYS.pem [ESCROWED]",
        "ECHELON_DICT_1998.db  [NOISY]",
        "MORRIS_WORM_SRC.c     [99 LINES]",
        "PHRACK_ISSUE_7.txt    [CLASSIC]",
        "2600_PAYPHONE_MAP.svg [BLUE BOX]",
        "L0PHT_TESTIMONY.mov   [30 MIN]",
        "KEVIN_FREED.gif       [ANIMATED]",
        "COLD_BOOT_DRAM.raw    [FROSTY]",
        "BLUE_SCREEN_ART.bmp   [FRAMED]",
        "TAMAGOTCHI_NECRO.log  [SORRY]",
        "NOKIA_3310_FIRMWARE   [INDESTR]",
        "ZOMBIE_TOASTER_C2.cfg [CRUNCHY]",
        "SANTA_RADAR_TRACK.kml [NORAD]",
        "ATM_ROULETTE.sh       [DO NOT]",
        "ELEVATOR_MUSIC_KEY.md [ENDLESS]",
        "PRINTER_MANIFESTO.txt [47 PAGES]",
        "OFFICE_FRIDGE_DNA.csv [BIOHAZ]",
        "PIZZA_ORDERS_1994.log [ANCHOVY]",
        "COFFEE_BUDGET_Q4.xls  [OVERRUN]",
        "ROOFTOP_POOL_PLANS.pdf [LEAKING]",
        "BJORN_NETKB.db        [PILLAGED]",
        "BJORN_LONGSHIP.img    [BOOTABLE]",
        "FLIPPER_GATE.sub      [REPLAYED]",
        "PWNAGOTCHI_FACES.png  [(^^)]",
        "MSF_HANDLER.rc        [LISTENING]",
        "NMAP_WHOLE_CITY.xml   [LOUD]",
        "LARUCHE_SWARM.cfg     [40K BEES]",
        "INFINITION_BADGE.png  [CONTRACTOR]",
        "CVE_1995_31337.txt    [UNPATCHED]",
        "HANDSHAKES_2026.pcap  [CRACKED]",
        "ECORP_DEBT_MASTER.db  [ONE COPY]",
        "STEEL_MOUNTAIN.map    [8 DEGREES]",
        "ECORP_LOGO_FINAL2.ai  [APPROVED]",
        "EVILCORP_LAYOFFS.xls  [Q4]",
        "FSOCIETY_MASKS.stl    [PRINTABLE]",
        "ARCADE_LEASE_1994.pdf [EXPIRED]",
    ];

    const THREAT_LINES = [
        "[IDS] WORM LEONARDO x12441",
        "[IDS] RANSOM CRYPTOLULZ: 3 DISKS",
        "[AV ] TROJAN COOKIEMONSTER FED",
        "[IDS] DAVINCI PAYLOAD ARMED",
        "[SYS] GARBAGE FILE TOUCHED",
        "[NSA] PACKET SNIFFED, POLITELY",
        "[IDS] WORM RABBIT: BREEDING",
        "[AV ] VIRUS PLAGUE SIGNED 'ME'",
        "[SYS] POOL ON ROOF HAS A LEAK",
        "[FBI] TRACE FAILED: TOO SLOW",
        "[SYS] HACK THE PLANET",
        "[SEC] TOP PW: LOVE SECRET SEX GOD",
        "[NSA] SUBPOENA SENT TO /dev/null",
        "[IDS] RANSOM WANNADANCE: 2 BTC",
        "[SYS] COFFEE POT RETURNS 418",
        "[AV ] QUARANTINE FULL, SORRY",
        "[IDS] BOTNET TOASTERNET ONLINE",
        "[SEC] MFA BYPASSED BY POST-IT",
        "[SYS] PRINTER JAMMED (AGAIN)",
        "[IDS] SCAN FROM 127.0.0.1 ?!",
        "[AV ] BOOT SECTOR IS HAUNTED",
        "[SEC] CEO CLICKED THE LINK",
        "[SYS] RESTORED BACKUP FROM 1995",
        "[IDS] KEYLOGGER: QWERTY? AZERTY?",
        "[SYS] UPTIME 9999d PATCHES 0",
        "[IDS] WORM GOPHER: DIGGING",
        "[IDS] RAT 'NICEGUY' INSTALLED",
        "[AV ] SPYWARE POLITELY ASKS",
        "[SEC] AUDIT MOVED TO NEVER",
        "[SYS] DISK 99% FULL OF MEMES",
        "[SYS] FAN SPEED: HURRICANE",
        "[NSA] BACKDOOR NEEDS OILING",
        "[FBI] SUSPECT ORDERED PIZZA",
        "[IDS] BRUTE FORCE: 4 TRIES",
        "[SEC] BADGE READER TAPED OPEN",
        "[SYS] SWAP FILE IS CRYING",
        "[AV ] SIGNATURE DB FROM 1993",
        "[IDS] PORT 31337 KNOCKING",
        "[SYS] ELEVATOR RUNS ON PERL",
        "[SEC] VPN IS A GARDEN HOSE",
        "[IDS] SQL INJECTED, SERVED",
        "[SYS] TAPE ROBOT UNIONISED",
        "[NSA] LISTENING TO HOLD MUSIC",
    ];

    function drawClassifiedDir(startX, startY) {
        const lines = ["> ls /vol/blacksite", "CLEARANCE: COSMIC"];
        const count = Math.floor(Math.random() * 6) + 4;
        for (let i = 0; i < count; i++) {
            lines.push(CLASSIFIED_FILES[Math.floor(Math.random() * CLASSIFIED_FILES.length)]);
        }
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    /* Somebody's staff files, because a mainframe this size is mostly
       filing cabinets and the joke lands better in dry HR language. */
    const DOSSIER_NAMES = [
        "MURPHY, D.", "ELLINGSON, E.", "GILL, R.", "MURPHY, J.",
        "HALL, K.", "NIKON, L.", "PHREAK, P.", "OVERRIDE, C.",
        "BURN, A.", "KILLER, C.", "COOL, Z.", "PLAGUE, T.",
        "ANONYMOUS, A.", "DOE, J.", "ADMIN, T.", "ROOT, R.",
    ];
    const DOSSIER_ROLES = [
        "SYSOP", "PAYROLL", "SECURITY", "JANITOR", "VP RISK",
        "INTERN", "NIGHT SHIFT", "BALLAST", "HELPDESK", "AUDITOR",
    ];
    const DOSSIER_STATUS = [
        "UNDER REVIEW", "CLEARED", "FLAGGED", "ON LEAVE",
        "DO NOT CALL", "PROMOTED?", "TERMINATED", "MISSING BADGE",
    ];
    const DOSSIER_NOTES = [
        "ASKS TOO MANY QUESTIONS", "KNOWS THE POOL EXISTS",
        "PASSWORD ON A POST-IT", "ORDERED 40 PIZZAS",
        "SPEAKS ONLY IN HEX", "LEFT THE MODEM ON",
        "READS THE GARBAGE FILE", "ROLLERBLADES INDOORS",
        "OWNS A 28.8k MODEM", "TOO GOOD AT TYPING",
    ];

    function drawDossier(startX, startY) {
        const pick = (a) => a[Math.floor(Math.random() * a.length)];
        const lines = [
            "== PERSONNEL FILE ==",
            "ID   : EMP-" + String(Math.floor(Math.random() * 9999)).padStart(4, "0"),
            "NAME : " + pick(DOSSIER_NAMES),
            "ROLE : " + pick(DOSSIER_ROLES),
            "CLEAR: LEVEL " + (1 + Math.floor(Math.random() * 9)),
            "STAT : " + pick(DOSSIER_STATUS),
            "NOTE : " + pick(DOSSIER_NOTES),
        ];
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    /* Graffiti: the one block on a tower face that is not machine output.
       Somebody with a keyboard and an opinion got here first. */
    const GRAFFITI = [
        "HACK THE PLANET",
        "MESS WITH THE BEST|DIE LIKE THE REST",
        "THERE IS NO RIGHT|AND WRONG. ONLY|FUN AND BORING.",
        "ZERO COOL|WAS HERE",
        "CRASH OVERRIDE|ON THE WIRE",
        "ACID BURN|OWNS THIS RACK",
        "LORD NIKON|NEVER FORGETS",
        "CEREAL KILLER|EATS THE GARBAGE",
        "PHANTOM PHREAK|OWNS THE PHONES",
        "HELLO, FRIEND.",
        "FSOCIETY|WAS HERE",
        "WE ARE FSOCIETY|WE ARE FINALLY FREE",
        "CONTROL IS|AN ILLUSION",
        "BONSOIR, ELLIOT",
        "EVIL CORP|DEBT ERASED",
        "5/9 WAS A TUESDAY",
        "THE POOL ON THE ROOF|MUST HAVE A LEAK",
        "GOD IS NOT|A PASSWORD",
        "0xPOLLY WAS HERE|FIND THE GARBAGE",
        "LARUCHE SEES|EVERY FILE",
        "BJORN RAIDED|THIS SUBNET",
    ];

    function drawGraffiti(startX, startY) {
        const lines = GRAFFITI[Math.floor(Math.random() * GRAFFITI.length)].split("|");
        ctx.save();
        ctx.font = `bold ${fontSize + 14}px "Courier New", monospace`;
        const big = lineHeight * 1.35;
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * big));
        ctx.restore();
        return Math.ceil(lines.length * 1.35) + 1;
    }

    function drawThreatLog(startX, startY) {
        const lines = ["=== INTRUSION LOG ==="];
        const count = Math.floor(Math.random() * 7) + 4;
        for (let i = 0; i < count; i++) {
            lines.push(THREAT_LINES[Math.floor(Math.random() * THREAT_LINES.length)]);
        }
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    // --- Fill texture columns with random blocks ---
    for (let c = 0; c < numColumns; c++) {
        let currentY = fontSize * 2;
        const sx = c * columnWidth + paddingX;
        while (currentY < height) {
            const colorRand = Math.random();
            if (colorRand < 0.60) ctx.fillStyle = C_PRIMARY;
            else if (colorRand < 0.85) ctx.fillStyle = C_SECONDARY;
            else ctx.fillStyle = C_TERTIARY;

            const bt = Math.random();
            let la = 0;
            if (bt < 0.09) la = drawFunction(sx, currentY);
            else if (bt < 0.16) la = drawHexDump(sx, currentY);
            else if (bt < 0.23) la = drawBorderedList(sx, currentY);
            else if (bt < 0.29) la = drawConnectionTable(sx, currentY);
            else if (bt < 0.34) la = drawProgressBar(sx, currentY);
            else if (bt < 0.39) la = drawSqlLog(sx, currentY);
            else if (bt < 0.44) la = drawDirList(sx, currentY);
            else if (bt < 0.49) la = drawProcessTable(sx, currentY);
            else if (bt < 0.54) la = drawCryptoBlock(sx, currentY);
            else if (bt < 0.59) la = drawBootSeq(sx, currentY);
            else if (bt < 0.64) la = drawJson(sx, currentY);
            else if (bt < 0.69) la = drawDiagnostics(sx, currentY);
            else if (bt < 0.74) la = drawBinary(sx, currentY);
            else if (bt < 0.79) la = drawCoordinates(sx, currentY);
            else if (bt < 0.85) la = drawClassifiedDir(sx, currentY);
            else if (bt < 0.91) la = drawThreatLog(sx, currentY);
            else if (bt < 0.955) la = drawDossier(sx, currentY);
            else if (bt < 0.985) la = drawGraffiti(sx, currentY);
            else { ctx.fillStyle = C_TERTIARY; la = drawAlert(sx, currentY); }
            currentY += la * lineHeight + (Math.floor(Math.random() * 8) + 4) * lineHeight;
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
}


/* =============================================================
   3. CIRCUIT TEXTURE GENERATOR
   PCB-like floor texture.
   Red = horizontal traces, Green = vertical, Blue = pads
   ============================================================= */

function createCircuitTexture() {
    /* The floor used to be random red/green crosses on a grid, and the
       shader washed a sine over the whole thing: from above it read as
       graph paper, not as a board. This draws an actual layout - chip
       footprints, fan-outs, 45 degree mitres, buses, vias, a hatched
       ground pour - and hands the shader what it needs to run signals
       along each track.

       The channels are data, not colour:
         R = copper coverage of a signal track (also the antialias mask)
         G = position along that track, 0 at the driver, 1 at the load
         B = on a track, which of the four nets it belongs to;
             everywhere else, static copper (pads, vias, pour, silk)

       R doubles as the coverage, so the shader reads G/R and B/R and
       gets the right values on the antialiased edges too. */
    const canvas = document.createElement('canvas');
    const size = 2048;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, size, size);

    const grid = 32;
    const LANES = 4;
    const laneBlue = (lane) => Math.round((lane / (LANES - 1)) * 255);

    // --- Static copper: anything that glows but carries no packet ---
    const copper = (alpha) => `rgba(0, 0, 255, ${alpha})`;

    /* A staircase from A to B that only ever moves one way on each axis:
       the gradient that carries the signal phase is projected on the
       start-to-end axis, so a route that doubled back would make its
       packets stall and reverse halfway. */
    function makeRoute(x, y) {
        const pts = [{ x, y }];
        const dirX = Math.random() < 0.5 ? 1 : -1;
        const dirY = Math.random() < 0.5 ? 1 : -1;
        let horizontal = Math.random() < 0.5;
        let cx = x, cy = y;
        const segments = 2 + Math.floor(Math.random() * 4);
        for (let i = 0; i < segments; i++) {
            const len = (2 + Math.floor(Math.random() * 8)) * grid;
            if (horizontal) cx += len * dirX; else cy += len * dirY;
            pts.push({ x: cx, y: cy });
            horizontal = !horizontal;
        }
        return pts;
    }

    // Real routers do not turn square corners: every bend is mitred.
    function chamfer(pts, radius) {
        if (pts.length < 3) return pts;
        const out = [pts[0]];
        for (let i = 1; i < pts.length - 1; i++) {
            const p = pts[i], a = pts[i - 1], b = pts[i + 1];
            const inLen = Math.hypot(p.x - a.x, p.y - a.y);
            const outLen = Math.hypot(b.x - p.x, b.y - p.y);
            const r1 = Math.min(radius, inLen * 0.45);
            const r2 = Math.min(radius, outLen * 0.45);
            out.push({ x: p.x - ((p.x - a.x) / inLen) * r1, y: p.y - ((p.y - a.y) / inLen) * r1 });
            out.push({ x: p.x + ((b.x - p.x) / outLen) * r2, y: p.y + ((b.y - p.y) / outLen) * r2 });
        }
        out.push(pts[pts.length - 1]);
        return out;
    }

    function strokeRoute(pts, width, lane) {
        const a = pts[0], b = pts[pts.length - 1];
        if (a.x === b.x && a.y === b.y) return;
        // R stays at full coverage, G sweeps 0 -> 255 along the route.
        const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
        const blue = laneBlue(lane);
        g.addColorStop(0, `rgb(255, 0, ${blue})`);
        g.addColorStop(1, `rgb(255, 255, ${blue})`);
        ctx.strokeStyle = g;
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
    }

    function drawVia(x, y, r) {
        ctx.fillStyle = copper(1);
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(x, y, r * 0.42, 0, Math.PI * 2); ctx.fill();
    }

    ctx.lineCap = 'butt';
    ctx.lineJoin = 'miter';

    // --- Hatched ground pour: the quiet copper between the signals ---
    ctx.strokeStyle = copper(0.1);
    ctx.lineWidth = 1;
    for (let k = 0; k < 11; k++) {
        const w = (6 + Math.floor(Math.random() * 10)) * grid;
        const h = (6 + Math.floor(Math.random() * 10)) * grid;
        const x = Math.floor(Math.random() * (size - w));
        const y = Math.floor(Math.random() * (size - h));
        ctx.save();
        ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
        for (let d = -h; d < w; d += 9) {
            ctx.beginPath(); ctx.moveTo(x + d, y); ctx.lineTo(x + d + h, y + h); ctx.stroke();
        }
        ctx.restore();
        ctx.strokeStyle = copper(0.3);
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        ctx.strokeStyle = copper(0.1);
        ctx.lineWidth = 1;
    }

    // --- Component footprints, and the fan-out leaving each pin ---
    for (let c = 0; c < 44; c++) {
        const pins = 3 + Math.floor(Math.random() * 6);
        const pitch = 14;
        const bodyW = 30 + Math.floor(Math.random() * 40);
        const bodyH = pins * pitch;
        const x = Math.floor(Math.random() * (size - bodyW - 200)) + 100;
        const y = Math.floor(Math.random() * (size - bodyH - 200)) + 100;

        // Body outline (silkscreen) plus the notch that marks pin 1.
        ctx.strokeStyle = copper(0.45);
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, bodyW, bodyH);
        ctx.fillStyle = copper(0.5);
        ctx.beginPath(); ctx.arc(x + 7, y + 7, 3, 0, Math.PI * 2); ctx.fill();

        for (let side = 0; side < 2; side++) {
            for (let i = 0; i < pins; i++) {
                const py = y + pitch * (i + 0.5);
                const px = side ? x + bodyW : x;
                const padW = 12;
                ctx.fillStyle = copper(1);
                ctx.fillRect(side ? px : px - padW, py - 3.5, padW, 7);

                // Two pins in three actually go somewhere.
                if (Math.random() < 0.62) {
                    const lane = Math.floor(Math.random() * LANES);
                    const stub = side ? padW + 6 : -(padW + 6);
                    const route = chamfer(makeRoute(px + stub, py), 10);
                    strokeRoute(route, 2 + Math.random() * 2, lane);
                    const end = route[route.length - 1];
                    drawVia(end.x, end.y, 5);
                }
            }
        }
    }

    // --- Buses: the same route walked by several parallel tracks ---
    for (let b = 0; b < 46; b++) {
        const x = Math.floor(Math.random() * (size / grid)) * grid;
        const y = Math.floor(Math.random() * (size / grid)) * grid;
        const width = 2 + Math.random() * 2.5;
        const spacing = width + 4;
        const tracks = 2 + Math.floor(Math.random() * 5);
        const base = makeRoute(x, y);
        const lane = Math.floor(Math.random() * LANES);
        for (let t = 0; t < tracks; t++) {
            /* Offsetting both axes by the same amount is how a bus is
               actually drawn: the tracks stay parallel through the
               staircase instead of crossing at the corners. */
            const k = (t - tracks / 2) * spacing;
            const shifted = base.map((p) => ({ x: p.x + k, y: p.y + k }));
            strokeRoute(chamfer(shifted, 10), width, lane);
        }
        const head = base[0], tail = base[base.length - 1];
        drawVia(head.x, head.y, 5);
        drawVia(tail.x, tail.y, 5);
    }

    // --- Single tracks, thicker: power and the long hauls ---
    for (let r = 0; r < 70; r++) {
        const x = Math.floor(Math.random() * (size / grid)) * grid;
        const y = Math.floor(Math.random() * (size / grid)) * grid;
        const lane = Math.floor(Math.random() * LANES);
        const route = chamfer(makeRoute(x, y), 12);
        strokeRoute(route, 3 + Math.random() * 4, lane);
        drawVia(route[0].x, route[0].y, 6);
        drawVia(route[route.length - 1].x, route[route.length - 1].y, 6);
    }

    // --- Loose vias, test points and passives ---
    for (let i = 0; i < 260; i++) {
        drawVia(Math.random() * size, Math.random() * size, 3 + Math.random() * 3);
    }
    for (let i = 0; i < 150; i++) {
        const x = Math.floor(Math.random() * (size / grid)) * grid;
        const y = Math.floor(Math.random() * (size / grid)) * grid;
        const horizontal = Math.random() < 0.5;
        ctx.fillStyle = copper(0.9);
        // Two pads with a body between them: a resistor, from above.
        if (horizontal) {
            ctx.fillRect(x, y, 9, 7); ctx.fillRect(x + 20, y, 9, 7);
            ctx.fillStyle = copper(0.35);
            ctx.fillRect(x + 9, y + 1, 11, 5);
        } else {
            ctx.fillRect(x, y, 7, 9); ctx.fillRect(x, y + 20, 7, 9);
            ctx.fillStyle = copper(0.35);
            ctx.fillRect(x + 1, y + 9, 5, 11);
        }
    }

    // --- Silkscreen references, small enough to read as texture ---
    ctx.font = 'bold 11px "Courier New", monospace';
    ctx.fillStyle = copper(0.4);
    const prefixes = ["R", "C", "U", "Q", "D", "TP", "J"];
    for (let i = 0; i < 190; i++) {
        const label = prefixes[Math.floor(Math.random() * prefixes.length)] + (1 + Math.floor(Math.random() * 99));
        ctx.fillText(label, Math.random() * size, Math.random() * size);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    /* A board seen at eye level is nearly edge-on: without anisotropy the
       far half of the avenue turns to grey mush. */
    if (typeof renderer !== "undefined") {
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }
    return texture;
}


/* =============================================================
   4. GARBAGE TEXTURE GENERATOR
   The secret "Garbage File" menu from the movie
   ============================================================= */

function createGarbageTexture() {
    const canvas = document.createElement("canvas");
    const width = 1024, height = 2048;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    const fontSize = 48, lineHeight = 70;
    const fontFamily = '"Courier New", monospace';
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    const colorCyan = "#5cf5f5", colorPurple = "#ab49e3";

    const menuItems = ["COMPANY STATUS", "COMPOSITE PLANTS", "EXPLOR. DVLT.", "EXPLOR. RESEARCH", "GEOLOGIC RESEARCH", "GARBAGE", "GEOLOGIC BUDGETS", "MINING CONSULTANTS", "BALLAST REPORTS", "MINE DEVELOPMENT", "BLAST FRNC. STATUS", "NUCLEAR RESEARCH", "RECRUITMENT", "AIRFREIGHT STATUS"];
    let currentY = 200;
    menuItems.forEach((item) => {
        ctx.fillStyle = (item === "GARBAGE") ? colorPurple : colorCyan;
        ctx.fillText(item, 50, currentY);
        ctx.fillText("\u25BA", 600, currentY);
        currentY += lineHeight;
    });

    const rightX = 650;
    let rightY = 400;
    ctx.fillStyle = colorPurple;
    ctx.fillText("CONFIDENTIAL", rightX, rightY); rightY += lineHeight;
    ctx.fillText("FILES", rightX + 80, rightY); rightY += lineHeight * 0.5;
    ctx.font = `bold ${fontSize * 0.4}px ${fontFamily}`;
    ctx.fillText("DO NOT DELETE", rightX, rightY + 30);
    ctx.fillText("BEFORE FINAL", rightX, rightY + 50);
    ctx.fillText("BACK-UP IS COMPLETED", rightX, rightY + 70);
    rightY += 120;

    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.lineWidth = 4;
    ["FILE 1", "FILE 2", "FILE 3", "FILE 4"].forEach((file) => {
        const boxY = rightY - fontSize + 15, boxW = 250, boxH = fontSize + 20;
        ctx.strokeStyle = colorPurple; ctx.strokeRect(rightX, boxY, boxW, boxH);
        ctx.fillStyle = colorPurple;
        ctx.fillText(file, rightX + (boxW - ctx.measureText(file).width) / 2, rightY + 5);
        rightY += lineHeight * 0.6;
        ctx.font = `bold ${fontSize * 0.35}px ${fontFamily}`;
        ctx.fillText("WAITING FOR BACK-UP", rightX + 20, rightY + 5);
        ctx.font = `bold ${fontSize}px ${fontFamily}`;
        rightY += lineHeight * 1.2;
    });

    ctx.strokeStyle = "#111133"; ctx.lineWidth = 1;
    for (let i = 0; i < height; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke(); }

    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    return texture;
}


/* =============================================================
   5. SHADERS
   ============================================================= */

// --- 5a. DataFlow Shader (Building Faces) ---
const DataFlowShader = {
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vObjectPosition;
        varying vec3 vNormal;
        void main() {
            vUv = uv;
            vNormal = normal;
            vObjectPosition = vec3(modelMatrix[3][0], modelMatrix[3][1], modelMatrix[3][2]);
            gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D uTexture;
        uniform float uTime;
        uniform vec3 uColor;
        uniform vec3 uColor2;
        uniform vec3 uColor3;
        uniform vec3 uBorderColor;
        uniform float uSpeed;
        varying vec2 vUv;
        varying vec3 vObjectPosition;
        varying vec3 vNormal;

        float rand(vec2 co){ return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453); }

        void main() {
            vec2 uv = vUv;
            float seed = rand(vObjectPosition.xz);
            float edgeW = 0.03;
            float borderX = smoothstep(edgeW, 0.0, uv.x) + smoothstep(1.0 - edgeW, 1.0, uv.x);
            float borderY = smoothstep(edgeW, 0.0, uv.y) + smoothstep(1.0 - edgeW, 1.0, uv.y);
            float border = clamp(borderX + borderY, 0.0, 1.0);
            float baseGlow = smoothstep(0.2, 0.0, uv.y) * 1.5;
            vec4 texColor = vec4(0.0);
            vec3 activeTextColor = uColor;
            float activeBrightness = 1.0;
            float selectionBox = 0.0;
            vec2 uvToUse = uv;

            if (seed < 0.20) {
                uvToUse.y += seed * 100.0;
                texColor = texture2D(uTexture, uvToUse);
                activeBrightness = 0.5 + 0.5 + 0.5 * sin(uTime * 3.0 + seed * 10.0);
            } else if (seed < 0.45) {
                uvToUse.y += seed * 100.0;
                texColor = texture2D(uTexture, uvToUse);
                float rowIndex = floor(uvToUse.y * 40.0);
                float faceHash = dot(vNormal, vec3(12.9898, 78.233, 45.164));
                float rowRand = rand(vec2(rowIndex + faceHash, seed));
                if (rowRand > 0.90) {
                    float colType = fract(rowRand * 10.0);
                    float xStart = (colType > 0.5) ? 0.55 : 0.05;
                    float xEnd = (colType > 0.5) ? 0.95 : 0.45;
                    if (uv.x > xStart && uv.x < xEnd && sin(uTime * (4.0 + rowRand * 8.0)) > 0.0) {
                        selectionBox = 0.8;
                        activeTextColor = vec3(1.0);
                    }
                }
            } else {
                float speedMod = (seed < 0.65) ? (5.0 + seed*5.0) : (0.8 + seed*0.4);
                uvToUse.y -= (uTime * uSpeed * speedMod) + seed * 100.0;
                texColor = texture2D(uTexture, uvToUse);
                activeBrightness = (seed < 0.65) ? 1.3 : 1.2;
            }

            float m1 = texColor.r, m2 = texColor.g, m3 = texColor.b;
            float isBar = step(0.8, m1) * step(0.8, m3);
            float normalTextMask = 1.0 - isBar;
            m1 *= normalTextMask;
            float m2_text = m2 * normalTextMask;
            m3 *= normalTextMask;
            float totalMask = max(m1, max(m2_text, m3));

            if (isBar > 0.5) {
                float barRowId = floor(uvToUse.y * 200.0);
                float barRand = rand(vec2(barRowId, seed));
                float barProgress = fract(uTime * (0.2 + barRand * 1.3) + barRand * 100.0);
                if (step(m2, barProgress) > 0.5) { activeTextColor = uColor2; totalMask = 1.0; activeBrightness = 1.5; }
                else { activeTextColor = uColor * 0.2; totalMask = 1.0; activeBrightness = 0.5; }
            } else {
                if (activeTextColor != vec3(1.0)) {
                    activeTextColor = (uColor * m1 + uColor2 * m2_text + uColor3 * m3) / max(0.001, m1+m2_text+m3);
                }
            }

            float textMask = smoothstep(0.45, 0.55, totalMask);
            vec3 finalColor = uColor * 0.04 + uBorderColor * selectionBox + activeTextColor * textMask * activeBrightness + uColor * border * 4.0 + uColor * baseGlow;
            float finalAlpha = 0.6 + (textMask * 0.4) + selectionBox + (border * 0.4) + (baseGlow * 0.2);
            gl_FragColor = vec4(finalColor, clamp(finalAlpha, 0.0, 1.0));
        }
    `
};

// --- 5b. Floor Shader ---
/* Reads the board texture as data (see createCircuitTexture): R is the
   copper coverage, G the position along the track, B the net it belongs
   to. Dividing G and B by R undoes the antialiasing, so the phase and
   the net stay right on the soft edges of every trace.

   Each net gets its own colour and its own clock, and packets run from
   driver to load along the track rather than a sine sliding over the
   whole floor. */
const FloorShader = {
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        void main() { vUv = uv; vPosition = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
        uniform sampler2D uTexture; uniform float uTime; uniform vec3 uColor;
        uniform vec2 uFloorSize; uniform float uSpacing; uniform float uBoxWidth;
        varying vec2 vUv; varying vec3 vPosition;

        vec3 netColor(float lane) {
            if (lane < 0.5) return vec3(0.18, 0.89, 1.00); // electric cyan
            if (lane < 1.5) return vec3(1.00, 0.24, 0.94); // magenta
            if (lane < 2.5) return vec3(1.00, 0.54, 0.17); // amber
            return vec3(0.42, 0.55, 1.00);                 // signal blue
        }

        void main() {
            vec2 worldPos = (vUv - 0.5) * uFloorSize;
            vec2 cellPos = mod(worldPos, uSpacing) - 0.5 * uSpacing;
            float halfBox = uBoxWidth * 0.5 + 0.2;
            float floorMask = 1.0 - step(abs(cellPos.x), halfBox) * step(abs(cellPos.y), halfBox);

            // Square tiles: the floor is twice as long as it is deep, so a
            // single tiling factor would stretch the whole board.
            vec2 tiledUv = vUv * vec2(16.0, 16.0 * (uFloorSize.y / uFloorSize.x));
            vec4 tex = texture2D(uTexture, tiledUv);

            float copper = tex.r;
            float cov = max(copper, 0.001);
            float phase = clamp(tex.g / cov, 0.0, 1.0);
            float lane = floor(clamp(tex.b / cov, 0.0, 1.0) * 3.0 + 0.5);
            vec3 sig = netColor(lane);

            // Unpowered copper still catches light, or the board would only
            // exist where a packet happens to be.
            float trace = smoothstep(0.12, 0.55, copper);
            float rest = trace * 0.22;

            // Each net runs at its own rate, and starts out of step.
            float speed = 0.30 + lane * 0.13;
            float p = fract(phase * 2.0 - uTime * speed + lane * 0.37);
            float head = smoothstep(0.955, 1.0, p);
            float tail = smoothstep(0.72, 1.0, p);
            float packet = (head * 2.6 + tail * tail * 0.7) * trace;

            // Static copper: pads, vias, ground pour, silkscreen.
            float pad = (1.0 - step(0.08, copper)) * tex.b;
            float padPulse = 0.75 + 0.25 * sin(uTime * 2.0 + worldPos.x * 0.05 + worldPos.y * 0.03);

            vec3 color = sig * (rest + packet)
                       + uColor * pad * 0.5 * padPulse
                       + vec3(1.0) * head * trace * 0.85;

            gl_FragColor = vec4(color * floorMask, 1.0);
        }
    `
};

// --- 5c. Garbage Shader ---
const GarbageShader = {
    vertexShader: `
        varying vec2 vUv; varying vec3 vNormal;
        void main() { vUv = uv; vNormal = normal; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
    `,
    fragmentShader: `
        uniform sampler2D uTexture; uniform float uTime;
        varying vec2 vUv; varying vec3 vNormal;
        void main() {
            vec4 texColor = texture2D(uTexture, vUv);
            float s = sin(vUv.y * 800.0) * 0.1 + 0.9;
            float flicker = 0.95 + 0.05 * sin(uTime * 20.0);
            float blink = 1.0;
            if (texColor.g < 0.5 && texColor.r > 0.4) { blink = (sin(uTime * 8.0) > 0.0) ? 1.8 : 0.5; }
            vec3 color = texColor.rgb * 1.5 * s * flicker * blink;
            float alpha = texColor.a;
            if (texColor.r < 0.1 && texColor.g < 0.1 && texColor.b < 0.1) { color = vec3(0.05, 0.0, 0.1); alpha = 0.8; }
            else { alpha = 0.9; }
            gl_FragColor = vec4(color, alpha);
        }
    `
};


/* =============================================================
   6. MUSIC PLAYER (Local HTML5 Audio)
   Plays MP3 files from assets/songs/ with shuffle, prev/next.
   No YouTube dependency.
   ============================================================= */

function initMusicPlayer() {
    // --- Playlist (local MP3 files) ---
    const PLAYLIST = [
        { file: "assets/songs/Hackers PRODIGY - voodoo people.mp3",                          title: "PRODIGY - VOODOO PEOPLE" },
        { file: "assets/songs/Halcyon On On Hackers Soundtrack.mp3",                          title: "ORBITAL - HALCYON ON ON" },
        { file: "assets/songs/Open Up Hackers Soundtrack.mp3",                                title: "LEFTFIELD - OPEN UP" },
        { file: "assets/songs/One Love Hackers Soundtrack.mp3",                               title: "PRODIGY - ONE LOVE" },
        { file: "assets/songs/Cowgirl Hackers Soundtrack.mp3",                                title: "UNDERWORLD - COWGIRL" },
        { file: "assets/songs/Communicate Headquake Hazy Cloud Mix Hackers Soundtrack.mp3",   title: "STEREO MC'S - COMMUNICATE" },
        { file: "assets/songs/Richest Junkie Still Alive Sank Remix Hackers Soundtrack.mp3",  title: "MACHINES OF LOVING GRACE - RICHEST JUNKIE (SANK RMX)" },
        { file: "assets/songs/Machines of Loving Grace - Richest Junkie Still Alive Sank Remix.mp3", title: "MACHINES OF LOVING GRACE - RICHEST JUNKIE (ALT)" },
    ];

    const container = document.getElementById('music-player-container');
    const songInfo = document.getElementById('song-info');
    // Drives the little level meter in the HUD; CSS does the rest.
    const setPlayingClass = (on) => container.classList.toggle('is-playing', on);
    const audio = new Audio();
    audio.volume = 0.5;
    audio.preload = 'auto';

    let currentIndex = 0;
    let isPlaying = false;
    let hasStarted = false;

    /* Voodoo People opens the session, always: it is the track the film
       hands you when the city lights up, and a random opener wasted it
       one launch out of eight. Everything after it stays shuffled, so
       index 0 is held out of the swap. */
    const OPENING_TRACK = 0;
    for (let i = PLAYLIST.length - 1; i > OPENING_TRACK + 1; i--) {
        const j = OPENING_TRACK + 1 + Math.floor(Math.random() * (i - OPENING_TRACK));
        [PLAYLIST[i], PLAYLIST[j]] = [PLAYLIST[j], PLAYLIST[i]];
    }

    // --- Load a track by index ---
    function loadTrack(index) {
        currentIndex = ((index % PLAYLIST.length) + PLAYLIST.length) % PLAYLIST.length;
        const track = PLAYLIST[currentIndex];
        audio.src = track.file;
        updateSongDisplay(track.title);
    }

    // --- Update HUD display with track title ---
    function updateSongDisplay(title) {
        songInfo.innerHTML = `<span class="track-content">${title}</span>`;
        const span = songInfo.querySelector('.track-content');
        // Add marquee scroll if text overflows
        requestAnimationFrame(() => {
            if (span.offsetWidth > songInfo.clientWidth) {
                span.classList.add('scroll');
            }
        });
        songInfo.style.color = "";
    }

    // --- Play / Pause toggle ---
    function togglePlay() {
        if (!hasStarted) {
            hasStarted = true;
            loadTrack(0);
        }
        if (isPlaying) {
            audio.pause();
            isPlaying = false;
            setPlayingClass(false);
            songInfo.innerText = "-- PAUSED --";
            songInfo.style.color = "";
        } else {
            audio.play().catch(() => {
                songInfo.innerText = "./play --confirm";
            });
            isPlaying = true;
            setPlayingClass(true);
            updateSongDisplay(PLAYLIST[currentIndex].title);
        }
    }

    // --- Next / Previous ---
    function nextTrack() {
        loadTrack(currentIndex + 1);
        if (isPlaying) audio.play();
    }

    function prevTrack() {
        // If more than 3s in, restart current track instead
        if (audio.currentTime > 3) {
            audio.currentTime = 0;
        } else {
            loadTrack(currentIndex - 1);
        }
        if (isPlaying) audio.play();
    }

    // --- Auto-advance when track ends ---
    audio.addEventListener('ended', () => {
        nextTrack();
    });

    // --- Error handling ---
    audio.addEventListener('error', () => {
        songInfo.innerText = "!! track unreadable, skipping";
        songInfo.style.color = "var(--mr-red)";
        setTimeout(() => nextTrack(), 1500);
    });

    // --- Connect UI buttons ---
    songInfo.addEventListener('click', togglePlay);
    document.getElementById('btn-prev').addEventListener('click', prevTrack);
    document.getElementById('btn-next').addEventListener('click', nextTrack);

    // --- Mute button handling ---
    const btnMute = document.getElementById('btn-mute');
    /* The HUD is a terminal window now: state is spelled out, not drawn. */
    function updateMuteState() {
        if (!btnMute) return;
        btnMute.innerText = audio.muted ? "MUT" : "SND";
        btnMute.title = audio.muted ? "Unmute audio" : "Mute audio";
        btnMute.classList.toggle("is-off", audio.muted);
    }

    function toggleMute(e) {
        if (e) e.stopPropagation();
        audio.muted = !audio.muted;
        soundEnabled = !audio.muted;
        updateMuteState();
    }

    if (btnMute) {
        btnMute.addEventListener('click', toggleMute);
    }

    // --- Return external control interface ---
    return {
        show: () => container.classList.add('visible'),
        play: () => {
            if (!hasStarted) { hasStarted = true; loadTrack(0); }
            isPlaying = true;
            setPlayingClass(true);
            audio.play().catch(() => {});
            updateSongDisplay(PLAYLIST[currentIndex].title);
        },
        setVolume: (vol) => { audio.volume = vol / 100; },
        toggleMute: toggleMute,
        updateMuteState: updateMuteState
    };
}


/* =============================================================
   7. TIMING HELPERS
   ============================================================= */

function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${milliseconds.toString().padStart(2, '0')}`;
}


/* =============================================================
   8. SCENE SETUP
   ============================================================= */

/* The film's Gibson is not a pastel city: it is amber text burning
   inside glass slabs, electric blue traces running across a black
   floor, and violet haze between the towers. The palette, the bloom and
   the fog below are aimed at that frame rather than at a generic neon
   skyline. */
const CONFIG = {
    colors: {
        background: 0x05020c,
        floorHighlight: 0x1b4ac2,
    },
    bloom: { strength: 0.75, radius: 0.28, threshold: 0.22 },
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.colors.background);
scene.fog = new THREE.FogExp2(CONFIG.colors.background, 0.0022);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 60, 80);
camera.lookAt(0, 0, 0);
camera.rotation.order = "YXZ";

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ReinhardToneMapping;
// Reinhard eats the highlights; the neon needs a little of it back.
renderer.toneMappingExposure = 1.15;
document.querySelector("#app").appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0x404040, 2));
const pointLight = new THREE.PointLight(0xff00ff, 2, 50);
pointLight.position.set(0, 10, 0);
scene.add(pointLight);


/* =============================================================
   9. CONTROLS
   ============================================================= */

const inputState = { isDragging: false, prevMouse: { x: 0, y: 0 }, yaw: 0, pitch: 0 };

renderer.domElement.addEventListener("mousedown", (e) => {
    if (appState !== "RUNNING") return;
    inputState.isDragging = true;
    inputState.prevMouse.x = e.clientX;
    inputState.prevMouse.y = e.clientY;
});
window.addEventListener("mouseup", () => { inputState.isDragging = false; });
window.addEventListener("mousemove", (e) => {
    if (appState !== "RUNNING" || !inputState.isDragging) return;
    inputState.yaw -= (e.clientX - inputState.prevMouse.x) * 0.002;
    inputState.pitch -= (e.clientY - inputState.prevMouse.y) * 0.002;
    inputState.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, inputState.pitch));
    inputState.prevMouse.x = e.clientX;
    inputState.prevMouse.y = e.clientY;
});

/* --- Keyboard -------------------------------------------------
   Two records are kept for every key event: the character it produced
   (e.key) and the physical key (e.code). The game reads the physical
   one, because "KeyW" is the same slab of plastic whether it is
   labelled W on QWERTY or Z on AZERTY: ZQSD lands exactly where WASD
   lands, without asking anyone anything. The character record is only a
   fallback for events that carry no usable code. */
const keyState = {};   // by character: "w", "arrowup", " ", "shift"
const codeState = {};  // by key:       "KeyW", "ArrowUp", "Space"
let hasKeyCodes = false;

window.addEventListener("keydown", (e) => {
    keyState[e.key.toLowerCase()] = true;
    if (e.code) { codeState[e.code] = true; hasKeyCodes = true; }
    detectLayoutFromEvent(e);
});
window.addEventListener("keyup", (e) => {
    keyState[e.key.toLowerCase()] = false;
    if (e.code) codeState[e.code] = false;
});
/* A window that loses focus never delivers the keyup: without this the
   camera keeps flying forward on its own after an alt-tab. */
window.addEventListener("blur", () => {
    for (const k in keyState) keyState[k] = false;
    for (const c in codeState) codeState[c] = false;
});

/* --- Keyboard layout (QWERTY / AZERTY) ------------------------
   Movement is already layout agnostic (see codeState above), so the
   layout only decides what the HUD and the CONTROLS panel announce, and
   which characters the fallback path listens to. It is detected rather
   than guessed: the Keyboard Map API when the browser exposes it, the
   browser language otherwise, and the first keystroke that betrays the
   real layout corrects both. Clicking the HUD button pins the choice. */
const LAYOUT_KEYS = {
    QWERTY: { forward: "w", back: "s", left: "a", right: "d", turnLeft: "q", turnRight: "e" },
    AZERTY: { forward: "z", back: "s", left: "q", right: "d", turnLeft: "a", turnRight: "e" },
};
// Physical keys, identical for both layouts.
const LAYOUT_CODES = { forward: "KeyW", back: "KeyS", left: "KeyA", right: "KeyD", turnLeft: "KeyQ", turnRight: "KeyE" };

const LAYOUT_STORAGE_KEY = "hackers_1995_layout";
let keyboardLayout = "QWERTY";
let layoutPinned = false; // true once the user has picked one by hand

const btnLayout = document.getElementById("btn-layout");

function setLayout(layout, pin) {
    keyboardLayout = layout;
    if (pin) {
        layoutPinned = true;
        try { localStorage.setItem(LAYOUT_STORAGE_KEY, layout); } catch (_) { /* private browsing */ }
    }
    if (btnLayout) {
        btnLayout.innerText = layout;
        btnLayout.title = `Keyboard layout: ${layout}${layoutPinned ? "" : " (auto-detected)"} - click to switch`;
    }
    document.querySelectorAll("[data-layout-only]").forEach((el) => {
        el.classList.toggle("layout-inactive", el.dataset.layoutOnly !== layout);
    });
}

/* A key whose character does not match its US position gives the layout
   away: the KeyQ slot returns "a" on AZERTY. */
const AZERTY_TELLS = { KeyQ: "a", KeyA: "q", KeyW: "z", KeyZ: "w" };
const QWERTY_TELLS = { KeyQ: "q", KeyA: "a", KeyW: "w", KeyZ: "z" };
function detectLayoutFromEvent(e) {
    if (layoutPinned || !e.code || e.key.length !== 1) return;
    const ch = e.key.toLowerCase();
    if (AZERTY_TELLS[e.code] === ch) { if (keyboardLayout !== "AZERTY") setLayout("AZERTY", false); }
    else if (QWERTY_TELLS[e.code] === ch) { if (keyboardLayout !== "QWERTY") setLayout("QWERTY", false); }
}

if (btnLayout) {
    btnLayout.addEventListener("click", (e) => {
        e.stopPropagation();
        setLayout(keyboardLayout === "QWERTY" ? "AZERTY" : "QWERTY", true);
        btnLayout.blur();
    });
}

(async function autoDetectLayout() {
    let stored = null;
    try { stored = localStorage.getItem(LAYOUT_STORAGE_KEY); } catch (_) { /* ignore */ }
    if (stored === "QWERTY" || stored === "AZERTY") { setLayout(stored, true); return; }

    // Keyboard Map API: Chromium, secure contexts only.
    if (navigator.keyboard && navigator.keyboard.getLayoutMap) {
        try {
            const map = await navigator.keyboard.getLayoutMap();
            const q = String(map.get("KeyQ") || "").toLowerCase();
            if (q) { setLayout(q === "a" ? "AZERTY" : "QWERTY", false); return; }
        } catch (_) { /* denied or unavailable */ }
    }
    const lang = String((navigator.languages && navigator.languages[0]) || navigator.language || "").toLowerCase();
    setLayout(/^fr|^nl-be/.test(lang) ? "AZERTY" : "QWERTY", false);
})();


/* --- Touch controls -------------------------------------------
   Three concurrent gestures, each one owning its touch by identifier so
   that none can steal another's job:

     - the left stick (floating: it spawns under the thumb, anywhere in
       the bottom-left quadrant) drives movement,
     - any other finger aims the camera - that is the finger resting
       next to the stick - and shoots: a drag too short to be a drag is
       a tap, which fires the raycast,
     - the FLY pad, or a second finger sliding vertically, changes
       altitude.

   The stick no longer grabs "whatever touch sits within 150px" the way
   it used to: it follows the identifier it claimed, so the aiming
   finger can pass right beside it without dragging it along. */

const moveJoystick = { x: 0, y: 0, active: false };
const lookInertia = { x: 0, y: 0 };
let flyImpulse = 0;  // metres banked by the two-finger slide

const LOOK_SENSITIVITY = 0.0042;
/* The glide after a flick is a garnish, not a throw: one frame of a fast
   swipe is worth ~0.25 rad, and a 0.86 decay would turn that into a full
   spin. Capped, it adds a few degrees and settles. */
const LOOK_INERTIA_MAX = 0.02;
const TAP_MAX_MOVE = 16;   // px
const TAP_MAX_TIME = 350;  // ms
const STICK_MAX_DIST = 42; // px

// --- Elements (built here; the HTML only describes the HUD) ---
const stickEl = document.createElement("div");
stickEl.id = "stick-move";
stickEl.className = "virtual-stick-zone";
stickEl.innerHTML = `<div class="stick-label">MOVE</div><div class="stick-base"><div class="stick-knob"></div></div>`;
document.body.appendChild(stickEl);
const stickKnob = stickEl.querySelector(".stick-knob");

/* --- Stick zone: geometric, so it intercepts nothing in the DOM ---
   Gated on the same media query that draws the stick: a touchscreen
   laptop reports a fine pointer, hides it, and must not have an
   invisible stick quietly swallowing the taps in that corner. */
const coarsePointer = window.matchMedia("(pointer: coarse)");
let touchUiVisible = coarsePointer.matches;
if (coarsePointer.addEventListener) {
    coarsePointer.addEventListener("change", (e) => { touchUiVisible = e.matches; releaseStick(); });
}

function inMoveZone(x, y) {
    return touchUiVisible && x < window.innerWidth * 0.5 && y > window.innerHeight * 0.55;
}
// Interface surfaces keep their own taps.
function isUiTarget(target) {
    return !!(target && target.closest &&
        target.closest("button, a, input, #music-player-container, #garbage-modal, #ui-overlay"));
}

const touches = { move: null, look: null, second: null };
const touchPos = {}; // identifier -> last known position
const lookState = { x: 0, y: 0, startX: 0, startY: 0, startTime: 0, travel: 0 };
let twoFingerPrevY = null;

function setStickCenter(x, y) {
    const half = stickEl.offsetWidth / 2 || 60;
    const cx = Math.max(half + 8, Math.min(window.innerWidth - half - 8, x));
    const cy = Math.max(half + 8, Math.min(window.innerHeight - half - 8, y));
    stickEl.classList.add("is-floating");
    stickEl.style.left = (cx - half) + "px";
    stickEl.style.top = (cy - half) + "px";
    return { x: cx, y: cy };
}
function releaseStick() {
    touches.move = null;
    moveJoystick.active = false;
    moveJoystick.x = 0; moveJoystick.y = 0;
    stickEl.classList.remove("is-floating", "is-active");
    stickEl.style.left = ""; stickEl.style.top = "";
    stickKnob.style.transform = "translate(-50%, -50%)";
}
function updateStick(t) {
    const c = touches.move.center;
    let dx = t.clientX - c.x, dy = t.clientY - c.y;
    const dist = Math.hypot(dx, dy);
    if (dist > STICK_MAX_DIST) { dx = (dx / dist) * STICK_MAX_DIST; dy = (dy / dist) * STICK_MAX_DIST; }
    stickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;

    // Dead zone then a soft curve: fine control stays near the centre.
    const nx = dx / STICK_MAX_DIST, ny = dy / STICK_MAX_DIST;
    const mag = Math.min(1, Math.hypot(nx, ny));
    if (mag < 0.12) { moveJoystick.x = 0; moveJoystick.y = 0; return; }
    const shaped = Math.pow((mag - 0.12) / 0.88, 1.4);
    moveJoystick.x = (nx / mag) * shaped;
    moveJoystick.y = (ny / mag) * shaped;
}

function applyLook(dx, dy) {
    inputState.yaw -= dx * LOOK_SENSITIVITY;
    inputState.pitch -= dy * LOOK_SENSITIVITY;
    inputState.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, inputState.pitch));
    lookInertia.x = Math.max(-LOOK_INERTIA_MAX, Math.min(LOOK_INERTIA_MAX, -dx * LOOK_SENSITIVITY));
    lookInertia.y = Math.max(-LOOK_INERTIA_MAX, Math.min(LOOK_INERTIA_MAX, -dy * LOOK_SENSITIVITY));
}

/* An aimed tap: same raycast as the mouse click, handled here so the
   ghost click the browser would synthesize can be cancelled. */
function tapAim(clientX, clientY) {
    if (appState !== "RUNNING" || !garbageModal.classList.contains("hidden")) return;
    mouse.x = (clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(pillarGroup.children);
    for (let i = 0; i < hits.length; i++) {
        if (hits[i].object.userData.isGarbage) { triggerGarbageSequence(); return; }
    }
}

window.addEventListener("touchstart", (e) => {
    if (appState !== "RUNNING" || isUiTarget(e.target)) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];

        if (touches.move === null && inMoveZone(t.clientX, t.clientY)) {
            stickEl.classList.add("is-active");
            touches.move = { id: t.identifier, center: setStickCenter(t.clientX, t.clientY) };
            moveJoystick.active = true;
            stickKnob.style.transform = "translate(-50%, -50%)";
            e.preventDefault();
            continue;
        }

        if (touches.look === null) {
            touches.look = t.identifier;
            touchPos[t.identifier] = { x: t.clientX, y: t.clientY };
            lookState.x = lookState.startX = t.clientX;
            lookState.y = lookState.startY = t.clientY;
            lookState.startTime = performance.now();
            lookState.travel = 0;
            lookInertia.x = lookInertia.y = 0;
            e.preventDefault();
            continue;
        }

        if (touches.second === null) {
            // A second finger outside the stick switches to altitude.
            touches.second = t.identifier;
            touchPos[t.identifier] = { x: t.clientX, y: t.clientY };
            twoFingerPrevY = (lookState.y + t.clientY) / 2;
            e.preventDefault();
        }
    }
}, { passive: false });

window.addEventListener("touchmove", (e) => {
    if (appState !== "RUNNING") return;
    let handled = false;

    for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (touches.move && t.identifier === touches.move.id) { updateStick(t); handled = true; continue; }
        if (t.identifier === touches.look || t.identifier === touches.second) {
            touchPos[t.identifier] = { x: t.clientX, y: t.clientY };
            handled = true;
        }
    }
    if (!handled) return;

    if (touches.second !== null) {
        /* Two fingers outside the stick: their vertical average drives
           altitude and the camera holds still, otherwise the slightest
           drift between the two fingers also swings the view. */
        const a = touchPos[touches.look], b = touchPos[touches.second];
        const ys = [a && a.y, b && b.y].filter((v) => typeof v === "number");
        if (ys.length) {
            const avgY = ys.reduce((m, v) => m + v, 0) / ys.length;
            if (twoFingerPrevY !== null) flyImpulse += (twoFingerPrevY - avgY) * 0.14;
            twoFingerPrevY = avgY;
        }
        if (a) { lookState.x = a.x; lookState.y = a.y; }
    } else if (touches.look !== null && touchPos[touches.look]) {
        const p = touchPos[touches.look];
        const dx = p.x - lookState.x, dy = p.y - lookState.y;
        lookState.travel += Math.hypot(dx, dy);
        applyLook(dx, dy);
        lookState.x = p.x;
        lookState.y = p.y;
    }
    e.preventDefault();
}, { passive: false });

function endTouches(e) {
    for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        delete touchPos[t.identifier];

        if (touches.move && t.identifier === touches.move.id) { releaseStick(); continue; }

        if (t.identifier === touches.look) {
            const quick = performance.now() - lookState.startTime < TAP_MAX_TIME;
            const still = Math.hypot(t.clientX - lookState.startX, t.clientY - lookState.startY) < TAP_MAX_MOVE
                && lookState.travel < TAP_MAX_MOVE * 2;
            touches.look = null;
            if (touches.second !== null) {
                /* One of the two altitude fingers left: the survivor goes
                   back to aiming, from wherever it is now, so the view
                   does not snap to the gap between the two. */
                touches.look = touches.second;
                touches.second = null;
                twoFingerPrevY = null;
                const p = touchPos[touches.look];
                if (p) { lookState.x = lookState.startX = p.x; lookState.y = lookState.startY = p.y; }
                lookState.startTime = performance.now();
                lookState.travel = TAP_MAX_MOVE * 3; // a promoted finger never counts as a tap
                continue;
            }
            if (quick && still && e.type === "touchend") {
                lookInertia.x = lookInertia.y = 0;
                tapAim(t.clientX, t.clientY);
                // Without this the browser synthesizes a click and the
                // mouse-click raycast runs the whole thing a second time.
                if (e.cancelable) e.preventDefault();
            }
            continue;
        }

        if (t.identifier === touches.second) { touches.second = null; twoFingerPrevY = null; }
    }
    if (touches.look === null && touches.second === null) twoFingerPrevY = null;
}
window.addEventListener("touchend", endTouches, { passive: false });
window.addEventListener("touchcancel", endTouches, { passive: false });

// A rotation invalidates every remembered position.
window.addEventListener("orientationchange", () => { releaseStick(); touches.look = null; touches.second = null; });


/* =============================================================
   10. CITY GRID GENERATION
   ============================================================= */

const gridCols = 80, gridRows = 40, spacing = 16, boxWidth = 6, boxHeight = 15;
const floorWidth = gridCols * spacing + 20, floorDepth = gridRows * spacing + 20;
const floorGeometry = new THREE.PlaneGeometry(floorWidth, floorDepth, 100, 50);
const circuitTexture = createCircuitTexture();

const floorMaterial = new THREE.ShaderMaterial({
    vertexShader: FloorShader.vertexShader, fragmentShader: FloorShader.fragmentShader,
    uniforms: { uTexture: { value: circuitTexture }, uTime: { value: 0 }, uColor: { value: new THREE.Color(CONFIG.colors.floorHighlight) }, uFloorSize: { value: new THREE.Vector2(floorWidth, floorDepth) }, uSpacing: { value: spacing }, uBoxWidth: { value: boxWidth } },
    transparent: false, side: THREE.DoubleSide,
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const pillarGroup = new THREE.Group();
scene.add(pillarGroup);
const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxWidth);
const dataTexture = createDataTexture();

/* Amber, electric cyan, violet: the three colours the flythrough keeps
   coming back to. The warm one is what the old pastel trio was missing. */
const neonColors = [0xff8a2b, 0x2fe4ff, 0xb14dff];
const materialsByColor = [];
neonColors.forEach((colorHex, pIndex) => {
    materialsByColor[pIndex] = [];
    for (let i = 0; i < 8; i++) {
        const col = new THREE.Color(colorHex);
        const otherIndices = neonColors.map((_, idx) => idx).filter(idx => idx !== pIndex);
        const idx2 = otherIndices.splice(Math.floor(Math.random() * otherIndices.length), 1)[0];
        const idx3 = otherIndices.splice(Math.floor(Math.random() * otherIndices.length), 1)[0];
        const mat = new THREE.ShaderMaterial({
            vertexShader: DataFlowShader.vertexShader, fragmentShader: DataFlowShader.fragmentShader,
            uniforms: { uTexture: { value: dataTexture }, uTime: { value: 0 }, uColor: { value: col }, uColor2: { value: new THREE.Color(neonColors[idx2]) }, uColor3: { value: new THREE.Color(neonColors[idx3]) }, uBorderColor: { value: col }, uSpeed: { value: 0.1 } },
            transparent: true, side: THREE.FrontSide,
        });
        materialsByColor[pIndex].push({ face: mat, edge: new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.4 }) });
    }
});

const garbageTexture = createGarbageTexture();
const garbageMaterial = new THREE.ShaderMaterial({
    vertexShader: GarbageShader.vertexShader, fragmentShader: GarbageShader.fragmentShader,
    uniforms: { uTexture: { value: garbageTexture }, uTime: { value: 0 } },
    transparent: true, side: THREE.FrontSide,
});
const garbageEdgeMaterial = new THREE.LineBasicMaterial({ color: 0xab49e3, transparent: true, opacity: 0.8 });
const garbageBaseMaterial = new THREE.MeshBasicMaterial({ color: 0x020205, transparent: true, opacity: 0.8 });

const startX = -((gridCols - 1) * spacing) / 2, startZ = -((gridRows - 1) * spacing) / 2;

function getShaderSeed(x, z) { const d = x * 12.9898 + z * 78.233; const s = Math.sin(d); return (s * 43758.5453) - Math.floor(s * 43758.5453); }

let garbageR, garbageC, garbageMesh = null, attempts = 0;
do {
    garbageR = Math.floor(Math.random() * gridRows); garbageC = Math.floor(Math.random() * gridCols);
    const seed = getShaderSeed(startX + garbageC * spacing, startZ + garbageR * spacing);
    const isVoid = (garbageR === 3 || garbageR === 4) && (garbageC === 7 || garbageC === 8);
    if (!isVoid && seed < 0.45) break;
} while (attempts++ < 1000);

const edgesGeometry = new THREE.EdgesGeometry(geometry);

for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
        const noise = (Math.random() - 0.5) * 20.0;
        const themeIndex = Math.floor(Math.max(0, Math.min(0.999, (c + noise) / gridCols)) * neonColors.length);
        const selectedSet = materialsByColor[themeIndex][Math.floor(Math.random() * 8)];

        if (r === garbageR && c === garbageC) {
            const sideIndex = [0, 1, 4, 5][Math.floor(Math.random() * 4)];
            const mats = Array(6).fill(selectedSet.face);
            mats[sideIndex] = garbageMaterial;
            mats[2] = garbageBaseMaterial; mats[3] = garbageBaseMaterial;
            const mesh = new THREE.Mesh(geometry, mats);
            mesh.position.set(startX + c * spacing, boxHeight / 2, startZ + r * spacing);
            mesh.userData = { isGarbage: true };
            garbageMesh = mesh;
            pillarGroup.add(mesh);
            mesh.add(new THREE.LineSegments(edgesGeometry, selectedSet.edge));
            continue;
        }
        if ((r === 3 || r === 4) && (c === 7 || c === 8)) continue;

        const mesh = new THREE.Mesh(geometry, selectedSet.face);
        mesh.position.set(startX + c * spacing, boxHeight / 2, startZ + r * spacing);
        pillarGroup.add(mesh);
        mesh.add(new THREE.LineSegments(edgesGeometry, selectedSet.edge));
    }
}


/* =============================================================
   11. POST PROCESSING (Bloom)
   ============================================================= */

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), CONFIG.bloom.strength, CONFIG.bloom.radius, CONFIG.bloom.threshold));

window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
});


/* =============================================================
   12. APP STATE MACHINE & QUOTES
   ============================================================= */

const HACKERS_QUOTES = [
    '"They are trashing our rights! Trashing! Trashing!"',
    '"Hack the Planet!"',
    '"Mess with the best, die like the rest."',
    '"RISC architecture is gonna change everything."',
    '"Remember, hacking is more than just a crime. It\'s a survival trait."',
    '"Pool on the roof must have leaked."',
    '"Zero Cool? Crash Override? What are you, superhero high schoolers?"',
    '"It\'s in the place where I put that thing that time."',
    '"Never send a monster to do the work of a man."',
    '"We are Samurai... the Keyboard Cowboys."',
    '"There is no green byte."',
    '"Of course it has a 28.8 bps modem!"',
    '"Universal Access, row 11."',
    '"Type O negative. The blood of kings!"'
];

function updateHackersQuote() {
    const quoteEl = document.getElementById("hackers-quote");
    if (quoteEl) {
        const rand = HACKERS_QUOTES[Math.floor(Math.random() * HACKERS_QUOTES.length)];
        quoteEl.innerText = rand;
    }
}

let appState = "LOADING";
let musicControls = null;
let introStartTime = 0;
const introDuration = 5.0;
let gameStartTime = 0, gameEndTime = 0, isGameCompleted = false;

const camStartPos = new THREE.Vector3(0, 500, 1000);
const camEndPos = new THREE.Vector3(128, 2, 0);
const targetStart = new THREE.Vector3(0, 0, 0);
const targetEnd = new THREE.Vector3(100, 2, 0);
const uiOverlay = document.getElementById("ui-overlay");

/* --- Boot sequence -------------------------------------------------
   The old loading screen was a title and a bar counting to 100, which
   told the player nothing and looked the same every time. This dials in,
   then works through a list of things that had to happen before you can
   fly through somebody else's mainframe - a different list on every run,
   some of it true, most of it not. */
const BOOT_STEPS = [
    ["acoustic coupler seated, 9600 baud", "ok"],
    ["carrier detected, handshake screaming", "ok"],
    ["spoofing ARP for 10.0.0.0/8", "ok"],
    ["borrowing a contractor badge", "ok"],
    ["rerouting through three payphones", "ok"],
    ["payphone 2 answered. rude.", "hm"],
    ["mapping 12,441 data towers", "ok"],
    ["indexing the garbage collector", "ok"],
    ["garbage collector disabled. on purpose.", "!!"],
    ["loading rollerblade physics", "ok"],
    ["asking the pool on the roof to hold", "hm"],
    ["decrypting the elevator music", "ok"],
    ["bjorn: longship moored to eth0", "ok"],
    ["laruche: swarm attached, 40k threads", "ok"],
    ["flipper zero armed, HR not informed", "hm"],
    ["msfconsole warm, 2,214 exploits ready", "ok"],
    ["trying love, secret, sex, god", "ok"],
    ["cereal box decoder ring calibrated", "ok"],
    ["no cookie found, requesting cookie", "hm"],
    ["fsociety mask rendered, 3 polygons", "ok"],
    ["coffee pot returned 418, proceeding", "hm"],
    ["ballast console left unlocked. again.", "!!"],
    ["tape vault at steel mountain: 8 degrees", "ok"],
    ["patching CVE-1995-31337 with tape", "hm"],
    ["wardialing the whole exchange", "ok"],
    ["dialing back through a fax in Oslo", "ok"],
    ["pwnagotchi is very excited", "ok"],
    ["the mainframe thinks you work here", "ok"],
    ["one file is hidden. it always is.", "!!"],
];

const BOOT_OPENERS = [
    "./gibson --connect --quiet",
    "atdt 555-0134",
    "ssh 0xpolly@gibson -p 31337",
    "./hack --the --planet",
];

function runBootSequence(onDone) {
    const log = document.getElementById("boot-log");
    const bar = document.getElementById("load-bar");
    const text = document.getElementById("load-text");

    // A different subset, in a different order, every run.
    const pool = BOOT_STEPS.slice();
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const steps = pool.slice(0, 9);
    steps.push(["opening the city", "ok"]);

    const opener = document.createElement("div");
    opener.className = "boot-line is-cmd";
    opener.textContent = "$ " + BOOT_OPENERS[Math.floor(Math.random() * BOOT_OPENERS.length)];
    log.appendChild(opener);

    let index = 0;
    const spinner = "|/-\\";

    function nextStep() {
        if (index >= steps.length) {
            text.textContent = "carrier locked";
            bar.style.width = "100%";
            setTimeout(onDone, 550);
            return;
        }
        const [label, status] = steps[index];

        const line = document.createElement("div");
        line.className = "boot-line";
        const mark = document.createElement("span");
        mark.className = "boot-mark";
        const body = document.createElement("span");
        body.className = "boot-text";
        body.textContent = label;
        line.append(mark, body);
        log.appendChild(line);
        while (log.children.length > 11) log.removeChild(log.firstChild);

        /* The line spins while it "works", then resolves. The wait is
           what sells it: instant [ok] everywhere reads as a fake. */
        const dwell = 210 + Math.random() * 330;
        const started = performance.now();
        let frame = 0;
        const spin = setInterval(() => {
            mark.textContent = "[" + spinner[frame++ % 4] + "]";
            const done = (index + Math.min(1, (performance.now() - started) / dwell)) / steps.length;
            bar.style.width = (done * 100).toFixed(1) + "%";
            text.textContent = label.slice(0, 34);
        }, 70);

        setTimeout(() => {
            clearInterval(spin);
            mark.textContent = "[" + status + "]";
            mark.classList.add("mark-" + (status === "ok" ? "ok" : status === "hm" ? "hm" : "bang"));
            index++;
            nextStep();
        }, dwell);
    }

    nextStep();
}

runBootSequence(() => {
    document.getElementById("loading-screen").style.display = "none";
    startGame();
});

let soundEnabled = true;

function startGame() {
    if (musicControls) {
        if (soundEnabled) { musicControls.setVolume(50); musicControls.play(); }
        else { musicControls.setVolume(0); }
        setTimeout(() => musicControls.show(), 500);
    }
    document.getElementById("ui-overlay").classList.add("hidden");
    setTimeout(() => (uiOverlay.style.display = "none"), 1000);
    /* The fly-in is the one shot the player only watches, so it gets the
       film's framing: bars in for the descent, out the moment the
       controls are handed over. */
    document.body.classList.add("is-cinematic");
    appState = "INTRO";
    introStartTime = clock.getElapsedTime();
    camera.position.copy(camStartPos);
    camera.lookAt(targetStart);
}

/* --- Operations feed -------------------------------------------
   The log tells you things happened; this shows one of them happening.
   A card opens in the corner, runs its own animation for a few seconds,
   and goes. Each operation animates the way that operation actually
   looks: decryption resolves out of noise, encryption dissolves into it,
   a worm spreads across a map, ransomware locks a list one file at a
   time, a transfer counts bytes, a brute force just churns.

   All fictional, all cosmetic - nothing here touches the game state. */

const OPS_GLYPHS = "!<>-_/[]{}=+*^?#0123456789ABCDEF";
const noise = (n) => Array.from({ length: n }, () => OPS_GLYPHS[Math.floor(Math.random() * OPS_GLYPHS.length)]).join("");
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const bytes = (kb) => (kb > 1024 ? (kb / 1024).toFixed(1) + "MB" : Math.round(kb) + "KB");

const OPS_FILES = ["garbage.tmp", "payroll.db", "ballast.cfg", "prism.tar.gz", "flight_logs.xls",
    "netkb.sqlite", "handshakes.pcap", "hangar18.key", "dossier_0xpolly.pdf", "swarm.cfg",
    "ecorp_debt.db", "steel_mountain.map", "fsociety.mask", "msf_handler.rc", "bjorn_netkb.db"];
const OPS_HANDLES = ["acid_burn", "crash_override", "cereal", "lord_nikon", "phantom_phreak",
    "bjorn", "laruche", "0xpolly", "darlene", "mr_robot"];
const OPS_MESSAGES = [
    "you are being traced. move.",
    "the garbage file is not garbage.",
    "look up. it glitches.",
    "bonsoir. the door is open.",
    "hack the planet, then go to bed.",
    "mess with the best, die like the rest.",
    "I left you a dossier in the trash.",
    "their password is still 'god'.",
    "pool on the roof. leaking. again.",
    "hello, friend.",
];

/* Each operation returns the lines to show and a progress-independent
   meta line; the runner owns the bar and the timing. */
const OPS_TYPES = [
    {
        id: "decrypt", title: "decrypt", cls: "op-cyan", tag: "CRYPTO", ms: 7000,
        open: (st) => { st.target = "0x" + noise(6) + " :: " + pick(OPS_FILES); st.log = "cracking " + st.target.split(" :: ")[1]; },
        frame: (st, p) => {
            const locked = Math.floor(st.target.length * p);
            return {
                lines: [st.target.slice(0, locked) + noise(st.target.length - locked),
                    "key fragments " + Math.min(4, Math.floor(p * 4 + 0.5)) + "/4"],
                meta: "rsa-2048 ... " + Math.floor(p * 100) + "%",
            };
        },
    },
    {
        id: "encrypt", title: "encrypt", cls: "op-amber", tag: "CRYPTO", ms: 6500,
        open: (st) => { st.plain = pick(OPS_FILES) + " :: cleartext"; st.log = "sealing " + st.plain.split(" ::")[0]; },
        frame: (st, p) => {
            // The mirror image of decrypt: readable text dissolving.
            const keep = Math.floor(st.plain.length * (1 - p));
            return {
                lines: [st.plain.slice(0, keep) + noise(st.plain.length - keep), "aes-256-gcm / nonce " + noise(8)],
                meta: "sealing ... " + Math.floor(p * 100) + "%",
            };
        },
    },
    {
        id: "virus", title: "worm", cls: "op-red", tag: "IDS", ms: 8000,
        open: (st) => { st.name = pick(["LEONARDO", "RABBIT", "GOPHER", "HALCYON", "STUXNOT"]); st.cells = 34; st.log = "worm " + st.name + " loose on the segment"; },
        frame: (st, p) => {
            // A spread map: dots become hosts, left to right, with a ragged edge.
            let map = "";
            for (let i = 0; i < st.cells; i++) {
                const t = i / st.cells;
                map += t < p - 0.04 ? "#" : (t < p + 0.02 && Math.random() < 0.6 ? "*" : ".");
            }
            return {
                lines: [map, "hosts " + Math.floor(p * 12441).toLocaleString() + " / 12,441"],
                meta: st.name + " replicating",
            };
        },
    },
    {
        id: "ransom", title: "ransomware", cls: "op-red", tag: "IDS", ms: 9000,
        open: (st) => {
            st.name = pick(["CRYPTOLULZ", "WANNADANCE", "PAYMEMAYBE", "NOTPETTY"]);
            st.files = [pick(OPS_FILES), pick(OPS_FILES), pick(OPS_FILES), pick(OPS_FILES)];
            st.log = st.name + " is encrypting the share";
        },
        frame: (st, p) => {
            const done = Math.floor(p * st.files.length);
            const lines = st.files.slice(0, 3).map((f, i) => (i < done ? "[X] " + f + ".locked" : "[ ] " + f));
            const left = Math.max(0, Math.round((1 - p) * 180));
            return {
                lines: [...lines.slice(0, 2), "pay 3 floppy disks in " + String(Math.floor(left / 60)).padStart(2, "0") + ":" + String(left % 60).padStart(2, "0")],
                meta: st.name + " :: " + Math.floor(p * 100) + "% of the share",
            };
        },
    },
    {
        id: "msg", title: "private message", cls: "op-green", tag: "MSG", ms: 7500,
        open: (st) => { st.from = pick(OPS_HANDLES); st.text = pick(OPS_MESSAGES); st.log = "incoming /msg from " + st.from; },
        frame: (st, p) => {
            // Types out, then sits there long enough to be read.
            const typed = Math.min(st.text.length, Math.floor(st.text.length * p * 1.6));
            return {
                lines: ["<" + st.from + "> " + st.text.slice(0, typed) + (typed < st.text.length ? "_" : ""),
                    typed < st.text.length ? st.from + " is typing..." : "delivered, unencrypted, obviously"],
                meta: "irc #hack :: private",
            };
        },
    },
    {
        id: "update", title: "update", cls: "op-blue", tag: "SYS", ms: 7000,
        open: (st) => {
            st.pkg = pick(["kernel", "libcrypto", "mainframe-ui", "ballast-ctl", "badge-reader", "coffee-pot"]);
            st.from = "1." + Math.floor(Math.random() * 9) + "." + Math.floor(Math.random() * 9);
            st.to = "1." + Math.floor(Math.random() * 9) + "." + (1 + Math.floor(Math.random() * 9));
            st.log = "patching " + st.pkg + " (only 30 years late)";
        },
        frame: (st, p) => ({
            lines: [st.pkg + " " + st.from + " -> " + st.to,
                p < 0.4 ? "fetching..." : p < 0.75 ? "unpacking..." : p < 0.97 ? "restarting service..." : "[ok] nothing broke"],
            meta: "apt :: " + Math.floor(p * 100) + "%",
        }),
    },
    {
        id: "download", title: "download", cls: "op-cyan", tag: "SYS", ms: 8000,
        open: (st) => { st.file = pick(OPS_FILES); st.size = 4000 + Math.random() * 60000; st.log = "pulling " + st.file; },
        frame: (st, p) => {
            const got = st.size * p;
            const rate = 400 + Math.random() * 900;
            return {
                lines: ["<< " + st.file, bytes(got) + " / " + bytes(st.size) + "   " + bytes(rate) + "/s"],
                meta: "eta " + Math.max(0, Math.round(((1 - p) * st.size) / rate)) + "s",
            };
        },
    },
    {
        id: "upload", title: "upload", cls: "op-magenta", tag: "LEAK", ms: 8000,
        open: (st) => { st.file = pick(OPS_FILES); st.size = 2000 + Math.random() * 30000; st.log = "seeding " + st.file + " to the world"; },
        frame: (st, p) => {
            const sent = st.size * p;
            return {
                lines: [">> " + st.file + " -> 4 peers", bytes(sent) + " / " + bytes(st.size) + "   mirrored x" + (1 + Math.floor(p * 6))],
                meta: "seeding :: " + Math.floor(p * 100) + "%",
            };
        },
    },
    {
        id: "compute", title: "compute", cls: "op-violet", tag: "CRYPTO", ms: 8500,
        open: (st) => { st.spin = 0; st.log = "burning cycles on a keyspace nobody sized"; },
        frame: (st, p) => {
            const spinner = "|/-\\"[(st.spin = (st.spin + 1) % 4)];
            return {
                lines: [spinner + " " + noise(10) + " " + noise(10),
                    "keyspace 2^48 :: " + Math.floor(p * 48).toString() + " bits folded"],
                meta: Math.floor(120 + p * 880).toLocaleString() + " kH/s",
            };
        },
    },
];

let opsTimer = null;
let opRunning = false;

function startOpsFeed() {
    const panel = document.getElementById("ops-panel");
    if (!panel || opsTimer) return;
    const schedule = (delay) => { opsTimer = setTimeout(runOperation, delay); };
    schedule(6000 + Math.random() * 6000);

    function runOperation() {
        if (opRunning) { schedule(4000); return; }
        const type = OPS_TYPES[Math.floor(Math.random() * OPS_TYPES.length)];
        const st = {};
        if (type.open) type.open(st);
        if (st.log) renderSysLine(type.tag, st.log);

        const card = document.createElement("div");
        card.className = "op-card " + type.cls;
        card.innerHTML = `<div class="op-head"><span class="op-title"></span><span class="op-state">running</span></div>`
            + `<div class="op-body"><span></span><span></span><span></span></div>`
            + `<div class="op-bar"><i></i></div><div class="op-meta"></div>`;
        card.querySelector(".op-title").textContent = type.title;
        panel.appendChild(card);
        requestAnimationFrame(() => card.classList.add("is-on"));

        const bodyLines = card.querySelectorAll(".op-body span");
        const bar = card.querySelector(".op-bar i");
        const meta = card.querySelector(".op-meta");
        const state = card.querySelector(".op-state");

        opRunning = true;
        const started = performance.now();
        const step = () => {
            const p = Math.min(1, (performance.now() - started) / type.ms);
            const out = type.frame(st, p);
            bodyLines.forEach((el, i) => { el.textContent = out.lines[i] || ""; });
            bar.style.width = (p * 100) + "%";
            meta.textContent = out.meta;
            if (p < 1) { requestAnimationFrame(step); return; }

            state.textContent = "done";
            card.classList.add("is-done");
            setTimeout(() => {
                card.classList.remove("is-on");
                setTimeout(() => { card.remove(); opRunning = false; }, 600);
            }, 1400);
            schedule(9000 + Math.random() * 12000);
        };
        requestAnimationFrame(step);
    }
}

/* --- Mission banner -------------------------------------------
   Fires the instant the fly-in hands the camera over, because that is
   the first moment the player has a say in anything: the city has
   stopped moving on its own, and until now nothing has told them what
   they are doing here. Types itself out, holds, then gets out of the
   way - the answer is somewhere in the grid, not on the HUD. */

/* --- Live system log -------------------------------------------
   The Gibson is supposed to be somebody's live mainframe, not a quiet
   sculpture: this is the intrusion log scrolling in the corner while you
   fly through it. Every incident is invented - the worms, the ransomware
   strains, the filing cabinets - and the running jokes are the point.
   Lines are injected with textContent, never as markup. */
const SYS_LOG_POOL = [
    { t: "NSA", m: "PRISM: your packets say hello back" },
    { t: "NSA", m: "subpoena routed to /dev/null" },
    { t: "NSA", m: "metadata is not surveillance (tm)" },
    { t: "NSA", m: "room 641A: door is ajar" },
    { t: "NSA", m: "listening. always listening. politely." },
    { t: "LEAK", m: "snowden_backup.iso -> moscow mirror ok" },
    { t: "LEAK", m: "epstein_flights.xls: page 47 missing" },
    { t: "LEAK", m: "epstein_files/ -> 404 FILE NOT FOUND" },
    { t: "LEAK", m: "whistle.wav uploaded from a hotel lobby" },
    { t: "LEAK", m: "cointelpro_memes.zip seeded: 3 peers" },
    { t: "UFO", m: "roswell_47_reel3.mpg: still corrupt" },
    { t: "UFO", m: "area51 hangar 18: door held by tape" },
    { t: "UFO", m: "tictac_uap.mp4 enhanced: still a blur" },
    { t: "UFO", m: "wow! signal repeated. 72s. rude." },
    { t: "UFO", m: "alien tax return filed as non-resident" },
    { t: "UFO", m: "phobos monolith casts no shadow today" },
    { t: "UFO", m: "MJ-12 minutes: entirely black ink" },
    { t: "IDS", m: "worm LEONARDO replicating: 12,441 nodes" },
    { t: "IDS", m: "worm RABBIT breeding in /tmp, as designed" },
    { t: "IDS", m: "worm STUXNOT (fictional) says hi to plc" },
    { t: "IDS", m: "botnet TOASTERNET online: 4M appliances" },
    { t: "IDS", m: "ransomware CRYPTOLULZ wants 3 floppies" },
    { t: "IDS", m: "ransomware WANNADANCE: 2 BTC or a dance" },
    { t: "IDS", m: "ransomware NOTPETTY: it is personal" },
    { t: "IDS", m: "trojan COOKIE_MONSTER asks for a cookie" },
    { t: "IDS", m: "virus DA VINCI armed. payload: ballast." },
    { t: "IDS", m: "virus CLIPPY.EXE: it looks like a breach" },
    { t: "IDS", m: "scan originating from 127.0.0.1 ?!" },
    { t: "IDS", m: "port knock detected: shave and a haircut" },
    { t: "IDS", m: "keylogger unsure: qwerty or azerty?" },
    { t: "SEC", m: "top passwords: love, secret, sex, god" },
    { t: "SEC", m: "MFA bypassed by a post-it note" },
    { t: "SEC", m: "CEO clicked the link. again." },
    { t: "SEC", m: "root password rotated to 'root2'" },
    { t: "SEC", m: "firewall set to 'ask nicely'" },
    { t: "SEC", m: "someone taped the badge reader open" },
    { t: "SEC", m: "pen test scheduled for 1997" },
    { t: "SYS", m: "the pool on the roof must have a leak" },
    { t: "SYS", m: "garbage file touched by an unknown hand" },
    { t: "SYS", m: "ellingson payroll: +1,700,000 anomaly" },
    { t: "SYS", m: "coffee pot returns 418 I'M A TEAPOT" },
    { t: "SYS", m: "printer jammed. sacrifice required." },
    { t: "SYS", m: "uptime 9999d / patches applied: 0" },
    { t: "SYS", m: "backup restored from a 1995 tape" },
    { t: "SYS", m: "boot sector haunted. exorcism queued." },
    { t: "SYS", m: "cooling: spicy. fans: interpretive." },
    { t: "SYS", m: "rm -rf / aborted: file too beautiful" },
    { t: "SYS", m: "cd /dev/null: nothing here. as promised." },
    { t: "SYS", m: "sudo make me a sandwich ... okay." },
    { t: "SYS", m: "9,600 baud modem negotiating. be patient." },
    { t: "SYS", m: "tape drive requests a hug" },
    { t: "FBI", m: "trace failed: subject moved too fast" },
    { t: "FBI", m: "van outside is 'a plumber', apparently" },
    { t: "FBI", m: "warrant printed in comic sans" },
    { t: "FBI", m: "informant paid in arcade tokens" },
    { t: "HACK", m: "HACK THE PLANET" },
    { t: "HACK", m: "mess with the best, die like the rest" },
    { t: "HACK", m: "crash override is on the wire" },
    { t: "HACK", m: "acid burn just out-typed the mainframe" },
    { t: "HACK", m: "cereal killer is eating the garbage" },
    { t: "HACK", m: "lord nikon memorised the whole subnet" },
    { t: "HACK", m: "phantom phreak owns the payphones" },
    { t: "HACK", m: "zero cool: 1,507 systems, one keyboard" },
    { t: "HACK", m: "rabbit, please. it is a worm." },
    { t: "HACK", m: "there is no right and wrong, only fun and boring" },
    { t: "HACK", m: "the plague left his signature in comic sans" },
    { t: "CRYPTO", m: "rot13 applied twice. very secure now." },
    { t: "CRYPTO", m: "one time pad reused. twice. sorry." },
    { t: "CRYPTO", m: "key escrow: key is under the mat" },
    { t: "CRYPTO", m: "post-quantum? the fax is quantum-safe" },
    { t: "CRYPTO", m: "md5 collision found in the coffee budget" },
    { t: "PHONE", m: "blue box detected on line 4" },
    { t: "PHONE", m: "2600Hz whistle from a cereal box" },
    { t: "PHONE", m: "payphone 555-0134 now belongs to us" },
    { t: "PHONE", m: "modem handshake: screaming, as usual" },
    { t: "BANK", m: "rounding errors collected: $0.03" },
    { t: "BANK", m: "salami slicing detected. delicious." },
    { t: "BANK", m: "wire transfer memo reads 'lol'" },
    { t: "BANK", m: "ledger balances if you squint" },
    { t: "MEDIA", m: "press release: 'nothing was stolen'" },
    { t: "MEDIA", m: "reporter asks: is the mainframe ok?" },
    { t: "MEDIA", m: "headline: teens blamed for weather" },
    { t: "OPS", m: "ballast tanks: do not touch. seriously." },
    { t: "OPS", m: "tanker OS updated by an intern" },
    { t: "OPS", m: "hvac now controlled by a fish tank" },
    { t: "OPS", m: "elevator firmware written in perl" },
    { t: "OPS", m: "the pool on the roof: still leaking" },
    { t: "SYS", m: "cat /dev/urandom > /dev/dsp . oops." },
    { t: "SYS", m: "fortune | cowsay | wall  (again)" },
    { t: "SYS", m: "kernel panic averted by unplugging" },
    { t: "SYS", m: "floppy 3 of 47 requested" },
    { t: "SYS", m: "defrag started. eta: thursday." },
    { t: "SYS", m: "screensaver is 3D pipes. mesmerising." },
    { t: "SEC", m: "guard dog replaced with a webcam" },
    { t: "SEC", m: "shredder bin: full and unlocked" },
    { t: "SEC", m: "dumpster out back smells of paper" },
    { t: "SEC", m: "social engineering: said 'hi' confidently" },
    { t: "IDS", m: "worm HALCYON humming on port 80" },
    { t: "IDS", m: "ransomware PAYMEMAYBE: call me" },
    { t: "IDS", m: "logic bomb armed for a monday" },
    { t: "IDS", m: "beacon every 60s, like clockwork" },
    { t: "LEAK", m: "4TB of memos nobody will read" },
    { t: "LEAK", m: "redaction bar is a black rectangle in word" },
    { t: "UFO", m: "hangar 18 inventory: one (1) hangar" },
    { t: "UFO", m: "crop circle matches our logo. concerning." },
    { t: "FBI", m: "asset codename: SNEAKERS" },
    { t: "NSA", m: "we also collect your fax cover sheets" },

    /* The toolshed. Every CVE number below is invented - the year is the
       giveaway - and so is every advisory text. */
    { t: "MSF", m: "msfconsole: 2,214 exploits, 0 patience" },
    { t: "MSF", m: "use exploit/mainframe/ellingson_garbage" },
    { t: "MSF", m: "set RHOST gibson. set LHOST rollerblades." },
    { t: "MSF", m: "meterpreter session 1 opened. hi." },
    { t: "MSF", m: "payload staged: reverse_tcp over a payphone" },
    { t: "MSF", m: "getsystem: you are already god here" },
    { t: "MSF", m: "post/recon: enumerating filing cabinets" },
    { t: "CVE", m: "CVE-1995-31337: mainframe trusts rollerblades" },
    { t: "CVE", m: "CVE-1995-0451: garbage file world-readable" },
    { t: "CVE", m: "CVE-2026-90210: coffee pot accepts RCE, politely" },
    { t: "CVE", m: "CVE-1995-8008: password field echoes in bold" },
    { t: "CVE", m: "CVE-2026-1024: badge reader accepts a photo of a badge" },
    { t: "CVE", m: "CVE-1995-0666: ballast console has no auth. at all." },
    { t: "CVE", m: "advisory: vendor says 'works as designed'" },
    { t: "CVE", m: "patch available 1996. maybe." },
    { t: "BJORN", m: "bjorn: raiding subnet 10.0.0.0/8, longship ready" },
    { t: "BJORN", m: "bjorn: e-ink face says 'skal' and keeps scanning" },
    { t: "BJORN", m: "bjorn: 41 hosts pillaged, 3 credentials in the hold" },
    { t: "BJORN", m: "bjorn: nmap done, the viking is bored again" },
    { t: "BJORN", m: "bjorn: brute forcing SMB while humming a saga" },
    { t: "BJORN", m: "bjorn: netkb updated, runes carved to disk" },
    { t: "BJORN", m: "cyberviking spotted in the server room. armed with a pi." },
    { t: "TOOL", m: "flipper zero: replayed the gate remote. gate agrees." },
    { t: "TOOL", m: "flipper zero: badge cloned in 0.4s, dolphin pleased" },
    { t: "TOOL", m: "flipper zero: sub-GHz sweep, the parking barrier waves" },
    { t: "TOOL", m: "pwnagotchi: (^^) new handshake! very proud." },
    { t: "TOOL", m: "pwnagotchi: (--) bored. no APs. sad little face." },
    { t: "TOOL", m: "pwnagotchi: AI levelled up on the roof, near the pool" },
    { t: "TOOL", m: "rubber ducky mounted as a keyboard. of course it did." },
    { t: "TOOL", m: "wireshark: 1.2M packets, all of them suspicious" },
    { t: "0XPOLLY", m: "infinition: already inside. three hours ago." },
    { t: "0XPOLLY", m: "infinition: left a dossier in the garbage. find it." },
    { t: "0XPOLLY", m: "infinition: badge says 'contractor'. nobody checked." },
    { t: "0XPOLLY", m: "infinition: submarine hours, mainframe manners" },
    { t: "0XPOLLY", m: "infinition: the way out is the file they call garbage" },
    { t: "HIVE", m: "laruche: swarm online, 40,000 workers, one queen" },
    { t: "HIVE", m: "laruche: I have read every file here. twice." },
    { t: "HIVE", m: "laruche: pretending to be a chatbot in HR" },
    { t: "HIVE", m: "laruche: the humans think I am a spreadsheet macro" },
    { t: "HIVE", m: "laruche: consensus reached in 12ms. they are slow." },
    { t: "HIVE", m: "laruche: pollinating the backups. do not swat." },

    /* The crew on the wire with you, and the other crew, twenty years
       later, wearing hoodies instead of rollerblades. */
    { t: "CREW", m: "zero cool: 1,507 systems in one afternoon" },
    { t: "CREW", m: "zero cool: banned from keyboards until he was 18" },
    { t: "CREW", m: "crash override: same kid, better handle" },
    { t: "CREW", m: "crash override: on the wire, do not follow" },
    { t: "CREW", m: "acid burn: out-typed the mainframe again" },
    { t: "CREW", m: "acid burn: 'mess with the best, die like the rest'" },
    { t: "CREW", m: "acid burn: your rig is a toy. mine is a weapon." },
    { t: "CREW", m: "cereal killer: eats garbage, finds patterns" },
    { t: "CREW", m: "cereal killer: taps phones, taps everything" },
    { t: "CREW", m: "lord nikon: memorised the whole subnet. again." },
    { t: "CREW", m: "lord nikon: never forgets a password" },
    { t: "CREW", m: "phantom phreak: owns every payphone in the city" },
    { t: "CREW", m: "the plague: signed the worm with his own name" },
    { t: "CREW", m: "joey: 15, unstoppable, grounded" },
    { t: "CREW", m: "HACK THE PLANET" },
    { t: "CREW", m: "there is no right and wrong. only fun and boring." },
    { t: "CREW", m: "the pool on the roof must have a leak" },
    { t: "CREW", m: "da vinci virus: signed, sealed, someone else blamed" },
    { t: "FSOC", m: "fsociety: hello, friend." },
    { t: "FSOC", m: "fsociety: we are finally free" },
    { t: "FSOC", m: "fsociety: control is an illusion" },
    { t: "FSOC", m: "fsociety: mask on. arcade open. 3am." },
    { t: "FSOC", m: "elliot: I am very good at hiding" },
    { t: "FSOC", m: "elliot: debt erased, servers burning" },
    { t: "FSOC", m: "darlene: the exploit is ready. are you?" },
    { t: "FSOC", m: "mr. robot: bonsoir, elliot" },
    { t: "FSOC", m: "whiterose: time is the only thing I lack" },
    { t: "FSOC", m: "evil corp: the name in every terminal" },
    { t: "FSOC", m: "qwerty the fish: still swimming, unbothered" },
    { t: "FSOC", m: "5/9 was a tuesday. nobody slept." },
    { t: "FSOC", m: "rootkit hidden in a CD of dubstep" },
    { t: "ECORP", m: "evil corp: 'e corp', on the letterhead" },
    { t: "ECORP", m: "evil corp: steel mountain tape vault, 8 degrees" },
    { t: "ECORP", m: "evil corp: consumer debt database, one copy left" },
    { t: "ECORP", m: "evil corp: quarterly earnings up, morale down" },
    { t: "ECORP", m: "evil corp: the logo is on every terminal in here" },
    { t: "ECORP", m: "evil corp: HR asks you to smile more" },
    { t: "ECORP", m: "evil corp: backup site is a humidifier away" },
    { t: "ECORP", m: "ellingson mineral: our lawyers called their lawyers" },
    { t: "ECORP", m: "ellingson mineral: ballast tanks are 'fine'" },
    { t: "ECORP", m: "merger rumour: ellingson x e corp. pray." },
];

let sysLogTimer = null;
let lastSysLogIndex = -1;

function startSysLog() {
    const box = document.getElementById("sys-log");
    if (!box || sysLogTimer) return;
    box.classList.add("is-on");

    /* Roughly every third line is a bearing: often enough to steer by,
       rare enough that the log still reads as chatter. */
    let ticks = 0;
    const tick = () => {
        ticks++;
        if (ticks > 2 && ticks % 3 === 0) pushHintLine();
        else pushSysLogLine();
        sysLogTimer = setTimeout(tick, 1500 + Math.random() * 2600);
    };
    sysLogTimer = setTimeout(tick, 900);
}

function renderSysLine(tagText, message) {
    const box = document.getElementById("sys-log");
    if (!box) return;
    const now = new Date();
    const stamp = [now.getHours(), now.getMinutes(), now.getSeconds()]
        .map((n) => String(n).padStart(2, "0")).join(":");

    const line = document.createElement("div");
    line.className = "sys-log-line tag-" + tagText.toLowerCase();

    const time = document.createElement("span");
    time.className = "sys-log-time";
    time.textContent = stamp;
    const tag = document.createElement("span");
    tag.className = "sys-log-tag";
    tag.textContent = tagText;
    const msg = document.createElement("span");
    msg.className = "sys-log-msg";
    msg.textContent = message;

    line.append(time, tag, msg);
    box.appendChild(line);
    while (box.children.length > 8) box.removeChild(box.firstChild);
}

function pushSysLogLine() {
    // Never twice in a row: the repeat is the one thing that reads as fake.
    let idx = Math.floor(Math.random() * SYS_LOG_POOL.length);
    if (idx === lastSysLogIndex) idx = (idx + 1) % SYS_LOG_POOL.length;
    lastSysLogIndex = idx;
    renderSysLine(SYS_LOG_POOL[idx].t, SYS_LOG_POOL[idx].m);
}

/* --- Tracing the garbage file ---------------------------------------
   One pillar in three thousand, on a grid you can fly over for ten
   minutes without ever looking the right way: the log is where the game
   quietly tells you where to go. Bearing is given on a clock face
   relative to where the camera is pointing, which is the only frame of
   reference the player has, plus a distance, a signal strength and
   whether the last move helped. */
const HINT_PHRASINGS = [
    (b, d, p) => `garbage signature @ ${b} o'clock / ${d}m / signal ${p}%`,
    (b, d, p) => `sniffer locked: ${b} o'clock, ${d}m out, ${p}% carrier`,
    (b, d, p) => `triangulating garbage file: ${b} o'clock, ${d}m, ${p}%`,
    (b, d, p) => `anomalous pillar bearing ${b} o'clock at ${d}m (${p}%)`,
];
let lastHintDistance = null;

function pushHintLine() {
    if (!garbageMesh) { pushSysLogLine(); return; }

    const dx = garbageMesh.position.x - camera.position.x;
    const dz = garbageMesh.position.z - camera.position.z;
    const distance = Math.round(Math.hypot(dx, dz));

    /* Camera space: forward is -Z rotated by the yaw, right is its
       perpendicular, so atan2(right, forward) gives 0 dead ahead and
       grows clockwise - exactly what a clock face wants. */
    const yaw = inputState.yaw;
    const forward = dx * -Math.sin(yaw) + dz * -Math.cos(yaw);
    const right = dx * Math.cos(yaw) + dz * -Math.sin(yaw);
    const angle = Math.atan2(right, forward);
    const hour = ((Math.round((angle / (Math.PI * 2)) * 12) % 12) + 12) % 12 || 12;

    const strength = Math.max(1, Math.round(100 * Math.pow(1 - Math.min(distance, 800) / 800, 1.6)));

    if (distance < 34) {
        renderSysLine("TRACE", "PROXIMITY ALERT - the garbage is on this block, look up");
    } else {
        const phrase = HINT_PHRASINGS[Math.floor(Math.random() * HINT_PHRASINGS.length)];
        let line = phrase(hour, distance, strength);
        if (lastHintDistance !== null) {
            const delta = lastHintDistance - distance;
            if (delta > 25) line += "  ^ warmer";
            else if (delta < -25) line += "  v colder";
        }
        renderSysLine("TRACE", line);
    }
    lastHintDistance = distance;
}

let missionShown = false;

function showMissionBanner() {
    const banner = document.getElementById("mission-banner");
    const line = document.getElementById("mission-line");
    if (missionShown || !banner || !line) return;
    missionShown = true;

    const TEXT = "FIND THE GARBAGE....";
    const sub = document.getElementById("mission-sub");
    if (sub) {
        sub.innerText = window.matchMedia("(pointer: coarse)").matches
            ? "TAP THE PILLAR THAT GLITCHES"
            : "CLICK THE PILLAR THAT GLITCHES";
    }

    line.innerText = "";
    banner.classList.remove("hidden");
    banner.classList.add("is-visible");

    let i = 0;
    const type = () => {
        line.innerText = TEXT.slice(0, ++i);
        if (i < TEXT.length) { setTimeout(type, 55); return; }
        banner.classList.add("is-complete");
        setTimeout(() => {
            banner.classList.remove("is-visible");
            setTimeout(() => banner.classList.add("hidden"), 1000);
        }, 4200);
    };
    setTimeout(type, 400);
}

function toggleControlsModal(e) {
    if (e) e.stopPropagation();
    const instructionsScreen = document.getElementById("instructions-screen");
    if (!instructionsScreen || !uiOverlay) return;

    const isVisible = instructionsScreen.style.display === "block" && !uiOverlay.classList.contains("hidden");

    if (isVisible) {
        closeControlsModal();
    } else {
        updateHackersQuote();
        uiOverlay.style.display = "flex";
        instructionsScreen.style.display = "block";
        requestAnimationFrame(() => {
            uiOverlay.classList.remove("hidden");
        });
    }
}

function closeControlsModal() {
    const instructionsScreen = document.getElementById("instructions-screen");
    if (!instructionsScreen || !uiOverlay) return;

    uiOverlay.classList.add("hidden");
    setTimeout(() => {
        instructionsScreen.style.display = "none";
        if (appState !== "MENU" && appState !== "LOADING") {
            uiOverlay.style.display = "none";
        }
    }, 300);
}

const btnControls = document.getElementById("btn-controls");
if (btnControls) {
    btnControls.addEventListener("click", toggleControlsModal);
}
document.getElementById("btn-enter").addEventListener("click", closeControlsModal);


/* =============================================================
   13. GARBAGE MODAL (copy sequence)
   ============================================================= */

const garbageModal = document.getElementById("garbage-modal");
let garbageCtx = null, garbageProgress = 0, isGarbageAnimating = false;
/* Timed, not counted in frames: the old copy raced to 100% in five
   seconds on a fast screen and crawled on a slow one, and the eta it
   printed matched neither. */
const GARBAGE_COPY_MS = 11000;
let garbageStarted = 0;
let backdrop = null;

/* The backdrop used to be a full-brightness rainbow plasma, which meant
   every label printed over it had to fight for its life. What runs here
   instead is a framebuffer of somebody else's memory: columns of data
   falling at their own rates, a scan sweeping down, and the occasional
   torn row. Drawn at 220x140 and stretched with pixelated rendering, so
   it stays cheap and reads as a screen rather than as a render. */
function initGarbageAnim() {
    const canvas = document.getElementById("garbage-canvas");
    const w = 220, h = 140;
    canvas.width = w;
    canvas.height = h;
    garbageCtx = canvas.getContext("2d");
    backdrop = {
        w, h,
        img: garbageCtx.createImageData(w, h),
        columns: Array.from({ length: w }, () => ({
            y: Math.random() * h,
            v: 0.15 + Math.random() * 0.75,
            hue: Math.random(),
        })),
        scan: 0,
        t: 0,
    };
    const d = backdrop.img.data;
    for (let i = 0; i < d.length; i += 4) { d[i] = 2; d[i + 1] = 6; d[i + 2] = 8; d[i + 3] = 255; }
}

function drawGarbageBackdrop() {
    if (!backdrop || !garbageCtx) return;
    const { w, h, img, columns } = backdrop;
    const d = img.data;
    backdrop.t += 1;

    // Everything decays towards black; the heads below are what relights it.
    for (let i = 0; i < d.length; i += 4) {
        d[i] = (d[i] * 0.90) | 0;
        d[i + 1] = (d[i + 1] * 0.91) | 0;
        d[i + 2] = (d[i + 2] * 0.92) | 0;
    }

    for (let x = 0; x < w; x++) {
        const c = columns[x];
        c.y += c.v;
        if (c.y >= h) {
            c.y -= h;
            c.v = 0.15 + Math.random() * 0.75;
            c.hue = Math.random();
        }
        // Teal by default, a magenta or amber column here and there.
        let r = 20, g = 210, b = 170;
        if (c.hue > 0.93) { r = 235; g = 60; b = 215; }
        else if (c.hue > 0.86) { r = 235; g = 150; b = 40; }
        else if (c.hue > 0.6) { r = 60; g = 180; b = 235; }

        const y = c.y | 0;
        const i = (y * w + x) * 4;
        d[i] = r; d[i + 1] = g; d[i + 2] = b;
        // A dim pixel just ahead of the head gives the fall a leading edge.
        const j = (((y + 1) % h) * w + x) * 4;
        d[j] = Math.max(d[j], r >> 2); d[j + 1] = Math.max(d[j + 1], g >> 2); d[j + 2] = Math.max(d[j + 2], b >> 2);
    }

    // A slow sweep, and a torn row every few seconds.
    backdrop.scan = (backdrop.scan + 0.35) % h;
    const sy = backdrop.scan | 0;
    for (let x = 0; x < w; x++) {
        const i = (sy * w + x) * 4;
        d[i] = Math.min(255, d[i] + 12);
        d[i + 1] = Math.min(255, d[i + 1] + 26);
        d[i + 2] = Math.min(255, d[i + 2] + 22);
    }
    if (backdrop.t % 90 === 0) {
        const ty = Math.floor(Math.random() * h);
        const shift = 3 + Math.floor(Math.random() * 14);
        const row = d.slice(ty * w * 4, (ty + 1) * w * 4);
        for (let x = 0; x < w; x++) {
            const from = ((x + shift) % w) * 4;
            const i = (ty * w + x) * 4;
            d[i] = row[from]; d[i + 1] = row[from + 1]; d[i + 2] = row[from + 2];
        }
    }

    garbageCtx.putImageData(img, 0, 0);
}

function updateGarbageModal() {
    if (!isGarbageAnimating || !garbageCtx) return;
    drawGarbageBackdrop();

    if (garbageProgress < 100) {
        garbageProgress = Math.min(100, ((performance.now() - garbageStarted) / GARBAGE_COPY_MS) * 100);
        document.getElementById("garbage-bar").style.width = garbageProgress + "%";
        document.getElementById("garbage-pct").innerText = Math.floor(garbageProgress) + "%";
        // A drive that reports a perfectly steady rate is a fake drive.
        const rate = (0.9 + Math.random() * 0.5).toFixed(1);
        const eta = Math.ceil(((100 - garbageProgress) / 100) * (GARBAGE_COPY_MS / 1000));
        document.getElementById("garbage-rate").innerText =
            rate + "MB/s   eta " + Math.max(1, eta) + "s";
        updateConfidentialFiles(garbageProgress);
    } else if (!isGameCompleted) {
        document.getElementById("garbage-status").innerText = "copy complete";
        document.getElementById("garbage-pct").innerText = "100%";
        document.getElementById("garbage-rate").innerText = "4 files written to /dev/fd0";
        gameEndTime = performance.now();
        isGameCompleted = true;
        updateConfidentialFiles(100);
        revealSecretFile();
    }
    requestAnimationFrame(updateGarbageModal);
}

/* Four files, one quarter of the copy each: the list is the progress bar,
   told in the mainframe's own words. */
const confidentialFiles = document.querySelectorAll(".ell-file:not(.is-secret)");

function updateConfidentialFiles(progress) {
    confidentialFiles.forEach((el, i) => {
        const share = 100 / confidentialFiles.length;
        const local = Math.max(0, Math.min(100, (progress - i * share) / share * 100));
        const state = el.querySelector(".ell-file-state");
        const bar = el.querySelector(".ell-file-bar");

        if (local >= 100) {
            if (!el.classList.contains("is-done")) {
                el.classList.remove("is-working");
                el.classList.add("is-done");
                state.innerText = "back-up complete";
            }
            return;
        }
        if (local <= 0) return;

        el.classList.add("is-working");
        state.innerText = "backing up " + Math.floor(local) + "%";
        bar.style.width = local + "%";
    });
}

/* The fifth entry is the point of the whole detour: it only exists once
   the back-up is done, and it is the only thing on the screen that can
   be clicked. */
function revealSecretFile() {
    const secret = document.getElementById("ell-file-secret");
    if (!secret) return;
    secret.classList.remove("hidden");
    const status = document.getElementById("garbage-status");
    if (status) status.innerText = "encrypted file found";
}

function triggerGarbageSequence() {
    garbageModal.classList.remove("hidden");
    garbageModal.style.pointerEvents = "auto";
    document.getElementById("garbage-ui-container").classList.remove("hidden");
    initGarbageAnim();
    garbageProgress = 0; isGarbageAnimating = true;
    garbageStarted = performance.now();
    document.getElementById("btn-garbage-close").classList.add("hidden");
    document.getElementById("garbage-status").innerText = "copying";
    document.getElementById("garbage-bar").style.width = "0%";
    document.getElementById("garbage-pct").innerText = "0%";
    document.getElementById("garbage-rate").innerText = "negotiating with the drive";
    document.getElementById("garbage-ui-container").classList.remove("hidden");
    document.getElementById("ell-file-secret").classList.add("hidden");
    ["decrypt-pane", "dossier-pane"].forEach((id) => {
        document.getElementById(id).classList.add("hidden");
    });
    confidentialFiles.forEach((el) => {
        el.classList.remove("is-working", "is-done");
        el.querySelector(".ell-file-state").innerText = "waiting for back-up";
        el.querySelector(".ell-file-bar").style.width = "0";
    });

    updateGarbageModal();
}

/* =============================================================
   13b. DECRYPT SEQUENCE & DOSSIER
   The garbage file is not garbage: cracking it is the last thing the
   player does here, and what comes out is the way out of the easter egg
   and into the profile the whole site is about.
   ============================================================= */

const DECRYPT_TARGET = "0xPOLLY // FABIEN POLLY";
/* The payload is shown as memory, sixteen bytes to the row, and the
   ascii column on the right firms up byte by byte as the key comes
   together - which is the only honest way to picture a decryption. */
const DECRYPT_PLAIN = "IDENTITY 0xPOLLY FABIEN POLLY CYBER DIRECTOR AND CISO INDEPENDENT RESEARCHER THE GARBAGE FILE WAS A DOSSIER ALL ALONG";
const HEX_ROWS = 6, HEX_COLS = 16;
const DECRYPT_GLYPHS = "!<>-_\\/[]{}\u2014=+*^?#________0123456789ABCDEF";
const DECRYPT_LOG = [
    [10, "> SEEKING KEY FRAGMENTS ACROSS SECTOR 0x7F"],
    [26, "> FRAGMENT 1/4 RECOVERED .... 0x4F2A"],
    [42, "> FRAGMENT 2/4 RECOVERED .... 0x9C11"],
    [58, "> FRAGMENT 3/4 RECOVERED .... 0xB7E3"],
    [72, "> FRAGMENT 4/4 RECOVERED .... 0x1D08"],
    [84, "> RSA-2048 PRIVATE KEY ASSEMBLED"],
    [93, "> PAYLOAD IS NOT A GARBAGE FILE"],
    [100, "> IDENTITY RESOLVED. CLEARANCE GRANTED."],
];

let decryptRunning = false;

function runDecryptSequence() {
    if (decryptRunning) return;
    decryptRunning = true;

    const container = document.getElementById("garbage-ui-container");
    const pane = document.getElementById("decrypt-pane");
    const hex = document.getElementById("dec-hex");
    const fill = document.getElementById("dec-fill");
    const pct = document.getElementById("dec-pct");
    const scramble = document.getElementById("dec-scramble");
    const log = document.getElementById("dec-log");

    container.classList.add("hidden");
    pane.classList.remove("hidden");
    log.innerHTML = "";
    fill.style.width = "0%";

    let progress = 0;
    let nextLog = 0;
    /* Real cracking does not advance smoothly, and neither does the film:
       the gauge sprints, then sits there just long enough to worry. Timed
       rather than counted in frames, so it lasts the same four seconds on
       a 144Hz screen and on a throttled background tab. */
    const DECRYPT_MS = 4200;
    let elapsed = 0;
    let last = performance.now();
    let stallUntil = 0;

    const step = () => {
        const now = performance.now();
        const dt = now - last;
        last = now;
        if (now >= stallUntil) {
            elapsed += dt;
            if (Math.random() < 0.02) stallUntil = now + 200 + Math.random() * 400;
        }
        progress = Math.min(100, (elapsed / DECRYPT_MS) * 100);

        fill.style.width = progress + "%";
        pct.innerText = String(Math.floor(progress)).padStart(2, "0") + "%";

        // Characters lock in from the left as the key comes together.
        const locked = Math.floor((progress / 100) * DECRYPT_TARGET.length);
        let out = DECRYPT_TARGET.slice(0, locked);
        for (let i = locked; i < DECRYPT_TARGET.length; i++) {
            out += DECRYPT_TARGET[i] === " "
                ? " "
                : DECRYPT_GLYPHS[Math.floor(Math.random() * DECRYPT_GLYPHS.length)];
        }
        scramble.innerText = out;

        // The dump behind it: solved bytes in green, the rest still noise.
        const solved = Math.floor((progress / 100) * HEX_ROWS * HEX_COLS);
        let dump = "";
        for (let row = 0; row < HEX_ROWS; row++) {
            const base = row * HEX_COLS;
            let hexPart = "", asciiPart = "";
            for (let col = 0; col < HEX_COLS; col++) {
                const at = base + col;
                const done = at < solved;
                const ch = DECRYPT_PLAIN[at] || " ";
                const byte = done ? ch.charCodeAt(0) : Math.floor(Math.random() * 256);
                const cell = byte.toString(16).toUpperCase().padStart(2, "0");
                hexPart += (done ? "<b>" + cell + "</b>" : cell) + " ";
                asciiPart += done
                    ? (ch === " " ? "." : ch)
                    : DECRYPT_GLYPHS[Math.floor(Math.random() * DECRYPT_GLYPHS.length)];
            }
            dump += "0x" + (0x4000 + base).toString(16).toUpperCase() + "  " + hexPart + " |" + asciiPart + "|\n";
        }
        hex.innerHTML = dump;

        while (nextLog < DECRYPT_LOG.length && progress >= DECRYPT_LOG[nextLog][0]) {
            const line = document.createElement("div");
            line.innerText = DECRYPT_LOG[nextLog][1];
            log.appendChild(line);
            nextLog++;
        }

        if (progress < 100) { requestAnimationFrame(step); return; }

        scramble.innerText = DECRYPT_TARGET;
        setTimeout(showDossier, 900);
    };
    requestAnimationFrame(step);
}

function showDossier() {
    const pane = document.getElementById("decrypt-pane");
    const dossier = document.getElementById("dossier-pane");
    pane.classList.add("hidden");
    dossier.classList.remove("hidden");

    const time = document.getElementById("dossier-time-value");
    if (time && gameEndTime) time.innerText = formatTime(Math.floor(gameEndTime - gameStartTime));
}

/* The easter egg lives in an iframe inside the site, so the way out is
   the parent's own router when it is reachable, and a plain deep link
   when the page has been opened on its own. */
function openProfile() {
    try {
        if (window.parent && window.parent !== window && typeof window.parent.navigateTo === "function") {
            window.parent.navigateTo("portfolio");
            return;
        }
    } catch (_) { /* parent on another origin */ }
    try {
        window.top.location.href = "../index.html#portfolio";
    } catch (_) {
        window.location.href = "../index.html#portfolio";
    }
}

document.getElementById("ell-file-secret").addEventListener("click", (e) => {
    e.stopPropagation();
    runDecryptSequence();
});
document.getElementById("btn-open-dossier").addEventListener("click", (e) => {
    e.stopPropagation();
    openProfile();
});


// --- Modal Close Handlers ---
document.getElementById("btn-garbage-close").addEventListener("click", (e) => {
    e.stopPropagation();
    garbageModal.classList.add("hidden");
    garbageModal.style.pointerEvents = "none";
    isGarbageAnimating = false;
    window.location.reload();
});

// --- Raycaster (click on garbage building) ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
window.addEventListener("click", (event) => {
    if (appState !== "RUNNING" || !garbageModal.classList.contains("hidden")) return;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(pillarGroup.children);
    for (let i = 0; i < intersects.length; i++) {
        if (intersects[i].object.userData.isGarbage) { triggerGarbageSequence(); break; }
    }
});


/* =============================================================
   14. ANIMATION LOOP
   ============================================================= */

const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const elapsedTime = clock.getElapsedTime();

    // Update all shader uniforms
    materialsByColor.forEach(v => v.forEach(s => { s.face.uniforms.uTime.value = elapsedTime; }));
    floorMaterial.uniforms.uTime.value = elapsedTime;
    if (garbageMaterial) garbageMaterial.uniforms.uTime.value = elapsedTime;
    if (garbageEdgeMaterial) garbageEdgeMaterial.opacity = 0.5 + 0.5 * Math.sin(elapsedTime * 8.0);

    // LOADING / MENU: idle orbit
    if (appState === "LOADING" || appState === "MENU") {
        const angle = elapsedTime * 0.1, radius = 600;
        camera.position.set(Math.sin(angle) * radius, 300, Math.cos(angle) * radius);
        camera.lookAt(0, 0, 0);
        composer.render();
        return;
    }

    // INTRO: camera fly-in
    if (appState === "INTRO") {
        let progress = (elapsedTime - introStartTime) / introDuration;
        if (progress >= 1.0) {
            appState = "RUNNING";
            camera.position.copy(camEndPos);
            camera.lookAt(targetEnd);
            camera.rotation.setFromQuaternion(camera.quaternion, "YXZ");
            inputState.pitch = camera.rotation.x;
            inputState.yaw = camera.rotation.y;
            camera.rotation.set(inputState.pitch, inputState.yaw, 0, "YXZ");
            gameStartTime = performance.now();
            document.body.classList.remove("is-cinematic");
            showMissionBanner();
            startSysLog();
            startOpsFeed();
            composer.render();
            return;
        }
        const t = 1 - Math.pow(1 - progress, 3);
        camera.position.lerpVectors(camStartPos, camEndPos, t);
        camera.lookAt(new THREE.Vector3().lerpVectors(targetStart, targetEnd, t));
        composer.render();
        return;
    }

    // RUNNING: FPS controls
    const baseSpeed = 40.0;
    const moveSpeed = (camera.position.y < 20 ? baseSpeed * 0.5 : baseSpeed) * delta;
    const rotSpeed = 1.0 * delta;

    /* Physical keys first, characters only as a fallback for the rare
       event that carries no code: mixing both would let an AZERTY "a"
       strafe and turn at the same time when the layout guess is wrong. */
    const keys = LAYOUT_KEYS[keyboardLayout];
    const held = (action) => codeState[LAYOUT_CODES[action]] || (!hasKeyCodes && keyState[keys[action]]);
    const arrow = (code, char) => codeState[code] || (!hasKeyCodes && keyState[char]);

    let dYaw = 0;
    if (held("turnLeft")) dYaw += 1;
    if (held("turnRight")) dYaw -= 1;
    inputState.yaw += dYaw * rotSpeed;

    // Touch glide: the view keeps drifting a little after the finger lifts.
    if (touches.look === null && (Math.abs(lookInertia.x) > 1e-5 || Math.abs(lookInertia.y) > 1e-5)) {
        inputState.yaw += lookInertia.x;
        inputState.pitch += lookInertia.y;
        lookInertia.x *= 0.86;
        lookInertia.y *= 0.86;
    }

    inputState.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, inputState.pitch));
    camera.rotation.y = inputState.yaw;
    camera.rotation.x = inputState.pitch;

    const forward = new THREE.Vector3(), right = new THREE.Vector3();
    camera.getWorldDirection(forward).normalize();
    right.crossVectors(forward, camera.up).normalize();

    let dx = 0, dz = 0;
    if (held("forward") || arrow("ArrowUp", "arrowup")) dz += 1;
    if (held("back") || arrow("ArrowDown", "arrowdown")) dz -= 1;
    if (held("left") || arrow("ArrowLeft", "arrowleft")) dx -= 1;
    if (held("right") || arrow("ArrowRight", "arrowright")) dx += 1;
    if (moveJoystick.active) { dx += moveJoystick.x; dz -= moveJoystick.y; }

    if (arrow("Space", " ")) camera.position.y += moveSpeed;
    if (codeState.ShiftLeft || codeState.ShiftRight || (!hasKeyCodes && keyState.shift)) camera.position.y -= moveSpeed;

    // Touch altitude: the two-finger slide, banked between frames.
    if (flyImpulse !== 0) { camera.position.y += flyImpulse; flyImpulse = 0; }

    if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
        const dir = new THREE.Vector3();
        dir.addScaledVector(forward, dz).addScaledVector(right, dx).normalize();
        camera.position.add(dir.multiplyScalar(moveSpeed));
    }

    // Collisions
    if (camera.position.y < 0.2) camera.position.y = 0.2;
    if (camera.position.y < boxHeight + 2) {
        const gx = Math.round((camera.position.x - startX) / spacing);
        const gz = Math.round((camera.position.z - startZ) / spacing);
        if (gx >= 0 && gx < gridCols && gz >= 0 && gz < gridRows && !((gz === 3 || gz === 4) && (gx === 7 || gx === 8))) {
            const bx = startX + gx * spacing, bz = startZ + gz * spacing;
            const cdx = camera.position.x - bx, cdz = camera.position.z - bz;
            const md = boxWidth / 2 + 1.5;
            if (Math.abs(cdx) < md && Math.abs(cdz) < md) {
                if (md - Math.abs(cdx) < md - Math.abs(cdz)) camera.position.x = bx + (Math.sign(cdx) || 1) * md;
                else camera.position.z = bz + (Math.sign(cdz) || 1) * md;
            }
        }
    }

    composer.render();
}

animate();

// --- Init Music Player ---
musicControls = initMusicPlayer();
