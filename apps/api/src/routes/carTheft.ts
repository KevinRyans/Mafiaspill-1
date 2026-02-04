import { Router } from "express"
import { z } from "zod"
import { prisma } from "../db/client"
import { requireAuth } from "../middleware/auth"
import { requireNotJailed } from "../middleware/prison"
import { requireAlive } from "../middleware/alive"
import { antiBot } from "../middleware/antiBot"
import { createNotification } from "../services/notifications"
import { listCarTheftActions, pickCarModel, resolveCarTheft } from "../services/carTheftService"

const router = Router()
const CAR_THEFT_COOLDOWN_MS = 90 * 1000

router.get("/actions", requireAuth, async (req, res) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } })
  if (!profile) {
    return res.status(404).json({ message: "Profil ikke funnet" })
  }
  const location = await prisma.userLocation.findUnique({
    where: { userId: req.user!.id },
    include: { city: { include: { heat: true } } }
  })
  const cityHeat = location?.city?.heat?.heat ?? 0
  const actions = listCarTheftActions(profile.carTheftXp, cityHeat)
  const cooldownEndsAt = profile.lastCarTheftAt
    ? profile.lastCarTheftAt.getTime() + CAR_THEFT_COOLDOWN_MS
    : null

  const garageCount = await prisma.garageCar.count({ where: { userId: req.user!.id } })

  return res.json({
    actions,
    cooldownEndsAt,
    cityHeat,
    garageCount
  })
})

router.post("/steal", requireAuth, requireNotJailed, requireAlive, antiBot(1500), async (req, res) => {
  const schema = z.object({ actionId: z.string() })
  const { actionId } = schema.parse(req.body)

  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } })
  if (!profile) {
    return res.status(404).json({ message: "Profil ikke funnet" })
  }

  if (profile.lastCarTheftAt) {
    const next = profile.lastCarTheftAt.getTime() + CAR_THEFT_COOLDOWN_MS
    if (next > Date.now()) {
      return res.status(429).json({ message: "Biltyveri er i nedkjøling", nextAvailableAt: next })
    }
  }

  const location = await prisma.userLocation.findUnique({
    where: { userId: req.user!.id },
    include: { city: { include: { heat: true } } }
  })
  const cityHeat = location?.city?.heat?.heat ?? 0

  const result = resolveCarTheft(actionId, profile.carTheftXp, cityHeat)
  if (!result) {
    return res.status(404).json({ message: "Handling ikke funnet" })
  }

  const now = new Date()
  const cooldownEndsAt = now.getTime() + CAR_THEFT_COOLDOWN_MS
  let carAwarded = null

  if (result.success) {
    const models = await prisma.carModel.findMany({ select: { id: true, rarity: true, make: true, model: true } })
    if (models.length) {
      const selectedId = pickCarModel(models)
      const chosen = models.find((model) => model.id === selectedId) ?? models[0]
      const garageCar = await prisma.garageCar.create({
        data: {
          userId: req.user!.id,
          carModelId: chosen.id
        },
        include: { carModel: true }
      })
      carAwarded = garageCar
    }
  }

  const updatedProfile = await prisma.profile.update({
    where: { userId: req.user!.id },
    data: {
      carTheftXp: profile.carTheftXp + result.xpGain,
      lastCarTheftAt: now
    }
  })

  let jailedUntil: number | null = null
  if (!result.success) {
    if (Math.random() < result.jailChance) {
      const minutes = 4 + Math.floor(Math.random() * 8) + Math.round(cityHeat / 18)
      const until = new Date(Date.now() + minutes * 60 * 1000)
      const cityId = location?.city?.id
      if (cityId) {
        await prisma.prisonInmate.upsert({
          where: { userId: req.user!.id },
          update: { cityId, jailedUntil: until, reason: "Biltyveri feilet" },
          create: { userId: req.user!.id, cityId, jailedUntil: until, reason: "Biltyveri feilet" }
        })
        jailedUntil = until.getTime()
      }
    }
  }

  await createNotification({
    userId: req.user!.id,
    type: "car_theft",
    category: "system",
    title: result.success ? "Biltyveri lykkes" : "Biltyveri feilet",
    body: result.success
      ? `Du fikk en ${carAwarded?.carModel?.make ?? "bil"} ${carAwarded?.carModel?.model ?? ""} i garasjen.`
      : "Du ble oppdaget. Heat i byen gjør dette risikabelt.",
    icon: result.success ? "check" : "warning",
    priority: result.success ? 1 : 2
  })

  return res.json({
    success: result.success,
    car: carAwarded,
    xpGain: result.xpGain,
    profile: updatedProfile,
    jailedUntil,
    cooldownEndsAt
  })
})

export default router
