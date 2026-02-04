export const GAME_CONSTANTS = {
  MAX_ENERGY: 100,
  ENERGY_REGEN_PER_HOUR: 12,
  MAX_HEAT: 100,
  MAX_RISK: 100,
  MAX_RESPECT: 10000,
  MAX_NOTORIETY: 10000,
  BASE_COMPLIANCE: 50,
  DAILY_CHALLENGE_COUNT: 3,
  WEEKLY_CHALLENGE_COUNT: 2,
  PVP_COOLDOWN_MINUTES: 15,
  MISSION_COOLDOWN_MINUTES: 5
} as const

export const ITEM_RARITIES = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary"
] as const

export const CREW_RANKS = [
  "recruit",
  "associate",
  "operator",
  "strategist",
  "captain",
  "boss"
] as const

export const STAT_LABELS = [
  "respect",
  "notoriety",
  "risk",
  "energy",
  "heat"
] as const
