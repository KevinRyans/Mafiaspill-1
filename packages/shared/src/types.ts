import { ITEM_RARITIES, CREW_RANKS } from "./constants"

export type Role = "player" | "support" | "mod" | "admin"
export type ItemRarity = typeof ITEM_RARITIES[number]
export type CrewRank = typeof CREW_RANKS[number]

export type Stats = {
  respect: number
  notoriety: number
  risk: number
  energy: number
  heat: number
}

export type InventoryItem = {
  id: string
  itemId: string
  name: string
  rarity: ItemRarity
  quantity: number
  provenanceScore: number
}

export type MissionOption = {
  id: string
  label: string
  riskDelta: number
  rewardMultiplier: number
  complianceImpact: number
}

export type Mission = {
  id: string
  name: string
  tier: number
  energyCost: number
  baseReward: number
  baseRisk: number
  options: MissionOption[]
}

export type Combatant = {
  id: string
  name: string
  maxHp: number
  hp: number
  power: number
  defense: number
  evasion: number
  critChance: number
}

export type CombatTurnResult = {
  attackerId: string
  defenderId: string
  damage: number
  crit: boolean
  evaded: boolean
  defenderHp: number
}

export type MarketPriceInput = {
  basePrice: number
  supply: number
  demand: number
  eventImpact: number
  complianceRisk: number
}

export type MarketPriceOutput = {
  price: number
  scarcityMultiplier: number
  eventMultiplier: number
  complianceMultiplier: number
}
