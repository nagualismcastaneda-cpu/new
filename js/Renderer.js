// ── Canvas Renderer (Premium Visual) ──────────────────────

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.W = canvas.width;
        this.H = canvas.height;
        this._t = 0;

        // Preload images
        this.images = {};
        this._loadImg('player', 'img/player.png');
        this._loadImg('troll',  'img/troll.png');
    }

    _loadImg(key, src) {
        const img = new Image();
        img.src = src;
        img.onload = () => { this.images[key] = img; };
    }

    // ── Clear with gradient ──────────────────────────────

    clear() {
        const ctx = this.ctx;
        const grad = ctx.createLinearGradient(0, 0, 0, this.H);
        grad.addColorStop(0, COLOR_BG_GRAD1);
        grad.addColorStop(1, COLOR_BG_GRAD2);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.W, this.H);

        // Subtle vignette
        const vig = ctx.createRadialGradient(this.W/2, this.H/2, this.H*0.3, this.W/2, this.H/2, this.H*0.85);
        vig.addColorStop(0, 'rgba(0,0,0,0)');
        vig.addColorStop(1, 'rgba(0,0,0,0.35)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, this.W, this.H);
    }

    // ── Title ──────────────────────────────────────────────

    drawTitle() {
        const ctx = this.ctx;
        const cx = this.W / 2;
        ctx.save();
        ctx.font = 'bold 24px monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = COLOR_GOLD;
        ctx.shadowBlur = 15;
        ctx.fillStyle = COLOR_GOLD;
        ctx.fillText('\u2694 STAMINA REELS \u2694', cx, 28);
        ctx.shadowBlur = 0;
        ctx.restore();
    }

    // ── Portrait ──────────────────────────────────────────

    drawPortrait(entity, x, y, accentColor, imgKey) {
        const ctx = this.ctx;
        const sz = PORTRAIT_SIZE;

        // Glow ring
        ctx.save();
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = 12;
        ctx.strokeStyle = accentColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x + sz/2, y + sz/2, sz/2 + 2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Clip circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(x + sz/2, y + sz/2, sz/2, 0, Math.PI * 2);
        ctx.clip();

        const img = this.images[imgKey];
        if (img) {
            // Draw loaded image, covering the circle
            const aspect = img.width / img.height;
            let dw = sz, dh = sz;
            if (aspect > 1) { dh = sz; dw = sz * aspect; }
            else { dw = sz; dh = sz / aspect; }
            ctx.drawImage(img, x + (sz - dw)/2, y + (sz - dh)/2, dw, dh);
        } else {
            // Placeholder gradient
            const grad = ctx.createRadialGradient(x+sz/2, y+sz*0.4, sz*0.1, x+sz/2, y+sz/2, sz*0.5);
            grad.addColorStop(0, accentColor);
            grad.addColorStop(1, '#1a1a2e');
            ctx.fillStyle = grad;
            ctx.fillRect(x, y, sz, sz);
            ctx.font = '28px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff';
            ctx.fillText(entity.name[0], x + sz/2, y + sz/2);
        }
        ctx.restore();

        // HP danger flash
        if (entity.hp / entity.maxHP < 0.25) {
            const pulse = Math.sin(performance.now() / 200) * 0.3 + 0.3;
            ctx.save();
            ctx.globalAlpha = pulse;
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(x + sz/2, y + sz/2, sz/2 + 2, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
    }

    // ── Entity Stats ───────────────────────────────────────

    drawStats(entity, x, y, alignRight, accentColor) {
        const ctx = this.ctx;
        const bw = 160; // bar width

        // Name
        ctx.font = 'bold 13px monospace';
        ctx.fillStyle = accentColor;
        if (alignRight) {
            ctx.textAlign = 'right';
            ctx.fillText(entity.name, x + bw, y);
        } else {
            ctx.textAlign = 'left';
            ctx.fillText(entity.name, x, y);
        }
        ctx.textAlign = 'left';

        // HP bar
        y += 16;
        this._drawGradBar(x, y, bw, 13, entity.hp / entity.maxHP,
            COLOR_HP, COLOR_HP_GRAD, `HP ${entity.hp}/${entity.maxHP}`);

        // Stamina bar
        y += 18;
        this._drawGradBar(x, y, bw, 13, entity.stamina / entity.maxStamina,
            COLOR_STAMINA, COLOR_STAMINA_GR, `ST ${entity.stamina}/${entity.maxStamina}`);

        // Stats line
        y += 17;
        ctx.font = '9px monospace';
        ctx.fillStyle = COLOR_TEXT_DIM;
        ctx.fillText(`STR:${entity.str} DEF:${entity.def} INT:${entity.int} LV:${entity.level}${entity.block > 0 ? ' BLK:'+entity.block : ''}`, x, y);

        return y + 4;
    }

    _drawGradBar(x, y, w, h, ratio, c1, c2, label) {
        const ctx = this.ctx;
        ratio = Math.max(0, Math.min(1, ratio));

        // Background
        ctx.fillStyle = '#111';
        this._rr(x, y, w, h, 4); ctx.fill();

        // Filled
        const fw = w * ratio;
        if (fw > 0) {
            const grad = ctx.createLinearGradient(x, y, x + fw, y);
            grad.addColorStop(0, c1);
            grad.addColorStop(1, c2);
            ctx.fillStyle = grad;
            this._rr(x, y, fw, h, 4); ctx.fill();

            // Shine
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            this._rr(x, y, fw, h/2, 4); ctx.fill();
        }

        // Border
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        this._rr(x, y, w, h, 4); ctx.stroke();

        // Label
        ctx.font = 'bold 9px monospace';
        ctx.fillStyle = COLOR_TEXT;
        ctx.textAlign = 'center';
        ctx.fillText(label, x + w/2, y + h - 3);
        ctx.textAlign = 'left';
    }

    // ── Status Effects Display ────────────────────────────

    drawEffects(entity, x, y, maxW) {
        const ctx = this.ctx;
        if (entity.effects.length === 0) return;

        const iconSize = 22;
        const gap = 4;
        let cx = x;

        for (const eff of entity.effects) {
            if (cx + iconSize > x + maxW) break;

            // Badge background
            ctx.save();
            ctx.fillStyle = eff.type === 'buff' ? 'rgba(80,200,80,0.2)' : 'rgba(200,60,60,0.2)';
            ctx.strokeStyle = eff.color;
            ctx.lineWidth = 1.5;
            this._rr(cx, y, iconSize, iconSize, 5);
            ctx.fill(); ctx.stroke();

            // Icon
            ctx.font = '12px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = eff.color;
            ctx.fillText(eff.icon, cx + iconSize/2, y + iconSize/2);

            // Duration badge
            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(cx + iconSize - 2, y + iconSize - 2, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 7px monospace';
            ctx.fillText(eff.turnsLeft, cx + iconSize - 2, y + iconSize - 1);

            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
            ctx.restore();

            cx += iconSize + gap;
        }
    }

    // ── VS Label ───────────────────────────────────────────

    drawVS() {
        const ctx = this.ctx;
        const cx = this.W / 2;
        const cy = PLAYER_GRID_Y + GRID_H / 2;
        ctx.save();
        ctx.font = 'bold 32px monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = COLOR_GOLD;
        ctx.shadowBlur = 12 + 6 * Math.sin(performance.now() / 400);
        ctx.globalAlpha = 0.5 + 0.3 * Math.sin(performance.now() / 400);
        ctx.fillStyle = COLOR_GOLD;
        ctx.fillText('VS', cx, cy);
        ctx.restore();
    }

    // ── Slot Machine ───────────────────────────────────────

    drawMachine(machine, gx, gy, showLocks) {
        const ctx = this.ctx;

        // Panel with glow
        ctx.save();
        const panelAccent = machine.isEnemy ? COLOR_ENEMY_ACC : COLOR_PLAYER_ACC;
        ctx.shadowColor = panelAccent;
        ctx.shadowBlur = 10;
        ctx.fillStyle = COLOR_PANEL;
        ctx.strokeStyle = panelAccent;
        ctx.lineWidth = 2;
        this._rr(gx - 10, gy - 10, GRID_W + 20, GRID_H + 20, 12);
        ctx.fill(); ctx.stroke();
        ctx.restore();

        // Inner metallic border
        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        this._rr(gx - 6, gy - 6, GRID_W + 12, GRID_H + 12, 10);
        ctx.stroke();

        // Label
        ctx.font = 'bold 11px monospace';
        ctx.fillStyle = panelAccent;
        ctx.textAlign = 'center';
        ctx.fillText(machine.isEnemy ? 'ENEMY REELS' : 'YOUR REELS', gx + GRID_W / 2, gy - 16);
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
            if (reel.phase === 'accelerating' || reel.phase === 'spinning' || reel.phase === 'decelerating' || reel.phase === 'landing') {
                this._drawScrollCol(reel, machine, gx, gy, c);
            } else {
                const colX = gx + c * CELL_W + SYMBOL_GAP;
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
                ctx.strokeStyle = 'rgba(60,100,180,0.3)';
                ctx.lineWidth = 1;
                this._rr(cx, cy, SYMBOL_SIZE, SYMBOL_SIZE, 6);
                ctx.stroke();
            }
        }

        // Locked overlay
        if (machine.firstSpinDone) {
            this._drawLockedOverlay(machine, gx, gy);
        }

        // Lock buttons
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
        ctx.beginPath();
        ctx.rect(colX - 1, clipTop - 1, SYMBOL_SIZE + 2, clipH + 2);
        ctx.clip();

        const blur = Math.min(10, reel.blurAmount);
        if (blur > 0.5) ctx.filter = `blur(${blur}px)`;

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
                const cy = gy + r * CELL_H + SYMBOL_GAP;
                this._drawSym(sym, colX, cy, 1.0);
            } else {
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

        // Symbol shadow
        ctx.save();
        ctx.shadowColor = symbol.color;
        ctx.shadowBlur = 6;
        ctx.font = '32px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = symbol.color;
        ctx.fillText(symbol.label, cx, cy);
        ctx.restore();

        ctx.font = '7px monospace';
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.textAlign = 'center';
        ctx.fillText(symbol.id, cx, y + SYMBOL_SIZE - 3);

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

                ctx.fillStyle = COLOR_LOCK_OVERLAY;
                this._rr(cx, cy, SYMBOL_SIZE, SYMBOL_SIZE, 6);
                ctx.fill();

                ctx.strokeStyle = COLOR_LOCK_BORDER;
                ctx.lineWidth = 2;
                this._rr(cx, cy, SYMBOL_SIZE, SYMBOL_SIZE, 6);
                ctx.stroke();

                // X pattern instead of hatch for cleaner look
                ctx.save();
                ctx.beginPath();
                this._rr(cx, cy, SYMBOL_SIZE, SYMBOL_SIZE, 6);
                ctx.clip();
                ctx.strokeStyle = 'rgba(233, 69, 96, 0.12)';
                ctx.lineWidth = 1;
                for (let d = -SYMBOL_SIZE; d < SYMBOL_SIZE * 2; d += 16) {
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
        const lx = gx + GRID_W + 10;

        for (let r = 0; r < ROW_COUNT; r++) {
            const ly = gy + r * CELL_H + SYMBOL_GAP + SYMBOL_SIZE / 2;
            const locked = machine.lockedLines[r];

            // Button background
            ctx.fillStyle = locked ? 'rgba(233,69,96,0.15)' : 'rgba(83,215,105,0.15)';
            this._rr(lx, ly - 14, 36, 32, 6);
            ctx.fill();
            ctx.strokeStyle = locked ? COLOR_LOCK : COLOR_UNLOCK;
            ctx.lineWidth = 1;
            this._rr(lx, ly - 14, 36, 32, 6);
            ctx.stroke();

            ctx.font = '15px serif';
            ctx.textAlign = 'center';

            if (locked) {
                ctx.fillStyle = COLOR_LOCK;
                ctx.fillText('\uD83D\uDD12', lx + 18, ly + 3);
                if (!machine.respinUsed) {
                    ctx.font = '7px monospace';
                    ctx.fillStyle = COLOR_TEXT_DIM;
                    ctx.fillText(`-${STAMINA_UNLOCK_COST}ST`, lx + 18, ly + 15);
                }
            } else {
                ctx.fillStyle = COLOR_UNLOCK;
                ctx.fillText('\uD83D\uDD13', lx + 18, ly + 3);
                ctx.font = '7px monospace';
                ctx.fillStyle = COLOR_UNLOCK;
                ctx.fillText('OPEN', lx + 18, ly + 15);
            }
            ctx.textAlign = 'left';
        }
    }

    // ── Combo Highlight ───────────────────────────────────

    _drawComboHighlight(match, machine, gx, gy) {
        if (!match.cells || match.cells.length === 0) return;
        const ctx = this.ctx;
        const t = performance.now();
        const pulse = Math.sin(t / 150 * Math.PI) * 0.5 + 0.5;

        for (const [r, c] of match.cells) {
            const cx = gx + c * CELL_W + SYMBOL_GAP;
            const cy = gy + r * CELL_H + SYMBOL_GAP;

            // Glow
            ctx.save();
            ctx.fillStyle = `rgba(245, 200, 66, ${0.15 + 0.25 * pulse})`;
            ctx.shadowColor = COLOR_GOLD;
            ctx.shadowBlur = 16 + 12 * pulse;
            this._rr(cx - 4, cy - 4, SYMBOL_SIZE + 8, SYMBOL_SIZE + 8, 8);
            ctx.fill();
            ctx.restore();

            // Gold border
            ctx.save();
            ctx.strokeStyle = COLOR_GOLD;
            ctx.lineWidth = 3;
            ctx.shadowColor = COLOR_GOLD;
            ctx.shadowBlur = 10;
            this._rr(cx - 4, cy - 4, SYMBOL_SIZE + 8, SYMBOL_SIZE + 8, 8);
            ctx.stroke();
            ctx.restore();

            // Redraw cell + symbol
            ctx.fillStyle = COLOR_REEL_BG;
            this._rr(cx, cy, SYMBOL_SIZE, SYMBOL_SIZE, 6);
            ctx.fill();

            const scale = 1.0 + 0.25 * pulse;
            this._drawSym(machine.grid[r][c], cx, cy, scale);
        }
    }

    // ── Buttons ────────────────────────────────────────────

    drawButtons(buttons) {
        const ctx = this.ctx;
        for (const btn of buttons) {
            ctx.save();

            if (btn.disabled) {
                ctx.fillStyle = '#1a1a2a';
                this._rr(btn.x, btn.y, btn.w, btn.h, 8);
                ctx.fill();
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 1;
                this._rr(btn.x, btn.y, btn.w, btn.h, 8);
                ctx.stroke();
            } else {
                // Gradient fill
                const grad = ctx.createLinearGradient(btn.x, btn.y, btn.x, btn.y + btn.h);
                const c = btn.hover ? btn.hoverColor : btn.color;
                grad.addColorStop(0, c);
                grad.addColorStop(1, this._darkenColor(c, 0.5));
                ctx.fillStyle = grad;
                this._rr(btn.x, btn.y, btn.w, btn.h, 8);
                ctx.fill();

                // Glow border
                ctx.shadowColor = COLOR_GOLD;
                ctx.shadowBlur = btn.hover ? 12 : 6;
                ctx.strokeStyle = COLOR_GOLD;
                ctx.lineWidth = 2;
                this._rr(btn.x, btn.y, btn.w, btn.h, 8);
                ctx.stroke();
                ctx.shadowBlur = 0;

                // Shine
                ctx.fillStyle = 'rgba(255,255,255,0.08)';
                this._rr(btn.x, btn.y, btn.w, btn.h/2, 8);
                ctx.fill();
            }

            ctx.font = 'bold 14px monospace';
            ctx.fillStyle = btn.disabled ? '#444' : COLOR_TEXT;
            ctx.textAlign = 'center';
            ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2 + 5);
            ctx.textAlign = 'left';
            ctx.restore();
        }
    }

    // ── Combat Log ─────────────────────────────────────────

    drawLog(log, x, y, w, h) {
        const ctx = this.ctx;

        // Background with gradient
        const grad = ctx.createLinearGradient(x, y, x, y + h);
        grad.addColorStop(0, 'rgba(10,8,20,0.6)');
        grad.addColorStop(1, 'rgba(10,8,20,0.45)');
        ctx.fillStyle = grad;
        this._rr(x, y, w, h, 8); ctx.fill();

        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        this._rr(x, y, w, h, 8); ctx.stroke();

        ctx.font = 'bold 10px monospace';
        ctx.fillStyle = COLOR_GOLD_DIM;
        ctx.fillText('Combat Log', x + 10, y + 14);

        // Separator line
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.beginPath();
        ctx.moveTo(x + 10, y + 20);
        ctx.lineTo(x + w - 10, y + 20);
        ctx.stroke();

        ctx.font = '10px monospace';
        const lh = 14;
        const max = Math.floor((h - 28) / lh);
        const start = Math.max(0, log.length - max);
        for (let i = start; i < log.length; i++) {
            const alpha = 0.4 + 0.6 * ((i - start) / Math.max(1, log.length - start - 1));
            ctx.globalAlpha = Math.max(0.4, alpha);
            ctx.fillStyle = log[i].color || '#ccc';
            ctx.fillText(log[i].text, x + 10, y + 34 + (i - start) * lh);
        }
        ctx.globalAlpha = 1;
    }

    // ── State Banner ───────────────────────────────────────

    drawBanner(text) {
        const ctx = this.ctx;
        ctx.save();
        ctx.font = 'bold 12px monospace';
        ctx.fillStyle = COLOR_GOLD;
        ctx.textAlign = 'center';
        ctx.shadowColor = COLOR_GOLD;
        ctx.shadowBlur = 6;
        ctx.fillText(text, this.W / 2, this.H - 8);
        ctx.restore();
    }

    // ── Stun Indicator on Lock ──────────────────────────────

    drawStunIndicator(machine, gx, gy) {
        const ctx = this.ctx;
        for (let r = 0; r < ROW_COUNT; r++) {
            if (machine.lockedLines[r] && machine.lineHasSkull(r)) {
                const cx = gx + GRID_W + 10;
                const cy = gy + r * CELL_H + SYMBOL_GAP + SYMBOL_SIZE / 2;
                ctx.save();
                ctx.font = '10px serif';
                ctx.textAlign = 'center';
                ctx.fillStyle = '#ffaa00';
                ctx.shadowColor = '#ffaa00';
                ctx.shadowBlur = 6;
                ctx.fillText('\uD83D\uDCAB', cx + 18, cy - 18);
                ctx.restore();
            }
        }
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

    _darkenColor(hex, factor) {
        const r = parseInt(hex.slice(1,3), 16);
        const g = parseInt(hex.slice(3,5), 16);
        const b = parseInt(hex.slice(5,7), 16);
        return `rgb(${Math.round(r*factor)},${Math.round(g*factor)},${Math.round(b*factor)})`;
    }
}
