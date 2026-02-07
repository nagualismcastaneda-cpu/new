// ── Slot Machine Logic ─────────────────────────────────────

class Reel {
    constructor(index) {
        this.index = index;
        this.strip = buildStrip();
        this.position = Math.floor(Math.random() * this.strip.length);
        this.symbols = [null, null, null]; // 3 visible symbols (rows)
        this.spinning = false;
        this.speed = 0;
        this.targetPosition = null;
        this.offsetY = 0;        // sub-symbol pixel offset for animation
        this.blurAmount = 0;
        this.bounceProgress = 0;
        this.isBouncing = false;
        this._updateSymbols();
    }

    _updateSymbols() {
        for (let r = 0; r < ROW_COUNT; r++) {
            this.symbols[r] = this.strip[(this.position + r) % this.strip.length];
        }
    }

    startSpin() {
        this.spinning = true;
        this.speed = 0;
        this.blurAmount = 0;
        this.isBouncing = false;
        this.bounceProgress = 0;
        this.targetPosition = null;
    }

    setStopTarget() {
        // Pick a random target position at least 20 symbols ahead
        const advance = 20 + Math.floor(Math.random() * 30);
        this.targetPosition = (this.position + advance) % this.strip.length;
    }

    update(dt) {
        if (!this.spinning) return;

        if (this.isBouncing) {
            this.bounceProgress += dt / BOUNCE_DURATION;
            if (this.bounceProgress >= 1) {
                this.bounceProgress = 1;
                this.isBouncing = false;
                this.spinning = false;
                this.offsetY = 0;
                this.blurAmount = 0;
            }
            // Bounce: overshoot then settle
            const t = easeOutBack(Math.min(1, this.bounceProgress));
            this.offsetY = (1 - t) * (SYMBOL_SIZE * 0.3);
            this.blurAmount = Math.max(0, (1 - this.bounceProgress) * 4);
            return;
        }

        // Accelerate
        if (this.speed < SPIN_SPEED_MAX) {
            this.speed = Math.min(SPIN_SPEED_MAX, this.speed + SPIN_ACCELERATION);
        }

        this.blurAmount = Math.min(12, this.speed * 0.5);
        this.offsetY += this.speed;

        // Advance symbols when offset exceeds symbol height
        const symbolStep = SYMBOL_SIZE + SYMBOL_GAP;
        while (this.offsetY >= symbolStep) {
            this.offsetY -= symbolStep;
            this.position = (this.position + 1) % this.strip.length;
            this._updateSymbols();

            // Check if we reached target
            if (this.targetPosition !== null && this.position === this.targetPosition) {
                this.offsetY = 0;
                this.isBouncing = true;
                this.bounceProgress = 0;
                this.speed = 0;
                this._updateSymbols();
                return;
            }
        }
    }
}

class SlotMachine {
    constructor() {
        this.reels = [];
        for (let i = 0; i < REEL_COUNT; i++) {
            this.reels.push(new Reel(i));
        }
        this.lockedLines = [false, false, false]; // true = locked (cannot respin)
        this.grid = this._buildGrid();
        this.state = STATE.IDLE;
        this.spinStartTime = 0;
        this.reelsStopped = 0;
        this.matchedLines = [];         // results after evaluation
        this.highlightLine = -1;        // currently highlighted line index
        this.highlightAlpha = 0;
        this.firstSpinDone = false;
    }

    _buildGrid() {
        const grid = [];
        for (let r = 0; r < ROW_COUNT; r++) {
            grid[r] = [];
            for (let c = 0; c < REEL_COUNT; c++) {
                grid[r][c] = this.reels[c].symbols[r];
            }
        }
        return grid;
    }

    spin() {
        if (this.state === STATE.SPINNING) return;
        this.matchedLines = [];
        this.highlightLine = -1;
        this.reelsStopped = 0;
        this.state = STATE.SPINNING;
        this.spinStartTime = performance.now();

        for (let i = 0; i < REEL_COUNT; i++) {
            // On respin, only spin unlocked lines' reels
            // Actually reels are columns, lines are rows.
            // For simplicity: spin all reels but preserve locked row symbols
            this.reels[i].startSpin();
        }

        // Stagger stop targets
        for (let i = 0; i < REEL_COUNT; i++) {
            setTimeout(() => {
                this.reels[i].setStopTarget();
            }, SPIN_MIN_DURATION + i * SPIN_STAGGER_DELAY);
        }
    }

    respin() {
        // Only respin: spin reels but after stopping, restore locked line symbols
        if (this.state !== STATE.PLAYER_DECISION) return;

        // Check if any line is unlocked
        const hasUnlocked = this.lockedLines.some(l => !l);
        if (!hasUnlocked) return;

        // Save locked row symbols
        this._savedRows = {};
        for (let r = 0; r < ROW_COUNT; r++) {
            if (this.lockedLines[r]) {
                this._savedRows[r] = [];
                for (let c = 0; c < REEL_COUNT; c++) {
                    this._savedRows[r][c] = this.grid[r][c];
                }
            }
        }

        this.matchedLines = [];
        this.highlightLine = -1;
        this.reelsStopped = 0;
        this.state = STATE.SPINNING;
        this.spinStartTime = performance.now();

        for (let i = 0; i < REEL_COUNT; i++) {
            this.reels[i].startSpin();
        }
        for (let i = 0; i < REEL_COUNT; i++) {
            setTimeout(() => {
                this.reels[i].setStopTarget();
            }, SPIN_MIN_DURATION + i * SPIN_STAGGER_DELAY);
        }
    }

    update(dt, now) {
        for (const reel of this.reels) {
            reel.update(dt);
        }

        if (this.state === STATE.SPINNING) {
            let allStopped = true;
            for (const reel of this.reels) {
                if (reel.spinning) allStopped = false;
            }
            if (allStopped) {
                this.grid = this._buildGrid();

                // Restore locked rows after respin
                if (this._savedRows) {
                    for (const r in this._savedRows) {
                        for (let c = 0; c < REEL_COUNT; c++) {
                            this.grid[r][c] = this._savedRows[r][c];
                            this.reels[c].symbols[r] = this._savedRows[r][c];
                        }
                    }
                    this._savedRows = null;
                }

                this.state = STATE.LOCKING;
                // Auto-lock all lines
                if (!this.firstSpinDone) {
                    this.lockedLines = [true, true, true];
                    this.firstSpinDone = true;
                } else {
                    // After respin, lock all again
                    this.lockedLines = [true, true, true];
                }
                this.state = STATE.PLAYER_DECISION;
            }
        }
    }

    toggleLock(lineIndex, player) {
        if (this.state !== STATE.PLAYER_DECISION) return false;
        if (lineIndex < 0 || lineIndex >= ROW_COUNT) return false;

        if (this.lockedLines[lineIndex]) {
            // Unlock costs stamina
            if (!player.spendStamina(STAMINA_UNLOCK_COST)) return false;
            this.lockedLines[lineIndex] = false;
            return true;
        } else {
            // Re-lock is free
            this.lockedLines[lineIndex] = true;
            return true;
        }
        return false;
    }

    calculateLines() {
        const lines = [];

        // 3 horizontal lines
        for (let r = 0; r < ROW_COUNT; r++) {
            const row = [this.grid[r][0], this.grid[r][1], this.grid[r][2]];
            const match = this._evaluateLine(row);
            if (match) {
                match.type = 'horizontal';
                match.row = r;
                match.cells = [[r, 0], [r, 1], [r, 2]];
                lines.push(match);
            }
        }

        // 2 diagonals
        const diag1 = [this.grid[0][0], this.grid[1][1], this.grid[2][2]];
        const m1 = this._evaluateLine(diag1);
        if (m1) {
            m1.type = 'diagonal';
            m1.cells = [[0, 0], [1, 1], [2, 2]];
            lines.push(m1);
        }

        const diag2 = [this.grid[2][0], this.grid[1][1], this.grid[0][2]];
        const m2 = this._evaluateLine(diag2);
        if (m2) {
            m2.type = 'diagonal';
            m2.cells = [[2, 0], [1, 1], [0, 2]];
            lines.push(m2);
        }

        // Skull special: check entire grid for any skull
        let skullCount = 0;
        for (let r = 0; r < ROW_COUNT; r++) {
            for (let c = 0; c < REEL_COUNT; c++) {
                if (this.grid[r][c].id === 'SKULL') skullCount++;
            }
        }
        if (skullCount > 0) {
            lines.push({ symbol: SYMBOLS.SKULL, count: skullCount, type: 'skull_special', cells: [] });
        }

        this.matchedLines = lines;
        return lines;
    }

    _evaluateLine(symbols) {
        // Check for 3-of-a-kind (with Wild substitution)
        if (symbolsMatch(symbols[0], symbols[1]) && symbolsMatch(symbols[1], symbols[2]) && symbolsMatch(symbols[0], symbols[2])) {
            const eff = effectiveSymbol(symbols);
            if (eff.id === 'SKULL') return null; // Skull handled separately
            return { symbol: eff, count: 3 };
        }
        return null;
    }

    reset() {
        this.lockedLines = [false, false, false];
        this.matchedLines = [];
        this.highlightLine = -1;
        this.firstSpinDone = false;
        this.state = STATE.IDLE;
    }
}
