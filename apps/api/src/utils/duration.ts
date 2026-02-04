const UNIT_MS: Record<string, number> = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000
}

export function parseDuration(value: string): number {
  const match = value.trim().match(/^(\d+)([smhd])$/)
  if (!match) {
    throw new Error(`Invalid duration: ${value}`)
  }
  const amount = Number(match[1])
  const unit = match[2]
  return amount * UNIT_MS[unit]
}
