// ── Status Effects System ──────────────────────────────────

const EFFECTS = {
    BLEEDING: {
        id: 'BLEEDING', name: 'Bleeding', icon: '\uD83E\uDE78', // 🩸
        color: '#ff4444', type: 'debuff', duration: 3,
        desc: '-5 HP/turn'
    },
    WEAKNESS: {
        id: 'WEAKNESS', name: 'Weakness', icon: '\uD83D\uDCA4', // 💤
        color: '#8866bb', type: 'debuff', duration: 2,
        desc: '-20% dmg dealt'
    },
    CURSE: {
        id: 'CURSE', name: 'Curse', icon: '\uD83C\uDF00', // 🌀
        color: '#44cc99', type: 'debuff', duration: 2,
        desc: '+20% dmg taken'
    },
    STUN: {
        id: 'STUN', name: 'Stun', icon: '\uD83D\uDCAB', // 💫
        color: '#ffaa00', type: 'debuff', duration: 2,
        desc: 'Skull lines locked'
    },
    RAGE: {
        id: 'RAGE', name: 'Rage', icon: '\uD83D\uDD25', // 🔥
        color: '#ff6600', type: 'buff', duration: 2,
        desc: '+25% phys dmg'
    },
    FORTIFY: {
        id: 'FORTIFY', name: 'Fortify', icon: '\uD83D\uDEE1', // 🛡
        color: '#4488ff', type: 'buff', duration: 2,
        desc: 'Block persists'
    },
    REGEN: {
        id: 'REGEN', name: 'Regen', icon: '\u2665', // ♥
        color: '#ff88aa', type: 'buff', duration: 3,
        desc: '+5 HP/turn'
    },
};

// Skull debuff assignment based on skull count
function getSkullDebuffs(skullCount) {
    const debuffs = [];
    if (skullCount >= 1) debuffs.push(EFFECTS.BLEEDING);
    if (skullCount >= 2) debuffs.push(EFFECTS.WEAKNESS);
    if (skullCount >= 3) debuffs.push(EFFECTS.CURSE);
    return debuffs;
}
