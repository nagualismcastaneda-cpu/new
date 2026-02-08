// ── Canvas Renderer ────────────────────────────────────────

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.W = canvas.width;
        this.H = canvas.height;
    }

    clear() {
        this.ctx.fillStyle = COLOR_BG;
        this.ctx.fillRect(0, 0, this.W, this.H);
    }

    // ── Title ──────────────────────────────────────────────

    drawTitle() {
        const ctx = this.ctx;
        ctx.font = 'bold 22px monospace';
        ctx.fillStyle = COLOR_GOLD;
        ctx.textAlign = 'center';
        ctx.fillText('\u2694 STAMINA REELS \u2694', this.W / 2, 30);
        ctx.textAlign = 'left';
    }

    // ── Entity Stats ───────────────────────────────────────

    drawStats(entity, x, y, alignRight) {
        const ctx = this.ctx;
        const isEnemy = alignRight;

        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = isEnemy ? COLOR_LOCK : COLOR_GOLD;
        if (isEnemy) {
            ctx.textAlign = 'right';
            ctx.fillText(`${entity.name} \uD83D\uDC79`, x + 200, y);
            ctx.textAlign = 'left';
        } else {
            ctx.fillText(`\u2666 ${entity.name}`, x, y);
        }

        y += 20;
        ctx.font = '12px monospace';
        ctx.fillStyle = COLOR_TEXT;
        ctx.fillText('HP:', x, y);
        this._drawBar(x + 28, y - 10, 170, 14, entity.hp / entity.maxHP, COLOR_HP,
            `${entity.hp}/${entity.maxHP}`);

        y += 20;
        ctx.fillText('ST:', x, y);
        this._drawBar(x + 28, y - 10, 170, 14, entity.stamina / entity.maxStamina, COLOR_STAMINA,
            `${entity.stamina}/${entity.maxStamina}`);

        y += 16;
        ctx.font = '10px monospace';
        ctx.fillStyle = '#888';
        ctx.fillText(`STR:${entity.str} DEF:${entity.def} INT:${entity.int} LVL:${entity.level} BLK:${entity.block}`, x, y);
    }

    _drawBar(x, y, w, h, ratio, color, label) {
        const ctx = this.ctx;
        ctx.fillStyle = '#222';
        this._rr(x, y, w, h, 3); ctx.fill();
        const fw = w * Math.max(0, Math.min(1, ratio));
        if (fw > 0) { ctx.fillStyle = color; this._rr(x, y, fw, h, 3); ctx.fill(); }
        ctx.strokeStyle = '#444'; ctx.lineWidth = 1;
        this._rr(x, y, w, h, 3); ctx.stroke();
        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = COLOR_TEXT;
        ctx.textAlign = 'center';
        ctx.fillText(label, x + w / 2, y + h - 3);
        ctx.textAlign = 'left';
    }

    // ── VS Label ───────────────────────────────────────────

    drawVS() {
        const ctx = this.ctx;
        const cx = this.W / 2;
        const cy = PLAYER_GRID_Y + GRID_H / 2;
        ctx.font = 'bold 30px monospace';
        ctx.fillStyle = COLOR_GOLD;
        ctx.textAlign = 'center';
        ctx.globalAlpha = 0.5 + 0.25 * Math.sin(performance.now() / 400);
        ctx.fillText('VS', cx, cy);
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
    }

    // ── Slot Machine ───────────────────────────────────────

    drawMachine(machine, gx, gy, showLocks) {
        const ctx = this.ctx;

        // Panel
        ctx.fillStyle = COLOR_PANEL;
        ctx.strokeStyle = machine.isEnemy ? COLOR_LOCK : COLOR_GOLD;
        ctx.lineWidth = 2;
        this._rr(gx - 8, gy - 8, GRID_W + 16, GRID_H + 16, 10);
        ctx.fill(); ctx.stroke();

        // Label
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = machine.isEnemy ? COLOR_LOCK : COLOR_GOLD;
        ctx.textAlign = 'center';
        ctx.fillText(machine.isEnemy ? 'ENEMY REELS' : 'YOUR REELS', gx + GRID_W / 2, gy - 14);
        ctx.textAlign = 'left';

        // Cell backgrounds
        for (let r = 0; r < ROW_COUNT; r++) {
            for (let c = 0; c < REEL_COUNT; c++) {
                const cx = gx + c * CELL_W + SYMBOL_GAP;
                const cy = gy + r * CELL_H + SYMBOL_GAP;
                ctx.fillStyle = COLOR_REEL_BG;
                this._rr(cx, cy, SYMBOL_SIZE, SYMBOL_SIZE, 6);
                ctx.fill();
            }
        }

        // Symbols per column
        for (let c = 0; c < REEL_COUNT; c++) {
            const reel = machine.reels[c];
            const colX = gx + c * CELL_W + SYMBOL_GAP;

            if (reel.phase === 'accelerating' || reel.phase === 'spinning' || reel.phase === 'decelerating') {
                this._drawScrollCol(reel, machine, gx, gy, c);
            } else if (reel.phase === 'bouncing') {
                this._drawBounceCol(reel, machine, gx, gy, c);
            } else {
                // Idle / stopped — draw from grid (stable)
                for (let r = 0; r < ROW_COUNT; r++) {
                    const cy = gy + r * CELL_H + SYMBOL_GAP;
                    this._drawSym(machine.grid[r][c], colX, cy, 1.0);
                }
            }
        }

        // Cell borders
        for (let r = 0; r < ROW_COUNT; r++) {
            for (let c = 0; c < REEL_COUNT; c++) {
                const cx = gx + c * CELL_W + SYMBOL_GAP;
                const cy = gy + r * CELL_H + SYMBOL_GAP;
                ctx.strokeStyle = '#2a4a7f'; ctx.lineWidth = 1;
                this._rr(cx, cy, SYMBOL_SIZE, SYMBOL_SIZE, 6);
                ctx.stroke();
            }
        }

        // Locked overlay
        if (machine.firstSpinDone) {
            this._drawLockedOverlay(machine, gx, gy);
        }

        // Lock buttons (player only)
        if (showLocks) {
            this._drawLockBtns(machine, gx, gy);
        }

        // Highlight current combo
        const hl = machine.getCurrentHighlight();
        if (hl) this._drawComboHighlight(hl, machine, gx, gy);
    }

    // ── Scrolling Column ───────────────────────────────────

    _drawScrollCol(reel, machine, gx, gy, c) {
        const ctx = this.ctx;
        const colX = gx + c * CELL_W + SYMBOL_GAP;
        const clipTop = gy + SYMBOL_GAP;
        const clipH = ROW_COUNT * CELL_H - SYMBOL_GAP;

        ctx.save();
        // Clip to column
        ctx.beginPath();
        ctx.rect(colX - 1, clipTop - 1, SYMBOL_SIZE + 2, clipH + 2);
        ctx.clip();

        // Blur
        const blur = Math.min(10, reel.blurAmount);
        if (blur > 0.5) ctx.filter = `blur(${blur}px)`;

        // Draw strip symbols scrolling through
        const step = CELL_H;
        for (let r = -1; r <= ROW_COUNT; r++) {
            const idx = ((reel.position + r) % reel.strip.length + reel.strip.length) % reel.strip.length;
            const sym = reel.strip[idx];
            const drawY = clipTop + r * step + reel.offsetY;
            if (drawY + SYMBOL_SIZE > clipTop - step && drawY < clipTop + clipH + step) {
                this._drawSym(sym, colX, drawY, 1.0);
            }
        }
        ctx.restore();

        // Overdraw locked rows during respin
        if (machine._savedRows) {
            for (let r = 0; r < ROW_COUNT; r++) {
                if (machine._savedRows[r]) {
                    const cy = gy + r * CELL_H + SYMBOL_GAP;
                    ctx.fillStyle = COLOR_REEL_BG;
                    this._rr(colX, cy, SYMBOL_SIZE, SYMBOL_SIZE, 6);
                    ctx.fill();
                    this._drawSym(machine._savedRows[r][c], colX, cy, 1.0);
                }
            }
        }
    }

    // ── Bouncing Column ────────────────────────────────────

    _drawBounceCol(reel, machine, gx, gy, c) {
        const ctx = this.ctx;
        const colX = gx + c * CELL_W + SYMBOL_GAP;

        for (let r = 0; r < ROW_COUNT; r++) {
            const isLockedRow = machine._savedRows && machine._savedRows[r];
            const sym = isLockedRow ? machine._savedRows[r][c] : reel.symbols[r];

            if (isLockedRow) {
                // Locked rows: no bounce, no blur
                const cy = gy + r * CELL_H + SYMBOL_GAP;
                this._drawSym(sym, colX, cy, 1.0);
            } else {
                // Unlocked rows: apply bounce and blur
                ctx.save();
                if (reel.blurAmount > 0.3) ctx.filter = `blur(${reel.blurAmount}px)`;
                const cy = gy + r * CELL_H + SYMBOL_GAP + reel.bounceOffsetY;
                this._drawSym(sym, colX, cy, 1.0);
                ctx.restore();
            }
        }
    }

    // ── Symbol ─────────────────────────────────────────────

    _drawSym(symbol, x, y, scale) {
        if (!symbol) return;
        const ctx = this.ctx;
        const cx = x + SYMBOL_SIZE / 2;
        const cy = y + SYMBOL_SIZE / 2;

        if (scale !== 1.0) {
            ctx.save();
            ctx.translate(cx, cy);
            ctx.scale(scale, scale);
            ctx.translate(-cx, -cy);
        }

        ctx.font = '30px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = symbol.color;
        ctx.fillText(symbol.label, cx, cy);

        ctx.font = '8px monospace';
        ctx.fillStyle = '#555';
        ctx.fillText(symbol.id, cx, y + SYMBOL_SIZE - 4);

        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        if (scale !== 1.0) ctx.restore();
    }

    // ── Locked Overlay ─────────────────────────────────────

    _drawLockedOverlay(machine, gx, gy) {
        const ctx = this.ctx;
        for (let r = 0; r < ROW_COUNT; r++) {
            if (!machine.lockedLines[r]) continue;
            for (let c = 0; c < REEL_COUNT; c++) {
                const cx = gx + c * CELL_W + SYMBOL_GAP;
                const cy = gy + r * CELL_H + SYMBOL_GAP;

                // Dark tint
                ctx.fillStyle = COLOR_LOCK_OVERLAY;
                this._rr(cx, cy, SYMBOL_SIZE, SYMBOL_SIZE, 6);
                ctx.fill();

                // Red border
                ctx.strokeStyle = COLOR_LOCK_BORDER;
                ctx.lineWidth = 2;
                this._rr(cx, cy, SYMBOL_SIZE, SYMBOL_SIZE, 6);
                ctx.stroke();

                // Diagonal hatch
                ctx.save();
                ctx.beginPath();
                this._rr(cx, cy, SYMBOL_SIZE, SYMBOL_SIZE, 6);
                ctx.clip();
                ctx.strokeStyle = 'rgba(233, 69, 96, 0.08)';
                ctx.lineWidth = 1;
                for (let d = -SYMBOL_SIZE; d < SYMBOL_SIZE * 2; d += 14) {
                    ctx.beginPath();
                    ctx.moveTo(cx + d, cy);
                    ctx.lineTo(cx + d + SYMBOL_SIZE, cy + SYMBOL_SIZE);
                    ctx.stroke();
                }
                ctx.restore();
            }
        }
    }

    // ── Lock Buttons ───────────────────────────────────────

    _drawLockBtns(machine, gx, gy) {
        const ctx = this.ctx;
        const lx = gx + GRID_W + 8;

        for (let r = 0; r < ROW_COUNT; r++) {
            const ly = gy + r * CELL_H + SYMBOL_GAP + SYMBOL_SIZE / 2;
            const locked = machine.lockedLines[r];

            ctx.font = '16px serif';
            ctx.textAlign = 'center';

            if (locked) {
                ctx.fillStyle = COLOR_LOCK;
                ctx.fillText('\uD83D\uDD12', lx + 15, ly + 2);
                if (!machine.respinUsed) {
                    ctx.font = '8px monospace';
                    ctx.fillStyle = '#777';
                    ctx.fillText(`-${STAMINA_UNLOCK_COST}ST`, lx + 15, ly + 16);
                }
            } else {
                ctx.fillStyle = COLOR_UNLOCK;
                ctx.fillText('\uD83D\uDD13', lx + 15, ly + 2);
                ctx.font = '8px monospace';
                ctx.fillStyle = COLOR_UNLOCK;
                ctx.fillText('OPEN', lx + 15, ly + 16);
            }
            ctx.textAlign = 'left';
        }
    }

    // ── Combo Highlight (sequential, with scale) ───────────

    _drawComboHighlight(match, machine, gx, gy) {
        if (!match.cells || match.cells.length === 0) return;
        const ctx = this.ctx;
        const t = performance.now();
        const pulse = Math.sin(t / 150 * Math.PI) * 0.5 + 0.5;

        for (const [r, c] of match.cells) {
            const cx = gx + c * CELL_W + SYMBOL_GAP;
            const cy = gy + r * CELL_H + SYMBOL_GAP;

            // Glow background
            ctx.save();
            ctx.fillStyle = `rgba(245, 200, 66, ${0.18 + 0.22 * pulse})`;
            ctx.shadowColor = COLOR_GOLD;
            ctx.shadowBlur = 14 + 10 * pulse;
            this._rr(cx - 3, cy - 3, SYMBOL_SIZE + 6, SYMBOL_SIZE + 6, 8);
            ctx.fill();
            ctx.restore();

            // Gold border
            ctx.save();
            ctx.strokeStyle = COLOR_GOLD;
            ctx.lineWidth = 3;
            ctx.shadowColor = COLOR_GOLD;
            ctx.shadowBlur = 8;
            this._rr(cx - 3, cy - 3, SYMBOL_SIZE + 6, SYMBOL_SIZE + 6, 8);
            ctx.stroke();
            ctx.restore();

            // Re-draw cell bg + symbol scaled up
            ctx.fillStyle = COLOR_REEL_BG;
            this._rr(cx, cy, SYMBOL_SIZE, SYMBOL_SIZE, 6);
            ctx.fill();

            const scale = 1.0 + 0.22 * pulse;
            this._drawSym(machine.grid[r][c], cx, cy, scale);
        }
    }

    // ── Buttons ────────────────────────────────────────────

    drawButtons(buttons) {
        const ctx = this.ctx;
        for (const btn of buttons) {
            ctx.save();
            ctx.fillStyle = btn.disabled ? '#2a2a2a' : (btn.hover ? btn.hoverColor : btn.color);
            this._rr(btn.x, btn.y, btn.w, btn.h, 6);
            ctx.fill();
            ctx.strokeStyle = btn.disabled ? '#444' : COLOR_GOLD;
            ctx.lineWidth = btn.disabled ? 1 : 2;
            this._rr(btn.x, btn.y, btn.w, btn.h, 6);
            ctx.stroke();
            ctx.font = 'bold 13px monospace';
            ctx.fillStyle = btn.disabled ? '#555' : COLOR_TEXT;
            ctx.textAlign = 'center';
            ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 5);
            ctx.textAlign = 'left';
            ctx.restore();
        }
    }

    // ── Combat Log ─────────────────────────────────────────

    drawLog(log, x, y, w, h) {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        this._rr(x, y, w, h, 6); ctx.fill();
        ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
        this._rr(x, y, w, h, 6); ctx.stroke();

        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = '#666';
        ctx.fillText('Combat Log', x + 8, y + 14);

        ctx.font = '10px monospace';
        const lh = 14;
        const max = Math.floor((h - 22) / lh);
        const start = Math.max(0, log.length - max);
        for (let i = start; i < log.length; i++) {
            ctx.fillStyle = log[i].color || '#ccc';
            ctx.fillText(log[i].text, x + 8, y + 28 + (i - start) * lh);
        }
    }

    // ── State Banner ───────────────────────────────────────

    drawBanner(text) {
        const ctx = this.ctx;
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = COLOR_GOLD;
        ctx.textAlign = 'center';
        ctx.fillText(text, this.W / 2, this.H - 8);
        ctx.textAlign = 'left';
    }

    // ── Helpers ─────────────────────────────────────────────

    _rr(x, y, w, h, r) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
}
