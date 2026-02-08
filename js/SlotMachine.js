// ── Reel (single vertical column) ──────────────────────────

class Reel {
    constructor(index) {
        this.index = index;
        this.strip = buildStrip();
        this.position = Math.floor(Math.random() * this.strip.length);
        this.symbols = [null, null, null];
        this.phase = 'idle';
        this.speed = 0;
        this.offsetY = 0;
        this.blurAmount = 0;
        this.bounceOffsetY = 0;
        this.phaseTime = 0;
        this.decelStartSpeed = 0;
        this._updateSymbols();
    }

    _updateSymbols() {
        const len = this.strip.length;
        for (let r = 0; r < ROW_COUNT; r++) {
            this.symbols[r] = this.strip[((this.position + r) % len + len) % len];
        }
    }

    startSpin() {
        this.phase = 'accelerating';
        this.speed = 0;
        this.phaseTime = 0;
        this.blurAmount = 0;
        this.bounceOffsetY = 0;
        this.offsetY = 0;
    }

    beginStop() {
        if (this.phase === 'spinning' || this.phase === 'accelerating') {
            this.phase = 'decelerating';
            this.phaseTime = 0;
            this.decelStartSpeed = this.speed;
        }
    }

    get isStopped() {
        return this.phase === 'stopped' || this.phase === 'idle';
    }

    update(dt) {
        if (this.phase === 'idle' || this.phase === 'stopped') return;

        this.phaseTime += dt;
        const dtN = dt / 16.667;

        switch (this.phase) {
            case 'accelerating': {
                this.speed = Math.min(SPIN_SPEED_MAX, this.speed + SPIN_ACCELERATION * dtN);
                this._advanceStrip(dtN);
                this.blurAmount = this.speed * 0.35;
                if (this.speed >= SPIN_SPEED_MAX) {
                    this.phase = 'spinning';
                    this.phaseTime = 0;
                }
                break;
            }
            case 'spinning': {
                this.speed = SPIN_SPEED_MAX;
                this._advanceStrip(dtN);
                this.blurAmount = SPIN_SPEED_MAX * 0.35;
                break;
            }
            case 'decelerating': {
                const p = Math.min(1, this.phaseTime / DECEL_DURATION);
                this.speed = this.decelStartSpeed * (1 - easeOutCubic(p));
                this._advanceStrip(dtN);
                this.blurAmount = Math.max(0, this.speed * 0.35);
                if (p >= 1) {
                    this.speed = 0;
                    this.blurAmount = 0;
                    // Smooth landing: advance to next grid position instead of snapping
                    this._landingStartOffset = this.offsetY;
                    this._landingAdvanced = false;
                    this.phase = 'landing';
                    this.phaseTime = 0;
                }
                break;
            }
            case 'landing': {
                // Smoothly scroll forward to next grid-aligned position
                const LAND_DURATION = 200;
                const p = Math.min(1, this.phaseTime / LAND_DURATION);
                const eased = easeOutCubic(p);
                const remaining = CELL_H - this._landingStartOffset;
                const rawOffset = this._landingStartOffset + remaining * eased;

                if (rawOffset >= CELL_H && !this._landingAdvanced) {
                    this._landingAdvanced = true;
                    this.position = (this.position + 1) % this.strip.length;
                    this._updateSymbols();
                }
                this.offsetY = this._landingAdvanced ? rawOffset - CELL_H : rawOffset;
                this.blurAmount = 0;
                this.bounceOffsetY = 0;

                if (p >= 1) {
                    this.offsetY = 0;
                    this._updateSymbols();
                    this.phase = 'stopped';
                }
                break;
            }
        }
    }

    _advanceStrip(dtN) {
        this.offsetY += this.speed * dtN;
        const step = CELL_H;
        while (this.offsetY >= step) {
            this.offsetY -= step;
            this.position = (this.position + 1) % this.strip.length;
            this._updateSymbols();
        }
    }
}

// ── Slot Machine ───────────────────────────────────────────

class SlotMachine {
    constructor(isEnemy) {
        this.isEnemy = !!isEnemy;
        this.reels = [];
        for (let i = 0; i < REEL_COUNT; i++) {
            this.reels.push(new Reel(i));
        }
        this.lockedLines = [false, false, false];
        this.grid = this._buildGrid();

        // Spin sequencing
        this.spinning = false;
        this.spinJustCompleted = false;
        this.spinTimer = 0;
        this.nextReelToStop = 0;

        // Respin
        this.respinUsed = false;
        this.firstSpinDone = false;
        this._savedRows = null;

        // Resolve
        this.matchedLines = [];
        this.resolveIndex = -1;
        this.resolveTimer = 0;
        this.resolvePhase = '';
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

    // ── Spin ───────────────────────────────────────────────

    spin() {
        if (this.spinning) return;
        this.matchedLines = [];
        this.resolveIndex = -1;
        this.spinJustCompleted = false;

        for (const reel of this.reels) reel.startSpin();

        this.nextReelToStop = 0;
        this.spinTimer = SPIN_MIN_DURATION;
        this.spinning = true;
    }

    respin() {
        if (this.spinning) return false;
        if (this.respinUsed) return false;
        if (!this.lockedLines.some(l => !l)) return false;

        this._savedRows = {};
        for (let r = 0; r < ROW_COUNT; r++) {
            if (this.lockedLines[r]) {
                this._savedRows[r] = this.grid[r].slice();
            }
        }

        this.matchedLines = [];
        this.resolveIndex = -1;
        this.spinJustCompleted = false;
        this.respinUsed = true;

        for (const reel of this.reels) reel.startSpin();

        this.nextReelToStop = 0;
        this.spinTimer = SPIN_MIN_DURATION;
        this.spinning = true;
        return true;
    }

    // ── Update ─────────────────────────────────────────────

    update(dt) {
        for (const reel of this.reels) reel.update(dt);

        if (!this.spinning) return;

        this.spinTimer -= dt;

        if (this.spinTimer <= 0 && this.nextReelToStop < REEL_COUNT) {
            const reel = this.reels[this.nextReelToStop];
            if (reel.phase === 'spinning' || reel.phase === 'accelerating') {
                reel.beginStop();
            }
        }

        if (this.nextReelToStop < REEL_COUNT && this.reels[this.nextReelToStop].isStopped) {
            const c = this.nextReelToStop;
            for (let r = 0; r < ROW_COUNT; r++) {
                if (this._savedRows && this._savedRows[r]) {
                    this.grid[r][c] = this._savedRows[r][c];
                } else {
                    this.grid[r][c] = this.reels[c].symbols[r];
                }
            }
            this.nextReelToStop++;
            if (this.nextReelToStop < REEL_COUNT) {
                this.spinTimer = SPIN_STAGGER_DELAY;
            }
        }

        if (this.nextReelToStop >= REEL_COUNT && this.reels.every(r => r.isStopped)) {
            this._savedRows = null;
            this.lockedLines = [true, true, true];
            this.firstSpinDone = true;
            this.spinning = false;
            this.spinJustCompleted = true;
        }
    }

    // ── Lock / Unlock ─────────────────────────────────────

    toggleLock(lineIndex, entity) {
        if (lineIndex < 0 || lineIndex >= ROW_COUNT) return false;
        if (this.respinUsed) return false;

        if (this.lockedLines[lineIndex]) {
            if (!entity.spendStamina(STAMINA_UNLOCK_COST)) return false;
            this.lockedLines[lineIndex] = false;
            return true;
        } else {
            entity.regenStamina(STAMINA_UNLOCK_COST);
            this.lockedLines[lineIndex] = true;
            return true;
        }
    }

    // ── Enemy AI: find lines to respin ────────────────────

    getComboParticipatingCells() {
        const cells = new Set();

        // Horizontal matches
        for (let r = 0; r < ROW_COUNT; r++) {
            const row = [this.grid[r][0], this.grid[r][1], this.grid[r][2]];
            if (symbolsMatch(row[0], row[1]) && symbolsMatch(row[1], row[2]) && symbolsMatch(row[0], row[2])) {
                const eff = effectiveSymbol(row);
                if (eff.id !== 'SKULL') {
                    cells.add(`${r},0`); cells.add(`${r},1`); cells.add(`${r},2`);
                }
            }
        }

        // Diagonals
        const d1 = [this.grid[0][0], this.grid[1][1], this.grid[2][2]];
        if (symbolsMatch(d1[0], d1[1]) && symbolsMatch(d1[1], d1[2]) && symbolsMatch(d1[0], d1[2])) {
            const eff = effectiveSymbol(d1);
            if (eff.id !== 'SKULL') {
                cells.add('0,0'); cells.add('1,1'); cells.add('2,2');
            }
        }

        const d2 = [this.grid[2][0], this.grid[1][1], this.grid[0][2]];
        if (symbolsMatch(d2[0], d2[1]) && symbolsMatch(d2[1], d2[2]) && symbolsMatch(d2[0], d2[2])) {
            const eff = effectiveSymbol(d2);
            if (eff.id !== 'SKULL') {
                cells.add('2,0'); cells.add('1,1'); cells.add('0,2');
            }
        }

        return cells;
    }

    // Returns array of line indices where no cell participates in any combo
    getLinesWithNoCombos() {
        const comboCells = this.getComboParticipatingCells();
        const lines = [];
        for (let r = 0; r < ROW_COUNT; r++) {
            const hasCombo = comboCells.has(`${r},0`) || comboCells.has(`${r},1`) || comboCells.has(`${r},2`);
            if (!hasCombo) lines.push(r);
        }
        return lines;
    }

    // ── Line Evaluation ────────────────────────────────────

    calculateLines() {
        const lines = [];

        for (let r = 0; r < ROW_COUNT; r++) {
            const row = [this.grid[r][0], this.grid[r][1], this.grid[r][2]];
            const m = this._evaluateLine(row);
            if (m) { m.cells = [[r,0],[r,1],[r,2]]; lines.push(m); }
        }

        const d1 = [this.grid[0][0], this.grid[1][1], this.grid[2][2]];
        const m1 = this._evaluateLine(d1);
        if (m1) { m1.cells = [[0,0],[1,1],[2,2]]; lines.push(m1); }

        const d2 = [this.grid[2][0], this.grid[1][1], this.grid[0][2]];
        const m2 = this._evaluateLine(d2);
        if (m2) { m2.cells = [[2,0],[1,1],[0,2]]; lines.push(m2); }

        // Skull special
        let skullCount = 0;
        const skullCells = [];
        for (let r = 0; r < ROW_COUNT; r++) {
            for (let c = 0; c < REEL_COUNT; c++) {
                if (this.grid[r][c].id === 'SKULL') {
                    skullCount++;
                    skullCells.push([r, c]);
                }
            }
        }
        if (skullCount > 0) {
            lines.push({ symbol: SYMBOLS.SKULL, count: skullCount, cells: skullCells });
        }

        this.matchedLines = lines;
        return lines;
    }

    _evaluateLine(syms) {
        if (symbolsMatch(syms[0], syms[1]) && symbolsMatch(syms[1], syms[2]) && symbolsMatch(syms[0], syms[2])) {
            const eff = effectiveSymbol(syms);
            if (eff.id === 'SKULL') return null;
            return { symbol: eff, count: 3 };
        }
        return null;
    }

    // ── Resolve ──────────────────────────────────────────

    startResolve() {
        this.calculateLines();
        if (this.matchedLines.length === 0) return false;
        this.resolveIndex = 0;
        this.resolveTimer = 0;
        this.resolvePhase = 'highlight';
        return true;
    }

    updateResolve(dt) {
        if (this.resolveIndex < 0 || this.resolveIndex >= this.matchedLines.length) return 'done';
        this.resolveTimer += dt;

        if (this.resolvePhase === 'highlight' && this.resolveTimer >= HIGHLIGHT_DURATION) {
            this.resolveTimer = 0;
            this.resolvePhase = 'pause';
            return { type: 'apply', match: this.matchedLines[this.resolveIndex] };
        }
        if (this.resolvePhase === 'pause' && this.resolveTimer >= HIGHLIGHT_PAUSE) {
            this.resolveIndex++;
            this.resolveTimer = 0;
            this.resolvePhase = 'highlight';
            if (this.resolveIndex >= this.matchedLines.length) return 'done';
        }
        return 'ongoing';
    }

    getCurrentHighlight() {
        if (this.resolveIndex >= 0 &&
            this.resolveIndex < this.matchedLines.length &&
            this.resolvePhase === 'highlight') {
            return this.matchedLines[this.resolveIndex];
        }
        return null;
    }

    // Check if a line has a skull (for stun mechanic)
    lineHasSkull(lineIndex) {
        for (let c = 0; c < REEL_COUNT; c++) {
            if (this.grid[lineIndex] && this.grid[lineIndex][c] && this.grid[lineIndex][c].id === 'SKULL') {
                return true;
            }
        }
        return false;
    }

    // ── Reset ──────────────────────────────────────────────

    reset() {
        this.lockedLines = [false, false, false];
        this.matchedLines = [];
        this.resolveIndex = -1;
        this.firstSpinDone = false;
        this.respinUsed = false;
        this.spinning = false;
        this.spinJustCompleted = false;
    }
}
