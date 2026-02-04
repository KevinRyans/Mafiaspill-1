export function calculateTravelPrice(basePrice: number, travelCount: number) {
  const multiplier = 1 + Math.min(0.5, travelCount * 0.005)
  return Math.round(basePrice * multiplier)
}

export function calculateTravelCooldownEndsAt(lastTravelAt?: Date | null) {
  if (!lastTravelAt) return null
  const next = lastTravelAt.getTime() + 60 * 60 * 1000
  return next > Date.now() ? next : null
}
