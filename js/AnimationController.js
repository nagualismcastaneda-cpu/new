// ── Animation Controller ───────────────────────────────────

class AnimationController {
    constructor() {
        this.queue = [];
        this.current = null;
        this.isPlaying = false;
    }

    add(animation) {
        // animation: { update(progress) -> bool done, duration, onComplete? }
        this.queue.push(animation);
    }

    play(onAllComplete) {
        this.onAllComplete = onAllComplete || null;
        this.isPlaying = true;
        this._next();
    }

    _next() {
        if (this.queue.length === 0) {
            this.isPlaying = false;
            this.current = null;
            if (this.onAllComplete) this.onAllComplete();
            return;
        }
        this.current = this.queue.shift();
        this.current._startTime = performance.now();
    }

    update(now) {
        if (!this.current) return;
        const elapsed = now - this.current._startTime;
        const progress = Math.min(1, elapsed / this.current.duration);
        const done = this.current.update(progress);
        if (done || progress >= 1) {
            if (this.current.onComplete) this.current.onComplete();
            this._next();
        }
    }

    clear() {
        this.queue = [];
        this.current = null;
        this.isPlaying = false;
    }
}

// ── Easing Functions ───────────────────────────────────────

function easeOutBack(t) {
    const s = BOUNCE_OVERSHOOT;
    return 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2);
}

function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
