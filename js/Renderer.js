// ── Canvas Renderer ────────────────────────────────────────

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
    }

    clear() {
        this.ctx.fillStyle = COLOR_BG;
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    // ── Stats HUD ──────────────────────────────────────────

    drawPlayerStats(player) {
        const ctx = this.ctx;
        const x = 20;
        let y = 25;

        // Title
        ctx.font = 'bold 18px monospace';
        ctx.fillStyle = COLOR_GOLD;
        ctx.fillText(`⚔ STAMINA REELS ⚔`, x, y);
        y += 30;

        // HP bar
        ctx.font = '14px monospace';
        ctx.fillStyle = COLOR_TEXT;
        ctx.fillText('HP:', x, y);
        this._drawBar(x + 35, y - 11, 200, 16, player.hp / player.maxHP, COLOR_HP, `${player.hp}/${player.maxHP}`);
        y += 24;

        // Stamina bar
        ctx.fillStyle = COLOR_TEXT;
        ctx.fillText('ST:', x, y);
        this._drawBar(x + 35, y - 11, 200, 16, player.stamina / player.maxStamina, COLOR_STAMINA, `${player.stamina}/${player.maxStamina}`);
        y += 24;

        // Stats line
        ctx.font = '12px monospace';
        ctx.fillStyle = '#aaa';
        ctx.fillText(`STR:${player.str}  DEF:${player.def}  INT:${player.int}  LVL:${player.level}  EXP:${player.exp}  BLK:${player.block}`, x, y);
    }

    _drawBar(x, y, w, h, ratio, color, label) {
        const ctx = this.ctx;
        // Background
        ctx.fillStyle = '#333';
        ctx.fillRect(x, y, w, h);
        // Fill
        ctx.fillStyle = color;
        ctx.fillRect(x, y, w * Math.max(0, Math.min(1, ratio)), h);
        // Border
        ctx.strokeStyle = '#555';
        ctx.strokeRect(x, y, w, h);
        // Label
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = COLOR_TEXT;
        ctx.textAlign = 'center';
        ctx.fillText(label, x + w / 2, y + h - 3);
        ctx.textAlign = 'left';
    }

    // ── Slot Grid ──────────────────────────────────────────

    drawSlotMachine(machine) {
        const ctx = this.ctx;
        const ox = GRID_OFFSET_X;
        const oy = GRID_OFFSET_Y;
        const cellW = SYMBOL_SIZE + SYMBOL_GAP * 2;
        const cellH = SYMBOL_SIZE + SYMBOL_GAP;
        const totalW = cellW * REEL_COUNT + SYMBOL_GAP;
        const totalH = cellH * ROW_COUNT + SYMBOL_GAP;

        // Machine background
        ctx.fillStyle = COLOR_PANEL;
        ctx.strokeStyle = COLOR_GOLD;
        ctx.lineWidth = 2;
        this._roundRect(ox - 10, oy - 10, totalW + 20, totalH + 20, 12);
        ctx.fill();
        ctx.stroke();

        // Draw each cell
        for (let r = 0; r < ROW_COUNT; r++) {
            for (let c = 0; c < REEL_COUNT; c++) {
                const cx = ox + c * cellW + SYMBOL_GAP;
                const cy = oy + r * cellH + SYMBOL_GAP;

                // Cell background
                ctx.fillStyle = COLOR_REEL_BG;
                this._roundRect(cx, cy, SYMBOL_SIZE, SYMBOL_SIZE, 8);
                ctx.fill();

                // If spinning, draw with blur effect
                const reel = machine.reels[c];
                if (reel.spinning && !reel.isBouncing) {
                    ctx.save();
                    ctx.filter = `blur(${Math.min(8, reel.blurAmount)}px)`;
                    this._drawSymbol(reel.symbols[r], cx, cy + reel.offsetY % (SYMBOL_SIZE * 0.3));
                    ctx.restore();
                } else if (reel.spinning && reel.isBouncing) {
                    ctx.save();
                    ctx.filter = `blur(${reel.blurAmount}px)`;
                    this._drawSymbol(reel.symbols[r], cx, cy + reel.offsetY);
                    ctx.restore();
                } else {
                    this._drawSymbol(machine.grid[r][c], cx, cy);
                }

                // Cell border
                ctx.strokeStyle = '#2a4a7f';
                ctx.lineWidth = 1;
                this._roundRect(cx, cy, SYMBOL_SIZE, SYMBOL_SIZE, 8);
                ctx.stroke();
            }
        }

        // Draw lock indicators
        this._drawLockIndicators(machine, ox, oy, cellW, cellH, totalW);

        // Draw highlighted matched lines
        this._drawMatchHighlights(machine, ox, oy, cellW, cellH);
    }

    _drawSymbol(symbol, x, y) {
        if (!symbol) return;
        const ctx = this.ctx;
        const centerX = x + SYMBOL_SIZE / 2;
        const centerY = y + SYMBOL_SIZE / 2;

        ctx.font = '36px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = symbol.color;
        ctx.fillText(symbol.label, centerX, centerY);

        // Small ID label
        ctx.font = '9px monospace';
        ctx.fillStyle = '#888';
        ctx.fillText(symbol.id, centerX, y + SYMBOL_SIZE - 6);

        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    _drawLockIndicators(machine, ox, oy, cellW, cellH, totalW) {
        const ctx = this.ctx;
        const lockX = ox + totalW + 5;

        for (let r = 0; r < ROW_COUNT; r++) {
            const ly = oy + r * cellH + SYMBOL_GAP + SYMBOL_SIZE / 2;
            const locked = machine.lockedLines[r];

            // Lock icon
            ctx.font = 'bold 13px monospace';
            ctx.textAlign = 'center';

            if (locked) {
                ctx.fillStyle = COLOR_LOCK;
                ctx.fillText('🔒', lockX + 15, ly - 6);
                ctx.font = '9px monospace';
                ctx.fillStyle = '#999';
                ctx.fillText(`-${STAMINA_UNLOCK_COST}ST`, lockX + 15, ly + 10);
            } else {
                ctx.fillStyle = COLOR_UNLOCK;
                ctx.fillText('🔓', lockX + 15, ly - 6);
                ctx.font = '9px monospace';
                ctx.fillStyle = COLOR_UNLOCK;
                ctx.fillText('OPEN', lockX + 15, ly + 10);
            }
            ctx.textAlign = 'left';
        }
    }

    _drawMatchHighlights(machine, ox, oy, cellW, cellH) {
        if (!machine.matchedLines || machine.matchedLines.length === 0) return;
        const ctx = this.ctx;

        for (const match of machine.matchedLines) {
            if (!match.cells || match.cells.length === 0) continue;
            ctx.save();
            ctx.strokeStyle = match.symbol.color || COLOR_GOLD;
            ctx.lineWidth = 3;
            ctx.shadowColor = match.symbol.color || COLOR_GOLD;
            ctx.shadowBlur = 10;
            ctx.globalAlpha = 0.6 + 0.4 * Math.sin(performance.now() / 200);

            for (const [r, c] of match.cells) {
                const cx = ox + c * cellW + SYMBOL_GAP;
                const cy = oy + r * cellH + SYMBOL_GAP;
                this._roundRect(cx - 2, cy - 2, SYMBOL_SIZE + 4, SYMBOL_SIZE + 4, 10);
                ctx.stroke();
            }
            ctx.restore();
        }
    }

    // ── Buttons ────────────────────────────────────────────

    drawButtons(buttons) {
        const ctx = this.ctx;
        for (const btn of buttons) {
            ctx.save();
            // Background
            ctx.fillStyle = btn.disabled ? '#333' : (btn.hover ? btn.hoverColor || '#2a5298' : btn.color || '#1a3a6a');
            this._roundRect(btn.x, btn.y, btn.w, btn.h, 8);
            ctx.fill();
            // Border
            ctx.strokeStyle = btn.disabled ? '#555' : COLOR_GOLD;
            ctx.lineWidth = btn.disabled ? 1 : 2;
            this._roundRect(btn.x, btn.y, btn.w, btn.h, 8);
            ctx.stroke();
            // Label
            ctx.font = 'bold 14px monospace';
            ctx.fillStyle = btn.disabled ? '#666' : COLOR_TEXT;
            ctx.textAlign = 'center';
            ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 5);
            ctx.textAlign = 'left';
            ctx.restore();
        }
    }

    // ── Combat Log ─────────────────────────────────────────

    drawLog(log, x, y, w, h) {
        const ctx = this.ctx;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        this._roundRect(x, y, w, h, 8);
        ctx.fill();
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 1;
        this._roundRect(x, y, w, h, 8);
        ctx.stroke();

        ctx.font = '11px monospace';
        ctx.fillStyle = '#999';
        ctx.fillText('Combat Log:', x + 8, y + 16);

        ctx.font = '11px monospace';
        const maxLines = Math.floor((h - 30) / 15);
        const startIdx = Math.max(0, log.length - maxLines);
        for (let i = startIdx; i < log.length; i++) {
            const entry = log[i];
            ctx.fillStyle = entry.color || '#ccc';
            ctx.fillText(entry.text, x + 8, y + 32 + (i - startIdx) * 15);
        }
    }

    // ── State Banner ───────────────────────────────────────

    drawStateBanner(text) {
        const ctx = this.ctx;
        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = COLOR_GOLD;
        ctx.textAlign = 'center';
        ctx.fillText(text, this.width / 2, this.height - 12);
        ctx.textAlign = 'left';
    }

    // ── Enemy Stats ────────────────────────────────────────

    drawEnemyStats(enemy, x, y) {
        const ctx = this.ctx;
        ctx.font = 'bold 14px monospace';
        ctx.fillStyle = COLOR_LOCK;
        ctx.fillText(`👹 ${enemy.name}`, x, y);

        ctx.font = '12px monospace';
        ctx.fillStyle = COLOR_TEXT;
        ctx.fillText(`HP:`, x, y + 20);
        this._drawBar(x + 30, y + 9, 160, 14, enemy.hp / enemy.maxHP, COLOR_HP, `${enemy.hp}/${enemy.maxHP}`);
    }

    // ── Helpers ─────────────────────────────────────────────

    _roundRect(x, y, w, h, r) {
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
