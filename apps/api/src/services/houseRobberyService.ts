type HouseRobberyAction = {
  id: string
  label: string
  baseChance: number
  difficulty: number
  rewardMin: number
  rewardMax: number
  xpGain: number
}

const ACTIONS: HouseRobberyAction[] = [
  {
    id: "postkasse",
    label: "Undersøk en åpen postkasse",
    baseChance: 88,
    difficulty: 1,
    rewardMin: 6_000_000,
    rewardMax: 14_000_000,
    xpGain: 6
  },
  {
    id: "bakhage",
    label: "Sjekk bakhagen for åpne innganger",
    baseChance: 72,
    difficulty: 2,
    rewardMin: 10_000_000,
    rewardMax: 24_000_000,
    xpGain: 9
  },
  {
    id: "kjeller",
    label: "Utforsk et kjellervindu",
    baseChance: 60,
    difficulty: 3,
    rewardMin: 16_000_000,
    rewardMax: 36_000_000,
    xpGain: 12
  },
  {
    id: "villa",
    label: "Diskré forsøk på en villa",
    baseChance: 46,
    difficulty: 4,
    rewardMin: 24_000_000,
    rewardMax: 52_000_000,
    xpGain: 15
  },
  {
    id: "penthouse",
    label: "Høyrisiko i et penthouse",
    baseChance: 30,
    difficulty: 5,
    rewardMin: 32_000_000,
    rewardMax: 70_000_000,
    xpGain: 20
  }
]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function randomRange(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function listHouseRobberyActions(xp: number, cityHeat: number) {
  return ACTIONS.map((action) => {
    const xpBonus = Math.min(14, Math.floor(xp / 50))
    const difficultyFactor = 1 - (action.difficulty - 1) * 0.18
    const bonus = Math.round(xpBonus * difficultyFactor)
    const heatPenalty = Math.round(cityHeat / 11)
    const chance = clamp(action.baseChance + bonus - heatPenalty, 5, 95)
    return {
      id: action.id,
      label: action.label,
      chance
    }
  })
}

export function resolveHouseRobbery(actionId: string, xp: number, cityHeat: number) {
  const action = ACTIONS.find((item) => item.id === actionId)
  if (!action) return null

  const xpBonus = Math.min(14, Math.floor(xp / 50))
  const difficultyFactor = 1 - (action.difficulty - 1) * 0.18
  const bonus = Math.round(xpBonus * difficultyFactor)
  const heatPenalty = Math.round(cityHeat / 11)
  const chance = clamp(action.baseChance + bonus - heatPenalty, 5, 95)
  const success = Math.random() * 100 < chance

  const reward = success ? randomRange(action.rewardMin, action.rewardMax) : 0
  const xpGain = success ? action.xpGain : Math.max(3, Math.floor(action.xpGain / 2))
  const jailChance = clamp(0.1 + cityHeat / 130 + action.difficulty * 0.05, 0.1, 0.65)

  return {
    action,
    success,
    chance,
    reward,
    xpGain,
    jailChance
  }
}

