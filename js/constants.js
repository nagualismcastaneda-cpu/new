// ── Game Constants ──────────────────────────────────────────

const REEL_COUNT = 3;
const ROW_COUNT = 3;
const SYMBOL_SIZE = 80;
const SYMBOL_GAP = 10;
const REEL_WIDTH = SYMBOL_SIZE + SYMBOL_GAP * 2;
const REEL_HEIGHT = (SYMBOL_SIZE + SYMBOL_GAP) * ROW_COUNT + SYMBOL_GAP;

// Grid area position on canvas
const GRID_OFFSET_X = 60;
const GRID_OFFSET_Y = 120;

// Spin physics
const SPIN_SPEED_MAX = 35;
const SPIN_ACCELERATION = 2.5;
const SPIN_MIN_DURATION = 600;   // ms
const SPIN_STAGGER_DELAY = 300;  // ms between each reel stopping
const BOUNCE_OVERSHOOT = 1.7;    // easeOutBack overshoot factor
const BOUNCE_DURATION = 350;     // ms

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
const COLOR_UNLOCK = '#53d769';
const COLOR_GOLD = '#f5c842';
const COLOR_TEXT = '#eee';
const COLOR_HP = '#e94560';
const COLOR_STAMINA = '#53d769';
const COLOR_HIGHLIGHT = 'rgba(245, 200, 66, 0.35)';

// Game states
const STATE = {
    IDLE: 'IDLE',
    SPINNING: 'SPINNING',
    LOCKING: 'LOCKING',
    PLAYER_DECISION: 'PLAYER_DECISION',
    RESOLVING: 'RESOLVING',
    ENEMY_TURN: 'ENEMY_TURN',
};
