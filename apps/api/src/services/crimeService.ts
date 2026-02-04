type CrimeAction = {
  id: string
  label: string
  baseChance: number
  difficulty: number
  rewardMin: number
  rewardMax: number
  xpGain: number
}

const ACTIONS: CrimeAction[] = [
  {
    id: "utligger",
    label: "Stjel penger fra en utligger",
    baseChance: 90,
    difficulty: 1,
    rewardMin: 5000000,
    rewardMax: 12000000,
    xpGain: 6
  },
  {
    id: "unge",
    label: "Stjel penger fra en unge",
    baseChance: 80,
    difficulty: 2,
    rewardMin: 8000000,
    rewardMax: 18000000,
    xpGain: 8
  },
  {
    id: "gammel",
    label: "Stjel penger fra en gammel dame",
    baseChance: 70,
    difficulty: 3,
    rewardMin: 12000000,
    rewardMax: 26000000,
    xpGain: 10
  },
  {
    id: "voksen",
    label: "Stjel penger fra en voksen person",
    baseChance: 60,
    difficulty: 4,
    rewardMin: 18000000,
    rewardMax: 42000000,
    xpGain: 12
  },
  {
    id: "lommebok",
    label: "Lirk til deg en lommebok",
    baseChance: 75,
    difficulty: 2,
    rewardMin: 9000000,
    rewardMax: 21000000,
    xpGain: 9
  }
]

const LEVELS = [
  { name: "Småkriminell", min: 0 },
  { name: "Gatemann", min: 60 },
  { name: "Plukker", min: 140 },
  { name: "Røslig", min: 260 },
  { name: "Veteran", min: 420 }
]

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function randomRange(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function getCrimeLevel(xp: number) {
  let levelIndex = 0
  for (let i = 0; i < LEVELS.length; i += 1) {
    if (xp >= LEVELS[i].min) {
      levelIndex = i
    }
  }
  const current = LEVELS[levelIndex]
  const next = LEVELS[levelIndex + 1]
  const progress = next ? clamp((xp - current.min) / (next.min - current.min), 0, 1) : 1
  return {
    name: current.name,
    progress,
    nextAt: next?.min ?? null
  }
}

export function listCrimeActions(xp: number, cityHeat: number) {
  return ACTIONS.map((action) => {
    const xpBonus = Math.min(15, Math.floor(xp / 45))
    const difficultyFactor = 1 - (action.difficulty - 1) * 0.2
    const bonus = Math.round(xpBonus * difficultyFactor)
    const heatPenalty = Math.round(cityHeat / 10)
    const chance = clamp(action.baseChance + bonus - heatPenalty, 5, 95)
    return {
      id: action.id,
      label: action.label,
      chance
    }
  })
}

export function resolveCrime(actionId: string, xp: number, cityHeat: number) {
  const action = ACTIONS.find((item) => item.id === actionId)
  if (!action) {
    return null
  }

  const xpBonus = Math.min(15, Math.floor(xp / 45))
  const difficultyFactor = 1 - (action.difficulty - 1) * 0.2
  const bonus = Math.round(xpBonus * difficultyFactor)
  const heatPenalty = Math.round(cityHeat / 10)
  const chance = clamp(action.baseChance + bonus - heatPenalty, 5, 95)
  const success = Math.random() * 100 < chance

  const reward = success ? randomRange(action.rewardMin, action.rewardMax) : 0
  const xpGain = success ? action.xpGain : Math.max(2, Math.floor(action.xpGain / 2))
  const jailChance = clamp(0.08 + cityHeat / 140 + action.difficulty * 0.05, 0.08, 0.55)

  return {
    action,
    success,
    chance,
    reward,
    xpGain,
    jailChance
  }
}
