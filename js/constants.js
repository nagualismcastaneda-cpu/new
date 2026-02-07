// ── Game Constants ──────────────────────────────────────────

const REEL_COUNT = 3;
const ROW_COUNT = 3;
const SYMBOL_SIZE = 72;
const SYMBOL_GAP = 8;
const CELL_W = SYMBOL_SIZE + SYMBOL_GAP * 2; // 88
const CELL_H = SYMBOL_SIZE + SYMBOL_GAP;      // 80
const GRID_W = CELL_W * REEL_COUNT + SYMBOL_GAP; // 272
const GRID_H = CELL_H * ROW_COUNT + SYMBOL_GAP;  // 248

// Canvas
const CANVAS_W = 900;
const CANVAS_H = 700;

// Machine positions
const PLAYER_GRID_X = 25;
const PLAYER_GRID_Y = 115;
const ENEMY_GRID_X = 575;
const ENEMY_GRID_Y = 115;

// Spin physics
const SPIN_SPEED_MAX = 28;
const SPIN_ACCELERATION = 1.5;
const SPIN_MIN_DURATION = 800;    // ms before first reel starts stopping
const SPIN_STAGGER_DELAY = 400;   // ms between reel stops
const DECEL_DURATION = 500;       // ms for smooth deceleration
const BOUNCE_OVERSHOOT = 1.70;
const BOUNCE_DURATION = 400;      // ms

// Resolve
const HIGHLIGHT_DURATION = 900;   // ms per combo highlight
const HIGHLIGHT_PAUSE = 200;      // ms pause between highlights

// Balance
const STAMINA_UNLOCK_COST = 5;
const STAMINA_REGEN_PER_TURN = 10;
const BASE_PHYS_DMG = 15;
const BASE_MAG_DMG = 10;
const BASE_BLOCK = 15;
const BASE_HEAL = 10;
const BASE_EXP = 10;
const PLAYER_START_HP = 100;
const PLAYER_START_STAMINA = 100;
const PLAYER_START_STR = 5;
const PLAYER_START_DEF = 5;
const PLAYER_START_INT = 5;

// Colors
const COLOR_BG = '#1a1a2e';
const COLOR_PANEL = '#16213e';
const COLOR_REEL_BG = '#0f3460';
const COLOR_LOCK = '#e94560';
const COLOR_LOCK_OVERLAY = 'rgba(15, 8, 25, 0.50)';
const COLOR_LOCK_BORDER = 'rgba(233, 69, 96, 0.55)';
const COLOR_UNLOCK = '#53d769';
const COLOR_GOLD = '#f5c842';
const COLOR_TEXT = '#eee';
const COLOR_HP = '#e94560';
const COLOR_STAMINA = '#53d769';

// Game states (top-level, managed by main.js)
const GS = {
    IDLE: 'IDLE',
    SPINNING: 'SPINNING',
    PLAYER_DECISION: 'PLAYER_DECISION',
    RESOLVING: 'RESOLVING',
    ENEMY_SPINNING: 'ENEMY_SPINNING',
    ENEMY_RESOLVING: 'ENEMY_RESOLVING',
    WAITING: 'WAITING',
};
