"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveCombatTurn = resolveCombatTurn;
exports.isCombatOver = isCombatOver;
function resolveCombatTurn(attacker, defender, rng = Math.random) {
    const evasionRoll = rng();
    const evaded = evasionRoll < defender.evasion;
    if (evaded) {
        return {
            attackerId: attacker.id,
            defenderId: defender.id,
            damage: 0,
            crit: false,
            evaded: true,
            defenderHp: defender.hp
        };
    }
    const critRoll = rng();
    const crit = critRoll < attacker.critChance;
    const variance = 0.85 + rng() * 0.3;
    const baseDamage = Math.max(1, attacker.power - defender.defense * 0.6);
    const damage = Math.max(1, Math.floor(baseDamage * variance * (crit ? 1.5 : 1)));
    const defenderHp = Math.max(0, defender.hp - damage);
    return {
        attackerId: attacker.id,
        defenderId: defender.id,
        damage,
        crit,
        evaded: false,
        defenderHp
    };
}
function isCombatOver(a, b) {
    return a.hp <= 0 || b.hp <= 0;
}
