// ── Symbol Definitions & Strip Map ─────────────────────────

const SYMBOLS = {
    WILD:   { id: 'WILD',   label: '★', color: '#f5c842', weight: 10, description: 'Wild — substitutes any (except Skull)' },
    SWORD:  { id: 'SWORD',  label: '⚔',  color: '#c0c0c0', weight: 15, description: 'Sword — 15 Phys Dmg + STR' },
    SHIELD: { id: 'SHIELD', label: '🛡', color: '#4a90d9', weight: 15, description: 'Shield — Block 15 Phys Dmg + DEF' },
    FIRE:   { id: 'FIRE',   label: '🔥', color: '#ff6347', weight: 15, description: 'Fire — 10 Mag Dmg + INT' },
    HEART:  { id: 'HEART',  label: '♥',  color: '#e94560', weight: 15, description: 'Heart — +10 HP & Purge Debuffs' },
    BOOK:   { id: 'BOOK',   label: '📖', color: '#9b59b6', weight: 15, description: 'Book — +10 EXP' },
    SKULL:  { id: 'SKULL',  label: '💀', color: '#666',    weight: 15, description: 'Skull — Activates debuff' },
};

const SYMBOL_LIST = Object.values(SYMBOLS);

// Build weighted strip (100 entries)
function buildStrip() {
    const strip = [];
    for (const sym of SYMBOL_LIST) {
        for (let i = 0; i < sym.weight; i++) {
            strip.push(sym);
        }
    }
    // Shuffle (Fisher-Yates)
    for (let i = strip.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [strip[i], strip[j]] = [strip[j], strip[i]];
    }
    return strip;
}

function randomSymbol() {
    const roll = Math.random() * 100;
    let cumulative = 0;
    for (const sym of SYMBOL_LIST) {
        cumulative += sym.weight;
        if (roll < cumulative) return sym;
    }
    return SYMBOL_LIST[SYMBOL_LIST.length - 1];
}

// Check if two symbols match (Wild counts as match for non-Skull)
function symbolsMatch(a, b) {
    if (a.id === b.id) return true;
    if (a.id === 'SKULL' || b.id === 'SKULL') return false;
    if (a.id === 'WILD' || b.id === 'WILD') return true;
    return false;
}

// Get the "effective" symbol from a group (non-Wild symbol takes priority)
function effectiveSymbol(symbols) {
    for (const s of symbols) {
        if (s.id !== 'WILD') return s;
    }
    return symbols[0]; // all wilds
}
