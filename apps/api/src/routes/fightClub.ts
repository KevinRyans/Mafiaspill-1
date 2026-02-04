import { Router } from "express"
import { z } from "zod"
import { prisma } from "../db/client"
import { requireAuth } from "../middleware/auth"
import { requireNotJailed } from "../middleware/prison"
import { requireAlive } from "../middleware/alive"
import { antiBot } from "../middleware/antiBot"
import { createNotification } from "../services/notifications"
import { TRAINING_OPTIONS, applyGymBoost, getLeague, gymCost, randomBetween } from "../services/fightClubService"

const router = Router()

async function ensureProfile(userId: string) {
  const existing = await prisma.fightClubProfile.findUnique({ where: { userId } })
  if (existing) return existing
  return prisma.fightClubProfile.create({ data: { userId } })
}

async function applyPending(profileId: string) {
  const current = await prisma.fightClubProfile.findUnique({ where: { id: profileId } })
  if (!current) return null
  if (!current.trainingEndsAt || current.trainingEndsAt > new Date()) {
    return current
  }

  const styleKey =
    current.style === "judo"
      ? "judoStrength"
      : current.style === "jujutsu"
      ? "jujutsuStrength"
      : current.style === "karate"
      ? "karateStrength"
      : "taekwondoStrength"

  const updated = await prisma.fightClubProfile.update({
    where: { id: current.id },
    data: {
      rating: current.rating + current.pendingRatingGain,
      [styleKey]: (current as any)[styleKey] + current.pendingStyleGain,
      league: getLeague(current.rating + current.pendingRatingGain),
      trainingEndsAt: null,
      trainingType: null,
      pendingRatingGain: 0,
      pendingStyleGain: 0,
      pendingCost: 0
    }
  })

  return updated
}

router.get("/status", requireAuth, async (req, res) => {
  const profile = await ensureProfile(req.user!.id)
  const updated = await applyPending(profile.id)
  return res.json({ profile: updated ?? profile })
})

router.post("/style", requireAuth, requireNotJailed, requireAlive, async (req, res) => {
  const schema = z.object({ style: z.enum(["judo", "jujutsu", "karate", "taekwondo"]) })
  const { style } = schema.parse(req.body)

  const profile = await ensureProfile(req.user!.id)
  const updated = await prisma.fightClubProfile.update({
    where: { id: profile.id },
    data: { style }
  })

  return res.json({ profile: updated })
})

router.post("/train", requireAuth, requireNotJailed, requireAlive, antiBot(1200), async (req, res) => {
  const schema = z.object({
    type: z.enum(["kort", "normal", "lang"]),
    gym: z.boolean().optional()
  })
  const { type, gym = false } = schema.parse(req.body)

  const profile = await ensureProfile(req.user!.id)
  const refreshed = await applyPending(profile.id)
  const active = refreshed ?? profile

  if (active.trainingEndsAt && active.trainingEndsAt > new Date()) {
    return res.status(429).json({ message: "Treningen er i gang", nextAvailableAt: active.trainingEndsAt.getTime() })
  }

  const training = TRAINING_OPTIONS[type]
  const ratingGain = applyGymBoost(randomBetween(...training.ratingGain), gym)
  const styleGain = applyGymBoost(randomBetween(...training.styleGain), gym)
  const cost = gymCost(training.baseCost, gym)

  const player = await prisma.profile.findUnique({ where: { userId: req.user!.id } })
  if (!player) {
    return res.status(404).json({ message: "Profil ikke funnet" })
  }
  if (player.fiatBalance < cost) {
    return res.status(400).json({ message: "Ikke nok USD" })
  }

  const endsAt = new Date(Date.now() + training.minutes * 60 * 1000)

  const updated = await prisma.$transaction(async (tx) => {
    await tx.profile.update({
      where: { userId: req.user!.id },
      data: { fiatBalance: player.fiatBalance - cost }
    })
    return tx.fightClubProfile.update({
      where: { id: active.id },
      data: {
        trainingEndsAt: endsAt,
        trainingType: type,
        pendingRatingGain: ratingGain,
        pendingStyleGain: styleGain,
        pendingCost: cost,
        lastTrainingAt: new Date()
      }
    })
  })

  await createNotification({
    userId: req.user!.id,
    type: "fight_club",
    category: "system",
    title: "Trening startet",
    body: `Økt (${type}) er i gang. Ferdig om ${training.minutes} min.`,
    icon: "badge",
    priority: 1
  })

  return res.json({ profile: updated, trainingEndsAt: updated.trainingEndsAt?.getTime() })
})

export default router
