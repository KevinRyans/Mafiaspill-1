import { Router } from "express"
import { z } from "zod"
import { prisma } from "../db/client"
import { requireAuth } from "../middleware/auth"
import { requireNotJailed } from "../middleware/prison"
import { requireAlive } from "../middleware/alive"
import { createNotification } from "../services/notifications"
import { getRespectUpgradeCodes } from "../services/respect"

const router = Router()

const BUSINESS_TYPES = {
  firma: { label: "Firma", createCost: 50_000_000, baseIncome: 2_000_000 },
  blackjack: { label: "Blackjack-eier", createCost: 350_000_000, baseIncome: 8_000_000 },
  lotto: { label: "Lotto-operatør", createCost: 500_000_000, baseIncome: 12_000_000 }
} as const

type BusinessType = keyof typeof BUSINESS_TYPES

function getTypeConfig(type: string) {
  return BUSINESS_TYPES[type as BusinessType] || BUSINESS_TYPES.firma
}

function calcUpgradeCost(business: any) {
  const config = getTypeConfig(business.type)
  const raw = Math.round(config.createCost * (0.25 + business.level * 0.15))
  return Math.min(raw, 1_900_000_000)
}

function calcIncome(business: any) {
  const hours = Math.floor((Date.now() - business.lastCollectedAt.getTime()) / (1000 * 60 * 60))
  const cappedHours = Math.min(12, Math.max(0, hours))
  const raw = cappedHours * business.baseIncome * business.level
  return Math.min(raw, 1_900_000_000)
}

router.get("/", requireAuth, async (req, res) => {
  const businesses = await prisma.business.findMany({
    where: { ownerId: req.user!.id },
    include: { city: true },
    orderBy: { createdAt: "asc" }
  })

  return res.json({
    businesses: businesses.map((biz) => ({
      ...biz,
      claimable: calcIncome(biz)
    }))
  })
})

router.post("/create", requireAuth, requireNotJailed, requireAlive, async (req, res) => {
  const schema = z.object({
    name: z.string().min(3).max(32),
    cityId: z.string().uuid(),
    type: z.enum(["firma", "blackjack", "lotto"]).optional()
  })
  const { name, cityId, type = "firma" } = schema.parse(req.body)

  const config = getTypeConfig(type)

  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } })
  if (!profile) {
    return res.status(404).json({ message: "Profil mangler" })
  }

  if (profile.fiatBalance < config.createCost) {
    return res.status(400).json({ message: "Ikke nok USD" })
  }

  const business = await prisma.$transaction(async (tx) => {
    await tx.profile.update({
      where: { userId: req.user!.id },
      data: { fiatBalance: profile.fiatBalance - config.createCost }
    })
    return tx.business.create({
      data: {
        ownerId: req.user!.id,
        cityId,
        name,
        type,
        baseIncome: config.baseIncome
      }
    })
  })

  await createNotification({
    userId: req.user!.id,
    type: "system",
    category: "system",
    title: "Firma opprettet",
    body: `${business.name} er nå i drift.`,
    icon: "spark",
    priority: 2
  })

  return res.json({ business })
})

router.post("/collect", requireAuth, requireAlive, async (req, res) => {
  const schema = z.object({ businessId: z.string().uuid() })
  const { businessId } = schema.parse(req.body)

  const business = await prisma.business.findFirst({
    where: { id: businessId, ownerId: req.user!.id }
  })
  if (!business) {
    return res.status(404).json({ message: "Firma ikke funnet" })
  }

  const upgrades = await getRespectUpgradeCodes(req.user!.id)
  const baseIncome = calcIncome(business)
  const income = upgrades.has("firm_boost") ? Math.round(baseIncome * 1.2) : baseIncome
  if (income <= 0) {
    return res.status(400).json({ message: "Ingen inntekt å hente ennå" })
  }

  await prisma.$transaction(async (tx) => {
    await tx.profile.update({
      where: { userId: req.user!.id },
      data: { fiatBalance: { increment: income } }
    })
    await tx.business.update({
      where: { id: business.id },
      data: { lastCollectedAt: new Date() }
    })
  })

  return res.json({ income })
})

router.post("/upgrade", requireAuth, requireNotJailed, requireAlive, async (req, res) => {
  const schema = z.object({ businessId: z.string().uuid() })
  const { businessId } = schema.parse(req.body)

  const business = await prisma.business.findFirst({
    where: { id: businessId, ownerId: req.user!.id }
  })
  if (!business) {
    return res.status(404).json({ message: "Firma ikke funnet" })
  }

  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } })
  if (!profile) {
    return res.status(404).json({ message: "Profil mangler" })
  }

  const cost = calcUpgradeCost(business)
  if (profile.fiatBalance < cost) {
    return res.status(400).json({ message: "Ikke nok USD" })
  }

  await prisma.$transaction(async (tx) => {
    await tx.profile.update({
      where: { userId: req.user!.id },
      data: { fiatBalance: profile.fiatBalance - cost }
    })
    await tx.business.update({
      where: { id: business.id },
      data: { level: business.level + 1 }
    })
  })

  return res.json({ success: true })
})

export default router
