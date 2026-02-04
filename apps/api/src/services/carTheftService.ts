type CarTheftAction = {
  id: string
  label: string
  baseChance: number
  difficulty: number
  xpGain: number
}

const ACTIONS: CarTheftAction[] = [
  {
    id: "nokkler",
    label: "Stjel nøkler på gata",
    baseChance: 90,
    difficulty: 1,
    xpGain: 6
  },
  {
    id: "sirkus",
    label: "Stjel fra Sirkus Shopping",
    baseChance: 21,
    difficulty: 3,
    xpGain: 12
  },
  {
    id: "ladestasjon",
    label: "Stjel fra en ladestasjon",
    baseChance: 1,
    difficulty: 5,
    xpGain: 20
  },
  {
    id: "city-syd",
    label: "Stjel fra City Syd",
    baseChance: 1,
    difficulty: 5,
    xpGain: 20
  }
]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function listCarTheftActions(xp: number, cityHeat: number) {
  return ACTIONS.map((action) => {
    const xpBonus = Math.min(12, Math.floor(xp / 55))
    const difficultyFactor = 1 - (action.difficulty - 1) * 0.15
    const bonus = Math.round(xpBonus * difficultyFactor)
    const heatPenalty = Math.round(cityHeat / 12)
    const chance = clamp(action.baseChance + bonus - heatPenalty, 1, 95)
    return {
      id: action.id,
      label: action.label,
      chance
    }
  })
}

export function resolveCarTheft(actionId: string, xp: number, cityHeat: number) {
  const action = ACTIONS.find((item) => item.id === actionId)
  if (!action) return null

  const xpBonus = Math.min(12, Math.floor(xp / 55))
  const difficultyFactor = 1 - (action.difficulty - 1) * 0.15
  const bonus = Math.round(xpBonus * difficultyFactor)
  const heatPenalty = Math.round(cityHeat / 12)
  const chance = clamp(action.baseChance + bonus - heatPenalty, 1, 95)
  const success = Math.random() * 100 < chance
  const xpGain = success ? action.xpGain : Math.max(2, Math.floor(action.xpGain / 2))
  const jailChance = clamp(0.1 + cityHeat / 120 + action.difficulty * 0.04, 0.1, 0.6)

  return {
    action,
    success,
    chance,
    xpGain,
    jailChance
  }
}

export function pickCarModel(models: Array<{ id: string; rarity: string }>) {
  const weights: Record<string, number> = {
    common: 60,
    uncommon: 25,
    rare: 10,
    epic: 4,
    legendary: 1
  }
  const pool = models.map((model) => ({
    id: model.id,
    weight: weights[model.rarity] ?? 5
  }))
  const total = pool.reduce((sum, item) => sum + item.weight, 0)
  let roll = Math.random() * total
  for (const item of pool) {
    roll -= item.weight
    if (roll <= 0) {
      return item.id
    }
  }
  return pool[0]?.id
}
