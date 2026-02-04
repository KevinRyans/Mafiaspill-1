import { Router } from "express"
import { z } from "zod"
import { prisma } from "../db/client"
import { requireAuth } from "../middleware/auth"
import { requireNotJailed } from "../middleware/prison"
import { requireAlive } from "../middleware/alive"
import { antiBot } from "../middleware/antiBot"
import { createNotification } from "../services/notifications"
import { getCrimeLevel, listCrimeActions, resolveCrime } from "../services/crimeService"

const router = Router()
const CRIME_COOLDOWN_MS = 60 * 1000

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
  const actions = listCrimeActions(profile.crimeXp, cityHeat)
  const level = getCrimeLevel(profile.crimeXp)
  const cooldownEndsAt = profile.lastCrimeAt
    ? profile.lastCrimeAt.getTime() + CRIME_COOLDOWN_MS
    : null

  return res.json({
    actions,
    level,
    cooldownEndsAt,
    cityHeat
  })
})

router.post("/run", requireAuth, requireNotJailed, requireAlive, antiBot(1200), async (req, res) => {
  const schema = z.object({ actionId: z.string() })
  const { actionId } = schema.parse(req.body)

  const profile = await prisma.profile.findUnique({ where: { userId: req.user!.id } })
  if (!profile) {
    return res.status(404).json({ message: "Profil ikke funnet" })
  }

  if (profile.lastCrimeAt) {
    const next = profile.lastCrimeAt.getTime() + CRIME_COOLDOWN_MS
    if (next > Date.now()) {
      return res.status(429).json({ message: "Kriminalitet er i nedkjøling", nextAvailableAt: next })
    }
  }

  const location = await prisma.userLocation.findUnique({
    where: { userId: req.user!.id },
    include: { city: { include: { heat: true } } }
  })
  const cityHeat = location?.city?.heat?.heat ?? 0

  const result = resolveCrime(actionId, profile.crimeXp, cityHeat)
  if (!result) {
    return res.status(404).json({ message: "Handling ikke funnet" })
  }

  const now = new Date()
  const cooldownEndsAt = now.getTime() + CRIME_COOLDOWN_MS
  const updatedProfile = await prisma.profile.update({
    where: { userId: req.user!.id },
    data: {
      fiatBalance: profile.fiatBalance + result.reward,
      crimeXp: profile.crimeXp + result.xpGain,
      lastCrimeAt: now
    }
  })

  let jailedUntil: number | null = null
  if (!result.success) {
    if (Math.random() < result.jailChance) {
      const minutes = 3 + Math.floor(Math.random() * 6) + Math.round(cityHeat / 20)
      const until = new Date(Date.now() + minutes * 60 * 1000)
      const cityId = location?.city?.id
      if (cityId) {
        await prisma.prisonInmate.upsert({
          where: { userId: req.user!.id },
          update: { cityId, jailedUntil: until, reason: "Kriminalitet feilet" },
          create: { userId: req.user!.id, cityId, jailedUntil: until, reason: "Kriminalitet feilet" }
        })
        jailedUntil = until.getTime()
      }
    }
  }

  await createNotification({
    userId: req.user!.id,
    type: "crime",
    category: "system",
    title: result.success ? "Kriminalitet fullført" : "Kriminalitet feilet",
    body: result.success
      ? `Du fikk ${result.reward} USD og +${result.xpGain} krim-XP.`
      : "Det gikk galt. Vær forsiktig med heat i byen.",
    icon: result.success ? "check" : "warning",
    priority: result.success ? 1 : 2
  })

  return res.json({
    success: result.success,
    reward: result.reward,
    xpGain: result.xpGain,
    profile: updatedProfile,
    jailedUntil,
    cooldownEndsAt
  })
})

export default router
