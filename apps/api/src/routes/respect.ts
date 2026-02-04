import { Router } from "express"
import { z } from "zod"
import { prisma } from "../db/client"
import { requireAuth } from "../middleware/auth"
import { requireAlive } from "../middleware/alive"
import { createNotification } from "../services/notifications"
import { getRespectLevel } from "../services/respect"

const router = Router()

router.get("/", requireAuth, async (req, res) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } })
  if (!profile) {
    return res.status(404).json({ message: "Profil ikke funnet" })
  }

  const upgrades = await prisma.respectUpgrade.findMany({ orderBy: { cost: "asc" } })
  const purchases = await prisma.respectPurchase.findMany({ where: { userId: req.user!.id } })
  const owned = new Set(purchases.map((purchase) => purchase.upgradeId))

  const level = getRespectLevel(profile.respectSpent)

  return res.json({
    respect: profile.respect,
    spent: profile.respectSpent,
    level,
    upgrades: upgrades.map((upgrade) => ({
      ...upgrade,
      owned: owned.has(upgrade.id)
    }))
  })
})

router.post("/purchase", requireAuth, requireAlive, async (req, res) => {
  const schema = z.object({ upgradeId: z.string().uuid() })
  const { upgradeId } = schema.parse(req.body)

  const [profile, upgrade] = await Promise.all([
    prisma.profile.findUnique({ where: { userId: req.user!.id } }),
    prisma.respectUpgrade.findUnique({ where: { id: upgradeId } })
  ])

  if (!profile || !upgrade) {
    return res.status(404).json({ message: "Oppgradering ikke funnet" })
  }

  const existing = await prisma.respectPurchase.findFirst({
    where: { userId: req.user!.id, upgradeId }
  })
  if (existing) {
    return res.status(400).json({ message: "Du eier allerede denne oppgraderingen" })
  }

  const level = getRespectLevel(profile.respectSpent)
  if (upgrade.levelRequired > level.levelIndex) {
    return res.status(400).json({ message: "Respektnivået ditt er for lavt" })
  }

  if (profile.respect < upgrade.cost) {
    return res.status(400).json({ message: "Ikke nok respekt" })
  }

  await prisma.$transaction(async (tx) => {
    await tx.profile.update({
      where: { userId: req.user!.id },
      data: {
        respect: profile.respect - upgrade.cost,
        respectSpent: profile.respectSpent + upgrade.cost
      }
    })

    await tx.respectPurchase.create({
      data: { userId: req.user!.id, upgradeId }
    })
  })

  await createNotification({
    userId: req.user!.id,
    type: "system",
    category: "system",
    title: "Respekt brukt",
    body: `Du låste opp ${upgrade.name}.`,
    icon: "spark",
    priority: 2
  })

  return res.json({ success: true })
})

export default router
