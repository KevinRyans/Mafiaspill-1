import type { MarketPriceInput, MarketPriceOutput } from "../types"

const clamp = (min: number, value: number, max: number) => Math.min(max, Math.max(min, value))

export function calculateMarketPrice(input: MarketPriceInput): MarketPriceOutput {
  const { basePrice, supply, demand, eventImpact, complianceRisk } = input
  const volume = Math.max(1, supply + demand)
  const balance = (demand - supply) / volume
  const scarcityMultiplier = clamp(0.6, 1 + balance * 0.9, 1.8)
  const eventMultiplier = clamp(0.6, eventImpact, 1.6)
  const complianceMultiplier = clamp(0.6, 1 - complianceRisk * 0.04, 1)
  const price = Math.max(1, Math.round(basePrice * scarcityMultiplier * eventMultiplier * complianceMultiplier))

  return {
    price,
    scarcityMultiplier,
    eventMultiplier,
    complianceMultiplier
  }
}

export function calculateMissionPayout(baseReward: number, riskScore: number, successBonus = 1): number {
  const riskMultiplier = clamp(0.7, 1 + riskScore * 0.015, 2.5)
  return Math.round(baseReward * riskMultiplier * successBonus)
}
