const GITHUB_USER = 'infinition';
const GITHUB_REPO = 'infinition';
const ARTICLES_PATH = 'articles';
const KB_PATH = 'kb';
const BANDS_FILE_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/bands/bands.md`;

const CONFIG = {
    projectName: "FABIEN POLLY",
    projectSubtitle: "INFINITION",
    description: "Portal of Fabien Polly (Infinition) - AI Researcher, Quantum Expert, Hacker, 3D Artist & Skater",
    logoPath: "img/icon-180.png",
    themeColor: "#060606",
    accentColor: "#22c55e",
    manifestPath: "manifest.webmanifest",
    enableMusic: true, // Set to false to disable ambient music and hide mute/unmute button
    enableSoundFx: true, // Set to false to disable sound effects
    enableOverload: true, // Set to false to disable reactor overload mode and hide SYS STABLE/OVERLOAD status
    social: {
        linkedin: "https://www.linkedin.com/in/fabienpolly",
        github: "https://github.com/infinition",
        reddit: "https://www.reddit.com/r/Bjorn_CyberViking",
        discord: "https://discord.com/invite/B3ZH9taVfT",
        artstation: "https://www.artstation.com/infinition",
        stats: {
            githubStars: "5.6k",
            redditSub: "r/bjorn"
        }
    },
    seo: {
        ogImage: "img/icon-180.png",
        twitterCard: "summary_large_image",
        keywords: "AI, Quantum, Hacker, 3D Artist, Cybersecurity, CISO, Fabien Polly, Infinition"
    },
    blog: {
        title: "DATA LOGS",
        subtitle: "Personal Research Notes & Live Repositories"
    }
};

const PORTFOLIO_DATA = {
    identity: {
        name: "FABIEN POLLY",
        id: "0xPOLLY",
        tagline: [
            { text: "Cyber Director & CISO", color: "orange" },
            { text: "Independent Researcher", color: "purple" },
            { text: "Creative Tech", color: "blue" },
            { text: "Skater", color: "red" }
        ],
        bio: `My journey started as an <strong>Ethical Hacker</strong>, breaking systems to understand them... Today, I operate at a unique intersection: I maintain my executive role as a <strong>Cyber Director & CISO</strong>, while simultaneously pushing the boundaries of technology as an <strong>Independent Researcher</strong> in <strong>Quantum AI & Post-Quantum Security</strong>.<br><em>"I protect nuclear secrets by day and build digital consciousness by night."</em>`,
        photo: "img/fpy.png"
    },
    career: [
        {
            title: "Cyber Director & Independent Researcher",
            company: "Current Status",
            icon: "fas fa-network-wired",
            summary: "Combining executive cybersecurity leadership with advanced research in Quantum Computing, AI Consciousness, and Cryptography at Oxford (Independent).",
            type: "research"
        },
        {
            title: "Chief Information Security Officer (CISO/RSSI)",
            company: "Various Missions (Nuclear, Energy, Banking...)",
            icon: "fas fa-shield-alt",
            summary: "Strategic cybersecurity leadership for Critical Infrastructure Operators (OIV). Managing risks, governance (ISO 27001), and large-scale defense strategies.",
            type: "ciso"
        },
        {
            title: "Ethical Hacker & Security Consultant",
            company: "Various Missions",
            icon: "fas fa-user-secret",
            summary: "The foundation. Offensive security, pentesting, and discovering vulnerabilities before they could be exploited.",
            type: "ciso"
        },
        {
            title: "Submarine Officer (\"Golden Ear\")",
            company: "French Navy",
            icon: "fas fa-anchor",
            summary: "<small>Where it all started: Signal analysis and acoustic warfare in high-pressure environments.</small>",
            type: "navy"
        }
    ],
    skills: [
        {
            category: "Quantum & AI",
            icon: "fas fa-atom",
            color: "purple",
            items: ["Quantum Machine Learning", "AI Engineering & Data Science", "Post-Quantum Cryptography", "AI Orchestration (LLMs)"]
        },
        {
            category: "Robotics & Eng.",
            icon: "fas fa-robot",
            color: "green",
            items: ["VLA/VLM & Tiny Networks", "Embedded Systems Security", "Robotics Engineering", "Autonomous Systems"]
        },
        {
            category: "Cybersecurity",
            icon: "fas fa-shield-virus",
            color: "orange",
            items: ["Offensive Security (Pentest)", "SCADA & Industrial Systems", "Governance (ISO 27001, LPM)", "Risk Management"]
        },
        {
            category: "Art & Lifestyle",
            icon: "fas fa-bolt",
            color: "red",
            items: ["<strong>3D Env Artist (Unreal/Blender)</strong>", "2D Concept Art", "Aggressive Inline Skating", "Creative Technology"]
        }
    ],
    projects: [
        {
            title: "Bjorn",
            tag: "CYBERSECURITY TOOL",
            icon: "fas fa-skull",
            color: "orange",
            description: "Autonomous offensive security tool for Raspberry Pi (Tamagotchi-like). Scans networks, discovers vulnerabilities, and automates attacks.",
            url: "https://github.com/infinition/Bjorn"
        },
        {
            title: "Recursive VLA",
            tag: "ROBOTICS RESEARCH",
            icon: "fas fa-robot",
            color: "green",
            description: "Personal research on Robotics Vision-Language-Action (VLA) models using tiny recursive networks to bypass GPU dependency.",
            url: "https://github.com/infinition"
        },
        {
            title: "Paradigm",
            tag: "ARTIFICIAL INTELLIGENCE",
            icon: "fas fa-brain",
            color: "purple",
            description: "Orchestrated AI System designed to mimic human-like intelligence. Coordinates specialized LLMs to solve reasoning tasks.",
            url: "https://github.com/infinition"
        },
        {
            title: "AI Consciousness",
            tag: "RESEARCH PUBLICATION",
            icon: "fas fa-book",
            color: "purple",
            description: "WIP Publication: \"Limits of Reproducing Human Consciousness in AI Systems\". Theoretical boundaries of AGI.",
            url: "https://github.com/infinition"
        },
        {
            title: "Immersive Worlds",
            tag: "3D ENVIRONMENT ART",
            icon: "fas fa-vr-cardboard",
            color: "blue",
            description: "Collection of real-time 3D environments created with Unreal Engine 5 and Blender. Lighting and storytelling.",
            url: "https://www.artstation.com/infinition"
        }
    ],
    footer: `© 2025 Fabien Polly.<br><em>"From the abyss to the quantum realm."</em>`
};

let mergedData = [];
let currentFlashcards = [];
let currentQuiz = null;
let cardIndex = 0;
let cachedBandsHTML = null; // CACHE POUR LA MUSIQUE
let kbSortMode = 'date'; // 'date' or 'name'
