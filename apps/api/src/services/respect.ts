import { prisma } from "../db/client"

const LEVELS = [
  { name: "Normal", min: 0 },
  { name: "Rekrutter", min: 20 },
  { name: "Strateg", min: 40 },
  { name: "Operatør", min: 80 },
  { name: "Legende", min: 140 }
]

export function getRespectLevel(spent: number) {
  let levelIndex = 0
  for (let i = 0; i < LEVELS.length; i += 1) {
    if (spent >= LEVELS[i].min) {
      levelIndex = i
    }
  }
  const current = LEVELS[levelIndex]
  const next = LEVELS[levelIndex + 1]
  const progress = next
    ? Math.min(1, (spent - current.min) / (next.min - current.min))
    : 1
  return {
    levelIndex,
    name: current.name,
    progress,
    nextAt: next?.min ?? null
  }
}

export async function getRespectUpgradeCodes(userId: string) {
  const purchases = await prisma.respectPurchase.findMany({
    where: { userId },
    include: { upgrade: true }
  })
  return new Set(purchases.map((purchase) => purchase.upgrade.code))
}
