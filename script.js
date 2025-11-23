// Simple Filler Quest Game
const palette = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899"];
const floodDelay = 60;
const POINT_MULTIPLIER = 10;

// Game state
let currentLevel = 1;
let grid = [];
let activeColor = "";
let moveCount = 0;
let moveLimit = 0;
let totalPoints = Number(localStorage.getItem('fillerPoints')) || 0;
let soundEnabled = localStorage.getItem('fillerSound') !== 'off';
let animating = false;

// DOM elements
const boardEl = document.getElementById("board");
const moveCountEl = document.getElementById("moveCount");
const moveLimitEl = document.getElementById("moveLimit");
const levelDisplay = document.getElementById("levelDisplay");
const pointsTotalEl = document.getElementById("pointsTotal");
const buttonsEl = document.getElementById("colorButtons");
const resetBtn = document.getElementById("resetBtn");
const newGameBtn = document.getElementById("newGameBtn");
const soundToggle = document.getElementById("soundToggle");
const overlay = document.getElementById("levelOverlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayMessage = document.getElementById("overlayMessage");
const overlayBtn = document.getElementById("overlayBtn");

// Audio elements
const moveSound = document.getElementById("moveSound");
const fillSound = document.getElementById("fillSound");
const winSound = document.getElementById("winSound");
const loseSound = document.getElementById("loseSound");

// Initialize game
function init() {
    buildColorButtons();
    resetBtn.addEventListener("click", () => loadLevel(currentLevel));
    newGameBtn.addEventListener("click", newGame);
    soundToggle.addEventListener("click", toggleSound);
    overlayBtn.addEventListener("click", handleOverlayConfirm);
    
    // Load saved level or start from level 1
    const savedLevel = Number(localStorage.getItem('fillerLevel')) || 1;
    loadLevel(savedLevel);
    updateSoundButton();
    
    // Initialize Base Mini App SDK
    initBaseMiniApp();
}

function initBaseMiniApp() {
    if (window.EmbedSDK) {
        window.EmbedSDK.init();
        console.log('Base Mini App SDK initialized');
    }
    
    // Detect if we're in an embedded environment
    if (window.self !== window.top || window.ethereum?.isMiniApp) {
        document.body.classList.add('embedded');
        console.log('Running in embedded mode');
    }
}

function buildColorButtons() {
    buttonsEl.innerHTML = "";
    palette.forEach(color => {
        const btn = document.createElement("button");
        btn.className = "color-btn";
        btn.style.backgroundColor = color;
        btn.dataset.color = color;
        btn.addEventListener("click", () => handleColorPick(color));
        buttonsEl.appendChild(btn);
    });
}

function loadLevel(level) {
    currentLevel = level;
    localStorage.setItem('fillerLevel', currentLevel.toString());
    
    const size = 4 + Math.floor((level - 1) / 2);
    moveLimit = Math.max(size * 2, size + 4);
    moveCount = 0;
    
    updateDisplays();
    createBoard(size);
    hideOverlay();
}

function createBoard(size) {
    boardEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    boardEl.innerHTML = "";
    
    grid = [];
    for (let r = 0; r < size; r++) {
        const row = [];
        for (let c = 0; c < size; c++) {
            const color = palette[Math.floor(Math.random() * palette.length)];
            const tile = document.createElement("div");
            tile.className = "tile";
            tile.style.backgroundColor = color;
            row.push({ color, el: tile });
            boardEl.appendChild(tile);
        }
        grid.push(row);
    }
    
    activeColor = grid[0][0].color;
    highlightActiveColor();
    animateTiles();
}

function animateTiles() {
    const tiles = boardEl.children;
    for (let i = 0; i < tiles.length; i++) {
        tiles[i].style.animationDelay = `${(i % 8) * 30}ms`;
    }
}

function highlightActiveColor() {
    Array.from(buttonsEl.children).forEach(btn => {
        btn.classList.toggle("active", btn.dataset.color === activeColor);
    });
}

function handleColorPick(newColor) {
    if (animating || newColor === activeColor || moveCount >= moveLimit) return;
    
    playSound(moveSound);
    moveCount++;
    updateDisplays();
    
    floodFill(newColor);
}

function floodFill(newColor) {
    animating = true;
    const size = grid.length;
    const oldColor = activeColor;
    const visited = new Set();
    const queue = [[0, 0]];
    const steps = [];
    
    // Find all connected tiles
    while (queue.length > 0) {
        const [r, c] = queue.shift();
        const key = `${r},${c}`;
        
        if (visited.has(key)) continue;
        visited.add(key);
        
        if (!steps[0]) steps[0] = [];
        steps[0].push([r, c]);
        
        // Check neighbors
        const neighbors = [[r-1, c], [r+1, c], [r, c-1], [r, c+1]];
        for (const [nr, nc] of neighbors) {
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                const neighborColor = grid[nr][nc].color;
                if (neighborColor === oldColor || neighborColor === newColor) {
                    queue.push([nr, nc]);
                }
            }
        }
    }
    
    activeColor = newColor;
    highlightActiveColor();
    
    // Animate the flood fill
    steps[0].forEach(([r, c], index) => {
        setTimeout(() => {
            grid[r][c].color = newColor;
            grid[r][c].el.style.backgroundColor = newColor;
            grid[r][c].el.classList.add("flooding");
            setTimeout(() => grid[r][c].el.classList.remove("flooding"), 300);
            
            if (index % 3 === 0) playSound(fillSound);
            
            if (index === steps[0].length - 1) {
                animating = false;
                checkGameState();
            }
        }, index * floodDelay);
    });
}

function checkGameState() {
    const allSameColor = grid.flat().every(cell => cell.color === activeColor);
    
    if (allSameColor) {
        const points = Math.max(moveLimit - moveCount, 0) * POINT_MULTIPLIER;
        totalPoints += points;
        localStorage.setItem('fillerPoints', totalPoints.toString());
        playSound(winSound);
        showOverlay("Level Complete!", `+${points} points!`, "next");
    } else if (moveCount >= moveLimit) {
        playSound(loseSound);
        showOverlay("Game Over", "No moves left!", "retry");
    }
    
    updateDisplays();
}

function showOverlay(title, message, action) {
    overlayTitle.textContent = title;
    overlayMessage.textContent = message;
    overlay.dataset.action = action;
    overlay.classList.remove("hidden");
}

function hideOverlay() {
    overlay.classList.add("hidden");
}

function handleOverlayConfirm() {
    hideOverlay();
    const action = overlay.dataset.action;
    
    if (action === "next") {
        loadLevel(currentLevel + 1);
    } else {
        loadLevel(currentLevel);
    }
}

function updateDisplays() {
    moveCountEl.textContent = moveCount;
    moveLimitEl.textContent = moveLimit;
    levelDisplay.textContent = currentLevel;
    pointsTotalEl.textContent = totalPoints;
}

function playSound(audio) {
    if (!soundEnabled) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    localStorage.setItem('fillerSound', soundEnabled ? 'on' : 'off');
    updateSoundButton();
}

function updateSoundButton() {
    soundToggle.textContent = soundEnabled ? "🔊 Sound" : "🔇 Muted";
}

function newGame() {
    totalPoints = 0;
    localStorage.setItem('fillerPoints', '0');
    localStorage.setItem('fillerLevel', '1');
    updateDisplays();
    loadLevel(1);
}

// Start the game
document.addEventListener("DOMContentLoaded", init);
