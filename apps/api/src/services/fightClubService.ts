export type TrainingType = "kort" | "normal" | "lang"

export const TRAINING_OPTIONS: Record<
  TrainingType,
  { minutes: number; ratingGain: [number, number]; styleGain: [number, number]; baseCost: number }
> = {
  kort: { minutes: 2.5, ratingGain: [2, 4], styleGain: [1, 2], baseCost: 2_000_000 },
  normal: { minutes: 7, ratingGain: [5, 8], styleGain: [2, 4], baseCost: 6_000_000 },
  lang: { minutes: 15, ratingGain: [10, 14], styleGain: [4, 6], baseCost: 12_000_000 }
}

export function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

export function applyGymBoost(value: number, gym: boolean) {
  return gym ? Math.round(value * 1.25) : value
}

export function gymCost(cost: number, gym: boolean) {
  return gym ? Math.round(cost * 1.5) : cost
}

export function getLeague(rating: number) {
  if (rating >= 900) return "Legende"
  if (rating >= 600) return "Elite"
  if (rating >= 400) return "Veteran"
  if (rating >= 250) return "Amatør"
  return "Rookie"
}
