// ── Main Game ──────────────────────────────────────────────

(function () {
    'use strict';

    const canvas = document.getElementById('gameCanvas');
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;
    const R = new Renderer(canvas);

    // ── Entities ───────────────────────────────────────────
    const player = new Entity('Hero', PLAYER_START_HP, PLAYER_START_STAMINA,
        PLAYER_START_STR, PLAYER_START_DEF, PLAYER_START_INT);
    const enemy  = new Entity('Goblin', 80, 50, 4, 3, 2);

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

    // ── Buttons ────────────────────────────────────────────
    const BCX = CANVAS_W / 2;
    const BY  = 395;
    const buttons = [
        { id: 'spin',    label: 'SPIN',     x: BCX - 165, y: BY, w: 100, h: 36,
          color: '#1a5a1a', hoverColor: '#2a8a2a', disabled: false, hover: false },
        { id: 'respin',  label: 'RESPIN',   x: BCX - 50,  y: BY, w: 100, h: 36,
          color: '#1a3a6a', hoverColor: '#2a5298', disabled: true,  hover: false },
        { id: 'endTurn', label: 'END TURN', x: BCX + 65,  y: BY, w: 100, h: 36,
          color: '#5a1a1a', hoverColor: '#8a2a2a', disabled: true,  hover: false },
    ];

    // Lock click areas (right side of player grid)
    const lockAreas = [];
    for (let r = 0; r < ROW_COUNT; r++) {
        lockAreas.push({
            row: r,
            x: PLAYER_GRID_X + GRID_W + 5,
            y: PLAYER_GRID_Y + r * CELL_H + SYMBOL_GAP - 5,
            w: 38,
            h: SYMBOL_SIZE + 10,
        });
    }

    function refreshButtons() {
        const idle     = gs === GS.IDLE;
        const decision = gs === GS.PLAYER_DECISION;
        const canRespin = decision && !pMachine.respinUsed && pMachine.lockedLines.some(l => !l);

        buttons[0].disabled = !idle;
        buttons[1].disabled = !canRespin;
        buttons[2].disabled = !decision;
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
            pMachine.respin();
            gs = GS.SPINNING;
        }
        if (id === 'endTurn' && gs === GS.PLAYER_DECISION) {
            beginPlayerResolve();
        }
    }

    function onLock(row) {
        const ok = pMachine.toggleLock(row, player);
        if (ok) {
            if (pMachine.lockedLines[row]) {
                addLog(`Line ${row+1} re-locked (+${STAMINA_UNLOCK_COST} ST refund)`, '#aaa');
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
            setTimeout(beginEnemyTurn, 500);
            return;
        }
        gs = GS.RESOLVING;
        addLog('--- Resolving your combos ---', COLOR_GOLD);
    }

    function applyPlayerMatch(m) {
        const s = m.symbol;
        switch (s.id) {
            case 'SWORD': { const d = BASE_PHYS_DMG + player.str; const r = enemy.takeDamage(d, 'physical');
                addLog(`\u2694 Sword x${m.count}: ${d} \u2192 ${r} dmg`, s.color); break; }
            case 'SHIELD': { const b = BASE_BLOCK + player.def; player.addBlock(b);
                addLog(`\uD83D\uDEE1 Shield x${m.count}: +${b} Block`, s.color); break; }
            case 'FIRE': { const d = BASE_MAG_DMG + player.int; const r = enemy.takeDamage(d, 'magical');
                addLog(`\uD83D\uDD25 Fire x${m.count}: ${d} \u2192 ${r} dmg`, s.color); break; }
            case 'HEART': { const h = player.heal(BASE_HEAL); player.purgeDebuffs();
                addLog(`\u2665 Heart x${m.count}: +${h} HP`, s.color); break; }
            case 'BOOK': { player.addExp(BASE_EXP);
                addLog(`\uD83D\uDCD6 Book x${m.count}: +${BASE_EXP} EXP`, s.color); break; }
            case 'SKULL': { const d = 5 * m.count; player.takeDamage(d, 'magical');
                addLog(`\uD83D\uDC80 Skull x${m.count}: -${d} HP!`, s.color); break; }
        }
    }

    // ── Enemy Turn ─────────────────────────────────────────

    function beginEnemyTurn() {
        if (!enemy.isAlive) { addLog(`${enemy.name} defeated!`, COLOR_GOLD); setTimeout(spawnEnemy, 800); return; }
        addLog(`--- ${enemy.name}'s turn ---`, COLOR_LOCK);
        eMachine.spin();
        gs = GS.ENEMY_SPINNING;
    }

    function beginEnemyResolve() {
        const has = eMachine.startResolve();
        if (!has) { addLog(`${enemy.name}: No matches.`, '#888'); gs = GS.WAITING; setTimeout(endTurn, 500); return; }
        gs = GS.ENEMY_RESOLVING;
        addLog('--- Resolving enemy combos ---', COLOR_LOCK);
    }

    function applyEnemyMatch(m) {
        const s = m.symbol;
        switch (s.id) {
            case 'SWORD': { const d = BASE_PHYS_DMG + enemy.str; const r = player.takeDamage(d, 'physical');
                addLog(`\u2694 ${enemy.name} Sword x${m.count}: ${d} \u2192 ${r} dmg`, '#ff6666'); break; }
            case 'SHIELD': { const b = BASE_BLOCK + enemy.def; enemy.addBlock(b);
                addLog(`\uD83D\uDEE1 ${enemy.name} Shield x${m.count}: +${b} Block`, '#6688ff'); break; }
            case 'FIRE': { const d = BASE_MAG_DMG + enemy.int; const r = player.takeDamage(d, 'magical');
                addLog(`\uD83D\uDD25 ${enemy.name} Fire x${m.count}: ${d} \u2192 ${r} dmg`, '#ff6666'); break; }
            case 'HEART': { const h = enemy.heal(BASE_HEAL);
                addLog(`\u2665 ${enemy.name} Heart x${m.count}: +${h} HP`, '#6688ff'); break; }
            case 'BOOK': { addLog(`\uD83D\uDCD6 ${enemy.name} Book: no effect`, '#888'); break; }
            case 'SKULL': { const d = 5 * m.count; enemy.takeDamage(d, 'magical');
                addLog(`\uD83D\uDC80 ${enemy.name} Skull x${m.count}: -${d} HP!`, COLOR_GOLD); break; }
        }
    }

    // ── End Turn / Spawn ───────────────────────────────────

    function spawnEnemy() {
        const lv = player.level;
        const names = ['Goblin','Skeleton','Orc','Dark Mage','Dragon'];
        enemy.name = names[Math.min(lv - 1, names.length - 1)];
        enemy.maxHP = 60 + lv * 20; enemy.hp = enemy.maxHP;
        enemy.maxStamina = 50; enemy.stamina = 50;
        enemy.str = 3 + lv; enemy.def = 2 + lv; enemy.int = 2 + lv;
        enemy.block = 0;
        addLog(`A new foe appears: ${enemy.name}!`, COLOR_LOCK);
        endTurn();
    }

    function endTurn() {
        if (!player.isAlive) {
            addLog('GAME OVER \u2014 Reviving\u2026', '#ff0000');
            player.hp = player.maxHP; player.stamina = player.maxStamina;
        }
        player.block = 0; enemy.block = 0;
        player.regenStamina(STAMINA_REGEN_PER_TURN);
        pMachine.reset(); eMachine.reset();
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
            gs = GS.PLAYER_DECISION;
        }

        // Player resolve tick
        if (gs === GS.RESOLVING) {
            const r = pMachine.updateResolve(dt);
            if (r && r.type === 'apply') applyPlayerMatch(r.match);
            else if (r === 'done') { pMachine.resolveIndex = -1; gs = GS.WAITING; setTimeout(beginEnemyTurn, 400); }
        }

        // Enemy spin finished
        if (gs === GS.ENEMY_SPINNING && eMachine.spinJustCompleted) {
            eMachine.spinJustCompleted = false;
            beginEnemyResolve();
        }

        // Enemy resolve tick
        if (gs === GS.ENEMY_RESOLVING) {
            const r = eMachine.updateResolve(dt);
            if (r && r.type === 'apply') applyEnemyMatch(r.match);
            else if (r === 'done') { eMachine.resolveIndex = -1; gs = GS.WAITING; setTimeout(endTurn, 400); }
        }

        refreshButtons();

        // ── Render ─────────────────────────────────────────
        R.clear();
        R.drawTitle();
        R.drawStats(player, 20, 46, false);
        R.drawStats(enemy, 670, 46, true);
        R.drawMachine(pMachine, PLAYER_GRID_X, PLAYER_GRID_Y, true);
        R.drawMachine(eMachine, ENEMY_GRID_X, ENEMY_GRID_Y, false);
        R.drawVS();
        R.drawButtons(buttons);
        R.drawLog(log, 15, 445, CANVAS_W - 30, 240);

        const banners = {
            [GS.IDLE]:            'Press SPIN to start!',
            [GS.SPINNING]:        'Reels spinning\u2026',
            [GS.PLAYER_DECISION]: pMachine.respinUsed
                                    ? 'Respin used \u2014 END TURN to resolve'
                                    : 'Click \uD83D\uDD12 to unlock (-5 ST) \u2192 RESPIN or END TURN',
            [GS.RESOLVING]:       'Resolving your combos\u2026',
            [GS.ENEMY_SPINNING]:  `${enemy.name} is spinning\u2026`,
            [GS.ENEMY_RESOLVING]: `Resolving ${enemy.name}'s combos\u2026`,
            [GS.WAITING]:         '\u2026',
        };
        R.drawBanner(banners[gs] || '');

        requestAnimationFrame(loop);
    }

    // ── Start ──────────────────────────────────────────────
    addLog('Welcome to Stamina Reels!', COLOR_GOLD);
    addLog('Press SPIN to begin.', '#aaa');
    requestAnimationFrame(loop);
})();
