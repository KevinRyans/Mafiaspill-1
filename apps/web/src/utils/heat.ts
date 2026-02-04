export function getHeatLabel(heat: number) {
  if (heat >= 85) return "Ekstrem"
  if (heat >= 65) return "Høy"
  if (heat >= 40) return "Moderat"
  return "Lav"
}

export function getHeatClass(heat: number) {
  if (heat >= 85) return "text-threat bg-threat/20"
  if (heat >= 65) return "text-ember bg-ember/20"
  if (heat >= 40) return "text-gold bg-gold/20"
  return "text-neon bg-neon/20"
}
