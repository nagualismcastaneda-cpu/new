// ── Entity (Player & Enemy) ────────────────────────────────

class Entity {
    constructor(name, hp, stamina, str, def, int_) {
        this.name = name;
        this.maxHP = hp;
        this.hp = hp;
        this.maxStamina = stamina;
        this.stamina = stamina;
        this.str = str;
        this.def = def;
        this.int = int_;
        this.exp = 0;
        this.level = 1;
        this.block = 0; // temporary block for current turn
        this.statusEffects = [];
    }

    takeDamage(amount, type) {
        let finalDmg = amount;
        if (type === 'physical') {
            finalDmg = Math.max(0, amount - this.block);
            this.block = Math.max(0, this.block - amount);
        }
        this.hp = Math.max(0, this.hp - finalDmg);
        return finalDmg;
    }

    heal(amount) {
        const before = this.hp;
        this.hp = Math.min(this.maxHP, this.hp + amount);
        return this.hp - before;
    }

    spendStamina(amount) {
        if (this.stamina < amount) return false;
        this.stamina -= amount;
        return true;
    }

    regenStamina(amount) {
        this.stamina = Math.min(this.maxStamina, this.stamina + amount);
    }

    addBlock(amount) {
        this.block += amount;
    }

    addExp(amount) {
        this.exp += amount;
        // Simple level-up: every 100 EXP
        while (this.exp >= this.level * 100) {
            this.exp -= this.level * 100;
            this.level++;
            this.maxHP += 10;
            this.hp = Math.min(this.maxHP, this.hp + 10);
            this.str += 1;
            this.def += 1;
            this.int += 1;
        }
    }

    applyEffect(effect) {
        this.statusEffects.push({ ...effect, turnsLeft: effect.duration });
    }

    purgeDebuffs() {
        this.statusEffects = this.statusEffects.filter(e => !e.isDebuff);
    }

    tickEffects() {
        const expired = [];
        for (const e of this.statusEffects) {
            if (e.onTick) e.onTick(this);
            e.turnsLeft--;
            if (e.turnsLeft <= 0) expired.push(e);
        }
        this.statusEffects = this.statusEffects.filter(e => e.turnsLeft > 0);
        return expired;
    }

    get isAlive() {
        return this.hp > 0;
    }
}
