import { Router } from "express"
import { z } from "zod"
import { prisma } from "../db/client"
import { requireAuth } from "../middleware/auth"
import { requireNotJailed } from "../middleware/prison"
import { requireAlive } from "../middleware/alive"
import { antiBot } from "../middleware/antiBot"
import { createNotification } from "../services/notifications"

const router = Router()
const ROBBERY_COOLDOWN_MS = 3 * 60 * 1000

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

router.get("/targets", requireAuth, async (req, res) => {
  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } })
  if (!profile) {
    return res.status(404).json({ message: "Profil ikke funnet" })
  }
  const location = await prisma.userLocation.findUnique({
    where: { userId: req.user!.id },
    include: { city: { include: { heat: true } } }
  })
  const cityHeat = location?.city?.heat?.heat ?? 0

  const targets = await prisma.user.findMany({
    where: { id: { not: req.user!.id } },
    take: 6,
    orderBy: { createdAt: "desc" },
    include: { profile: true, location: { include: { city: true } } }
  })

  const result = targets.map((target) => {
    const defense = target.profile?.defense ?? 0
    const baseChance = 60
    const xpBonus = Math.min(12, Math.floor(profile.playerRobberyXp / 60))
    const defensePenalty = Math.round(defense / 80000)
    const heatPenalty = Math.round(cityHeat / 10)
    const chance = clamp(baseChance + xpBonus - defensePenalty - heatPenalty, 8, 85)
    return {
      id: target.id,
      name: target.profile?.displayName || target.email,
      city: target.location?.city?.name ?? "Ukjent",
      defense,
      chance
    }
  })

  const cooldownEndsAt = profile.lastPlayerRobberyAt
    ? profile.lastPlayerRobberyAt.getTime() + ROBBERY_COOLDOWN_MS
    : null

  return res.json({ targets: result, cooldownEndsAt, cityHeat })
})

router.post("/run", requireAuth, requireNotJailed, requireAlive, antiBot(1800), async (req, res) => {
  const schema = z.object({ targetId: z.string().uuid() })
  const { targetId } = schema.parse(req.body)

  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } })
  if (!profile) {
    return res.status(404).json({ message: "Profil ikke funnet" })
  }
  if (profile.lastPlayerRobberyAt) {
    const next = profile.lastPlayerRobberyAt.getTime() + ROBBERY_COOLDOWN_MS
    if (next > Date.now()) {
      return res.status(429).json({ message: "Ran spiller er i nedkjøling", nextAvailableAt: next })
    }
  }

  const targetProfile = await prisma.profile.findUnique({ where: { userId: targetId } })
  if (!targetProfile) {
    return res.status(404).json({ message: "Mål ikke funnet" })
  }
  if (targetId === req.user!.id) {
    return res.status(400).json({ message: "Du kan ikke rane deg selv" })
  }

  const location = await prisma.userLocation.findUnique({
    where: { userId: req.user!.id },
    include: { city: { include: { heat: true } } }
  })
  const cityHeat = location?.city?.heat?.heat ?? 0

  const baseChance = 60
  const xpBonus = Math.min(12, Math.floor(profile.playerRobberyXp / 60))
  const defensePenalty = Math.round((targetProfile.defense ?? 0) / 80000)
  const heatPenalty = Math.round(cityHeat / 10)
  const chance = clamp(baseChance + xpBonus - defensePenalty - heatPenalty, 8, 85)
  const success = Math.random() * 100 < chance

  let reward = 0
  if (success) {
    const maxSteal = Math.round(targetProfile.fiatBalance * (0.03 + Math.random() * 0.05))
    reward = clamp(maxSteal, 5_000_000, 150_000_000)
  }

  const xpGain = success ? 12 : 5
  const jailChance = clamp(0.15 + cityHeat / 110, 0.15, 0.55)
  const now = new Date()
  const cooldownEndsAt = now.getTime() + ROBBERY_COOLDOWN_MS

  await prisma.$transaction(async (tx) => {
    await tx.profile.update({
      where: { userId: req.user!.id },
      data: {
        fiatBalance: profile.fiatBalance + reward,
        playerRobberyXp: profile.playerRobberyXp + xpGain,
        lastPlayerRobberyAt: now
      }
    })

    if (success) {
      await tx.profile.update({
        where: { userId: targetId },
        data: {
          fiatBalance: Math.max(0, targetProfile.fiatBalance - reward)
        }
      })
    }
  })

  let jailedUntil: number | null = null
  if (!success && Math.random() < jailChance) {
    const minutes = 5 + Math.floor(Math.random() * 7) + Math.round(cityHeat / 18)
    const until = new Date(Date.now() + minutes * 60 * 1000)
    const cityId = location?.city?.id
    if (cityId) {
      await prisma.prisonInmate.upsert({
        where: { userId: req.user!.id },
        update: { cityId, jailedUntil: until, reason: "Ran spiller feilet" },
        create: { userId: req.user!.id, cityId, jailedUntil: until, reason: "Ran spiller feilet" }
      })
      jailedUntil = until.getTime()
    }
  }

  await createNotification({
    userId: req.user!.id,
    type: "player_robbery",
    category: "system",
    title: success ? "Ran spiller lykkes" : "Ran spiller feilet",
    body: success ? `Du tok ${reward} USD.` : "Målet var forberedt. Vær forsiktig.",
    icon: success ? "check" : "warning",
    priority: success ? 1 : 2
  })

  await createNotification({
    userId: targetId,
    type: "player_robbery",
    category: "system",
    title: success ? "Du ble ranet" : "Ranforsøk mislyktes",
    body: success ? "Noen tok kontanter fra deg." : "Du avverget et ranforsøk.",
    icon: success ? "warning" : "check",
    priority: success ? 2 : 1
  })

  return res.json({ success, reward, xpGain, jailedUntil, cooldownEndsAt })
})

export default router
