import type { Combatant, CombatTurnResult } from "../types"

export type Rng = () => number

export function resolveCombatTurn(
  attacker: Combatant,
  defender: Combatant,
  rng: Rng = Math.random
): CombatTurnResult {
  const evasionRoll = rng()
  const evaded = evasionRoll < defender.evasion

  if (evaded) {
    return {
      attackerId: attacker.id,
      defenderId: defender.id,
      damage: 0,
      crit: false,
      evaded: true,
      defenderHp: defender.hp
    }
  }

  const critRoll = rng()
  const crit = critRoll < attacker.critChance
  const variance = 0.85 + rng() * 0.3
  const baseDamage = Math.max(1, attacker.power - defender.defense * 0.6)
  const damage = Math.max(1, Math.floor(baseDamage * variance * (crit ? 1.5 : 1)))
  const defenderHp = Math.max(0, defender.hp - damage)

  return {
    attackerId: attacker.id,
    defenderId: defender.id,
    damage,
    crit,
    evaded: false,
    defenderHp
  }
}

export function isCombatOver(a: Combatant, b: Combatant): boolean {
  return a.hp <= 0 || b.hp <= 0
}
