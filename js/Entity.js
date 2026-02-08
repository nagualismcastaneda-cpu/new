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
        this.block = 0;
        this.effects = [];    // { id, name, icon, color, type, desc, turnsLeft }
        this.portrait = null; // Image object for portrait
    }

    // ── Damage & Healing ──────────────────────────────────

    takeDamage(amount, type) {
        // Curse increases incoming damage
        const curseStacks = this.getEffectStacks('CURSE');
        let finalDmg = amount * (1 + 0.2 * curseStacks);
        finalDmg = Math.round(finalDmg);

        if (type === 'physical') {
            const blocked = Math.min(this.block, finalDmg);
            finalDmg -= blocked;
            this.block = Math.max(0, this.block - blocked);
        }
        this.hp = Math.max(0, this.hp - finalDmg);
        return finalDmg;
    }

    // Calculate outgoing damage with weakness modifier
    calcOutgoingDamage(baseDmg) {
        const weakStacks = this.getEffectStacks('WEAKNESS');
        const rageStacks = this.getEffectStacks('RAGE');
        return Math.round(baseDmg * (1 - 0.2 * weakStacks) * (1 + 0.25 * rageStacks));
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

    // ── Status Effects ────────────────────────────────────

    applyEffect(effectDef) {
        // Check for existing effect — refresh duration if already present
        const existing = this.effects.find(e => e.id === effectDef.id);
        if (existing) {
            existing.turnsLeft = Math.max(existing.turnsLeft, effectDef.duration);
            return;
        }
        this.effects.push({
            id:        effectDef.id,
            name:      effectDef.name,
            icon:      effectDef.icon,
            color:     effectDef.color,
            type:      effectDef.type,
            desc:      effectDef.desc,
            turnsLeft: effectDef.duration,
        });
    }

    hasEffect(effectId) {
        return this.effects.some(e => e.id === effectId);
    }

    getEffectStacks(effectId) {
        const e = this.effects.find(e => e.id === effectId);
        return e ? 1 : 0;
    }

    purgeDebuffs() {
        this.effects = this.effects.filter(e => e.type !== 'debuff');
    }

    // Tick effects at end of this entity's turn, returns log messages
    tickEffects() {
        const messages = [];
        for (const e of this.effects) {
            if (e.id === 'BLEEDING') {
                this.hp = Math.max(0, this.hp - 5);
                messages.push({ text: `${this.name}: Bleeding -5 HP`, color: '#ff4444' });
            }
            if (e.id === 'REGEN') {
                const h = this.heal(5);
                if (h > 0) messages.push({ text: `${this.name}: Regen +${h} HP`, color: '#ff88aa' });
            }
            e.turnsLeft--;
        }
        // Remove expired
        const expired = this.effects.filter(e => e.turnsLeft <= 0);
        for (const e of expired) {
            messages.push({ text: `${this.name}: ${e.name} faded`, color: '#888' });
        }
        this.effects = this.effects.filter(e => e.turnsLeft > 0);
        return messages;
    }

    // Fortify: preserve block if entity has FORTIFY
    endTurnBlock() {
        if (!this.hasEffect('FORTIFY')) {
            this.block = 0;
        }
    }

    get isAlive() {
        return this.hp > 0;
    }
}
