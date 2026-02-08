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
const CANVAS_W = 960;
const CANVAS_H = 720;

// Machine positions
const PLAYER_GRID_X = 80;
const PLAYER_GRID_Y = 135;
const ENEMY_GRID_X = 600;
const ENEMY_GRID_Y = 135;

// Portrait positions
const PORTRAIT_SIZE = 60;
const PLAYER_PORT_X = 10;
const PLAYER_PORT_Y = 42;
const ENEMY_PORT_X = CANVAS_W - PORTRAIT_SIZE - 10;
const ENEMY_PORT_Y = 42;

// Spin physics
const SPIN_SPEED_MAX = 28;
const SPIN_ACCELERATION = 1.5;
const SPIN_MIN_DURATION = 800;
const SPIN_STAGGER_DELAY = 400;
const DECEL_DURATION = 500;
const BOUNCE_OVERSHOOT = 1.70;
const BOUNCE_DURATION = 400;

// Resolve
const HIGHLIGHT_DURATION = 900;
const HIGHLIGHT_PAUSE = 200;

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

// Colors — premium dark fantasy palette
const COLOR_BG        = '#0f0e1a';
const COLOR_BG_GRAD1  = '#0f0e1a';
const COLOR_BG_GRAD2  = '#1a1530';
const COLOR_PANEL      = '#16213e';
const COLOR_PANEL_LITE = '#1c2a4a';
const COLOR_REEL_BG    = '#0a1e3d';
const COLOR_LOCK       = '#e94560';
const COLOR_LOCK_OVERLAY = 'rgba(15, 8, 25, 0.55)';
const COLOR_LOCK_BORDER  = 'rgba(233, 69, 96, 0.6)';
const COLOR_UNLOCK     = '#53d769';
const COLOR_GOLD       = '#f5c842';
const COLOR_GOLD_DIM   = '#c4982a';
const COLOR_TEXT       = '#eee';
const COLOR_TEXT_DIM   = '#888';
const COLOR_HP         = '#e94560';
const COLOR_HP_GRAD    = '#ff6b8a';
const COLOR_STAMINA    = '#53d769';
const COLOR_STAMINA_GR = '#7aff99';
const COLOR_MANA       = '#5e8aff';
const COLOR_PLAYER_ACC = '#ff9f43'; // warm orange accent for player
const COLOR_ENEMY_ACC  = '#6c7b95'; // cool grey-blue accent for enemy

// Game states
const GS = {
    IDLE:             'IDLE',
    SPINNING:         'SPINNING',
    PLAYER_DECISION:  'PLAYER_DECISION',
    RESOLVING:        'RESOLVING',
    ENEMY_SPINNING:   'ENEMY_SPINNING',
    ENEMY_DECISION:   'ENEMY_DECISION',
    ENEMY_RESOLVING:  'ENEMY_RESOLVING',
    WAITING:          'WAITING',
};
