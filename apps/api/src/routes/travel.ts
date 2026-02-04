import { Router } from "express"
import { z } from "zod"
import { prisma } from "../db/client"
import { requireAuth } from "../middleware/auth"
import { requireNotJailed } from "../middleware/prison"
import { requireAlive } from "../middleware/alive"
import { antiBot } from "../middleware/antiBot"
import { minutesFromNow } from "../utils/time"
import { calculateTravelCooldownEndsAt, calculateTravelPrice } from "../services/travelService"
import { createNotification } from "../services/notifications"

const router = Router()

router.get("/cities", requireAuth, async (req, res) => {
  const cities = await prisma.city.findMany({
    include: { state: true, heat: true },
    orderBy: { name: "asc" }
  })
  const location = await prisma.userLocation.findUnique({
    where: { userId: req.user!.id },
    include: { city: { include: { heat: true } } }
  })
  const queue = await prisma.travelQueue.findUnique({
    where: { userId: req.user!.id },
    include: { toCity: true }
  })
  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } })
  const travelCount = await prisma.travelLog.count({ where: { userId: req.user!.id } })
  const baseCost = 2_000_000
  const price = calculateTravelPrice(baseCost, travelCount)
  const cooldownEndsAt = calculateTravelCooldownEndsAt(profile?.lastTravelAt)
  return res.json({ cities, location, queue, price, cooldownEndsAt })
})

router.post("/start", requireAuth, requireNotJailed, requireAlive, antiBot(1200), async (req, res) => {
  const schema = z.object({ toCityId: z.string().uuid() })
  const { toCityId } = schema.parse(req.body)

  const from = await prisma.userLocation.findUnique({ where: { userId: req.user!.id } })
  if (!from) {
    return res.status(400).json({ message: "Ingen startby" })
  }

  if (from.cityId === toCityId) {
    return res.status(400).json({ message: "Du er allerede i denne byen" })
  }

  const existing = await prisma.travelQueue.findUnique({ where: { userId: req.user!.id } })
  if (existing) {
    return res.status(400).json({ message: "Reise allerede aktiv" })
  }

  const travelCount = await prisma.travelLog.count({ where: { userId: req.user!.id } })
  const cost = calculateTravelPrice(2_000_000, travelCount)
  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } })
  if (!profile) {
    return res.status(404).json({ message: "Profil mangler" })
  }
  if (profile.fiatBalance < cost) {
    return res.status(400).json({ message: "Ikke nok USD til reise" })
  }

  if (profile.lastTravelAt) {
    const next = profile.lastTravelAt.getTime() + 60 * 60 * 1000
    if (next > Date.now()) {
      return res.status(429).json({ message: "Reise er i nedkjøling", nextAvailableAt: next })
    }
  }

  const arriveAt = minutesFromNow(8)

  await prisma.$transaction(async (tx) => {
    await tx.profile.update({
      where: { userId: req.user!.id },
      data: {
        fiatBalance: profile.fiatBalance - cost,
        lastTravelAt: new Date()
      }
    })

    await tx.travelQueue.create({
      data: {
        userId: req.user!.id,
        fromCityId: from.cityId,
        toCityId,
        departAt: new Date(),
        arriveAt
      }
    })
  })

  await createNotification({
    userId: req.user!.id,
    type: "travel",
    category: "system",
    title: "Reise startet",
    body: "Du er på vei. Reisen tar 8 minutter.",
    icon: "travel"
  })

  return res.json({
    success: true,
    cooldownEndsAt: Date.now() + 60 * 60 * 1000,
    arriveAt: arriveAt.getTime(),
    toCityId
  })
})

router.post("/arrive", requireAuth, async (req, res) => {
  const queue = await prisma.travelQueue.findUnique({ where: { userId: req.user!.id } })
  if (!queue) {
    return res.status(404).json({ message: "Ingen aktiv reise" })
  }
  if (queue.arriveAt > new Date()) {
    return res.status(400).json({ message: "Ikke fremme enda" })
  }

  await prisma.$transaction(async (tx) => {
    await tx.userLocation.update({
      where: { userId: req.user!.id },
      data: { cityId: queue.toCityId }
    })

    const travelCount = await tx.travelLog.count({ where: { userId: req.user!.id } })
    const cost = calculateTravelPrice(2_000_000, travelCount)
    await tx.travelLog.create({
      data: {
        userId: req.user!.id,
        fromCityId: queue.fromCityId,
        toCityId: queue.toCityId,
        cost,
        riskDelta: 2
      }
    })

    await tx.travelQueue.delete({ where: { userId: req.user!.id } })
  })

  await createNotification({
    userId: req.user!.id,
    type: "travel",
    category: "system",
    title: "Du er fremme",
    body: "Ny by gir nye markedsmuligheter.",
    icon: "travel"
  })

  return res.json({
    success: true,
    cooldownEndsAt: Date.now() + 60 * 60 * 1000
  })
})

export default router
