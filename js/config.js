const GITHUB_USER = 'infinition';
const GITHUB_REPO = 'infinition';
const ARTICLES_PATH = 'articles';
const KB_PATH = 'kb';
const BANDS_FILE_URL = `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/main/bands/bands.md`;

let mergedData = [];
let currentFlashcards = [];
let currentQuiz = null;
let cardIndex = 0;
let cachedBandsHTML = null; // CACHE POUR LA MUSIQUE
let kbSortMode = 'date'; // 'date' or 'name'
