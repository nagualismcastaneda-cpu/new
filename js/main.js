// ── Main Game Entry Point ──────────────────────────────────

(function () {
    'use strict';

    // ── Canvas Setup ───────────────────────────────────────
    const canvas = document.getElementById('gameCanvas');
    const renderer = new Renderer(canvas);

    // ── Game Objects ───────────────────────────────────────
    const player = new Entity('Hero', PLAYER_START_HP, PLAYER_START_STAMINA, PLAYER_START_STR, PLAYER_START_DEF, PLAYER_START_INT);
    const enemy = new Entity('Goblin', 80, 50, 4, 3, 2);
    const machine = new SlotMachine();
    const animCtrl = new AnimationController();
    const combatLog = [];

    function log(text, color) {
        combatLog.push({ text: `> ${text}`, color: color || '#ccc' });
        if (combatLog.length > 50) combatLog.shift();
    }

    // ── Buttons ────────────────────────────────────────────
    const BTNY = 410;
    const buttons = [
        { id: 'spin',    label: 'SPIN',      x: 60,  y: BTNY, w: 100, h: 38, color: '#1a5a1a', hoverColor: '#2a8a2a', disabled: false, hover: false },
        { id: 'respin',  label: 'RESPIN',     x: 170, y: BTNY, w: 100, h: 38, color: '#1a3a6a', hoverColor: '#2a5298', disabled: true,  hover: false },
        { id: 'endTurn', label: 'END TURN',   x: 280, y: BTNY, w: 100, h: 38, color: '#5a1a1a', hoverColor: '#8a2a2a', disabled: true,  hover: false },
    ];

    // Line-lock clickable areas (rows)
    const lockAreas = [];
    for (let r = 0; r < ROW_COUNT; r++) {
        const cellH = SYMBOL_SIZE + SYMBOL_GAP;
        const totalW = (SYMBOL_SIZE + SYMBOL_GAP * 2) * REEL_COUNT + SYMBOL_GAP;
        const lx = GRID_OFFSET_X + totalW + 2;
        const ly = GRID_OFFSET_Y + r * cellH + SYMBOL_GAP;
        lockAreas.push({ row: r, x: lx, y: ly - 5, w: 40, h: SYMBOL_SIZE + 10 });
    }

    function updateButtons() {
        const isIdle = machine.state === STATE.IDLE;
        const isDecision = machine.state === STATE.PLAYER_DECISION;
        const hasUnlocked = machine.lockedLines.some(l => !l);

        buttons[0].disabled = !isIdle;                          // SPIN
        buttons[1].disabled = !(isDecision && hasUnlocked);     // RESPIN
        buttons[2].disabled = !isDecision;                      // END TURN
    }

    // ── Input ──────────────────────────────────────────────
    function getMousePos(e) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        return {
            x: (e.clientX - rect.left) * scaleX,
            y: (e.clientY - rect.top) * scaleY,
        };
    }

    function isInside(pos, rect) {
        return pos.x >= rect.x && pos.x <= rect.x + rect.w &&
               pos.y >= rect.y && pos.y <= rect.y + rect.h;
    }

    canvas.addEventListener('mousemove', (e) => {
        const pos = getMousePos(e);
        let cursor = 'default';
        for (const btn of buttons) {
            btn.hover = !btn.disabled && isInside(pos, btn);
            if (btn.hover) cursor = 'pointer';
        }
        for (const area of lockAreas) {
            if (isInside(pos, area) && machine.state === STATE.PLAYER_DECISION) {
                cursor = 'pointer';
            }
        }
        canvas.style.cursor = cursor;
    });

    canvas.addEventListener('click', (e) => {
        const pos = getMousePos(e);

        // Button clicks
        for (const btn of buttons) {
            if (!btn.disabled && isInside(pos, btn)) {
                handleButton(btn.id);
                return;
            }
        }

        // Lock area clicks
        for (const area of lockAreas) {
            if (isInside(pos, area) && machine.state === STATE.PLAYER_DECISION) {
                handleLockToggle(area.row);
                return;
            }
        }
    });

    // ── Game Actions ───────────────────────────────────────

    function handleButton(id) {
        switch (id) {
            case 'spin':
                if (machine.state !== STATE.IDLE) return;
                log('Spinning all reels...', COLOR_GOLD);
                machine.spin();
                break;

            case 'respin':
                if (machine.state !== STATE.PLAYER_DECISION) return;
                const unlocked = machine.lockedLines.filter(l => !l).length;
                log(`Respin! (${unlocked} line(s) unlocked)`, '#7ec8e3');
                machine.respin();
                break;

            case 'endTurn':
                if (machine.state !== STATE.PLAYER_DECISION) return;
                resolvePhase();
                break;
        }
    }

    function handleLockToggle(row) {
        const result = machine.toggleLock(row, player);
        if (result) {
            if (machine.lockedLines[row]) {
                log(`Line ${row + 1} re-locked.`, '#aaa');
            } else {
                log(`Line ${row + 1} unlocked! (-${STAMINA_UNLOCK_COST} ST)`, COLOR_STAMINA);
            }
        } else {
            log(`Not enough stamina to unlock!`, COLOR_LOCK);
        }
        updateButtons();
    }

    // ── Resolution Phase ───────────────────────────────────

    function resolvePhase() {
        machine.state = STATE.RESOLVING;
        const lines = machine.calculateLines();

        if (lines.length === 0) {
            log('No matches.', '#888');
            startEnemyTurn();
            return;
        }

        log('--- Resolving combos ---', COLOR_GOLD);

        let delay = 0;
        for (const match of lines) {
            setTimeout(() => applyMatch(match), delay);
            delay += 600;
        }

        setTimeout(() => {
            startEnemyTurn();
        }, delay + 300);
    }

    function applyMatch(match) {
        const sym = match.symbol;
        switch (sym.id) {
            case 'SWORD': {
                const dmg = BASE_PHYS_DMG + player.str;
                const dealt = enemy.takeDamage(dmg, 'physical');
                log(`Sword x${match.count}: ${dmg} Phys Dmg -> ${dealt} dealt!`, sym.color);
                break;
            }
            case 'SHIELD': {
                const blk = BASE_BLOCK + player.def;
                player.addBlock(blk);
                log(`Shield x${match.count}: +${blk} Block!`, sym.color);
                break;
            }
            case 'FIRE': {
                const dmg = BASE_MAG_DMG + player.int;
                const dealt = enemy.takeDamage(dmg, 'magical');
                log(`Fire x${match.count}: ${dmg} Mag Dmg -> ${dealt} dealt!`, sym.color);
                break;
            }
            case 'HEART': {
                const healed = player.heal(BASE_HEAL);
                player.purgeDebuffs();
                log(`Heart x${match.count}: +${healed} HP, debuffs purged!`, sym.color);
                break;
            }
            case 'BOOK': {
                player.addExp(BASE_EXP);
                log(`Book x${match.count}: +${BASE_EXP} EXP!`, sym.color);
                break;
            }
            case 'SKULL': {
                // Skull damage to player
                const skullDmg = 5 * match.count;
                player.takeDamage(skullDmg, 'magical');
                log(`Skull x${match.count}: ${skullDmg} damage to you!`, sym.color);
                break;
            }
            case 'WILD': {
                log(`Wild x${match.count}: No extra effect.`, sym.color);
                break;
            }
        }
    }

    // ── Enemy Turn ─────────────────────────────────────────

    function startEnemyTurn() {
        machine.state = STATE.ENEMY_TURN;

        if (!enemy.isAlive) {
            log('Enemy defeated! You win!', COLOR_GOLD);
            setTimeout(() => {
                // Spawn new enemy
                const lvl = player.level;
                enemy.maxHP = 60 + lvl * 20;
                enemy.hp = enemy.maxHP;
                enemy.str = 3 + lvl;
                enemy.def = 2 + lvl;
                enemy.int = 2 + lvl;
                enemy.name = ['Goblin', 'Skeleton', 'Orc', 'Dark Mage', 'Dragon'][Math.min(lvl - 1, 4)];
                log(`A new foe appears: ${enemy.name}!`, COLOR_LOCK);
                endTurn();
            }, 1000);
            return;
        }

        // Simple enemy attack
        setTimeout(() => {
            const atkDmg = 5 + enemy.str + Math.floor(Math.random() * 5);
            const dealt = player.takeDamage(atkDmg, 'physical');
            log(`${enemy.name} attacks for ${atkDmg} -> ${dealt} damage!`, COLOR_LOCK);

            if (!player.isAlive) {
                log('You have been defeated! Game Over.', '#ff0000');
                machine.state = STATE.IDLE;
                setTimeout(() => {
                    // Reset
                    player.hp = player.maxHP;
                    player.stamina = player.maxStamina;
                    player.block = 0;
                    log('You have been revived!', COLOR_STAMINA);
                    endTurn();
                }, 2000);
                return;
            }

            endTurn();
        }, 800);
    }

    function endTurn() {
        player.block = 0;
        player.regenStamina(STAMINA_REGEN_PER_TURN);
        machine.reset();
        log(`--- New Turn (Stamina +${STAMINA_REGEN_PER_TURN}) ---`, '#7ec8e3');
    }

    // ── Game Loop ──────────────────────────────────────────
    let lastTime = performance.now();

    function gameLoop(now) {
        const dt = now - lastTime;
        lastTime = now;

        // Update
        machine.update(dt, now);
        animCtrl.update(now);
        updateButtons();

        // Render
        renderer.clear();
        renderer.drawPlayerStats(player);
        renderer.drawSlotMachine(machine);
        renderer.drawButtons(buttons);
        renderer.drawEnemyStats(enemy, canvas.width - 220, 30);
        renderer.drawLog(combatLog, 20, 460, canvas.width - 40, 130);

        // State banner
        const bannerMap = {
            [STATE.IDLE]: 'Press SPIN to start your turn!',
            [STATE.SPINNING]: 'Reels spinning...',
            [STATE.LOCKING]: 'Locking lines...',
            [STATE.PLAYER_DECISION]: 'Click locks to unlock (-5 ST) | RESPIN or END TURN',
            [STATE.RESOLVING]: 'Resolving combos...',
            [STATE.ENEMY_TURN]: 'Enemy turn...',
        };
        renderer.drawStateBanner(bannerMap[machine.state] || '');

        requestAnimationFrame(gameLoop);
    }

    // ── Start ──────────────────────────────────────────────
    log('Welcome to Stamina Reels!', COLOR_GOLD);
    log('Press SPIN to begin.', '#aaa');
    requestAnimationFrame(gameLoop);
})();
