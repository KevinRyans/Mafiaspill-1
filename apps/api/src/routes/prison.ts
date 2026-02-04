import { Router } from "express"
import { z } from "zod"
import { prisma } from "../db/client"
import { requireAuth } from "../middleware/auth"
import { requireNotJailed } from "../middleware/prison"
import { requireAlive } from "../middleware/alive"
import { antiBot } from "../middleware/antiBot"
import { createNotification } from "../services/notifications"
import { getRespectUpgradeCodes } from "../services/respect"

const router = Router()
const BREAK_COOLDOWN_MS = 90 * 1000

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

router.get("/inmates", requireAuth, async (req, res) => {
  const now = new Date()

  await prisma.prisonInmate.deleteMany({ where: { jailedUntil: { lte: now } } })

  const inmates = await prisma.prisonInmate.findMany({
    include: {
      city: { include: { heat: true } },
      user: { select: { id: true, email: true, profile: true } }
    },
    orderBy: { jailedUntil: "desc" }
  })

  const latestAttempt = await prisma.prisonBreakAttempt.findFirst({
    where: { rescuerId: req.user!.id },
    orderBy: { createdAt: "desc" }
  })

  const rawCooldown = latestAttempt
    ? latestAttempt.createdAt.getTime() + BREAK_COOLDOWN_MS
    : null
  const breakCooldownEndsAt = rawCooldown && rawCooldown > Date.now() ? rawCooldown : null

  return res.json({
    breakCooldownEndsAt,
    inmates: inmates.map((inmate) => ({
      id: inmate.id,
      userId: inmate.userId,
      name: inmate.user.profile?.displayName || inmate.user.email,
      city: inmate.city.name,
      heat: inmate.city.heat?.heat ?? 0,
      reason: inmate.reason,
      jailedUntil: inmate.jailedUntil.getTime()
    }))
  })
})

router.post("/break", requireAuth, requireNotJailed, requireAlive, antiBot(1200), async (req, res) => {
  const schema = z.object({ inmateId: z.string().uuid() })
  const { inmateId } = schema.parse(req.body)

  const latestAttempt = await prisma.prisonBreakAttempt.findFirst({
    where: { rescuerId: req.user!.id },
    orderBy: { createdAt: "desc" }
  })

  if (latestAttempt) {
    const next = latestAttempt.createdAt.getTime() + BREAK_COOLDOWN_MS
    if (next > Date.now()) {
      return res.status(429).json({
        message: "Du må vente før du prøver å bryte ut noen igjen.",
        nextAvailableAt: next
      })
    }
  }

  const inmate = await prisma.prisonInmate.findUnique({
    where: { id: inmateId },
    include: { city: { include: { heat: true } }, user: { select: { id: true, email: true, profile: true } } }
  })

  if (!inmate) {
    return res.status(404).json({ message: "Fange ikke funnet" })
  }

  if (inmate.userId === req.user!.id) {
    return res.status(400).json({ message: "Du kan ikke bryte ut deg selv" })
  }

  const cityHeat = inmate.city.heat?.heat ?? 0
  const upgrades = await getRespectUpgradeCodes(req.user!.id)
  const bonus = upgrades.has("bribe_warden") ? 0.1 : 0
  const successChance = clamp(0.6 - cityHeat / 200 + bonus, 0.15, 0.85)
  const success = Math.random() < successChance
  const rescuerProfile = await prisma.profile.findUnique({ where: { userId: req.user!.id } })
  if (!rescuerProfile) {
    return res.status(404).json({ message: "Profil mangler" })
  }

  if (success) {
    const rewardFiat = 14_000_000 + Math.round(cityHeat * 80_000)
    const rewardRespect = 12

    await prisma.$transaction(async (tx) => {
      await tx.prisonBreakAttempt.create({
        data: {
          rescuerId: req.user!.id,
          inmateId: inmate.id,
          inmateUserId: inmate.userId,
          result: "success",
          reward: rewardFiat
        }
      })
      await tx.prisonInmate.delete({ where: { id: inmate.id } })
      await tx.profile.update({
        where: { userId: req.user!.id },
        data: {
          fiatBalance: rescuerProfile.fiatBalance + rewardFiat,
          respect: rescuerProfile.respect + rewardRespect
        }
      })
    })

    await createNotification({
      userId: req.user!.id,
      type: "prison",
      category: "sikkerhet",
      title: "Fengselsbrudd vellykket",
      body: `Du frigjorde ${inmate.user.profile?.displayName || inmate.user.email} og tjente ${rewardFiat} USD.`,
      icon: "check",
      priority: 2
    })

    await createNotification({
      userId: inmate.userId,
      type: "prison",
      category: "sikkerhet",
      title: "Du ble brutt ut",
      body: "En alliert fikk deg ut. Vær mer forsiktig fremover.",
      icon: "spark",
      priority: 2
    })

    return res.json({
      success: true,
      rewardFiat,
      rewardRespect
    })
  }

  const minutes = 3 + Math.floor(Math.random() * 6) + Math.round(cityHeat / 25)
  const jailedUntil = new Date(Date.now() + minutes * 60 * 1000)

  await prisma.$transaction(async (tx) => {
    await tx.prisonBreakAttempt.create({
      data: {
        rescuerId: req.user!.id,
        inmateId: inmate.id,
        inmateUserId: inmate.userId,
        result: "failed",
        reward: 0
      }
    })

    await tx.prisonInmate.upsert({
      where: { userId: req.user!.id },
      update: { cityId: inmate.cityId, jailedUntil, reason: "Mislykket fengselsbrudd" },
      create: { userId: req.user!.id, cityId: inmate.cityId, jailedUntil, reason: "Mislykket fengselsbrudd" }
    })
  })

  await createNotification({
    userId: req.user!.id,
    type: "prison",
    category: "sikkerhet",
    title: "Fengselsbrudd feilet",
    body: `Du ble tatt og er fengslet i ${minutes} min.`,
    icon: "warning",
    priority: 2
  })

  return res.json({
    success: false,
    jailedUntil: jailedUntil.getTime()
  })
})

export default router
