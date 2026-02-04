export type EnergyState = {
  energy: number
  maxEnergy: number
  lastEnergyAt: Date
  regenPerHour: number
}

export type EnergyResult = EnergyState & { regenerated: number }

export function computeEnergy(now: Date, state: EnergyState): EnergyResult {
  if (state.regenPerHour <= 0) {
    return { ...state, regenerated: 0 }
  }

  const secondsPerEnergy = Math.floor(3600 / state.regenPerHour)
  const elapsedSeconds = Math.max(0, Math.floor((now.getTime() - state.lastEnergyAt.getTime()) / 1000))
  const regenerated = Math.floor(elapsedSeconds / secondsPerEnergy)

  if (regenerated <= 0) {
    return { ...state, regenerated: 0 }
  }

  const nextEnergy = Math.min(state.maxEnergy, state.energy + regenerated)
  const applied = nextEnergy - state.energy
  const advanceSeconds = applied * secondsPerEnergy

  return {
    ...state,
    energy: nextEnergy,
    lastEnergyAt: new Date(state.lastEnergyAt.getTime() + advanceSeconds * 1000),
    regenerated: applied
  }
}

export function spendEnergy(now: Date, state: EnergyState, cost: number): EnergyResult {
  const refreshed = computeEnergy(now, state)
  if (refreshed.energy < cost) {
    return refreshed
  }
  return { ...refreshed, energy: refreshed.energy - cost }
}
