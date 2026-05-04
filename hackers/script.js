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
   7.  Leaderboard (localStorage)
   8.  Scene Setup (Camera, Renderer, Lighting)
   9.  Controls (Mouse, Touch, Keyboard, Joystick)
   10. City Grid Generation (Buildings, Garbage Column)
   11. Post Processing (Bloom)
   12. App State Machine (Loading, Menu, Intro, Running)
   13. Garbage Modal & Leaderboard UI
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
            if (bt < 0.10) la = drawFunction(sx, currentY);
            else if (bt < 0.18) la = drawHexDump(sx, currentY);
            else if (bt < 0.26) la = drawBorderedList(sx, currentY);
            else if (bt < 0.32) la = drawConnectionTable(sx, currentY);
            else if (bt < 0.38) la = drawProgressBar(sx, currentY);
            else if (bt < 0.44) la = drawSqlLog(sx, currentY);
            else if (bt < 0.50) la = drawDirList(sx, currentY);
            else if (bt < 0.56) la = drawProcessTable(sx, currentY);
            else if (bt < 0.62) la = drawCryptoBlock(sx, currentY);
            else if (bt < 0.68) la = drawBootSeq(sx, currentY);
            else if (bt < 0.74) la = drawJson(sx, currentY);
            else if (bt < 0.80) la = drawDiagnostics(sx, currentY);
            else if (bt < 0.86) la = drawBinary(sx, currentY);
            else if (bt < 0.92) la = drawCoordinates(sx, currentY);
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
    const canvas = document.createElement('canvas');
    const width = 1024, height = 1024;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);
    const gridSize = 32;
    ctx.lineCap = 'butt';

    function drawBus(x, y, isHorizontal, length, lanes) {
        const sp = 8;
        for (let l = 0; l < lanes; l++) {
            const offset = (l - lanes / 2) * sp;
            ctx.lineWidth = 4;
            if (isHorizontal) {
                ctx.strokeStyle = 'rgba(255,0,0,1)';
                ctx.beginPath(); ctx.moveTo(x, y + offset); ctx.lineTo(x + length, y + offset); ctx.stroke();
                ctx.fillStyle = '#0000ff';
                ctx.fillRect(x - 4, y + offset - 4, 8, 8);
                ctx.fillRect(x + length - 4, y + offset - 4, 8, 8);
            } else {
                ctx.strokeStyle = 'rgba(0,255,0,1)';
                ctx.beginPath(); ctx.moveTo(x + offset, y); ctx.lineTo(x + offset, y + length); ctx.stroke();
                ctx.fillStyle = '#0000ff';
                ctx.fillRect(x + offset - 4, y - 4, 8, 8);
                ctx.fillRect(x + offset - 4, y + length - 4, 8, 8);
            }
        }
    }

    for (let i = 0; i < 60; i++) {
        let x = Math.floor(Math.random() * (width / gridSize)) * gridSize + gridSize / 2;
        let y = Math.floor(Math.random() * (height / gridSize)) * gridSize + gridSize / 2;
        let lanes = Math.floor(Math.random() * 3) + 2;
        for (let s = 0; s < Math.floor(Math.random() * 3) + 1; s++) {
            const isH = Math.random() > 0.5;
            const len = (Math.floor(Math.random() * 6) + 3) * gridSize;
            if (isH) { const dir = Math.random() > 0.5 ? 1 : -1; const eX = x + len * dir; drawBus(Math.min(x, eX), y, true, Math.abs(eX - x), lanes); x = eX; }
            else { const dir = Math.random() > 0.5 ? 1 : -1; const eY = y + len * dir; drawBus(x, Math.min(y, eY), false, Math.abs(eY - y), lanes); y = eY; }
        }
    }

    ctx.fillStyle = '#0000ff';
    for (let i = 0; i < 200; i++) {
        if (Math.random() > 0.8) ctx.fillRect(Math.floor(Math.random() * (width / 16)) * 16, Math.floor(Math.random() * (height / 16)) * 16, 4, 4);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
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
        float rand(vec2 co){ return fract(sin(dot(co.xy,vec2(12.9898,78.233)))*43758.5453); }
        void main() {
            vec2 worldPos = (vUv - 0.5) * uFloorSize;
            vec2 cellPos = mod(worldPos, uSpacing) - 0.5 * uSpacing;
            float halfBox = uBoxWidth * 0.5 + 0.2;
            float floorMask = 1.0 - step(abs(cellPos.x), halfBox) * step(abs(cellPos.y), halfBox);
            vec2 tiledUv = vUv * 12.0;
            vec4 tex = texture2D(uTexture, tiledUv);
            float flowH = smoothstep(0.5, 1.0, sin(tiledUv.x * 2.0 - uTime * 8.0)) * smoothstep(0.0, 1.0, sin(tiledUv.y * 10.0 + tiledUv.x));
            float flowV = smoothstep(0.5, 1.0, sin(tiledUv.y * 2.0 + uTime * 8.0 + 3.14)) * smoothstep(0.0, 1.0, sin(tiledUv.x * 10.0 + tiledUv.y));
            float packetIntensity = (tex.r * flowH + tex.g * flowV) * 2.0;
            float staticGlow = max(smoothstep(0.2, 0.5, tex.r), smoothstep(0.2, 0.5, tex.g)) * 0.4;
            float totalIntensity = (staticGlow + packetIntensity + tex.b * 0.4) * floorMask;
            vec3 color = uColor * totalIntensity + vec3(1.0) * smoothstep(1.5, 3.0, packetIntensity);
            gl_FragColor = vec4(color, 1.0);
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
    const audio = new Audio();
    audio.volume = 0.5;
    audio.preload = 'auto';

    let currentIndex = 0;
    let isPlaying = false;
    let hasStarted = false;

    // Shuffle playlist on init for variety
    for (let i = PLAYLIST.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
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
        songInfo.style.color = isPlaying ? "#00ffff" : "#ffff00";
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
            songInfo.innerText = "[ PAUSED ]";
            songInfo.style.color = "#ffff00";
        } else {
            audio.play().catch(() => {
                songInfo.innerText = "[ CLICK TO PLAY ]";
            });
            isPlaying = true;
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
        songInfo.innerText = "[ TRACK ERROR - SKIPPING ]";
        songInfo.style.color = "#ff0000";
        setTimeout(() => nextTrack(), 1500);
    });

    // --- Connect UI buttons ---
    songInfo.addEventListener('click', togglePlay);
    document.getElementById('btn-prev').addEventListener('click', prevTrack);
    document.getElementById('btn-next').addEventListener('click', nextTrack);

    // --- Return external control interface ---
    return {
        show: () => container.classList.add('visible'),
        play: () => {
            if (!hasStarted) { hasStarted = true; loadTrack(0); }
            isPlaying = true;
            audio.play().catch(() => {});
            updateSongDisplay(PLAYLIST[currentIndex].title);
        },
        setVolume: (vol) => { audio.volume = vol / 100; }
    };
}


/* =============================================================
   7. LEADERBOARD (localStorage - zero backend)
   Stores scores in browser localStorage.
   ============================================================= */

const LB_STORAGE_KEY = 'hackers_1995_leaderboard';

function getStoredScores() {
    try {
        const raw = localStorage.getItem(LB_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function saveScores(scores) {
    localStorage.setItem(LB_STORAGE_KEY, JSON.stringify(scores));
}

function submitScoreLocal(alias, timeMs) {
    const scores = getStoredScores();
    scores.push({ alias, time_ms: timeMs, date: Date.now() });
    // Sort by fastest time
    scores.sort((a, b) => a.time_ms - b.time_ms);
    // Keep top 200
    if (scores.length > 200) scores.length = 200;
    saveScores(scores);
}

function getTopScoresLocal(limit = 50, offset = 0) {
    const scores = getStoredScores();
    return scores.slice(offset, offset + limit);
}

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

const CONFIG = {
    colors: {
        background: 0x050510,
        floorHighlight: 0x1b4ac2,
    },
    bloom: { strength: 0.5, radius: 0.2, threshold: 0.2 },
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.colors.background);
scene.fog = new THREE.FogExp2(CONFIG.colors.background, 0.002);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 60, 80);
camera.lookAt(0, 0, 0);
camera.rotation.order = "YXZ";

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ReinhardToneMapping;
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

// Touch look
let activeLookTouchId = null;
window.addEventListener("touchstart", (e) => {
    if (appState !== "RUNNING") return;
    if (e.target.closest(".virtual-stick-zone") || e.target.closest("button") || e.target.closest("#garbage-modal")) return;
    if (activeLookTouchId === null) { const t = e.changedTouches[0]; activeLookTouchId = t.identifier; inputState.prevMouse.x = t.clientX; inputState.prevMouse.y = t.clientY; }
}, { passive: false });
window.addEventListener("touchend", (e) => { for (let i = 0; i < e.changedTouches.length; i++) { if (e.changedTouches[i].identifier === activeLookTouchId) { activeLookTouchId = null; break; } } });
window.addEventListener("touchmove", (e) => {
    if (appState !== "RUNNING" || activeLookTouchId === null) return;
    let t = null;
    for (let i = 0; i < e.changedTouches.length; i++) { if (e.changedTouches[i].identifier === activeLookTouchId) { t = e.changedTouches[i]; break; } }
    if (!t) return;
    inputState.yaw -= (t.clientX - inputState.prevMouse.x) * 0.004;
    inputState.pitch -= (t.clientY - inputState.prevMouse.y) * 0.004;
    inputState.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, inputState.pitch));
    inputState.prevMouse.x = t.clientX;
    inputState.prevMouse.y = t.clientY;
}, { passive: false });

// Keyboard
const keyState = { w: false, a: false, s: false, d: false, q: false, e: false, ArrowUp: false, ArrowLeft: false, ArrowDown: false, ArrowRight: false, Shift: false, Space: false };
window.addEventListener("keydown", (e) => { const k = e.key.toLowerCase(); if (keyState.hasOwnProperty(k) || k === " " || e.shiftKey) { keyState[k] = true; if (k === " ") keyState.Space = true; if (e.shiftKey) keyState.Shift = true; } });
window.addEventListener("keyup", (e) => { const k = e.key.toLowerCase(); if (keyState.hasOwnProperty(k) || k === " " || !e.shiftKey) { keyState[k] = false; if (k === " ") keyState.Space = false; if (!e.shiftKey) keyState.Shift = false; } });

// Virtual joystick (mobile)
const moveJoystick = { x: 0, y: 0, active: false };
function createStick(id, label) {
    const el = document.createElement("div"); el.id = id; el.className = "virtual-stick-zone";
    el.innerHTML = `<div class="stick-label">${label}</div><div class="stick-base"><div class="stick-knob"></div></div>`;
    document.body.appendChild(el); return el;
}
const moveZone = createStick("stick-move", "MOVE");
const maxDist = 35;
function handleJoystick(zone, dataObj) {
    const knob = zone.querySelector(".stick-knob");
    const update = (e) => {
        if (!dataObj.active) return; e.preventDefault();
        const rect = zone.getBoundingClientRect();
        const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
        let tt = null;
        for (let i = 0; i < e.touches.length; i++) { const t = e.touches[i]; if (Math.sqrt((t.clientX-cx)**2 + (t.clientY-cy)**2) < 150) { tt = t; break; } }
        if (!tt) return;
        let dx = tt.clientX - cx, dy = tt.clientY - cy;
        const dist = Math.sqrt(dx*dx+dy*dy);
        if (dist > maxDist) { dx = (dx/dist)*maxDist; dy = (dy/dist)*maxDist; }
        knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        dataObj.x = dx/maxDist; dataObj.y = dy/maxDist;
    };
    const reset = () => { dataObj.active = false; dataObj.x = 0; dataObj.y = 0; knob.style.transform = `translate(-50%, -50%)`; };
    zone.addEventListener("touchstart", (e) => { dataObj.active = true; e.preventDefault(); }, { passive: false });
    zone.addEventListener("touchmove", update, { passive: false });
    zone.addEventListener("touchend", reset);
    zone.addEventListener("touchcancel", reset);
}
handleJoystick(moveZone, moveJoystick);


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

const neonColors = [0xc692ff, 0x98fce8, 0x4d8dff];
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
   12. APP STATE MACHINE
   ============================================================= */

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

// Simulated loading
let loadPct = 0;
const loadInterval = setInterval(() => {
    loadPct += Math.floor(Math.random() * 5) + 2;
    if (loadPct > 100) { loadPct = 100; clearInterval(loadInterval); }
    document.getElementById("load-bar").style.width = loadPct + "%";
    document.getElementById("load-text").innerText = "LOADING MODULES... " + loadPct + "%";
    if (loadPct >= 100) {
        setTimeout(() => {
            appState = "MENU";
            document.getElementById("loading-screen").style.display = "none";
            document.getElementById("start-screen").style.display = "block";
        }, 500);
    }
}, 100);

let soundEnabled = false;

function showInstructions(enableSound) {
    soundEnabled = enableSound;
    document.getElementById("start-screen").style.display = "none";
    document.getElementById("instructions-screen").style.display = "block";
}

function startGame() {
    if (musicControls) {
        if (soundEnabled) { musicControls.setVolume(50); musicControls.play(); }
        else { musicControls.setVolume(0); }
        setTimeout(() => musicControls.show(), 500);
    }
    document.getElementById("ui-overlay").classList.add("hidden");
    setTimeout(() => (uiOverlay.style.display = "none"), 1000);
    appState = "INTRO";
    introStartTime = clock.getElapsedTime();
    camera.position.copy(camStartPos);
    camera.lookAt(targetStart);
}

document.getElementById("btn-sound-yes").addEventListener("click", () => showInstructions(true));
document.getElementById("btn-sound-no").addEventListener("click", () => showInstructions(false));
document.getElementById("btn-enter").addEventListener("click", startGame);


/* =============================================================
   13. GARBAGE MODAL & LEADERBOARD UI (localStorage)
   ============================================================= */

const garbageModal = document.getElementById("garbage-modal");
let garbageCtx = null, garbageTime = 0, garbageProgress = 0, isGarbageAnimating = false;

function initGarbageAnim() {
    const canvas = document.getElementById("garbage-canvas");
    canvas.width = 160; canvas.height = 100;
    garbageCtx = canvas.getContext("2d", { willReadFrequently: true });
}

function updateGarbageModal() {
    if (!isGarbageAnimating || !garbageCtx) return;
    garbageTime += 0.02;
    const w = garbageCtx.canvas.width, h = garbageCtx.canvas.height;
    const imgData = garbageCtx.getImageData(0, 0, w, h);
    const data = imgData.data;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            let v = Math.sin(x * 0.05 + garbageTime) + Math.sin(y * 0.05 + garbageTime) + Math.sin((x + y) * 0.05 + garbageTime) + Math.sin(Math.sqrt(x * x + y * y) * 0.05 + garbageTime);
            const idx = (y * w + x) * 4;
            data[idx] = 128 + 127 * Math.sin(v * Math.PI);
            data[idx + 1] = 128 + 127 * Math.sin(v * Math.PI + 2.094);
            data[idx + 2] = 128 + 127 * Math.sin(v * Math.PI + 4.189);
            data[idx + 3] = 255;
        }
    }
    garbageCtx.putImageData(imgData, 0, 0);

    if (garbageProgress < 100) {
        garbageProgress += 0.15 + Math.random() * 0.35;
        if (garbageProgress > 100) garbageProgress = 100;
        document.getElementById("garbage-bar").style.width = garbageProgress + "%";
    } else if (!isGameCompleted) {
        document.getElementById("garbage-status").innerText = "COMPLETED";
        gameEndTime = performance.now();
        isGameCompleted = true;
        document.getElementById("leaderboard-form").classList.remove("hidden");
    }
    requestAnimationFrame(updateGarbageModal);
}

function triggerGarbageSequence() {
    garbageModal.classList.remove("hidden");
    garbageModal.style.pointerEvents = "auto";
    document.getElementById("garbage-ui-container").classList.remove("hidden");
    initGarbageAnim();
    garbageProgress = 0; isGarbageAnimating = true;
    document.getElementById("btn-garbage-close").classList.add("hidden");
    document.getElementById("garbage-status").innerText = "Copying";
    document.getElementById("garbage-bar").style.width = "0%";
    document.getElementById("leaderboard-form").classList.add("hidden");
    updateGarbageModal();
}

// --- Leaderboard Display (reads from localStorage) ---
function openLeaderboard() {
    garbageModal.classList.remove("hidden");
    garbageModal.style.pointerEvents = "auto";
    isGarbageAnimating = false;
    document.getElementById("garbage-ui-container").classList.add("hidden");

    const leaderboardDisplay = document.getElementById("leaderboard-display");
    leaderboardDisplay.classList.remove("hidden");
    leaderboardDisplay.style.display = "flex";
    leaderboardDisplay.style.flexDirection = "column";
    leaderboardDisplay.style.alignItems = "center";

    const tbody = document.getElementById("leaderboard-body");
    tbody.innerHTML = "";
    document.getElementById("lb-loader").style.display = "none";

    const scores = getTopScoresLocal(200, 0);
    if (scores.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" style="color:#666; text-align:center; padding:20px;">NO RECORDS FOUND IN LOCAL MEMORY</td></tr>';
    } else {
        scores.forEach((s, i) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td class="lb-col-rank">${(i + 1).toString().padStart(2, "0")}</td>
                <td class="lb-col-alias">${s.alias}</td>
                <td class="lb-col-time">${formatTime(s.time_ms)}</td>
            `;
            tbody.appendChild(tr);
        });
    }
}

// --- Submit Score (localStorage) ---
document.getElementById("btn-submit-score").addEventListener("click", () => {
    const alias = document.getElementById("alias-input").value.trim() || "ANONYMOUS";
    const timeMs = Math.floor(gameEndTime - gameStartTime);

    document.getElementById("btn-submit-score").innerText = "SAVING...";
    document.getElementById("btn-submit-score").disabled = true;

    // Save to localStorage
    submitScoreLocal(alias, timeMs);

    document.getElementById("leaderboard-form").classList.add("hidden");
    document.getElementById("garbage-status").innerText = "SAVED TO LOCAL MEMORY";

    // Show leaderboard with highlight
    garbageModal.classList.remove("hidden");
    garbageModal.style.pointerEvents = "auto";
    isGarbageAnimating = false;
    document.getElementById("garbage-ui-container").classList.add("hidden");

    const leaderboardDisplay = document.getElementById("leaderboard-display");
    leaderboardDisplay.classList.remove("hidden");
    leaderboardDisplay.style.display = "flex";
    leaderboardDisplay.style.flexDirection = "column";
    leaderboardDisplay.style.alignItems = "center";

    const tbody = document.getElementById("leaderboard-body");
    tbody.innerHTML = "";
    document.getElementById("lb-loader").style.display = "none";

    const scores = getTopScoresLocal(200, 0);
    scores.forEach((s, i) => {
        const tr = document.createElement("tr");
        const isMe = s.alias === alias && Math.abs(s.time_ms - timeMs) < 100;
        const color = isMe ? "#00ffff" : "#fff";
        const bg = isMe ? "rgba(0, 255, 255, 0.1)" : "transparent";
        tr.innerHTML = `
            <td class="lb-col-rank" style="color: #666; background: ${bg};">${(i + 1).toString().padStart(2, "0")}</td>
            <td class="lb-col-alias" style="color: ${color}; font-weight: ${isMe ? "bold" : "normal"}; background: ${bg};">${s.alias}</td>
            <td class="lb-col-time" style="color: ${color}; background: ${bg};">${formatTime(s.time_ms)}</td>
        `;
        tbody.appendChild(tr);
    });
});

// --- Modal Close Handlers ---
document.getElementById("btn-garbage-close").addEventListener("click", (e) => {
    e.stopPropagation();
    garbageModal.classList.add("hidden");
    garbageModal.style.pointerEvents = "none";
    isGarbageAnimating = false;
    window.location.reload();
});

document.getElementById("btn-lb-close").addEventListener("click", () => {
    document.getElementById("leaderboard-display").classList.add("hidden");
    garbageModal.classList.add("hidden");
    garbageModal.style.pointerEvents = "none";
    if (appState === "MENU" || appState === "INTRO") {
        document.getElementById("ui-overlay").style.display = "flex";
        document.getElementById("instructions-screen").style.display = "flex";
    } else if (appState !== "RUNNING") {
        window.location.reload();
    }
});

// --- Raycaster (click on garbage building) ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
window.addEventListener("click", (event) => {
    if (event.target.id === "btn-menu-leaderboard") { openLeaderboard(); return; }
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

    let dYaw = 0;
    if (keyState.q) dYaw += 1;
    if (keyState.e) dYaw -= 1;
    inputState.yaw += dYaw * rotSpeed;
    inputState.pitch = Math.max(-Math.PI / 2 + 0.1, Math.min(Math.PI / 2 - 0.1, inputState.pitch));
    camera.rotation.y = inputState.yaw;
    camera.rotation.x = inputState.pitch;

    const forward = new THREE.Vector3(), right = new THREE.Vector3();
    camera.getWorldDirection(forward).normalize();
    right.crossVectors(forward, camera.up).normalize();

    let dx = 0, dz = 0;
    if (keyState.w || keyState.ArrowUp) dz += 1;
    if (keyState.s || keyState.ArrowDown) dz -= 1;
    if (keyState.a || keyState.ArrowLeft) dx -= 1;
    if (keyState.d || keyState.ArrowRight) dx += 1;
    if (moveJoystick.active) { dx += moveJoystick.x; dz -= moveJoystick.y; }

    if (keyState.Space) camera.position.y += moveSpeed;
    if (keyState.Shift) camera.position.y -= moveSpeed;

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
const playerContainer = document.getElementById('music-player-container');
if (playerContainer) {
    playerContainer.addEventListener('click', () => {
        if (!soundEnabled && musicControls) {
            if (confirm("Enable Audio?")) {
                soundEnabled = true;
                musicControls.setVolume(50);
                musicControls.play();
            }
        }
    });
}
