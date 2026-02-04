import { describe, expect, it } from "vitest"
import { resolveCombatTurn } from "@mafiaspill/shared"

describe("combat", () => {
  it("resolves damage", () => {
    const rng = () => 0.1
    const result = resolveCombatTurn(
      { id: "a", name: "A", maxHp: 50, hp: 50, power: 10, defense: 4, evasion: 0.01, critChance: 0.1 },
      { id: "b", name: "B", maxHp: 50, hp: 50, power: 9, defense: 3, evasion: 0.01, critChance: 0.05 },
      rng
    )
    expect(result.damage).toBeGreaterThan(0)
  })
})
