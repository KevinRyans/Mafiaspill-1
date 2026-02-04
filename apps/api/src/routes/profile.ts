import { Router } from "express"
import { z } from "zod"
import { prisma } from "../db/client"
import { requireAuth } from "../middleware/auth"
import { computeEnergy } from "@mafiaspill/shared"

const router = Router()

router.get("/me", requireAuth, async (req, res) => {
  const userId = req.user!.id
  const profile = await prisma.profile.findUnique({ where: { userId } })
  if (!profile) {
    return res.status(404).json({ message: "Profil ikke funnet" })
  }
  const now = new Date()

  const energyState = computeEnergy(new Date(), {
    energy: profile.energy,
    maxEnergy: 100,
    lastEnergyAt: profile.energyUpdatedAt,
    regenPerHour: 12
  })

  if (energyState.regenerated > 0) {
    await prisma.profile.update({
      where: { userId },
      data: { energy: energyState.energy, energyUpdatedAt: energyState.lastEnergyAt }
    })
  }

  const inventory = await prisma.itemInstance.findMany({
    where: { ownerId: userId },
    include: { item: true }
  })

  const achievements = await prisma.userAchievement.findMany({
    where: { userId },
    include: { achievement: true },
    orderBy: { unlockedAt: "desc" }
  })

  const contacts = await prisma.userContact.count({ where: { userId } })
  const location = await prisma.userLocation.findUnique({
    where: { userId },
    include: { city: { include: { heat: true } } }
  })
  const crewMember = await prisma.crewMember.findFirst({
    where: { userId },
    include: { crew: true }
  })

  const travelQueue = await prisma.travelQueue.findUnique({
    where: { userId }
  })

  const prison = await prisma.prisonInmate.findUnique({
    where: { userId }
  })
  const fightClub = await prisma.fightClubProfile.findUnique({
    where: { userId }
  })

  if (prison && prison.jailedUntil <= now) {
    await prisma.prisonInmate.delete({ where: { userId } })
  }

  const missionCooldownMs = 5 * 60 * 1000
  const crimeCooldownMs = 60 * 1000
  const carTheftCooldownMs = 90 * 1000
  const houseRobberyCooldownMs = 2 * 60 * 1000
  const playerRobberyCooldownMs = 3 * 60 * 1000
  const travelCooldownMs = 60 * 60 * 1000

  const missionEndsAt = profile.lastMissionAt
    ? profile.lastMissionAt.getTime() + missionCooldownMs
    : null
  const crimeEndsAt = profile.lastCrimeAt ? profile.lastCrimeAt.getTime() + crimeCooldownMs : null
  const carTheftEndsAt = profile.lastCarTheftAt
    ? profile.lastCarTheftAt.getTime() + carTheftCooldownMs
    : null
  const houseRobberyEndsAt = profile.lastHouseRobberyAt
    ? profile.lastHouseRobberyAt.getTime() + houseRobberyCooldownMs
    : null
  const playerRobberyEndsAt = profile.lastPlayerRobberyAt
    ? profile.lastPlayerRobberyAt.getTime() + playerRobberyCooldownMs
    : null
  const travelCooldownEndsAt = profile.lastTravelAt ? profile.lastTravelAt.getTime() + travelCooldownMs : null
  const travelEndsAt = travelQueue?.arriveAt ? travelQueue.arriveAt.getTime() : null
  const prisonEndsAt = prison && prison.jailedUntil > now ? prison.jailedUntil.getTime() : null
  const fightClubEndsAt =
    fightClub?.trainingEndsAt && fightClub.trainingEndsAt > now ? fightClub.trainingEndsAt.getTime() : null

  return res.json({
    profile: {
      ...profile,
      energy: energyState.energy,
      energyUpdatedAt: energyState.lastEnergyAt,
      location: location?.city?.name,
      cityHeat: location?.city?.heat?.heat ?? 0,
      familyName: crewMember?.crew?.name ?? null
    },
    inventory,
    achievements,
    contacts,
    cooldowns: {
      missionEndsAt,
      travelEndsAt,
      travelCooldownEndsAt,
      crimeEndsAt,
      carTheftEndsAt,
      houseRobberyEndsAt,
      playerRobberyEndsAt,
      prisonEndsAt,
      fightClubEndsAt
    }
  })
})

router.patch("/me", requireAuth, async (req, res) => {
  const schema = z.object({
    displayName: z.string().min(3).max(32).optional(),
    title: z.string().min(2).max(32).optional(),
    playstyle: z.string().min(3).max(24).optional(),
    reputationTag: z.string().min(3).max(24).optional(),
    bio: z.string().max(160).optional(),
    specialization: z.string().min(3).max(24).optional()
  })
  const data = schema.parse(req.body)
  const profile = await prisma.profile.update({
    where: { userId: req.user!.id },
    data
  })
  return res.json({ profile })
})

export default router
