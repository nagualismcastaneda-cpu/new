// ── Main Game ──────────────────────────────────────────────

(function () {
    'use strict';

    const canvas = document.getElementById('gameCanvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const R = new Renderer(canvas);

    // ── Entities ───────────────────────────────────────────
    const player = new Entity('Aria', PLAYER_START_HP, PLAYER_START_STAMINA,
        PLAYER_START_STR, PLAYER_START_DEF, PLAYER_START_INT);
    const enemy  = new Entity('Troll', 120, 60, 6, 4, 3);

    // ── Two Slot Machines ──────────────────────────────────
    const pMachine = new SlotMachine(false);
    const eMachine = new SlotMachine(true);

    // ── State ──────────────────────────────────────────────
    let gs = GS.IDLE;
    const log = [];

    function addLog(text, color) {
        log.push({ text: '> ' + text, color: color || '#ccc' });
        if (log.length > 80) log.shift();
    }

    // ── Button (single dynamic) ─────────────────────────────
    const BCX = CANVAS_W / 2;
    const BY  = 405;
    const actionBtn = {
        id: 'spin', label: 'SPIN', x: BCX - 65, y: BY, w: 130, h: 40,
        color: '#1a5a1a', hoverColor: '#2a8a2a', disabled: false, hover: false
    };
    const buttons = [actionBtn];

    // Lock click areas (right side of player grid)
    const lockAreas = [];
    for (let r = 0; r < ROW_COUNT; r++) {
        lockAreas.push({
            row: r,
            x: PLAYER_GRID_X + GRID_W + 10,
            y: PLAYER_GRID_Y + r * CELL_H + SYMBOL_GAP - 5,
            w: 38,
            h: SYMBOL_SIZE + 10,
        });
    }

    function refreshButtons() {
        if (gs === GS.IDLE) {
            actionBtn.id = 'spin';
            actionBtn.label = 'SPIN';
            actionBtn.color = '#1a5a1a';
            actionBtn.hoverColor = '#2a8a2a';
            actionBtn.disabled = false;
        } else if (gs === GS.PLAYER_DECISION) {
            const hasUnlocked = pMachine.lockedLines.some(l => !l);
            if (hasUnlocked && !pMachine.respinUsed) {
                actionBtn.id = 'respin';
                actionBtn.label = 'RESPIN';
                actionBtn.color = '#1a3a6a';
                actionBtn.hoverColor = '#2a5298';
            } else {
                actionBtn.id = 'endTurn';
                actionBtn.label = 'END TURN';
                actionBtn.color = '#5a1a1a';
                actionBtn.hoverColor = '#8a2a2a';
            }
            actionBtn.disabled = false;
        } else {
            actionBtn.disabled = true;
        }
    }

    // ── Input ──────────────────────────────────────────────
    function mpos(e) {
        const r = canvas.getBoundingClientRect();
        return { x: (e.clientX - r.left) * (canvas.width / r.width),
                 y: (e.clientY - r.top)  * (canvas.height / r.height) };
    }
    function inside(p, b) {
        return p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;
    }

    canvas.addEventListener('mousemove', e => {
        const p = mpos(e);
        let cur = 'default';
        for (const b of buttons) { b.hover = !b.disabled && inside(p, b); if (b.hover) cur = 'pointer'; }
        if (gs === GS.PLAYER_DECISION && !pMachine.respinUsed) {
            for (const a of lockAreas) { if (inside(p, a)) cur = 'pointer'; }
        }
        canvas.style.cursor = cur;
    });

    canvas.addEventListener('click', e => {
        const p = mpos(e);
        for (const b of buttons) { if (!b.disabled && inside(p, b)) { onBtn(b.id); return; } }
        if (gs === GS.PLAYER_DECISION && !pMachine.respinUsed) {
            for (const a of lockAreas) { if (inside(p, a)) { onLock(a.row); return; } }
        }
    });

    // ── Actions ────────────────────────────────────────────

    function onBtn(id) {
        if (id === 'spin' && gs === GS.IDLE) {
            addLog('Spinning reels\u2026', COLOR_GOLD);
            pMachine.spin();
            gs = GS.SPINNING;
        }
        if (id === 'respin' && gs === GS.PLAYER_DECISION) {
            if (pMachine.respinUsed) return;
            const n = pMachine.lockedLines.filter(l => !l).length;
            if (n === 0) return;
            addLog(`Respin! (${n} line(s) unlocked)`, '#7ec8e3');
            if (!pMachine.respin()) return;
            gs = GS.SPINNING;
        }
        if (id === 'endTurn' && gs === GS.PLAYER_DECISION) {
            beginPlayerResolve();
        }
    }

    function onLock(row) {
        // Stun check: can't unlock lines with skulls when stunned
        if (pMachine.lockedLines[row] && player.hasEffect('STUN')) {
            if (pMachine.lineHasSkull(row)) {
                addLog(`Stunned! Can't unlock line ${row+1} (has skull)!`, '#ffaa00');
                return;
            }
        }

        const ok = pMachine.toggleLock(row, player);
        if (ok) {
            if (pMachine.lockedLines[row]) {
                addLog(`Line ${row+1} re-locked (+${STAMINA_UNLOCK_COST} ST)`, '#aaa');
            } else {
                addLog(`Line ${row+1} unlocked! (-${STAMINA_UNLOCK_COST} ST)`, COLOR_STAMINA);
            }
        } else {
            addLog('Not enough stamina!', COLOR_LOCK);
        }
        refreshButtons();
    }

    // ── Player Resolve ─────────────────────────────────────

    function beginPlayerResolve() {
        const has = pMachine.startResolve();
        if (!has) {
            addLog('No matches.', '#888');
            gs = GS.WAITING;
            // Tick player effects at end of player's turn
            tickPlayerEffects();
            setTimeout(beginEnemyTurn, 500);
            return;
        }
        gs = GS.RESOLVING;
        addLog('--- Resolving your combos ---', COLOR_GOLD);
    }

    function applyPlayerMatch(m) {
        const s = m.symbol;
        switch (s.id) {
            case 'SWORD': {
                const raw = BASE_PHYS_DMG + player.str;
                const d = player.calcOutgoingDamage(raw);
                const r = enemy.takeDamage(d, 'physical');
                addLog(`\u2694 Sword x${m.count}: ${d} \u2192 ${r} dmg`, s.color);
                break;
            }
            case 'SHIELD': {
                const b = BASE_BLOCK + player.def;
                player.addBlock(b);
                addLog(`\uD83D\uDEE1 Shield x${m.count}: +${b} Block`, s.color);
                break;
            }
            case 'FIRE': {
                const raw = BASE_MAG_DMG + player.int;
                const d = player.calcOutgoingDamage(raw);
                const r = enemy.takeDamage(d, 'magical');
                addLog(`\uD83D\uDD25 Fire x${m.count}: ${d} \u2192 ${r} dmg`, s.color);
                break;
            }
            case 'HEART': {
                const h = player.heal(BASE_HEAL);
                player.purgeDebuffs();
                addLog(`\u2665 Heart x${m.count}: +${h} HP, debuffs purged`, s.color);
                break;
            }
            case 'BOOK': {
                player.addExp(BASE_EXP);
                addLog(`\uD83D\uDCD6 Book x${m.count}: +${BASE_EXP} EXP`, s.color);
                break;
            }
            case 'SKULL': {
                // Skulls apply debuffs instead of damage
                const debuffs = getSkullDebuffs(m.count);
                for (const d of debuffs) {
                    player.applyEffect(d);
                    addLog(`\uD83D\uDC80 Skull: ${d.name} applied! (${d.desc})`, d.color);
                }
                break;
            }
        }
    }

    function tickPlayerEffects() {
        const msgs = player.tickEffects();
        for (const m of msgs) addLog(m.text, m.color);
    }

    // ── Enemy Turn ─────────────────────────────────────────

    function beginEnemyTurn() {
        if (!enemy.isAlive) {
            addLog(`${enemy.name} defeated!`, COLOR_GOLD);
            setTimeout(spawnEnemy, 800);
            return;
        }
        addLog(`--- ${enemy.name}'s turn ---`, COLOR_LOCK);
        eMachine.spin();
        gs = GS.ENEMY_SPINNING;
    }

    function enemyDecision() {
        // Check which lines have no combo participation
        const linesToRespin = eMachine.getLinesWithNoCombos();
        const maxAffordable = Math.floor(enemy.stamina / STAMINA_UNLOCK_COST);
        const toUnlock = linesToRespin.slice(0, maxAffordable);

        if (toUnlock.length > 0) {
            gs = GS.ENEMY_DECISION;
            // Unlock lines
            for (const r of toUnlock) {
                eMachine.toggleLock(r, enemy);
            }
            addLog(`${enemy.name} unlocks ${toUnlock.length} line(s) and respins!`, COLOR_ENEMY_ACC);

            setTimeout(() => {
                if (eMachine.respin()) {
                    gs = GS.ENEMY_SPINNING;
                } else {
                    beginEnemyResolve();
                }
            }, 800);
        } else {
            beginEnemyResolve();
        }
    }

    function beginEnemyResolve() {
        const has = eMachine.startResolve();
        if (!has) {
            addLog(`${enemy.name}: No matches.`, '#888');
            gs = GS.WAITING;
            tickEnemyEffects();
            setTimeout(endTurn, 500);
            return;
        }
        gs = GS.ENEMY_RESOLVING;
        addLog('--- Resolving enemy combos ---', COLOR_LOCK);
    }

    function applyEnemyMatch(m) {
        const s = m.symbol;
        switch (s.id) {
            case 'SWORD': {
                const raw = BASE_PHYS_DMG + enemy.str;
                const d = enemy.calcOutgoingDamage(raw);
                const r = player.takeDamage(d, 'physical');
                addLog(`\u2694 ${enemy.name} Sword x${m.count}: ${d} \u2192 ${r} dmg`, '#ff6666');
                break;
            }
            case 'SHIELD': {
                const b = BASE_BLOCK + enemy.def;
                enemy.addBlock(b);
                addLog(`\uD83D\uDEE1 ${enemy.name} Shield x${m.count}: +${b} Block`, '#6688ff');
                break;
            }
            case 'FIRE': {
                // Troll: Fire = Stun attack instead of magic damage
                player.applyEffect(EFFECTS.STUN);
                addLog(`\uD83D\uDCAB ${enemy.name} Stun! Lines with skulls locked for 2 turns!`, '#ffaa00');
                break;
            }
            case 'HEART': {
                const h = enemy.heal(BASE_HEAL);
                addLog(`\u2665 ${enemy.name} Heart x${m.count}: +${h} HP`, '#6688ff');
                break;
            }
            case 'BOOK': {
                addLog(`\uD83D\uDCD6 ${enemy.name} Book: no effect`, '#888');
                break;
            }
            case 'SKULL': {
                // Skulls apply debuffs to enemy too
                const debuffs = getSkullDebuffs(m.count);
                for (const d of debuffs) {
                    enemy.applyEffect(d);
                    addLog(`\uD83D\uDC80 ${enemy.name} Skull: ${d.name}! (${d.desc})`, d.color);
                }
                break;
            }
        }
    }

    function tickEnemyEffects() {
        const msgs = enemy.tickEffects();
        for (const m of msgs) addLog(m.text, m.color);
    }

    // ── End Turn / Spawn ───────────────────────────────────

    function spawnEnemy() {
        const lv = player.level;
        const names = ['Troll', 'Stone Troll', 'War Troll', 'Elder Troll', 'Troll King'];
        enemy.name = names[Math.min(lv - 1, names.length - 1)];
        enemy.maxHP = 100 + lv * 25;
        enemy.hp = enemy.maxHP;
        enemy.maxStamina = 50 + lv * 5;
        enemy.stamina = enemy.maxStamina;
        enemy.str = 5 + lv;
        enemy.def = 3 + lv;
        enemy.int = 3 + lv;
        enemy.block = 0;
        enemy.effects = [];
        addLog(`A new foe appears: ${enemy.name}!`, COLOR_LOCK);
        endTurn();
    }

    function endTurn() {
        if (!player.isAlive) {
            addLog('GAME OVER \u2014 Reviving\u2026', '#ff0000');
            player.hp = player.maxHP;
            player.stamina = player.maxStamina;
            player.effects = [];
        }
        player.endTurnBlock();
        enemy.endTurnBlock();
        player.regenStamina(STAMINA_REGEN_PER_TURN);
        enemy.regenStamina(STAMINA_REGEN_PER_TURN);
        pMachine.reset();
        eMachine.reset();
        gs = GS.IDLE;
        addLog(`--- New Turn (ST +${STAMINA_REGEN_PER_TURN}) ---`, '#7ec8e3');
    }

    // ── Game Loop ──────────────────────────────────────────
    let prev = performance.now();

    function loop(now) {
        const dt = now - prev; prev = now;

        // Update machines
        pMachine.update(dt);
        eMachine.update(dt);

        // ── State transitions ──────────────────────────────

        // Player spin finished
        if (gs === GS.SPINNING && pMachine.spinJustCompleted) {
            pMachine.spinJustCompleted = false;
            if (pMachine.respinUsed) {
                beginPlayerResolve();
            } else {
                gs = GS.PLAYER_DECISION;
            }
        }

        // Player resolve tick
        if (gs === GS.RESOLVING) {
            const r = pMachine.updateResolve(dt);
            if (r && r.type === 'apply') applyPlayerMatch(r.match);
            else if (r === 'done') {
                pMachine.resolveIndex = -1;
                gs = GS.WAITING;
                tickPlayerEffects();
                setTimeout(beginEnemyTurn, 400);
            }
        }

        // Enemy spin finished
        if (gs === GS.ENEMY_SPINNING && eMachine.spinJustCompleted) {
            eMachine.spinJustCompleted = false;
            if (eMachine.respinUsed) {
                // After enemy respin: resolve
                beginEnemyResolve();
            } else {
                // After enemy first spin: AI decision
                enemyDecision();
            }
        }

        // Enemy resolve tick
        if (gs === GS.ENEMY_RESOLVING) {
            const r = eMachine.updateResolve(dt);
            if (r && r.type === 'apply') applyEnemyMatch(r.match);
            else if (r === 'done') {
                eMachine.resolveIndex = -1;
                gs = GS.WAITING;
                tickEnemyEffects();
                setTimeout(endTurn, 400);
            }
        }

        refreshButtons();

        // ── Render ─────────────────────────────────────────
        R.clear();
        R.drawTitle();

        // Player side
        R.drawPortrait(player, PLAYER_PORT_X, PLAYER_PORT_Y, COLOR_PLAYER_ACC, 'player');
        const pStatEnd = R.drawStats(player, PLAYER_PORT_X + PORTRAIT_SIZE + 8, PLAYER_PORT_Y + 4, false, COLOR_PLAYER_ACC);
        R.drawEffects(player, PLAYER_PORT_X, pStatEnd + 2, 220);

        // Enemy side
        R.drawPortrait(enemy, ENEMY_PORT_X, ENEMY_PORT_Y, COLOR_ENEMY_ACC, 'troll');
        const eStatEnd = R.drawStats(enemy, ENEMY_PORT_X - 168, ENEMY_PORT_Y + 4, true, COLOR_ENEMY_ACC);
        R.drawEffects(enemy, ENEMY_PORT_X - 168, eStatEnd + 2, 220);

        // Slot machines
        R.drawMachine(pMachine, PLAYER_GRID_X, PLAYER_GRID_Y, gs === GS.PLAYER_DECISION);
        R.drawMachine(eMachine, ENEMY_GRID_X, ENEMY_GRID_Y, false);

        // Stun indicator on player locks
        if (gs === GS.PLAYER_DECISION && player.hasEffect('STUN')) {
            R.drawStunIndicator(pMachine, PLAYER_GRID_X, PLAYER_GRID_Y);
        }

        // Enemy lock display during enemy decision/spinning
        if (gs === GS.ENEMY_DECISION || (gs === GS.ENEMY_SPINNING && eMachine.firstSpinDone)) {
            // Show enemy lock state visually
        }

        R.drawVS();
        R.drawButtons(buttons);
        R.drawLog(log, 15, 458, CANVAS_W - 30, 244);

        const banners = {
            [GS.IDLE]:            'Press SPIN to start your turn!',
            [GS.SPINNING]:        'Reels spinning\u2026',
            [GS.PLAYER_DECISION]: 'Unlock lines (-5 ST) \u2192 RESPIN, or END TURN to resolve',
            [GS.RESOLVING]:       'Resolving your combos\u2026',
            [GS.ENEMY_SPINNING]:  `${enemy.name} is spinning\u2026`,
            [GS.ENEMY_DECISION]:  `${enemy.name} is thinking\u2026`,
            [GS.ENEMY_RESOLVING]: `Resolving ${enemy.name}'s combos\u2026`,
            [GS.WAITING]:         '\u2026',
        };
        R.drawBanner(banners[gs] || '');

        requestAnimationFrame(loop);
    }

    // ── Start ──────────────────────────────────────────────
    addLog('Welcome to Stamina Reels!', COLOR_GOLD);
    addLog(`${player.name} vs ${enemy.name} \u2014 Press SPIN to begin.`, '#aaa');
    requestAnimationFrame(loop);
})();
