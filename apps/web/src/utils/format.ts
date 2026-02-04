export function formatNumber(value?: number | null) {
  if (value === null || value === undefined || Number.isNaN(value)) return "0"
  return new Intl.NumberFormat("nb-NO").format(value)
}

export function formatUsd(value?: number | null) {
  return `$${formatNumber(value)}`
}
