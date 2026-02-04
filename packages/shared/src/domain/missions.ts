import type { MissionOption } from "../types"

export function pickMissionOutcome(
  baseRisk: number,
  option: MissionOption,
  rng: () => number = Math.random
): { success: boolean; riskDelta: number; complianceImpact: number } {
  const effectiveRisk = Math.min(0.95, Math.max(0.05, (baseRisk + option.riskDelta) / 100))
  const roll = rng()
  const success = roll > effectiveRisk

  return {
    success,
    riskDelta: option.riskDelta,
    complianceImpact: option.complianceImpact
  }
}
