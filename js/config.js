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
            githubStars: "7.2k",
            redditSub: "4.5k",
            discordMembers: "1.4k"
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
        bio: `My journey started as an <strong>Ethical Hacker</strong>, breaking systems to understand them... Eighteen years later I am on the other side of the table: former French Navy submariner (<em>Golden Ear</em>, acoustic analyst on nuclear attack submarines), then cybersecurity lead on submarine combat systems at <strong>Naval Group</strong>, then <strong>CISO</strong> for nuclear research, energy operators and health data. Today I keep my executive role as <strong>Cyber Director & CISO</strong> while pushing <strong>Quantum AI & Post-Quantum Security</strong> as an <strong>Independent Researcher</strong>, in collaboration with the University of Oxford.<br><em>"I protect nuclear secrets by day and build digital consciousness by night."</em>`,
        photo: "img/fpy.png"
    },
    /* Postes regroupes par periode : le CV detaille mission par mission, le
       portail ne garde que la ligne directrice. */
    career: [
        {
            title: "Independent Researcher",
            company: "University of Oxford (collaboration)",
            period: "2025 - Present",
            icon: "fas fa-atom",
            summary: "Post-quantum cryptography and entanglement-inspired distributed systems. Four arXiv papers in 2026.",
            type: "research"
        },
        {
            title: "Executive Cybersecurity Expert",
            company: "Capgemini",
            period: "2023 - Present",
            icon: "fas fa-network-wired",
            summary: "Senior advisory on AI and cyber convergence, strategic support to executive leadership.",
            type: "ciso"
        },
        {
            title: "CISO / ISSO, Critical Infrastructure",
            company: "CEA, ENEDIS / RTE, national programs",
            period: "2022 - 2023",
            icon: "fas fa-radiation",
            summary: "Nuclear research sites and energy network operators: security accreditations, EBIOS RM, defense-law and ISO compliance, SOC and SIEM coordination.",
            type: "ciso"
        },
        {
            title: "Chief Information Security Officer",
            company: "PRO BTP Groupe",
            period: "2019 - 2022",
            icon: "fas fa-hospital",
            summary: "Governance for health data hosting (HDS certification), ISO compliance and secure development lifecycle.",
            type: "ciso"
        },
        {
            title: "Cybersecurity Lead & Architect",
            company: "Naval Group, Thales Alenia Space, Sogeti ESEC",
            period: "2017 - 2019",
            icon: "fas fa-ship",
            summary: "Submarine combat systems, aerospace cyber architecture and defense-law audits for critical operators. Defense clearance.",
            type: "navy"
        },
        {
            title: "Chief Information Security Officer",
            company: "SQUAD",
            period: "2015 - 2017",
            icon: "fas fa-shield-alt",
            summary: "In-house CISO from the company creation: infrastructure built from zero, ISMS and ISO 27001 certification achieved.",
            type: "ciso"
        },
        {
            title: "IT & Security Management",
            company: "Siemens, CMA CGM",
            period: "2012 - 2015",
            icon: "fas fa-server",
            summary: "Global IT operations for the UK and Africa, then network, VOIP and embedded security on 24/7 port logistics infrastructure.",
            type: "tech"
        },
        {
            title: "Navy Submariner (\"Golden Ear\")",
            company: "French Navy",
            period: "2008 - 2012",
            icon: "fas fa-anchor",
            summary: "<small>Where it all started: expert acoustic analyst on nuclear attack submarines, real-time signal processing and sonar signature classification.</small>",
            type: "navy"
        }
    ],
    skills: [
        {
            category: "Quantum & AI",
            icon: "fas fa-atom",
            color: "purple",
            items: ["Post-Quantum Cryptography", "Deep Learning Research (PyTorch)", "World Models & Efficient Architectures", "AI Orchestration (LLMs)"]
        },
        {
            category: "Cybersecurity",
            icon: "fas fa-shield-virus",
            color: "orange",
            items: ["CISO / ISSO, classified environments", "EBIOS RM & Security Accreditation", "Governance (ISO 27001, LPM, NIS2)", "SOC / SIEM & Incident Response", "Offensive Security (Pentest, Red Team)"]
        },
        {
            category: "Robotics & Eng.",
            icon: "fas fa-robot",
            color: "green",
            items: ["VLA/VLM & Tiny Networks", "Embedded & IoT Security", "Acoustic & Signal Processing", "Python, Rust, C"]
        },
        {
            category: "Credentials",
            icon: "fas fa-graduation-cap",
            color: "blue",
            items: ["M2 Cybersecurity, M2 Data Science / AI", "ISO 27001 Lead Implementer", "CEH, AWS Cloud Practitioner", "Eligible for Defense clearance", "FR native, EN C1, ES B2"]
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
            tag: "OFFENSIVE SECURITY",
            icon: "fas fa-skull",
            color: "orange",
            description: "Autonomous pentesting platform for Raspberry Pi, driven by a Tamagotchi-like character: network reconnaissance, vulnerability discovery and attack automation. 6K+ stars on GitHub.",
            url: "https://github.com/infinition/Bjorn"
        },
        {
            title: "FluidWorld",
            tag: "WORLD MODELS",
            icon: "fas fa-water",
            color: "purple",
            description: "Transformer-free world model: reaction-diffusion dynamics used as the predictive substrate, linear complexity instead of quadratic attention. Published on arXiv.",
            url: "https://arxiv.org/abs/2603.21315"
        },
        {
            title: "Recursive VLA",
            tag: "ROBOTICS RESEARCH",
            icon: "fas fa-robot",
            color: "green",
            description: "Vision-Language-Action models for robotics built on tiny recursive networks, sized to run without a GPU farm.",
            url: "https://github.com/infinition"
        },
        {
            title: "Paradigm",
            tag: "ARTIFICIAL INTELLIGENCE",
            icon: "fas fa-brain",
            color: "purple",
            description: "Orchestrated AI system that coordinates specialized LLMs to solve reasoning tasks, closer to a team than to a single model.",
            url: "https://github.com/infinition"
        },
        {
            title: "Immersive Worlds",
            tag: "3D ENVIRONMENT ART",
            icon: "fas fa-vr-cardboard",
            color: "blue",
            description: "Real-time 3D environments built with Unreal Engine 5 and Blender. Lighting, mood and storytelling.",
            url: "https://www.artstation.com/infinition"
        }
    ],
    /* arXiv, 2026. Le dernier n a pas encore d identifiant public, on renvoie
       vers la recherche auteur plutot que vers une page inexistante. */
    publications: [
        {
            title: "Learning Only What Valid Adapters Can Express: Subspace-Constrained Adaptation Against Fine-Tuning Poisoning",
            ref: "arXiv 2607.05300",
            meta: "Jul 2026 // cs.CR, cs.LG",
            color: "orange",
            summary: "Defense against model poisoning through fine-tuning: adaptation constrained to a trusted subspace. Where security and AI actually meet.",
            url: "https://arxiv.org/abs/2607.05300"
        },
        {
            title: "When Do Geometric Algebra Layers Beat Scalarization? A Controlled Study on SO(3)-Equivariant Vector Laws",
            ref: "arXiv 2607.06634",
            meta: "Jul 2026 // cs.LG",
            color: "purple",
            summary: "Controlled study of SO(3)-equivariant networks built from Clifford algebra to learn 3D vector laws.",
            url: "https://arxiv.org/abs/2607.06634"
        },
        {
            title: "FluidWorld: Reaction-Diffusion Dynamics as a Predictive Substrate for World Models",
            ref: "arXiv 2603.21315",
            meta: "Mar 2026 // cs.LG",
            color: "purple",
            summary: "Transformer-free world models: PDE dynamics as the predictor, O(N) complexity.",
            url: "https://arxiv.org/abs/2603.21315"
        },
        {
            title: "Drift-Bounded Spectral Updates for Deep Local Learning",
            ref: "arXiv, Jul 2026",
            meta: "Jul 2026 // cs.LG",
            color: "green",
            summary: "Local learning with a bounded per-layer change budget. Applications: edge devices and controlled autonomous retraining.",
            url: "https://arxiv.org/search/?searchtype=author&query=Polly%2C+F"
        }
    ],
    footer: `&copy; 2026 Fabien Polly.<br><em>"From the abyss to the quantum realm."</em>`
};

let mergedData = [];
let currentFlashcards = [];
let currentQuiz = null;
let cardIndex = 0;
let cachedBandsHTML = null; // CACHE POUR LA MUSIQUE
let kbSortMode = 'date'; // 'date' or 'name'
